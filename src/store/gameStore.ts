import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CategoryId } from "@/data/categories";
import { getNextQuestion, loadCategory } from "../lib/questionsLoader";

// --- Firebase ---
import { ref, listAll, getBlob } from "firebase/storage";
import { storage } from "../lib/firebase";
import * as XLSX from 'xlsx';

let firebaseCache: Record<string, any[]> = {};
let isPreloaded = false;
let currentCacheMode: string | null = null;

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

export type Points = 200 | 400 | 600;
export type AidType = "swap" | "pit" | "twoAnswers" | "trap" | "freeze" | "shield" | "streak";

export interface TeamState {
  name: string;
  score: number;
  aids: Record<AidType, boolean>;
  shieldActive: boolean;
  selectedAids: AidType[];
  usedAidThisTurn: boolean;
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
  timerDuration: number;
  usedSlots: Record<string, true>;
  active: ActiveQuestion | null;
  questionQueues: Record<string, string[]>;
  activePit: { owner: 1 | 2 } | null;
  activeTrap: { owner: 1 | 2 } | null;
  activeFreeze: { owner: 1 | 2 } | null;
  shieldUnlocked: boolean;
  activeStreaks: { team1: { savedPoints: number } | null; team2: { savedPoints: number } | null };
  lastCorrectAnswer: { team: 1 | 2; points: number } | null;
  pendingAnswer: { team: 1 | 2; points: number } | null;

  theme: 'default' | 'pharaonic' | 'ramadan' | 'eid' | 'worldcup' | 'neon' | 'winter';
  setTheme: (t: GameState['theme']) => void;

  setTeamName: (n: 1 | 2, name: string) => void;
  toggleCategory: (id: CategoryId) => void;
  setTimerDuration: (d: number) => void;
  setTeamAids: (team: 1 | 2, aids: AidType[]) => void;
  startGame: () => void;
  pickQuestion: (categoryId: CategoryId, points: Points, side: "left" | "right") => Promise<boolean>;
  swapActiveQuestion: () => Promise<void>;
  awardPoints: (winner: 1 | 2 | 0) => void;
  useAid: (team: 1 | 2, aid: AidType) => void;
  activateShield: (team: 1 | 2) => void;
  cancelPit: (team: 1 | 2) => void;
  adjustScore: (team: 1 | 2, delta: number) => void;
  endGame: () => void;
  fullReset: () => void;
  setShieldUnlocked: (v: boolean) => void;
}

const freshTeam = (name = ""): TeamState => ({
  name,
  score: 0,
  aids: { swap: false, pit: false, twoAnswers: false, trap: false, freeze: false, shield: false, streak: true },
  shieldActive: false,
  selectedAids: [],
  usedAidThisTurn: false,
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
      timerDuration: 30,
      usedSlots: {},
      active: null,
      questionQueues: {},
      activePit: null,
      activeTrap: null,
      activeFreeze: null,
      shieldUnlocked: false,
      activeStreaks: { team1: null, team2: null },
      lastCorrectAnswer: null,
      pendingAnswer: null,

      theme: 'default',
      setTheme: (t) => set({ theme: t }),
      setShieldUnlocked: (v) => set({ shieldUnlocked: v }),

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

      setTeamAids: (team, aids) =>
        set((s) => {
          const t = team === 1? s.team1 : s.team2;
          const newAids: Record<AidType, boolean> = { swap: false, pit: false, twoAnswers: false, trap: false, freeze: false, shield: false, streak: true };
          const chosen = aids.slice(0,3) as AidType[];
          chosen.forEach(a => newAids[a] = true);
          return { [team === 1? "team1" : "team2"]: {...t, aids: newAids, selectedAids: chosen, usedAidThisTurn: false } } as Partial<GameState>;
        }),

      startGame: () =>
        set((s) => {
          const reset = (t: TeamState) => {
            const na = {...t.aids};
            t.selectedAids.forEach(a => na[a] = true);
            na.streak = true;
            return {...t, score: 0, shieldActive: false, aids: na, usedAidThisTurn: false };
          };
          return {
            team1: reset(s.team1),
            team2: reset(s.team2),
            currentTurn: 1,
            usedSlots: {},
            active: null,
            activePit: null,
            activeTrap: null,
            activeFreeze: null,
            shieldUnlocked: false,
            activeStreaks: { team1: null, team2: null },
            lastCorrectAnswer: null,
            pendingAnswer: null,
          };
        }),

      pickQuestion: async (categoryId, points, side) => {
        const { usedSlots } = get();
        const key = slotKey(categoryId, points, side);
        if (usedSlots[key]) return false;

        await loadCategory(categoryId);
        const q = await getNextQuestion(categoryId, points);
        if (!q) return false;

        const qid = String((q as any).id || Date.now() + Math.random());

        const duration = points === 200? 30 : points === 400? 50 : 70;

        set((s) => ({
          active: { categoryId, points, side, questionId: qid },
          usedSlots: {...s.usedSlots, [key]: true },
          shieldUnlocked: false,
          timerDuration: duration,
        }));

        setTimeout(() => {
          if (get().active?.questionId === qid) set({ shieldUnlocked: true });
        }, 10000);
        return true;
      },

      swapActiveQuestion: async () => {
        const { active } = get();
        if (!active) return;
        await loadCategory(active.categoryId);
        const q = await getNextQuestion(active.categoryId, active.points);
        if (!q) return;
        const qid = String((q as any).id || Date.now());
        set({ active: {...active, questionId: qid } });
        window.dispatchEvent(new CustomEvent('aid-used-reset-timer'));
      },

      awardPoints: (winner) => {
        const { active, currentTurn, activePit, activeTrap, activeFreeze } = get();
        if (!active) return;

        let t1 = {...get().team1};
        let t2 = {...get().team2};
        let newStreaks = {...get().activeStreaks};
        let newLastCorrect = get().lastCorrectAnswer;

        const myStreak = currentTurn === 1? newStreaks.team1 : newStreaks.team2;

        // لو الستريك متفعل عند صاحب الدور
        if (myStreak) {
          if (winner === currentTurn) {
            if (myStreak.savedPoints === 0) {
              // أول مرة - خزن النقط بس (متضيفش حاجة)
              if (currentTurn === 1) newStreaks.team1 = { savedPoints: active.points };
              else newStreaks.team2 = { savedPoints: active.points };
            } else {
              // تاني مرة - ضيف اللي خزنته + دبل السؤال التاني بس
              const total = myStreak.savedPoints + (active.points * 2);
              if (currentTurn === 1) {
                t1.score += total;
                newStreaks.team1 = null;
              } else {
                t2.score += total;
                newStreaks.team2 = null;
              }
            }
            newLastCorrect = null;
          } else {
            // غلط أو لا أحد - اخسر اللي خزنته بس
            if (currentTurn === 1) {
              t1.score -= myStreak.savedPoints;
              newStreaks.team1 = null;
            } else {
              t2.score -= myStreak.savedPoints;
              newStreaks.team2 = null;
            }
            newLastCorrect = null;
            // لو حد تاني جاوب، اديه نقطته عادي
            if (winner === 1) t1.score += active.points;
            if (winner === 2) t2.score += active.points;
          }
        } else {
          // مفيش ستريك - عادي
          if (winner === 1) t1.score += active.points;
          else if (winner === 2) t2.score += active.points;

          if (winner === 1 || winner === 2) {
            newLastCorrect = { team: winner, points: active.points };
          } else {
            newLastCorrect = null;
          }
        }

        if (activePit && winner === activePit.owner) {
          const opponent = activePit.owner === 1? 2 : 1;
          if (opponent === 1) t1.score -= active.points;
          else t2.score -= active.points;
        }

        if (activeTrap && winner === 0) {
          const forced = activeTrap.owner === 1? 2 : 1;
          if (forced === 1) t1.score -= active.points;
          else t2.score -= active.points;
        }

        if (activeFreeze && winner!== 0 && winner!== activeFreeze.owner) {
          if (winner === 1) t1.score -= active.points;
          if (winner === 2) t2.score -= active.points;
        }

        const updates: Partial<GameState> = {
          usedSlots: {...get().usedSlots, [slotKey(active.categoryId, active.points, active.side)]: true },
          active: null,
          currentTurn: currentTurn === 1? 2 : 1,
          activePit: null,
          activeTrap: null,
          activeFreeze: null,
          shieldUnlocked: false,
          activeStreaks: newStreaks,
          lastCorrectAnswer: newLastCorrect,
          pendingAnswer: null,
          team1: {...t1, shieldActive: false, usedAidThisTurn: false },
          team2: {...t2, shieldActive: false, usedAidThisTurn: false },
        };

        set(updates as GameState);
      },

      useAid: (team, aid) =>
        set((s) => {
          const t = team === 1? s.team1 : s.team2;
          if (!t.aids[aid]) return {};
          if (t.usedAidThisTurn && aid!== "streak") return {};
          const opponent = team === 1? s.team2 : s.team1;

          if (aid === "streak") {
            // تفعيل الستريك - كل فريق مستقل
            const streaks = s.activeStreaks;
            if (team === 1 && streaks.team1) return {};
            if (team === 2 && streaks.team2) return {};
            const newAids = {...t.aids, streak: false };
            const newStreaks = {...streaks, [team === 1? 'team1' : 'team2']: { savedPoints: 0 } };
            return {
              activeStreaks: newStreaks,
              [team === 1? "team1" : "team2"]: {...t, aids: newAids, usedAidThisTurn: false }
            } as Partial<GameState>;
          }

          if ((aid === "trap" || aid === "freeze") && opponent.shieldActive) {
            const oppUpdate = team === 1? { team2: {...opponent, shieldActive: false } } : { team1: {...opponent, shieldActive: false } };
            setTimeout(() => window.dispatchEvent(new CustomEvent('shield-blocked')), 0);
            return oppUpdate as Partial<GameState>;
          }

          if (aid === "shield" && (!s.active ||!s.shieldUnlocked)) return {};

          const newAids = {...t.aids, [aid]: false };
          if (aid === "freeze") newAids.trap = false;

          const updates: Partial<GameState> = { [team === 1? "team1" : "team2"]: {...t, aids: newAids, usedAidThisTurn: true } };
          if (aid === "pit") updates.activePit = { owner: team };
          if (aid === "trap") updates.activeTrap = { owner: team };
          if (aid === "freeze") updates.activeFreeze = { owner: team };
          if (aid === "shield") {
            updates[team === 1? "team1" : "team2"] = {...t, aids: newAids, shieldActive: true, usedAidThisTurn: true };
          }
          setTimeout(() => window.dispatchEvent(new CustomEvent('aid-used-reset-timer')), 0);
          return updates as Partial<GameState>;
        }),

      activateShield: (team) =>
        set((s) => {
          const t = team === 1? s.team1 : s.team2;
          if (!t.aids.shield) return {};
          if (!s.active ||!s.shieldUnlocked) return {};
          return { [team === 1? "team1" : "team2"]: {...t, aids: {...t.aids, shield: false }, shieldActive: true, usedAidThisTurn: true } } as Partial<GameState>;
        }),

      cancelPit: (team) =>
        set((s) => {
          if (s.activePit?.owner!== team) return {};
          const t = team === 1? s.team1 : s.team2;
          return {
            activePit: null,
            [team === 1? "team1" : "team2"]: {...t, aids: {...t.aids, pit: true }, usedAidThisTurn: false },
          } as Partial<GameState>;
        }),

      adjustScore: (team, delta) =>
        set((s) => {
          const t = team === 1? s.team1 : s.team2;
          return { [team === 1? "team1" : "team2"]: {...t, score: t.score + delta } } as Partial<GameState>;
        }),

      endGame: () =>
        set((s) => {
          const reset = (t: TeamState) => {
            const na = {...t.aids};
            t.selectedAids.forEach(a => na[a] = true);
            na.streak = true;
            return {...t, score: 0, shieldActive: false, aids: na, usedAidThisTurn: false };
          };
          return {
            usedSlots: {},
            active: null,
            currentTurn: 1,
            activePit: null,
            activeTrap: null,
            activeFreeze: null,
            shieldUnlocked: false,
            activeStreaks: { team1: null, team2: null },
            lastCorrectAnswer: null,
            pendingAnswer: null,
            team1: reset(s.team1),
            team2: reset(s.team2),
          };
        }),

      fullReset: () =>
        set({
          team1: freshTeam(),
          team2: freshTeam(),
          selectedCategories: [],
          currentTurn: 1,
          timerDuration: 30,
          usedSlots: {},
          active: null,
          theme: 'default',
          questionQueues: {},
          activePit: null,
          activeTrap: null,
          activeFreeze: null,
          shieldUnlocked: false,
          activeStreaks: { team1: null, team2: null },
          lastCorrectAnswer: null,
          pendingAnswer: null,
        }),
    }),
    { name: STORE_KEY, version: 6 },
  ),
);

export const getFirebaseCache = () => firebaseCache;
export const isFirebaseReady = () => isPreloaded;
