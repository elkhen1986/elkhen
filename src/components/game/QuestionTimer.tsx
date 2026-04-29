import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  duration: number; // seconds
  onTimeUp?: () => void;
}

export function QuestionTimer({ duration, onTimeUp }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(true);
  const ref = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    ref.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (!firedRef.current) { firedRef.current = true; onTimeUp?.(); }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => { if (ref.current) window.clearInterval(ref.current); };
  }, [running, onTimeUp]);

  const reset = () => { firedRef.current = false; setRemaining(duration); setRunning(true); };
  const minutes = Math.floor(remaining / 60).toString().padStart(2, "0");
  const seconds = (remaining % 60).toString().padStart(2, "0");
  const danger = remaining <= 10 && remaining > 0;

  return (
    <div className={cn(
      "glass-strong rounded-full px-4 py-2 flex items-center gap-3",
      danger && "ring-2 ring-destructive animate-pulse",
    )}>
      <button onClick={() => setRunning((r) => !r)} className="text-foreground hover:text-primary transition">
        {running ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>
      <span className={cn(
        "text-xl sm:text-2xl font-black tabular-nums",
        danger ? "text-destructive" : "text-foreground"
      )}>
        {minutes}:{seconds}
      </span>
      <button onClick={reset} className="text-foreground hover:text-primary transition" aria-label="إعادة">
        <RotateCcw className="w-5 h-5" />
      </button>
    </div>
  );
}
