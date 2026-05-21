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
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled &&!selected}
      className={cn(
        "group relative w-full aspect-[4/5] rounded-2xl overflow-hidden",
        "flex flex-col", // 👈 عشان نقسم فوق وتحت
        "transition-all duration-200 bg-card",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        disabled &&!selected && "opacity-40 grayscale cursor-not-allowed"
      )}
    >
      {/* فوق - الصورة تملى المساحة */}
      <div className="relative flex-1 w-full">
        <img
          src={`/images/categories/${category.image}`}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* علامة الصح */}
        {selected && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center z-10 shadow">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* تحت - مربع ملون منفصل */}
      <div className={cn(
        "w-full py-2 px-2 text-center",
        "bg-gradient-to-r",
        category.color // 👈 اللون من الداتا
      )}>
        <h4 className="font-bold text-white text- sm:text- truncate">
          {category.name}
        </h4>
      </div>
    </button>
  );
}