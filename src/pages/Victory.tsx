import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { Trophy, Smile, Frown, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
// @ts-ignore
import confetti from "canvas-confetti";

export default function Victory() {
  const navigate = useNavigate();
  const team1 = useGameStore(s => s.team1);
  const team2 = useGameStore(s => s.team2);
  const fullReset = useGameStore(s => s.fullReset);
  const endGame = useGameStore(s => s.endGame); // ✅ للجولة الجديدة

  const winner = team1.score >= team2.score ? team1 : team2;
  const isDraw = team1.score === team2.score;

  // شغل الاحتفال
  useEffect(() => {
    const duration = 4000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050a06] flex items-center justify-center p-4" dir="rtl">
      {/* نور بيطير في الخلفية */}
      <div className="absolute inset-0">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-primary rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
              boxShadow: "0 0 20px hsl(var(--primary))"
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        {/* مبروك */}
        <div className="text-center mb-10">
          <Trophy className="w-24 h-24 mx-auto text-yellow-400 mb-6 animate-bounce drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]" />
          <h1 className="text-5xl md:text-7xl font-black mb-3 leading-[1.2] pb-2">
            {isDraw ? (
              <span className="text-gradient-gold">تعادل!</span>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-4">
                <span className="text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.7)]">مبروك</span>
                <span className="text-gradient-primary">{winner.name}!</span>
              </div>
            )}
          </h1>
          <p className="text-xl text-muted-foreground">انتهت المعركة</p>
        </div>

        {/* الفريقين جنب بعض */}
        <div className="grid md:grid-cols-2 gap-6">
          {[team1, team2].sort((a,b) => b.score - a.score).map((team) => {
            const isWinner = team.name === winner.name && !isDraw;
            return (
              <div
                key={team.name}
                className={`relative glass-strong rounded-3xl p-8 text-center transition-all duration-700 ${
                  isWinner 
                    ? "scale-105 glow-primary border-2 border-primary/50 shadow-[0_0_40px_rgba(16,185,129,0.3)]" 
                    : "opacity-60 grayscale"
                }`}
              >
                {/* وش سعيد / حزين - ثابت */}
                <div className="mb-5">
                  {isDraw ? (
                    <span className="text-7xl">😐</span>
                  ) : isWinner ? (
                    <Smile className="w-20 h-20 mx-auto text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                  ) : (
                    <Frown className="w-20 h-20 mx-auto text-red-400/70" />
                  )}
                </div>

                <h2 className={`text-3xl font-black mb-3 ${isWinner ? "text-white" : "text-muted-foreground"}`}>
                  {team.name}
                </h2>
                <div className={`text-7xl font-black mb-2 ${isWinner ? "text-gradient-primary" : "text-muted-foreground"}`}>
                  {team.score}
                </div>
                <p className="text-muted-foreground">نقطة</p>

                {isWinner && !isDraw && (
                  <div className="absolute -top-4 -right-4 bg-yellow-400 text-black px-5 py-1.5 rounded-full font-black rotate-12 shadow-lg">
                    الفائز
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* أزرار */}
        <div className="flex gap-4 justify-center mt-12">
          <Button size="lg" onClick={() => { endGame(); navigate("/board"); }} className="gap-2 bg-gradient-primary hover:opacity-90 text-lg px-8">
            <RotateCcw className="w-5 h-5" /> جولة جديدة
          </Button>
          <Button size="lg" variant="outline" onClick={() => { fullReset(); navigate("/"); }} className="gap-2 text-lg px-8 border-white/20 hover:bg-white/10">
            <Home className="w-5 h-5" /> الرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
}