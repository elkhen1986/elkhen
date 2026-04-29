import type { CategoryGroup } from "@/data/categories";
import { CategoryCard } from "./CategoryCard";
import { useGameStore } from "@/store/gameStore";

export function CategoryGroupSection({ group }: { group: CategoryGroup }) {
  const selectedCategories = useGameStore((s) => s.selectedCategories);
  const toggleCategory = useGameStore((s) => s.toggleCategory);
  const limitReached = selectedCategories.length >= 6;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-1 w-8 rounded-full bg-gradient-primary" />
        <h3 className="text-lg sm:text-xl font-bold text-gradient-primary">{group.title}</h3>
        <div className="flex-1 h-px bg-border/50" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {group.categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            selected={selectedCategories.includes(cat.id)}
            disabled={limitReached}
            onClick={() => toggleCategory(cat.id)}
          />
        ))}
      </div>
    </section>
  );
}
