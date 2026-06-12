import { useGameStore, type AidType } from "@/store/gameStore";
import { cn } from "@/lib/utils";
import { Repeat, Bomb, Hand, Bug, Minus, Plus, Snowflake, Shield } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  team: 1 | 2;
}

const AIDS: { key: AidType; icon: typeof Repeat; label: string }[] = [
  { key: "swap", icon: Repeat, label: "تبديل السؤال" },
  { key: "pit", icon: Bomb, label: "حفرة" },
  { key: "twoAnswers", icon: Hand, label: "إجابتين" },
  { key: "trap", icon: Bug, label: "فخ" },
  { key: "freeze", icon: Snowflake, label: "تجميد" },
  { key: "shield", icon: Shield, label: "درع" },
];

export function TeamScoreBar({ team }: Props) {
  const teamData = useGameStore((s) => (team === 1? s.team1 : s.team2));
  const opponentData = useGameStore((s) => (team === 1? s.team2 : s.team1));
  const currentTurn = useGameStore((s) => s.currentTurn);
  const adjustScore = useGameStore((s) => s.adjustScore);
  const useAid = useGameStore((s) => s.useAid);
  const cancelPit = useGameStore((s) => s.cancelPit);
  const activePit = useGameStore((s) => s.activePit);
  const activeTrap = useGameStore((s) => s.activeTrap);
  const activeFreeze = useGameStore((s) => s.activeFreeze);
  const active = useGameStore((s) => s.active);
  const shieldUnlocked = useGameStore((s) => s.shieldUnlocked);

  const [shieldTimer, setShieldTimer] = useState(0);

  const isTurn = currentTurn === team;
  const isBoard =!active;
  const isPitActive = activePit?.owner === team;
  const isTrapTarget = activeTrap && activeTrap.owner!== team;
  const isPitOwner = activePit?.owner === team;
  const isPitVictim = activePit && activePit.owner!== team;
  const isFreezeActive = activeFreeze?.owner === team;
  const hasShield = teamData.shieldActive;
  const opponentHasShield = opponentData.shieldActive;
  const isFrozen =!!activeFreeze && activeFreeze.owner!== team;
  const selectedAids = teamData.selectedAids || [];

  const isOpponent =!isTurn;
  const showShieldTimer = isOpponent && active && teamData.aids.shield &&!shieldUnlocked;

  // تايمر الدرع للخصم
  useEffect(() => {
    if (showShieldTimer) {
      setShieldTimer(10);
      const interval = setInterval(() => {
        setShieldTimer((t) => {
          if (t <= 1 || shieldUnlocked) {
            clearInterval(interval);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setShieldTimer(0);
    }
  }, [active?.questionId, showShieldTimer, shieldUnlocked]);

  return (
    <div
      className={cn(
        "relative glass-strong rounded-2xl p-3 sm:p-4 flex items-center gap-3 transition-all",
        isTurn && "ring-2 ring-primary glow-primary",
        isTrapTarget && "ring-2 ring-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]",
        isPitOwner && "ring-2 ring-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]",
        isPitVictim && "ring-2 ring-red-500/70 shadow-[0_0_15px_rgba(239,68,68,0.4)]",
        hasShield && "ring-2 ring-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]",
        isFreezeActive && "ring-2 ring-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)]",
        isFrozen && "ring-2 ring-white/70 opacity-60 grayscale",
      )}
    >
      {isFrozen && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_10px,rgba(255,255,255,0.12)_10px,rgba(255,255,255,0.12)_14px)]" />
        </div>
      )}
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center gap-2 mb-1 min-w-0">
          <span className={cn(
            "text-xs font-bold px-2 py-0.5 rounded-full shrink-0 truncate max-w-",
            isTurn? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}>
            {teamData.name || `الفريق ${team}`}
          </span>
          {hasShield && <Shield className="w-3.5 h-3.5 text-violet-400 animate-pulse" />}
          {isFreezeActive && <Snowflake className="w-3.5 h-3.5 text-sky-400 animate-pulse" />}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => adjustScore(team, -100)}
            disabled={isFrozen}
            className="w-7 h-7 rounded-full bg-destructive/20 hover:bg-destructive/40 text-destructive flex items-center justify-center transition shrink-0 disabled:opacity-30"
            aria-label="إنقاص"
          >
            <Minus className="w-4 h-4" />
          </button>

          <div className="font-black text-gradient-gold text-center shrink-0 tabular-nums leading-none text-[clamp(1.25rem,6vw,1.875rem)] min-w-">
            {teamData.score}
          </div>

          <button
            onClick={() => adjustScore(team, 100)}
            disabled={isFrozen}
            className="w-7 h-7 rounded-full bg-success/20 hover:bg-success/40 text-success flex items-center justify-center transition shrink-0 disabled:opacity-30"
            aria-label="زيادة"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-1 shrink-0 relative z-10">
        <span className="text- text-muted-foreground font-semibold whitespace-nowrap leading-none">
          وسائل المساعدة
        </span>
        <div className="flex gap-1.5">
          {AIDS.filter(({key}) => selectedAids.includes(key)).map(({ key, icon: Icon, label }) => {
            const available = teamData.aids[key];
            const isPit = key === "pit";
            const isShield = key === "shield";
            const isFreeze = key === "freeze";
            const blockedByShield = (key === "trap" || key === "freeze") && opponentHasShield;
            const usedOnce = teamData.usedAidThisTurn;

            if (!available &&!isPitActive && key!== "pit") {}

            if (isPit && isTurn && isBoard) {
              return (
                <button
                  key={key}
                  title={isPitActive? "إلغاء الحفرة" : "تفعيل الحفرة"}
                  onClick={() => isPitActive? cancelPit(team) : useAid(team, 'pit')}
                  disabled={(!available &&!isPitActive) || isFrozen || usedOnce}
                  className={cn(
                    "w-7 h-7 rounded-full glass flex items-center justify-center transition relative",
                    isPitActive? "text-red-400 ring-1 ring-red-400 animate-pulse" : available &&!usedOnce? "text-primary hover:bg-primary/20" : "opacity-30 grayscale cursor-not-allowed",
                  )}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            }

            const canUse = isShield
          ? (!isTurn &&!!active && available && shieldUnlocked &&!usedOnce)
              : isFreeze
          ? (isTurn &&!!active && available &&!usedOnce)
              : (key === 'swap' || key === 'twoAnswers' || key === 'trap')
          ? (isTurn &&!!active && available &&!usedOnce)
              : false;

            const isShieldTimerActive = isShield && showShieldTimer && shieldTimer > 0;

            return (
              <button
                key={key}
                title={!shieldUnlocked && isShield? "الدرع بعد 10 ثواني" : blockedByShield? "الخصم مفعل درع" : usedOnce? "وسيلة واحدة في الدور" : label}
                onClick={() => available &&!blockedByShield && canUse && useAid(team, key)}
                disabled={!available || blockedByShield ||!canUse || isFrozen}
                className={cn(
                  "w-7 h-7 rounded-full glass flex items-center justify-center transition relative",
                  available &&!blockedByShield && canUse &&!isFrozen? "text-primary hover:bg-primary/20 cursor-pointer" : isShieldTimerActive? "" : "opacity-30 grayscale cursor-not-allowed",
                  isShield && hasShield && "text-violet-400 ring-1 ring-violet-400",
                  isFreeze && isFreezeActive && "text-sky-400 ring-1 ring-sky-400",
                )}
                style={{ overflow: 'visible' }}
              >
                <Icon className="w-4 h-4" />

                {/* تايمر الدرع للخصم - أحمر متوهج */}
                {isShieldTimerActive && (
                  <div
                    className="absolute animate-pulse"
                    style={{
                      top: '-8px',
                      right: '-8px',
                      width: '22px',
                      height: '22px',
                      backgroundColor: 'rgba(153, 27, 0.95)',
                      borderRadius: '50%',
                      border: '2px solid #ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 12px #ef4444, 0 0 24px rgba(239, 68, 68, 0.8), 0 0 36px rgba(220, 38, 38, 0.6)',
                      backdropFilter: 'blur(2px)',
                      zIndex: 50,
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '900',
                        color: '#fecaca',
                        lineHeight: '1',
                        textShadow: '0 0 6px #ef4444, 0 0 12px #dc2626',
                      }}
                    >
                      {shieldTimer}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
