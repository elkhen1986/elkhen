import { QUESTIONS, type Points, type Question } from "@/data/questions";
import type { CategoryId } from "@/data/categories";

export function pickRandomQuestion(
  categoryId: CategoryId,
  points: Points,
  usedIds: Set<string>,
): Question | null {
  const bank = QUESTIONS[categoryId]?.[points] ?? [];
  const available = bank.filter((q) => !usedIds.has(q.id));
  if (available.length === 0) {
    // fallback: allow repeats only if all consumed
    if (bank.length === 0) return null;
    return bank[Math.floor(Math.random() * bank.length)];
  }
  return available[Math.floor(Math.random() * available.length)];
}
