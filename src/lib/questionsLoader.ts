import * as XLSX from "xlsx";
import { storage, db, auth } from "./firebase";
import { ref, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export interface Question {
  id: string;
  category: string;
  points: number;
  question: string;
  answer: string;
  image?: string[];
  answerImage?: string[];
}

const cache = new Map<string, { questions: Question[]; sheets: number }>();
const usedCache = new Map<string, Set<string>>();

// ✅ جديد: معرف الوضع
const getMode = () => (typeof window!== 'undefined' && localStorage.getItem("elkhen_trial") === "true")? 'trial' : 'full';

const getUid = () => {
  const uid = auth.currentUser?.uid;
  if (uid) return uid;
  // ✅ جديد: بدل 'guest' اعمل anon مستقر
  let anon = localStorage.getItem('elkhen_anon_id');
  if (!anon) {
    anon = (window.crypto && crypto.randomUUID)? crypto.randomUUID() : 'anon-' + Math.random().toString(36).slice(2);
    localStorage.setItem('elkhen_anon_id', anon);
  }
  return anon;
};
const usedDocRef = (categoryId: string) => doc(db, 'users', getUid(), 'usedQuestions', `${categoryId}_${getMode()}`);

// === إضافة: IndexedDB للكاش الدائم ===
const DB_NAME = 'elkhen-questions-v1';
const STORE_NAME = 'categories';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const dbName = `${DB_NAME}-${getUid()}-${getMode()}`; // ✅ فصل حسب المستخدم والوضع
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getCachedFromDB(categoryId: string): Promise<{questions: Question[], sheets: number} | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(categoryId);
      req.onsuccess = () => resolve(req.result? {questions: req.result.questions, sheets: req.result.sheets} : null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function saveToDB(categoryId: string, data: {questions: Question[], sheets: number}) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({id: categoryId,...data, ts: Date.now()});
  } catch {}
}
// === نهاية الإضافة ===

async function getUsedSet(categoryId: string): Promise<Set<string>> {
  const mode = getMode();
  const key = `${getUid()}_${categoryId}_${mode}`; // ✅ فصل
  if (usedCache.has(key)) return usedCache.get(key)!;

  const localKey = `used_${key}`;
  let set = new Set<string>();

  // === التعديل المهم: Firestore هو المصدر ===
  if (auth.currentUser) {
    try {
      const snap = await getDoc(usedDocRef(categoryId));
      if (snap.exists()) {
        set = new Set<string>(snap.data().ids || []);
        usedCache.set(key, set);
        localStorage.setItem(localKey, JSON.stringify([...set]));
        return set;
      }
    } catch (e) {
      console.warn('⚠ فشل قراءة used من Firestore:', e);
    }
  }

  set = new Set<string>(JSON.parse(localStorage.getItem(localKey) || '[]'));
  usedCache.set(key, set);
  return set;
}

async function saveUsed(categoryId: string, questionId: string) {
  console.log('>>> UID الحالي:', getUid(), '| mode:', getMode(), '| category:', categoryId);

  const set = await getUsedSet(categoryId);
  set.add(questionId);
  const mode = getMode();
  const key = `${getUid()}_${categoryId}_${mode}`;
  usedCache.set(key, set);
  localStorage.setItem(`used_${key}`, JSON.stringify([...set]));

  if (auth.currentUser) {
    await setDoc(usedDocRef(categoryId), { ids: [...set] }, { merge: true });
    console.log('✅ اتكتب في Firestore');
  }
  window.dispatchEvent(new Event("storage"));
}

async function resetIfFinished(categoryId: string) {
  const all = await loadCategory(categoryId);
  const used = await getUsedSet(categoryId);

  if (all.length > 0 && used.size >= all.length) {
    const mode = getMode();
    const key = `${getUid()}_${categoryId}_${mode}`;
    usedCache.set(key, new Set());
    localStorage.removeItem(`used_${key}`);
    if (auth.currentUser) {
      await setDoc(usedDocRef(categoryId), { ids: [], cycle: Date.now() });
    }
    console.log(`🔄 ${categoryId}: دورة جديدة`);
  }
}

export async function loadCategory(categoryId: string): Promise<Question[]> {
  const isTrial = getMode() === 'trial';
  const cacheKey = `${categoryId}_${isTrial? 'trial' : 'full'}`;

  if (cache.has(cacheKey)) {
    console.log(`📦 من الكاش: ${cacheKey}`);
    return cache.get(cacheKey)!.questions;
  }

  const dbCached = await getCachedFromDB(cacheKey);
  if (dbCached) {
    console.log(`💾 من IndexedDB: ${cacheKey}`);
    cache.set(cacheKey, dbCached);
    return dbCached.questions;
  }

  console.log(`🔄 بحمل من Storage: ${cacheKey}`);
  try {
    const basePath = isTrial? `trial` : `questions`;
    const url = await getDownloadURL(ref(storage, `${basePath}/${categoryId}.xlsx`)); // ✅ مسار ثابت
    console.log(`✅ لقيت الملف في ${basePath}/`);

    const res = await fetch(url);
    const data = await res.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });

    const parseImages = (val: any): string[] | undefined => {
      if (!val) return undefined;
      const str = String(val).trim();
      if (!str) return undefined;
      const parts = str.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
      return parts.length? parts : undefined;
    };

    const allQuestions: Question[] = [];
    workbook.SheetNames.forEach((sheetName) => {
      const points = parseInt(sheetName) || 200;
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      rows.forEach((row, idx) => {
        const q = row.question || row.Question || row.السؤال;
        const a = row.answer || row.Answer || row.الجواب;
        const img = row.image || row.Image || row.صورة;
        const ansImg = row.answerImage || row.answer_image || row.صورة_الإجابة;
        if (q && a) {
          allQuestions.push({
            id: `${categoryId}-${sheetName}-${idx}`,
            category: categoryId,
            points,
            question: String(q).trim(),
            answer: String(a).trim(),
            image: parseImages(img),
            answerImage: parseImages(ansImg),
          });
        }
      });
    });

    console.log(`✅ حمّلت ${allQuestions.length} سؤال من ${cacheKey}`);
    const cacheData = { questions: allQuestions, sheets: workbook.SheetNames.length };
    cache.set(cacheKey, cacheData);
    await saveToDB(cacheKey, cacheData);
    return allQuestions;
  } catch (error) {
    console.error(`❌ فشل تحميل ${categoryId}:`, error);
    return [];
  }
}

export async function getNextQuestion(categoryId: string, points: number): Promise<Question | null> {
  await resetIfFinished(categoryId);
  const all = await loadCategory(categoryId);
  const used = await getUsedSet(categoryId);
  const available = all.filter(q => q.points === points &&!used.has(q.id));
  if (available.length === 0) return null;
  const q = available[Math.floor(Math.random() * available.length)];
  await saveUsed(categoryId, q.id);
  return q;
}

export async function getQuestionsForGame(categoryIds: string[]): Promise<Record<string, Question[]>> {
  const result: Record<string, Question[]> = {};
  for (const catId of categoryIds) {
    await resetIfFinished(catId);
    const all = await loadCategory(catId);
    const used = await getUsedSet(catId);
    const available = all.filter(q =>!used.has(q.id));
    const byPoints: Record<number, Question[]> = { 200: [], 400: [], 600: [] };
    available.forEach(q => { if (byPoints[q.points]) byPoints[q.points].push(q); });
    const selected: Question[] = [];
    for (const points of [200, 400, 600]) {
      const pool = byPoints[points];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      for (let i = 0; i < 2 && pool.length > 0; i++) {
        const q = pool.pop()!;
        selected.push(q);
        await saveUsed(catId, q.id);
      }
    }
    result[catId] = selected;
  }
  return result;
}

export async function getRemainingForCategory(categoryId: string) {
  const isTrial = getMode() === 'trial';
  const cacheKey = `${categoryId}_${isTrial? 'trial' : 'full'}`;
  await loadCategory(categoryId);
  const cached = cache.get(cacheKey) || { questions: [], sheets: 0 };
  const used = await getUsedSet(categoryId);
  const total = cached.questions.length;
  const remaining = Math.max(0, total - used.size);
  const gamesLeft = Math.floor(remaining / 6);
  const totalGames = Math.floor(total / 6);
  return { remaining: gamesLeft, total: totalGames };
}

export const markQuestionUsed = saveUsed;

export function subscribeToRemaining(categoryId: string, callback: (data: { remaining: number; total: number }) => void) {
  const uid = getUid();
  if (!auth.currentUser) {
    getRemainingForCategory(categoryId).then(callback);
    return () => {};
  }
  const ref = doc(db, 'users', uid, 'usedQuestions', `${categoryId}_${getMode()}`);
  return onSnapshot(ref, async () => {
    const key = `${uid}_${categoryId}_${getMode()}`;
    usedCache.delete(key);
    localStorage.removeItem(`used_${key}`);
    await loadCategory(categoryId);
    const data = await getRemainingForCategory(categoryId);
    callback(data);
    window.dispatchEvent(new Event("storage"));
  });
}

export function subscribeToAllRemaining(categoryIds: string[], callback: (counts: Record<string, { remaining: number; total: number }>) => void) {
  const loadAll = async () => {
    const all: Record<string, { remaining: number; total: number }> = {};
    await Promise.all(categoryIds.map(async (id) => { all[id] = await getRemainingForCategory(id); }));
    callback(all);
  };
  loadAll();
  const unsubs = categoryIds.map(catId => subscribeToRemaining(catId, async () => { await loadAll(); }));
  return () => unsubs.forEach(unsub => unsub());
}

export const getCurrentUid = () => getUid();

export async function clearQuestionCache() {
  cache.clear();
  usedCache.clear();
  try {
    const dbs = await indexedDB.databases?.();
    if (dbs) {
      for (const db of dbs) {
        if (db.name?.startsWith('elkhen-questions-v1')) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
    console.log('🧹 تم مسح كاش الأسئلة بنجاح');
  } catch {}
}