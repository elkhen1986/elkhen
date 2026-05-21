import type { CategoryGroup } from "@/data/categories";
import { CategoryCard } from "./CategoryCard";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";

export function CategoryGroupSection({ group }: { group: CategoryGroup }) {
  const selectedCategories = useGameStore((s) => s.selectedCategories);
  const toggleCategory = useGameStore((s) => s.toggleCategory);
  const limitReached = selectedCategories.length >= 6;

  return (
    <section className="relative mb-8 group/section">
      {/* وهج خلفي بلون المجموعة */}
      <div
        className={cn(
          "absolute -inset-1 rounded-[1.8rem] blur-2xl opacity-15 group-hover/section:opacity-25 transition-opacity duration-500",
          "bg-gradient-to-r",
          group.color
        )}
      />

      {/* المربع اللي بيحاوط كل الفئات */}
      <div className="relative p-5 sm:p-6 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl">
        {/* العنوان مع الخط */}
        <div className="flex items-center gap-3 mb-5">
          <div className={cn("h-1 w-8 rounded-full bg-gradient-to-r", group.color)} />
          <h3
            className={cn(
              "text-lg sm:text-xl font-bold whitespace-nowrap",
              "bg-clip-text text-transparent bg-gradient-to-r",
              group.color
            )}
          >
            {group.title}
          </h3>
          <div
            className={cn(
              "flex-1 h- rounded-full bg-gradient-to-r opacity-70",
              group.color
            )}
          />
        </div>

        {/* شبكة الفئات */}
        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 sm:gap-4">
          {group.categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              selected={selectedCategories.includes(cat.id)}
              disabled={limitReached &&!selectedCategories.includes(cat.id)}
              onClick={() => toggleCategory(cat.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}