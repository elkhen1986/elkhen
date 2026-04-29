import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CategoryId } from "@/data/categories";
import type { Points } from "@/data/questions";
import { pickRandomQuestion } from "@/lib/randomPicker";

export type AidType = "swap" | "call" | "twoAnswers";

export interface TeamState {
  name: string;
  score: number;
  aids: Record<AidType, boolean>; // true = available
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
  usedQuestionIds: Record<string, true>; // categoryId-points -> set
  usedSlots: Record<string, true>; // categoryId-points-side -> consumed
  active: ActiveQuestion | null;

  setTeamName: (n: 1 | 2, name: string) => void;
  toggleCategory: (id: CategoryId) => void;
  setTimerDuration: (d: 30 | 60 | 90) => void;
  startGame: () => void;
  pickQuestion: (categoryId: CategoryId, points: Points, side: "left" | "right") => boolean;
  swapActiveQuestion: () => void;
  awardPoints: (winner: 1 | 2 | 0) => void;
  useAid: (team: 1 | 2, aid: AidType) => void;
  adjustScore: (team: 1 | 2, delta: number) => void;
  endGame: () => void;
  fullReset: () => void;
}

const freshTeam = (name = ""): TeamState => ({
  name,
  score: 0,
  aids: { swap: true, call: true, twoAnswers: true },
});

const slotKey = (c: CategoryId, p: Points, s: "left" | "right") => `${c}-${p}-${s}`;

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      team1: freshTeam(),
      team2: freshTeam(),
      selectedCategories: [],
      currentTurn: 1,
      timerDuration: 60,
      usedQuestionIds: {},
      usedSlots: {},
      active: null,

      setTeamName: (n, name) =>
        set((s) => ({ [n === 1 ? "team1" : "team2"]: { ...(n === 1 ? s.team1 : s.team2), name } } as Partial<GameState>)),

      toggleCategory: (id) =>
        set((s) => {
          const exists = s.selectedCategories.includes(id);
          if (exists) return { selectedCategories: s.selectedCategories.filter((c) => c !== id) };
          if (s.selectedCategories.length >= 6) return {};
          return { selectedCategories: [...s.selectedCategories, id] };
        }),

      setTimerDuration: (d) => set({ timerDuration: d }),

      startGame: () =>
        set({
          team1: { ...get().team1, score: 0, aids: { swap: true, call: true, twoAnswers: true } },
          team2: { ...get().team2, score: 0, aids: { swap: true, call: true, twoAnswers: true } },
          currentTurn: 1,
          usedQuestionIds: {},
          usedSlots: {},
          active: null,
        }),

      pickQuestion: (categoryId, points, side) => {
        const { usedQuestionIds, usedSlots } = get();
        const key = slotKey(categoryId, points, side);
        if (usedSlots[key]) return false;
        const usedIds = new Set(Object.keys(usedQuestionIds));
        const q = pickRandomQuestion(categoryId, points, usedIds);
        if (!q) return false;
        set({ active: { categoryId, points, side, questionId: q.id } });
        return true;
      },

      swapActiveQuestion: () => {
        const { active, usedQuestionIds } = get();
        if (!active) return;
        const usedIds = new Set([...Object.keys(usedQuestionIds), active.questionId]);
        const q = pickRandomQuestion(active.categoryId, active.points, usedIds);
        if (q) set({ active: { ...active, questionId: q.id } });
      },

      awardPoints: (winner) => {
        const { active, currentTurn } = get();
        if (!active) return;
        const updates: Partial<GameState> = {
          usedQuestionIds: { ...get().usedQuestionIds, [active.questionId]: true },
          usedSlots: { ...get().usedSlots, [slotKey(active.categoryId, active.points, active.side)]: true },
          active: null,
          currentTurn: currentTurn === 1 ? 2 : 1,
        };
        if (winner === 1) updates.team1 = { ...get().team1, score: get().team1.score + active.points };
        else if (winner === 2) updates.team2 = { ...get().team2, score: get().team2.score + active.points };
        set(updates as GameState);
      },

      useAid: (team, aid) =>
        set((s) => {
          const t = team === 1 ? s.team1 : s.team2;
          if (!t.aids[aid]) return {};
          const updated = { ...t, aids: { ...t.aids, [aid]: false } };
          return { [team === 1 ? "team1" : "team2"]: updated } as Partial<GameState>;
        }),

      adjustScore: (team, delta) =>
        set((s) => {
          const t = team === 1 ? s.team1 : s.team2;
          return { [team === 1 ? "team1" : "team2"]: { ...t, score: Math.max(0, t.score + delta) } } as Partial<GameState>;
        }),

      endGame: () =>
        set({
          usedQuestionIds: {},
          usedSlots: {},
          active: null,
          currentTurn: 1,
          team1: { ...get().team1, score: 0, aids: { swap: true, call: true, twoAnswers: true } },
          team2: { ...get().team2, score: 0, aids: { swap: true, call: true, twoAnswers: true } },
        }),

      fullReset: () =>
        set({
          team1: freshTeam(),
          team2: freshTeam(),
          selectedCategories: [],
          currentTurn: 1,
          timerDuration: 60,
          usedQuestionIds: {},
          usedSlots: {},
          active: null,
        }),
    }),
    { name: "elkhen-game-state" },
  ),
);
