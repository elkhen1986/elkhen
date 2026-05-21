import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { getCategory } from "@/data/categories";
import { POINTS_VALUES, type Points } from "@/data/questions";
import { TopBar } from "@/components/game/TopBar";
import { TeamScoreBar } from "@/components/game/TeamScoreBar";
import { cn } from "@/lib/utils";

const POINT_STYLES: Record<Points, string> = {
  200: "from-emerald-500/25 to-teal-600/25 border-emerald-400/40 hover:border-emerald-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] text-emerald-100",
  400: "from-amber-500/25 to-orange-500/25 border-amber-400/40 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] text-amber-100",
  600: "from-rose-500/25 to-pink-600/25 border-rose-400/40 hover:border-rose-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] text-rose-100",
};

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

  const handlePick = (catId: string, pts: Points, side: "left" | "right") => {
    if (pickQuestion(catId, pts, side)) navigate("/question");
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden" dir="rtl">
      <div className="flex flex-col h-full p-2 sm:p-3 gap-2">
        <div className="shrink-0"><TopBar /></div>

        <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 lg:h-full">
            {selectedCategories.map((catId) => {
              const cat = getCategory(catId);
              if (!cat) return null;

              return (
                <div key={catId} className="relative min-h- lg:h-full group">
                  <div className={cn("absolute -inset-1 rounded-[1.6rem] blur-2xl opacity-20 group-hover:opacity-40 transition-all duration-500", `bg-gradient-to-br ${cat.color}`)} />

                  <div className="relative h-full flex flex-col bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/15 overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] hover:border-white/25 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)]">
                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-3 p-4 items-center">
                      {/* يمين */}
                      <div className="flex flex-col gap-2.5 h-full justify-center">
                        {POINTS_VALUES.map((pts) => {
                          const used = usedSlots[`${catId}-${pts}-right`];
                          return (
                            <button
                              key={`r-${pts}`}
                              onClick={() => handlePick(catId, pts, "right")}
                              disabled={used}
                              className={cn(
                                "relative flex-1 min-h- rounded-xl font-black text-lg border-2 backdrop-blur-xl transition-all duration-300",
                                used
                               ? "bg-black/40 text-white/15 border-white/5 cursor-not-allowed"
                                  : `bg-gradient-to-br ${POINT_STYLES[pts]} hover:scale-105 hover:-translate-y-0.5 active:scale-95`
                              )}
                            >
                              <span className="relative z-10">{pts}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* الوسط - نفس تصميم CategoryCard */}
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative">
                          <div className={cn("absolute -inset-4 rounded-2xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity", `bg-gradient-to-br ${cat.color}`)} />
                          
                          <div className="relative w-24 h-28 sm:w-28 sm:h-32 lg:w-32 lg:h-36 rounded-2xl overflow-hidden border-2 border-white/25 shadow-xl flex flex-col bg-black/40">
                            {/* الصورة */}
                            <div className="relative flex-1">
                              <img
                                src={`/images/categories/${cat.image}`}
                                alt={cat.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            {/* الشريط الملون */}
                            <div className={cn("w-full py-1.5 px-1 text-center", "bg-gradient-to-r", cat.color)}>
                              <span className="text- sm:text-xs font-bold text-white truncate block leading-tight">
                                {cat.name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* شمال */}
                      <div className="flex flex-col gap-2.5 h-full justify-center">
                        {POINTS_VALUES.map((pts) => {
                          const used = usedSlots[`${catId}-${pts}-left`];
                          return (
                            <button
                              key={`l-${pts}`}
                              onClick={() => handlePick(catId, pts, "left")}
                              disabled={used}
                              className={cn(
                                "relative flex-1 min-h- rounded-xl font-black text-lg border-2 backdrop-blur-xl transition-all duration-300",
                                used
                               ? "bg-black/40 text-white/15 border-white/5 cursor-not-allowed"
                                  : `bg-gradient-to-br ${POINT_STYLES[pts]} hover:scale-105 hover:-translate-y-0.5 active:scale-95`
                              )}
                            >
                              <span className="relative z-10">{pts}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        <footer className="shrink-0 grid grid-cols-2 gap-2.5 pt-2.5 border-t border-white/10">
          <TeamScoreBar team={1} />
          <TeamScoreBar team={2} />
        </footer>
      </div>
    </div>
  );
}