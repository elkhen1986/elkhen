import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { CATEGORY_GROUPS } from "@/data/categories";
import { CategoryGroupSection } from "@/components/game/CategoryGroupSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Users2, Timer, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/ThemeSelector";

const Index = () => {
  const navigate = useNavigate();
  const team1 = useGameStore((s) => s.team1);
  const team2 = useGameStore((s) => s.team2);
  const setTeamName = useGameStore((s) => s.setTeamName);
  const selectedCategories = useGameStore((s) => s.selectedCategories);
  const timerDuration = useGameStore((s) => s.timerDuration);
  const setTimerDuration = useGameStore((s) => s.setTimerDuration);
  const startGame = useGameStore((s) => s.startGame);

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
      console.error("Fullscreen error:", e);
    }
  };

  const canStart = team1.name.trim().length > 0 && team2.name.trim().length > 0 && selectedCategories.length === 6;

  const handleStart = () => {
    if (!canStart) return;
    startGame();
    navigate("/board");
  };

  return (
    <div className="min-h-screen relative z-10 px-3 sm:px-6 py-6 sm:py-10">
      <div className="absolute top-4 left-4 z-50">
        <ThemeSelector />
      </div>

      <div className="absolute top-4 right-4 z-50">
        <Button
          onClick={toggleFullscreen}
          variant="outline"
          size="icon"
          className="glass rounded-full w-10 h-10"
          aria-label={isFullscreen ? "الخروج من ملء الشاشة" : "ملء الشاشة"}
        >
          {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-3 animate-fade-in">
          <div className="inline-flex items-center gap-3 glass rounded-full px-5 py-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold text-muted-foreground">خلك قد التحدي</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black text-gradient-primary tracking-tight">
            Elkhen
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
             فكر... العب... استمتع
          </p>
        </header>

        <section className="glass-strong rounded-3xl p-5 sm:p-7 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">أسماء الفرق</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">الفريق 1</label>
              <Input
                value={team1.name}
                onChange={(e) => setTeamName(1, e.target.value)}
                placeholder="مثال : حمودة"
                className="glass border-primary/30 h-12 text-base font-bold focus-visible:ring-primary"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">الفريق 2</label>
              <Input
                value={team2.name}
                onChange={(e) => setTeamName(2, e.target.value)}
                placeholder="مثال : الخن"
                className="glass border-primary/30 h-12 text-base font-bold focus-visible:ring-primary"
                maxLength={20}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <Timer className="w-5 h-5 text-primary" />
            <span className="text-sm font-bold">مدة المؤقت لكل سؤال :</span>
            <div className="flex gap-2">
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setTimerDuration(d as 30 | 60 | 90)}
                  className={cn(
                    "px-4 py-1.5 rounded-full font-bold text-sm transition",
                    timerDuration === d
                     ? "bg-gradient-primary text-primary-foreground glow-primary"
                      : "glass text-muted-foreground hover:text-foreground"
                  )}
                >
                  {d} ثانية
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-2xl font-bold">اختر <span className="text-gradient-gold">6 فئات</span></h2>
            <div className={cn(
              "px-4 py-1.5 rounded-full font-black text-sm transition",
              selectedCategories.length === 6
               ? "bg-success/20 text-success ring-1 ring-success"
                : "glass text-muted-foreground"
            )}>
              {selectedCategories.length} / 6
            </div>
          </div> {/* ← دي كانت ناقصة */}
          
          <div className="space-y-6">
            {CATEGORY_GROUPS.map((group) => (
              <CategoryGroupSection key={group.title} group={group} />
            ))}
          </div>
        </section>

        <div className="sticky bottom-4 z-20 pt-2 animate-fade-in">
          <Button
            onClick={handleStart}
            disabled={!canStart}
            size="lg"
            className={cn(
              "w-full h-16 text-xl font-black rounded-2xl",
              "bg-gradient-primary text-primary-foreground",
              canStart ? "glow-primary animate-pulse-glow hover:scale-[1.02]" : "opacity-50",
            )}
          >
            {canStart ? "ابدأ اللعبة 🚀" : `أكمل البيانات لتفعيل الزر`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;