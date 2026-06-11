import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type AidInfo = {
  id: "swap" | "pit" | "twoAnswers" | "trap" | "freeze" | "shield";
  name: string;
  desc: string;
  icon: string;
  color: string;
};

export function AidCard({
  aid,
  selected,
  disabled,
  onClick
}: {
  aid: AidInfo;
  selected: boolean;
  disabled: boolean;
  onClick: () => void
}) {
  // يقبل /aids/swap.png أو aids/swap.png أو http...
  const isImage = /\.(png|jpg|jpeg|webp|svg)$/i.test(aid.icon);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled &&!selected}
      className={cn(
        "group relative w-full aspect-[4/5] rounded-2xl overflow-hidden flex flex-col transition-all duration-200 bg-black/40 backdrop-blur-2xl border border-white/15",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        disabled &&!selected && "opacity-40 grayscale cursor-not-allowed",
      !disabled && "hover:scale-[1.02] hover:border-white/30"
      )}
    >
      {/* الصورة - 70% من الكارت */}
      <div className="relative h-[70%] w-full flex items-center justify-center bg-black/20 overflow-hidden">
        {isImage? (
          <img
            src={aid.icon.startsWith('/')? aid.icon : `/${aid.icon}`}
            alt={aid.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="text-5xl transition-transform duration-200 group-hover:scale-110">
            {aid.icon}
          </div>
        )}

        {selected && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center z-10 shadow-lg ring-2 ring-white/30">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
        )}
      </div>

      {/* الكلام - 30% ثابت */}
      <div className={cn("h-[30%] w-full flex flex-col items-center justify-center px-2 text-center bg-gradient-to-r", aid.color)}>
        <h4 className="font-bold text-white text-sm leading-tight">{aid.name}</h4>
        <p className="text-[11px] text-white/90 leading-tight mt-0.5">{aid.desc}</p>
      </div>
    </button>
  );
}
