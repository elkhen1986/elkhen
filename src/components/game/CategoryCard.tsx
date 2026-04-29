import type { Category } from "@/data/categories";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  category: Category;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function CategoryCard({ category, selected, disabled, onClick }: Props) {
  const Icon = category.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled && !selected}
      className={cn(
        "group relative glass rounded-2xl p-4 sm:p-5 hover-lift text-right",
        "flex items-center gap-3 w-full overflow-hidden",
        selected && "ring-2 ring-primary glow-primary border-primary/60",
        disabled && !selected && "opacity-30 cursor-not-allowed grayscale",
      )}
    >
      <div
        className={cn(
          "shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br flex items-center justify-center",
          category.color,
          "shadow-lg",
        )}
      >
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" strokeWidth={2.2} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-base sm:text-lg text-foreground truncate">{category.name}</h4>
      </div>
      {selected && (
        <div className="shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center animate-scale-in">
          <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
        </div>
      )}
    </button>
  );
}
