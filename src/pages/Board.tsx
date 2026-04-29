import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { getCategory } from "@/data/categories";
import { POINTS_VALUES, type Points } from "@/data/questions";
import { TopBar } from "@/components/game/TopBar";
import { TeamScoreBar } from "@/components/game/TeamScoreBar";
import { cn } from "@/lib/utils";

export default function Board() {
  const navigate = useNavigate();
  const selectedCategories = useGameStore((s) => s.selectedCategories);
  const team1 = useGameStore((s) => s.team1);
  const team2 = useGameStore((s) => s.team2);
  const usedSlots = useGameStore((s) => s.usedSlots);
  const pickQuestion = useGameStore((s) => s.pickQuestion);

  useEffect(() => {
    if (selectedCategories.length !== 6 || !team1.name || !team2.name) {
      navigate("/", { replace: true });
    }
  }, [selectedCategories, team1.name, team2.name, navigate]);

  const handlePick = (catId: typeof selectedCategories[number], pts: Points, side: "left" | "right") => {
    const ok = pickQuestion(catId, pts, side);
    if (ok) navigate("/question");
  };

  return (
    <div className="min-h-screen p-3 sm:p-4 lg:p-6 relative z-10 flex flex-col gap-4">
      <TopBar />

      <main className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 animate-fade-in">
        {selectedCategories.map((catId) => {
          const cat = getCategory(catId);
          if (!cat) return null;
          const Icon = cat.icon;
          return (
            <div key={catId} className="glass-strong rounded-2xl p-3 sm:p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0", cat.color)}>
                  <Icon className="w-6 h-6 text-white" strokeWidth={2.2} />
                </div>
                <h3 className="font-black text-base sm:text-lg flex-1 truncate">{cat.name}</h3>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                {/* Right side */}
                <div className="flex flex-col gap-2">
                  {POINTS_VALUES.map((pts) => {
                    const used = usedSlots[`${catId}-${pts}-right`];
                    return (
                      <button
                        key={`r-${pts}`}
                        onClick={() => handlePick(catId, pts, "right")}
                        disabled={used}
                        className={cn(
                          "h-10 sm:h-12 rounded-xl font-black text-base sm:text-lg transition-all",
                          used
                            ? "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                            : "bg-gradient-primary text-primary-foreground hover:scale-105 hover:glow-primary"
                        )}
                      >
                        {pts}
                      </button>
                    );
                  })}
                </div>
                <div className="text-center text-xs text-muted-foreground font-bold writing-mode-vertical">VS</div>
                {/* Left side */}
                <div className="flex flex-col gap-2">
                  {POINTS_VALUES.map((pts) => {
                    const used = usedSlots[`${catId}-${pts}-left`];
                    return (
                      <button
                        key={`l-${pts}`}
                        onClick={() => handlePick(catId, pts, "left")}
                        disabled={used}
                        className={cn(
                          "h-10 sm:h-12 rounded-xl font-black text-base sm:text-lg transition-all",
                          used
                            ? "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                            : "bg-gradient-primary text-primary-foreground hover:scale-105 hover:glow-primary"
                        )}
                      >
                        {pts}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      <footer className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TeamScoreBar team={1} />
        <TeamScoreBar team={2} />
      </footer>
    </div>
  );
}
