import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { getCategory } from "@/data/categories";
import { POINTS_VALUES, type Points } from "@/data/questions";
import { TopBar } from "@/components/game/TopBar";
import { TeamScoreBar } from "@/components/game/TeamScoreBar";
import { cn } from "@/lib/utils";

const POINT_STYLES: Record<Points, string> = {
  200: "from-emerald-500/20 to-teal-600/20 border-emerald-500/30 hover:border-emerald-400/70 hover:shadow-[0_0_25px_-8px_rgba(16,185,129,0.5)] text-emerald-200",
  400: "from-amber-500/20 to-orange-500/20 border-amber-500/30 hover:border-amber-400/70 hover:shadow-[0_0_25px_-8px_rgba(245,158,11,0.5)] text-amber-200",
  600: "from-rose-500/20 to-pink-600/20 border-rose-500/30 hover:border-rose-400/70 hover:shadow-[0_0_25px_-8px_rgba(244,63,94,0.5)] text-rose-200",
};

export default function Board() {
  const navigate = useNavigate();
  const selectedCategories = useGameStore((s) => s.selectedCategories);
  const team1 = useGameStore((s) => s.team1);
  const team2 = useGameStore((s) => s.team2);
  const usedSlots = useGameStore((s) => s.usedSlots);
  const pickQuestion = useGameStore((s) => s.pickQuestion);

  useEffect(() => {
    if (selectedCategories.length!== 6 ||!team1.name ||!team2.name) {
      navigate("/", { replace: true });
    }
  }, [selectedCategories, team1.name, team2.name, navigate]);

  const handlePick = (catId: string, pts: Points, side: "left" | "right") => {
    if (pickQuestion(catId, pts, side)) navigate("/question");
  };

  return (
    <div className="h-dvh overflow-hidden flex flex-col" dir="rtl">
      <div className="flex flex-col h-full p-2 sm:p-3 lg:p-4 gap-2 sm:gap-3">
        <div className="shrink-0"><TopBar /></div>

        <main className="flex-1 min-h-0 grid grid-cols-2 lg:grid-cols-3 grid-rows-3 lg:grid-rows-2 gap-2 sm:gap-3">
          {selectedCategories.map((catId) => {
            const cat = getCategory(catId);
            if (!cat) return null;
            const Icon = cat.icon;

            return (
              <div key={catId} className="group relative min-h-0 will-change-transform">
                <div className={`absolute -inset- bg-gradient-to-b ${cat.color} opacity-15 rounded-2xl blur-2xl group-hover:opacity-40 transition duration-500`} />

                <div className="relative h-full flex flex-col bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden transition-all duration-300 group-hover:-translate-y-1.5 group-hover:scale-[1.02] group-hover:bg-white/[0.09] group-hover:border-white/25 group-hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]">
                  <div className="flex items-center gap-2 px-2.5 py-2 border-b border-white/5 shrink-0">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", `bg-gradient-to-br ${cat.color}`)}>
                      <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <h3 className="font-bold text- sm:text- text-white/90 truncate flex-1">{cat.name}</h3>
                  </div>

                  <div className="flex-1 min-h-0 grid grid-cols-[1fr_20px_1fr] gap-1.5 p-2">
                    {/* يمين */}
                    <div className="grid grid-rows-3 gap-1.5">
                      {POINTS_VALUES.map((pts) => {
                        const used = usedSlots[`${catId}-${pts}-right`];
                        return (
                          <button
                            key={`r-${pts}`}
                            onClick={() => handlePick(catId, pts, "right")}
                            disabled={used}
                            className={cn(
                              "relative w-full h-full min-h-0 rounded-lg font-black text- border backdrop-blur-sm transition-all duration-300 overflow-hidden",
                              used
                              ? "bg-black/20 text-white/15 border-white/5 cursor-not-allowed"
                                : `bg-gradient-to-br ${POINT_STYLES[pts]} hover:scale-[1.03] active:scale-95`
                            )}
                          >
                            <span className="relative z-10">{pts}</span>
                            {!used && <div className="absolute inset-0 bg-white/0 hover:bg-white/[0.05] transition" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="w-px self-stretch bg-white/10" />
                    </div>

                    {/* شمال */}
                    <div className="grid grid-rows-3 gap-1.5">
                      {POINTS_VALUES.map((pts) => {
                        const used = usedSlots[`${catId}-${pts}-left`];
                        return (
                          <button
                            key={`l-${pts}`}
                            onClick={() => handlePick(catId, pts, "left")}
                            disabled={used}
                            className={cn(
                              "relative w-full h-full min-h-0 rounded-lg font-black text- border backdrop-blur-sm transition-all duration-300 overflow-hidden",
                              used
                              ? "bg-black/20 text-white/15 border-white/5 cursor-not-allowed"
                                : `bg-gradient-to-br ${POINT_STYLES[pts]} hover:scale-[1.03] active:scale-95`
                            )}
                          >
                            <span className="relative z-10">{pts}</span>
                            {!used && <div className="absolute inset-0 bg-white/0 hover:bg-white/[0.05] transition" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </main>

        <footer className="shrink-0 grid grid-cols-2 gap-2">
          <div className="scale-[0.92] origin-right"><TeamScoreBar team={1} /></div>
          <div className="scale-[0.92] origin-left"><TeamScoreBar team={2} /></div>
        </footer>
      </div>
    </div>
  );
}