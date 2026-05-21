import { useGameStore, type AidType } from "@/store/gameStore";
import { cn } from "@/lib/utils";
import { Repeat, Phone, Hand, Minus, Plus } from "lucide-react";

interface Props {
  team: 1 | 2;
}

const AIDS: { key: AidType; icon: typeof Repeat; label: string }[] = [
  { key: "swap", icon: Repeat, label: "تبديل السؤال" },
  { key: "call", icon: Phone, label: "اتصال بصديق" },
  { key: "twoAnswers", icon: Hand, label: "إجابتين" },
];

export function TeamScoreBar({ team }: Props) {
  const teamData = useGameStore((s) => (team === 1? s.team1 : s.team2));
  const currentTurn = useGameStore((s) => s.currentTurn);
  const adjustScore = useGameStore((s) => s.adjustScore);
  const isTurn = currentTurn === team;

  return (
    <div
      className={cn(
        "glass-strong rounded-2xl p-3 sm:p-4 flex items-center gap-3 transition-all",
        isTurn && "ring-2 ring-primary glow-primary",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 min-w-0">
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full shrink-0",
            isTurn? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            فريق {team}
          </span>
          <h3 className="font-bold whitespace-nowrap overflow-hidden leading-tight text-[clamp(0.7rem,3.5vw,1rem)]">
            {teamData.name || `الفريق ${team}`}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustScore(team, -100)}
            className="w-7 h-7 rounded-full bg-destructive/20 hover:bg-destructive/40 text-destructive flex items-center justify-center transition shrink-0"
            aria-label="إنقاص"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="font-black text-gradient-gold text-center shrink-0 tabular-nums leading-none text-[clamp(1.25rem,6vw,1.875rem)] min-w-">
            {teamData.score}
          </div>

          <button
            onClick={() => adjustScore(team, 100)}
            className="w-7 h-7 rounded-full bg-success/20 hover:bg-success/40 text-success flex items-center justify-center transition shrink-0"
            aria-label="زيادة"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* وسائل المساعدة */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className="text- text-muted-foreground font-semibold whitespace-nowrap leading-none">
          وسائل المساعدة
        </span>
        <div className="flex gap-1.5">
          {AIDS.map(({ key, icon: Icon, label }) => {
            const available = teamData.aids[key];
            return (
              <div
                key={key}
                title={label}
                className={cn(
                  "w-7 h-7 rounded-full glass flex items-center justify-center",
                  available? "text-primary" : "opacity-30 grayscale",
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}