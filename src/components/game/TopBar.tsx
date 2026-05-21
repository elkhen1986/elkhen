import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { LogOut, LayoutGrid, Flag, Sparkles, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ThemeSelector } from "../ThemeSelector";

interface Props {
  showBackToBoard?: boolean;
}

export function TopBar({ showBackToBoard }: Props) {
  const navigate = useNavigate();
  const currentTurn = useGameStore((s) => s.currentTurn);
  const team = useGameStore((s) => (s.currentTurn === 1 ? s.team1 : s.team2));
  const endGame = useGameStore((s) => s.endGame);
  const fullReset = useGameStore((s) => s.fullReset);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="glass-strong rounded-2xl px-3 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-4 flex-wrap">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-black text-gradient-primary hidden sm:inline">Elkhen</span>
      </Link>

      <div className="flex items-center gap-2 mr-auto sm:mr-0 sm:order-3">
        {/* الثيم + فول سكرين للديسكتوب */}
        <div className="hidden sm:flex items-center gap-1">
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            aria-label={isFullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          <ThemeSelector />
        </div>
        
        {showBackToBoard && (
          <Button variant="ghost" size="sm" onClick={() => navigate("/board")} className="gap-1.5">
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">الرجوع للوحة</span>
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <Flag className="w-4 h-4" />
              <span className="hidden sm:inline">انتهاء اللعبة</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="glass-strong">
            <AlertDialogHeader>
              <AlertDialogTitle>إنهاء اللعبة؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم إعادة تصفير الدرجات والأسئلة المستخدمة. هل أنت متأكد؟
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={() => { endGame(); navigate("/board"); }}>
                إنهاء
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="ghost" size="sm" onClick={() => { fullReset(); navigate("/"); }} className="gap-1.5 text-destructive hover:text-destructive">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">الخروج</span>
        </Button>
      </div>

      <div className="flex-1 sm:flex-none sm:mx-auto order-2 flex items-center gap-2 justify-center">
        <span className="text-xs sm:text-sm text-muted-foreground">دور:</span>
        <span className="px-3 py-1 rounded-full bg-gradient-primary text-primary-foreground font-bold text-sm sm:text-base animate-pulse-glow">
          {team.name || `الفريق ${currentTurn}`}
        </span>
      </div>

      {/* للموبايل: الثيم + فول سكرين تحت */}
      <div className="w-full sm:hidden flex justify-center items-center gap-2 pt-1">
        <Button
          onClick={toggleFullscreen}
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          aria-label={isFullscreen ? "خروج من ملء الشاشة" : "ملء الشاشة"}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </Button>
        <ThemeSelector />
      </div>
    </header>
  );
}