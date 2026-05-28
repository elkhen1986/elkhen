import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CategoryId } from "@/data/categories";
import { getNextQuestion, loadCategory } from "../lib/questionsLoader";

// --- إضافات التسريع من Firebase ---
import { ref, listAll, getBlob } from "firebase/storage";
import { storage } from "../lib/firebase";
import * as XLSX from 'xlsx';

let firebaseCache: Record<string, any[]> = {};
let isPreloaded = false;
let currentCacheMode: string | null = null;

// ✅ دالة مسح الكاش
export function resetFirebaseCache() {
  isPreloaded = false;
  firebaseCache = {};
  currentCacheMode = null;
  console.log('🧹 Firebase cache reset');
}

export async function preloadFirebaseCategories(selected?: CategoryId[]) {
  const mode = (typeof window!== 'undefined' && localStorage.getItem('elkhen_trial') === 'true')? 'trial' : 'full';
  if (isPreloaded && currentCacheMode === mode) return;
  firebaseCache = {};
  currentCacheMode = mode;
  isPreloaded = false;

  const basePath = mode === 'trial'? 'trial' : '';
  const rootRef = ref(storage, basePath);
  const res = await listAll(rootRef);
  const filesToLoad = selected && selected.length > 0
? res.items.filter(file => selected.includes(file.name.replace('.xlsx','') as CategoryId))
    : res.items;

  await Promise.all(filesToLoad.map(async (file) => {
    if (!file.name.endsWith('.xlsx')) return;
    const blob = await getBlob(file);
    const buf = await blob.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const name = file.name.replace('.xlsx','') as CategoryId;
    firebaseCache[name] = json;
  }));
  isPreloaded = true;
  console.log(`Firebase ${mode} categories cached:`, Object.keys(firebaseCache));
}
// --- نهاية الإضافات ---

export type Points = 200 | 400 | 600;
export type AidType = "swap" | "pit" | "twoAnswers" | "trap";

export interface TeamState {
  name: string;
  score: number;
  aids: Record<AidType, boolean>;
}

export interface ActiveQuestion {
  categoryId: CategoryId;
  points: Points;
  side: "left" | "right";
  questionId: string;
}

interface GameState {
  team1: TeamState;
  team2: TeamState;
  selectedCategories: CategoryId[];
  currentTurn: 1 | 2;
  timerDuration: 30 | 60 | 90;
  usedSlots: Record<string, true>;
  active: ActiveQuestion | null;
  questionQueues: Record<string, string[]>;
  activePit: { owner: 1 | 2 } | null;
  activeTrap: { owner: 1 | 2 } | null;

  theme: 'default' | 'pharaonic' | 'ramadan' | 'eid' | 'worldcup' | 'neon' | 'winter';
  setTheme: (t: GameState['theme']) => void;

  setTeamName: (n: 1 | 2, name: string) => void;
  toggleCategory: (id: CategoryId) => void;
  setTimerDuration: (d: 30 | 60 | 90) => void;
  startGame: () => void;
  pickQuestion: (categoryId: CategoryId, points: Points, side: "left" | "right") => Promise<boolean>;
  swapActiveQuestion: () => Promise<void>;
  awardPoints: (winner: 1 | 2 | 0) => void;
  useAid: (team: 1 | 2, aid: AidType) => void;
  cancelPit: (team: 1 | 2) => void;
  adjustScore: (team: 1 | 2, delta: number) => void;
  endGame: () => void;
  fullReset: () => void;
}

const freshTeam = (name = ""): TeamState => ({
  name,
  score: 0,
  aids: { swap: true, pit: true, twoAnswers: true, trap: true },
});

const slotKey = (c: CategoryId, p: Points, s: "left" | "right") => `${c}-${p}-${s}`;

const getStoreMode = () => (typeof window!== 'undefined' && localStorage.getItem('elkhen_trial') === 'true')? 'trial' : 'full';
const STORE_KEY = `elkhen-game-state-${getStoreMode()}`;
const LEGACY_KEY = 'elkhen-game-state';
if (typeof window!== 'undefined') {
  const legacy = localStorage.getItem(LEGACY_KEY);
  const current = localStorage.getItem(STORE_KEY);
  if (legacy &&!current) {
    localStorage.setItem(STORE_KEY, legacy);
  }
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      team1: freshTeam(),
      team2: freshTeam(),
      selectedCategories: [],
      currentTurn: 1,
      timerDuration: 60,
      usedSlots: {},
      active: null,
      questionQueues: {},
      activePit: null,
      activeTrap: null,

      theme: 'default',
      setTheme: (t) => set({ theme: t }),

      setTeamName: (n, name) =>
        set((s) => ({ [n === 1? "team1" : "team2"]: {...(n === 1? s.team1 : s.team2), name } } as Partial<GameState>)),

      toggleCategory: (id) =>
        set((s) => {
          const exists = s.selectedCategories.includes(id);
          if (exists) return { selectedCategories: s.selectedCategories.filter((c) => c!== id) };
          if (s.selectedCategories.length >= 6) return {};
          return { selectedCategories: [...s.selectedCategories, id] };
        }),

      setTimerDuration: (d) => set({ timerDuration: d }),

      startGame: () =>
        set((s) => {
          // preloadFirebaseCategories(); // ✅ معطلة عشان متلغبطش التجربة
          return {
          team1: {...s.team1, score: 0, aids: { swap: true, pit: true, twoAnswers: true, trap: true } },
          team2: {...s.team2, score: 0, aids: { swap: true, pit: true, twoAnswers: true, trap: true } },
          currentTurn: 1,
          usedSlots: {},
          active: null,
          activePit: null,
          activeTrap: null,
        }}),

      pickQuestion: async (categoryId, points, side) => {
        const { usedSlots } = get();
        const key = slotKey(categoryId, points, side);
        if (usedSlots[key]) return false;

        // ✅ حمّل من الملف مباشرة (trial أو full)
        await loadCategory(categoryId);
        const q = await getNextQuestion(categoryId, points);

        if (!q) return false;

        const qid = String((q as any).id || Date.now() + Math.random());

        set((s) => ({
          active: { categoryId, points, side, questionId: qid },
          usedSlots: {...s.usedSlots, [key]: true }
        }));
        return true;
      },

      swapActiveQuestion: async () => {
        const { active } = get();
        if (!active) return;

        await loadCategory(active.categoryId);
        const q = await getNextQuestion(active.categoryId, active.points);

        if (!q) return;
        const qid = String((q as any).id || Date.now());
        set({
          active: {...active, questionId: qid },
        });
        window.dispatchEvent(new CustomEvent('aid-used-reset-timer'));
      },

      awardPoints: (winner) => {
        const { active, currentTurn, activePit, activeTrap } = get();
        if (!active) return;
        const updates: Partial<GameState> = {
          usedSlots: {...get().usedSlots, [slotKey(active.categoryId, active.points, active.side)]: true },
          active: null,
          currentTurn: currentTurn === 1? 2 : 1,
          activePit: null,
          activeTrap: null,
        };
        if (winner === 1) updates.team1 = {...get().team1, score: get().team1.score + active.points };
        else if (winner === 2) updates.team2 = {...get().team2, score: get().team2.score + active.points };

        if (activePit && winner === activePit.owner) {
          const opponent = activePit.owner === 1? 2 : 1;
          if (opponent === 1) {
            const base = updates.team1?.score?? get().team1.score;
            updates.team1 = {...(updates.team1?? get().team1), score: base - active.points };
          } else {
            const base = updates.team2?.score?? get().team2.score;
            updates.team2 = {...(updates.team2?? get().team2), score: base - active.points };
          }
        }

        if (activeTrap && winner === 0) {
          const forced = activeTrap.owner === 1? 2 : 1;
          if (forced === 1) {
            const base = updates.team1?.score?? get().team1.score;
            updates.team1 = {...(updates.team1?? get().team1), score: base - active.points };
          } else {
            const base = updates.team2?.score?? get().team2.score;
            updates.team2 = {...(updates.team2?? get().team2), score: base - active.points };
          }
        }

        set(updates as GameState);
      },

      useAid: (team, aid) =>
        set((s) => {
          const t = team === 1? s.team1 : s.team2;
          if (!t.aids[aid]) return {};
          const newAids = {...t.aids, [aid]: false };
          const updates: Partial<GameState> = { [team === 1? "team1" : "team2"]: {...t, aids: newAids } };
          if (aid === "pit") updates.activePit = { owner: team };
          if (aid === "trap") updates.activeTrap = { owner: team };
          setTimeout(() => window.dispatchEvent(new CustomEvent('aid-used-reset-timer')), 0);
          return updates as Partial<GameState>;
        }),

      cancelPit: (team) =>
        set((s) => {
          if (s.activePit?.owner!== team) return {};
          const t = team === 1? s.team1 : s.team2;
          return {
            activePit: null,
            [team === 1? "team1" : "team2"]: {...t, aids: {...t.aids, pit: true } },
          } as Partial<GameState>;
        }),

      adjustScore: (team, delta) =>
        set((s) => {
          const t = team === 1? s.team1 : s.team2;
          return { [team === 1? "team1" : "team2"]: {...t, score: t.score + delta } } as Partial<GameState>;
        }),

      endGame: () =>
        set((s) => ({
          usedSlots: {},
          active: null,
          currentTurn: 1,
          activePit: null,
          activeTrap: null,
          team1: {...s.team1, score: 0, aids: { swap: true, pit: true, twoAnswers: true, trap: true } },
          team2: {...s.team2, score: 0, aids: { swap: true, pit: true, twoAnswers: true, trap: true } },
        })),

      fullReset: () =>
        set({
          team1: freshTeam(),
          team2: freshTeam(),
          selectedCategories: [],
          currentTurn: 1,
          timerDuration: 60,
          usedSlots: {},
          active: null,
          theme: 'default',
          questionQueues: {},
          activePit: null,
          activeTrap: null,
        }),
    }),
    { name: STORE_KEY, version: 1 },
  ),
);

export const getFirebaseCache = () => firebaseCache;
export const isFirebaseReady = () => isPreloaded;