import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { TopBar } from "@/components/game/TopBar";
import { TeamScoreBar } from "@/components/game/TeamScoreBar";
import { QuestionTimer } from "@/components/game/QuestionTimer";
import { QUESTIONS } from "@/data/questions";
import { getCategory } from "@/data/categories";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Question() {
  const navigate = useNavigate();
  const active = useGameStore((s) => s.active);
  const team1 = useGameStore((s) => s.team1);
  const team2 = useGameStore((s) => s.team2);
  const timerDuration = useGameStore((s) => s.timerDuration);
  const awardPoints = useGameStore((s) => s.awardPoints);
  const swapActiveQuestion = useGameStore((s) => s.swapActiveQuestion);
  const useAid = useGameStore((s) => s.useAid);
  const currentTurn = useGameStore((s) => s.currentTurn);

  const [answerOpen, setAnswerOpen] = useState(false);

  useEffect(() => {
    if (!active) navigate("/board", { replace: true });
  }, [active, navigate]);

  const question = useMemo(() => {
    if (!active) return null;
    return QUESTIONS[active.categoryId][active.points].find((q) => q.id === active.questionId) ?? null;
  }, [active]);

  if (!active || !question) return null;

  const cat = getCategory(active.categoryId);

  const handleWinner = (winner: 1 | 2 | 0) => {
    awardPoints(winner);
    navigate("/board");
  };

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6 relative z-10 flex flex-col gap-4">
      <TopBar showBackToBoard />

      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* Main question area */}
        <div className="flex-1 glass-strong rounded-3xl p-4 sm:p-6 lg:p-8 flex flex-col gap-4 animate-fade-in">
          {/* Header strip: points + timer */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="px-4 py-2 rounded-2xl bg-gradient-gold text-accent-foreground font-black text-lg sm:text-xl glow-gold">
              {active.points} نقطة
            </div>
            <QuestionTimer duration={timerDuration} />
            <div className="px-3 py-1.5 rounded-full glass text-sm font-bold">
              {cat?.name}
            </div>
          </div>

          {/* Question text */}
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-4">
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-black leading-relaxed max-w-3xl">
              {question.text}
            </h2>

            {question.image && (
              <img src={question.image} alt="سؤال" className="max-h-64 sm:max-h-80 rounded-2xl border border-border object-contain" />
            )}

            {question.audio && (
              <audio controls className="w-full max-w-md">
                <source src={question.audio} />
              </audio>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              onClick={() => setAnswerOpen(true)}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 font-bold text-lg h-14 glow-primary"
            >
              إظهار الإجابة
            </Button>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <Button
                onClick={() => handleWinner(1)}
                className="bg-success/90 hover:bg-success text-success-foreground font-bold h-12 sm:h-14"
              >
                {team1.name || "الفريق 1"}
              </Button>
              <Button
                onClick={() => handleWinner(0)}
                variant="secondary"
                className="font-bold h-12 sm:h-14"
              >
                لا أحد
              </Button>
              <Button
                onClick={() => handleWinner(2)}
                className="bg-success/90 hover:bg-success text-success-foreground font-bold h-12 sm:h-14"
              >
                {team2.name || "الفريق 2"}
              </Button>
            </div>
          </div>
        </div>

        {/* Side panel: aids */}
        <aside className="lg:w-72 flex flex-col gap-3">
          <div className="glass rounded-2xl p-4">
            <h4 className="font-bold mb-3 text-center text-sm text-muted-foreground">
              وسائل المساعدة — دور {currentTurn === 1 ? team1.name || "ف1" : team2.name || "ف2"}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                disabled={!(currentTurn === 1 ? team1 : team2).aids.swap}
                onClick={() => { useAid(currentTurn, "swap"); swapActiveQuestion(); }}
                className="flex-col h-auto py-3"
              >
                <span className="text-2xl">🔄</span>
                <span className="text-xs mt-1">تبديل</span>
              </Button>
              <Button
                variant="outline"
                disabled={!(currentTurn === 1 ? team1 : team2).aids.call}
                onClick={() => useAid(currentTurn, "call")}
                className="flex-col h-auto py-3"
              >
                <span className="text-2xl">📞</span>
                <span className="text-xs mt-1">اتصال</span>
              </Button>
              <Button
                variant="outline"
                disabled={!(currentTurn === 1 ? team1 : team2).aids.twoAnswers}
                onClick={() => useAid(currentTurn, "twoAnswers")}
                className="flex-col h-auto py-3"
              >
                <span className="text-2xl">✌️</span>
                <span className="text-xs mt-1">إجابتين</span>
              </Button>
            </div>
          </div>
          <TeamScoreBar team={1} />
          <TeamScoreBar team={2} />
        </aside>
      </div>

      <Dialog open={answerOpen} onOpenChange={setAnswerOpen}>
        <DialogContent className="glass-strong border-primary/40 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl text-gradient-gold text-center">الإجابة الصحيحة</DialogTitle>
            <DialogDescription className="text-center text-lg sm:text-xl text-foreground py-6 leading-relaxed">
              {question.answer}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
