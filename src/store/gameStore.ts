import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CategoryId } from "@/data/categories";
import type { Points } from "@/data/questions";
import { QUESTIONS } from "@/data/questions";

export type AidType = "swap" | "call" | "twoAnswers";

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
  questionQueues: Record<string, string[]>; // ده اللي هيحفظ الدور بين الألعاب

  theme: 'default' | 'pharaonic' | 'ramadan' | 'eid' | 'worldcup' | 'neon' | 'winter';
  setTheme: (t: GameState['theme']) => void;

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
const queueKey = (c: CategoryId, p: Points) => `${c}-${p}`;

function shuffle<T>(arr: T[], avoidFirst?: string): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (avoidFirst && a.length > 1 && String(a[0]) === avoidFirst) {
    [a[0], a[1]] = [a[1], a[0]];
  }
  return a;
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
        set((s) => ({
          // مهم: ما بنمسحش questionQueues هنا
          team1: {...s.team1, score: 0, aids: { swap: true, call: true, twoAnswers: true } },
          team2: {...s.team2, score: 0, aids: { swap: true, call: true, twoAnswers: true } },
          currentTurn: 1,
          usedSlots: {},
          active: null,
        })),

      pickQuestion: (categoryId, points, side) => {
        const { usedSlots, questionQueues } = get();
        const key = slotKey(categoryId, points, side);
        if (usedSlots[key]) return false;

        const qk = queueKey(categoryId, points);
        const pool = QUESTIONS[categoryId]?.[points] || [];
        if (!pool.length) return false;

        let queue = questionQueues[qk] || [];
        if (queue.length === 0) {
          queue = shuffle(pool.map(q => q.id)); // دورة كاملة جديدة
        }

        const nextId = queue.shift()!;
        set({
          active: { categoryId, points, side, questionId: nextId },
          questionQueues: {...questionQueues, [qk]: queue }
        });
        return true;
      },

      swapActiveQuestion: () => {
        const { active, questionQueues } = get();
        if (!active) return;

        const qk = queueKey(active.categoryId, active.points);
        const pool = QUESTIONS[active.categoryId]?.[active.points] || [];
        let queue = [...(questionQueues[qk] || []), active.questionId];

        if (queue.length <= 1) {
          const fresh = pool.map(q => q.id).filter(id => id!== active.questionId);
          queue = fresh.length? fresh : pool.map(q => q.id);
        }
        queue = shuffle(queue, active.questionId);

        const nextId = queue.shift()!;
        set({
          active: {...active, questionId: nextId },
          questionQueues: {...questionQueues, [qk]: queue }
        });
      },

      awardPoints: (winner) => {
        const { active, currentTurn } = get();
        if (!active) return;
        const updates: Partial<GameState> = {
          usedSlots: {...get().usedSlots, [slotKey(active.categoryId, active.points, active.side)]: true },
          active: null,
          currentTurn: currentTurn === 1? 2 : 1,
        };
        if (winner === 1) updates.team1 = {...get().team1, score: get().team1.score + active.points };
        else if (winner === 2) updates.team2 = {...get().team2, score: get().team2.score + active.points };
        set(updates as GameState);
      },

      useAid: (team, aid) =>
        set((s) => {
          const t = team === 1? s.team1 : s.team2;
          if (!t.aids[aid]) return {};
          return { [team === 1? "team1" : "team2"]: {...t, aids: {...t.aids, [aid]: false } } } as Partial<GameState>;
        }),

      adjustScore: (team, delta) =>
        set((s) => {
          const t = team === 1? s.team1 : s.team2;
          return { [team === 1? "team1" : "team2"]: {...t, score: Math.max(0, t.score + delta) } } as Partial<GameState>;
        }),

      endGame: () =>
        set((s) => ({
          // بنفضي البورد بس، والـ queues تفضل زي ما هي
          usedSlots: {},
          active: null,
          currentTurn: 1,
          team1: {...s.team1, score: 0, aids: { swap: true, call: true, twoAnswers: true } },
          team2: {...s.team2, score: 0, aids: { swap: true, call: true, twoAnswers: true } },
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
          questionQueues: {}, // هنا بس بنمسح كل حاجة فعلا
        }),
    }),
    { name: "elkhen-game-state" },
  ),
);