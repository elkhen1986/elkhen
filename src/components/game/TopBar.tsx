import { Link, useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { LogOut, LayoutGrid, Flag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  showBackToBoard?: boolean;
}

export function TopBar({ showBackToBoard }: Props) {
  const navigate = useNavigate();
  const currentTurn = useGameStore((s) => s.currentTurn);
  const team = useGameStore((s) => (s.currentTurn === 1 ? s.team1 : s.team2));
  const endGame = useGameStore((s) => s.endGame);
  const fullReset = useGameStore((s) => s.fullReset);

  return (
    <header className="glass-strong rounded-2xl px-3 sm:px-5 py-2.5 flex items-center gap-2 sm:gap-4 flex-wrap">
      <Link to="/" className="flex items-center gap-2 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center glow-primary">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-black text-gradient-primary hidden sm:inline">Elkhen</span>
      </Link>

      <div className="flex items-center gap-2 mr-auto sm:mr-0 sm:order-3">
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
    </header>
  );
}
