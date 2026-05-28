import { useGameStore, type AidType } from "@/store/gameStore";
import { cn } from "@/lib/utils";
import { Repeat, Bomb, Hand, Bug, Minus, Plus } from "lucide-react";

interface Props {
  team: 1 | 2;
}

const AIDS: { key: AidType; icon: typeof Repeat; label: string }[] = [
  { key: "swap", icon: Repeat, label: "تبديل السؤال" },
  { key: "pit", icon: Bomb, label: "حفرة" },
  { key: "twoAnswers", icon: Hand, label: "إجابتين" },
  { key: "trap", icon: Bug, label: "فخ" },
];

export function TeamScoreBar({ team }: Props) {
  const teamData = useGameStore((s) => (team === 1? s.team1 : s.team2));
  const currentTurn = useGameStore((s) => s.currentTurn);
  const adjustScore = useGameStore((s) => s.adjustScore);
  const useAid = useGameStore((s) => s.useAid);
  const cancelPit = useGameStore((s) => s.cancelPit);
  const activePit = useGameStore((s) => s.activePit);
  const activeTrap = useGameStore((s) => s.activeTrap);
  const active = useGameStore((s) => s.active);
  const isTurn = currentTurn === team;
  const isBoard =!active;
  const isPitActive = activePit?.owner === team;
  const isTrapTarget = activeTrap && activeTrap.owner!== team;
  const isPitOwner = activePit?.owner === team;
  const isPitVictim = activePit && activePit.owner!== team;

  return (
    <div
      className={cn(
        "glass-strong rounded-2xl p-3 sm:p-4 flex items-center gap-3 transition-all",
        isTurn && "ring-2 ring-primary glow-primary",
        isTrapTarget && "ring-2 ring-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]",
        isPitOwner && "ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]",
        isPitVictim && "ring-2 ring-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.4)]",
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

      <div className="flex flex-col items-center gap-1 shrink-0">
        <span className="text- text-muted-foreground font-semibold whitespace-nowrap leading-none">
          وسائل المساعدة
        </span>
        <div className="flex gap-1.5">
          {AIDS.map(({ key, icon: Icon, label }) => {
            const available = teamData.aids[key];
            const isPit = key === "pit";

            if (isPit && isTurn && isBoard) {
              return (
                <button
                  key={key}
                  title={isPitActive? "إلغاء الحفرة" : "تفعيل الحفرة"}
                  onClick={() => isPitActive? cancelPit(team) : useAid(team, 'pit')}
                  className={cn(
                    "w-7 h-7 rounded-full glass flex items-center justify-center transition",
                    isPitActive? "text-red-400 ring-1 ring-red-400 animate-pulse" : available? "text-primary hover:bg-primary/20" : "opacity-30 grayscale",
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            }

            return (
              <div
                key={key}
                title={label}
                className={cn(
                  "w-7 h-7 rounded-full glass flex items-center justify-center",
                  available? "text-primary" : "opacity-30 grayscale",
                  isPit && isPitActive && "text-red-400 ring-1 ring-red-400",
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