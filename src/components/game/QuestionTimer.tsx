import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  duration: number; // seconds
  onTimeUp?: () => void;
  isReady?: boolean; // ← جديد
}

export function QuestionTimer({ duration, onTimeUp, isReady = true }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(false); // ← بقى false
  const ref = useRef<number | null>(null);
  const firedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // حضر الصوت مرة واحدة
  useEffect(() => {
    audioRef.current = new Audio("/sounds/tick.mp3");
    audioRef.current.volume = 0.5;
  }, []);

  // ← جديد: شغّل لما الصورة تجهز
  useEffect(() => {
    if (isReady) {
      firedRef.current = false;
      setRemaining(duration);
      setRunning(true);
    } else {
      setRunning(false);
    }
  }, [isReady, duration]);

  useEffect(() => {
    if (!running || !isReady) return;
    ref.current = window.setInterval(() => {
      setRemaining((r) => {
        const next = r <= 1 ? 0 : r - 1;

        // شغل صوت tick آخر 5 ثواني
        if (next <= 5 && next > 0 && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }

        if (next === 0) {
          if (!firedRef.current) { firedRef.current = true; onTimeUp?.(); }
        }
        return next;
      });
    }, 1000);
    return () => { if (ref.current) window.clearInterval(ref.current); };
  }, [running, onTimeUp, isReady]);

  // اسمع إيفنت إعادة التايمر من الوسائل
  useEffect(() => {
    const resetTimer = () => { firedRef.current = false; setRemaining(duration); setRunning(isReady); };
    window.addEventListener('aid-used-reset-timer', resetTimer);
    return () => window.removeEventListener('aid-used-reset-timer', resetTimer);
  }, [duration, isReady]);

  const reset = () => { firedRef.current = false; setRemaining(duration); setRunning(isReady); };
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