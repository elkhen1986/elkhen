import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { TopBar } from "@/components/game/TopBar";
import { TeamScoreBar } from "@/components/game/TeamScoreBar";
import { QuestionTimer } from "@/components/game/QuestionTimer";
import { QUESTIONS } from "@/data/questions";
import { getCategory } from "@/data/categories";

export default function Question() {
  const navigate = useNavigate();
  const active = useGameStore((s) => s.active);
  const team1 = useGameStore((s) => s.team1);
  const team2 = useGameStore((s) => s.team2);
  const timerDuration = useGameStore((s) => s.timerDuration);
  const awardPoints = useGameStore((s) => s.awardPoints);
  const adjustScore = useGameStore((s) => s.adjustScore);
  const swapActiveQuestion = useGameStore((s) => s.swapActiveQuestion);
  const useAid = useGameStore((s) => s.useAid);
  const currentTurn = useGameStore((s) => s.currentTurn);

  const [revealed, setRevealed] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [knockoutWindow, setKnockoutWindow] = useState(true);

  const sounds = useRef({
    correct: typeof Audio !== 'undefined' ? new Audio('/sounds/correct.mp3') : null,
    none: typeof Audio !== 'undefined' ? new Audio('/sounds/none.mp3') : null,
    tick: typeof Audio !== 'undefined' ? new Audio('/sounds/tick.mp3') : null,
    timeup: typeof Audio !== 'undefined' ? new Audio('/sounds/timeup.mp3') : null,
  }).current;

  const finalAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    Object.values(sounds).forEach(s => { if(s) { s.preload = 'auto'; s.volume = 0.75; } });
    if (sounds.tick) sounds.tick.volume = 0.45;
  }, [sounds]);

  useEffect(() => {
    if (!active) navigate("/board", { replace: true });
  }, [active, navigate]);

  useEffect(() => {
    if (active?.points === 600) {
      document.body.dataset.final = "true";
      setKnockoutWindow(true);
      finalAudio.current = new Audio('/sounds/final.mp3');
      finalAudio.current.loop = true;
      finalAudio.current.volume = 0.5;
      finalAudio.current.play().catch(()=>{});

      const knockoutTimer = setTimeout(() => {
        setKnockoutWindow(false);
        finalAudio.current?.pause();
        delete document.body.dataset.final;
      }, 10000);

      return () => {
        clearTimeout(knockoutTimer);
        delete document.body.dataset.final;
        finalAudio.current?.pause();
      };
    } else {
      delete document.body.dataset.final;
      finalAudio.current?.pause();
    }
  }, [active?.points]);

  const question = useMemo(() => {
    if (!active) return null;
    return QUESTIONS[active.categoryId][active.points].find((q) => q.id === active.questionId) ?? null;
  }, [active]);

  if (!active || !question) return null;
  const cat = getCategory(active.categoryId);

  const handleWinner = (w: 1|2|0) => {
    finalAudio.current?.pause();
    delete document.body.dataset.final;

    if (w === 1 || w === 2) {
      sounds.correct!.currentTime = 0;
      sounds.correct?.play().catch(()=>{});
      if (active.points === 600 && knockoutWindow) {
        adjustScore(w, 600);
        new Audio('/sounds/knockout.mp3').play().catch(()=>{});
      }
    } else {
      sounds.none!.currentTime = 0;
      sounds.none?.play().catch(()=>{});
    }
    awardPoints(w);
    navigate("/board");
  };

  return (
    <div className="min-h-screen p-3 sm:p-6 relative z-10 flex flex-col gap-4" dir="rtl">
      <TopBar showBackToBoard />
      <div className="flex flex-col lg:flex-row gap-5 flex-1 max-w-7xl mx-auto w-full">
        <div className="flex-1 relative group">
          <div className="absolute -inset-1 bg-gradient-to-b from-primary/20 via-transparent to-amber-500/20 rounded-3xl blur-2xl opacity-70"></div>
          <div className="relative h-full bg-gradient-to-b from-white/[0.09] to-white/[0.03] glass rounded-3xl border border-white/15 overflow-hidden shadow-[0_25px_80px_-25px_rgba(0,0,0,0.8)]">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"></div>
            <div className="p-6 md:p-8 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500 blur-xl opacity-60 rounded-full"></div>
                  <div className={`relative flex items-center gap-1.5 ${active.points===600 && knockoutWindow?'bg-gradient-to-b from-red-500 to-red-700 animate-pulse':'bg-gradient-to-b from-amber-300 to-amber-500'} text-black font-black px-4 py-2 rounded-xl text-lg shadow-xl border border-amber-200/50`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    {active.points} نقطة
                  </div>
                </div>
                <QuestionTimer duration={timerDuration} />
                <button
                  onClick={() => setRevealed(!revealed)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-emerald-500/30 text-emerald-300 font-bold text-sm transition"
                >
                  {revealed ? "إخفاء الإجابة" : "كشف الإجابة"}
                </button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {active.points===600 && knockoutWindow && (
                  <div className="mb-3 text-red-400 font-black animate-pulse">⚡ الضربة القاضية - جاوب قبل 10 ثواني وخد 1200!</div>
                )}
                <h2 className="text-xl md:text-2xl font-black leading-[1.6] text-white mb-6 max-w-3xl">
                  {question.text}
                </h2>
                {question.image && (
                  <button onClick={() => setZoomImg(question.image!)} className="group/img relative mb-6">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-amber-500/30 rounded-2xl blur-2xl opacity-0 group-hover/img:opacity-70 transition duration-700"></div>
                    <img src={question.image} className="relative w-full max-w-xl max-h-80 object-contain rounded-2xl border border-white/15" />
                  </button>
                )}
                
                {revealed && (
                  <div className="w-full max-w-md mt-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="relative overflow-hidden bg-gradient-to-b from-emerald-950/80 to-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 backdrop-blur-xl">
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-emerald-400 mb-1 tracking-wide">الإجابة الصحيحة</div>
                          <div className="text-lg font-black text-white leading-snug">{question.answer}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <div className="text-center text-white/60 font-bold mb-3">من جاوب على السؤال؟</div>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => handleWinner(1)} className="relative group h-16 rounded-2xl bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 border border-blue-400/30 shadow-[0_10px_30px_-10px_rgba(59,130,246,0.5)] transition-all hover:scale-[1.02]">
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 rounded-2xl transition" />
                    <div className="relative flex flex-col items-center justify-center h-full">
                      <span className="text-2xl font-black text-white">A</span>
                      <span className="text-xs text-white/80 -mt-1">{team1.name || "فريق 1"}</span>
                    </div>
                  </button>
                  <button onClick={() => handleWinner(0)} className="h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-bold transition">لا أحد</button>
                  <button onClick={() => handleWinner(2)} className="relative group h-16 rounded-2xl bg-gradient-to-b from-pink-600 to-rose-700 hover:from-pink-500 hover:to-rose-600 border border-pink-400/30 shadow-[0_10px_30px_-10px_rgba(236,72,153,0.5)] transition-all hover:scale-[1.02]">
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 rounded-2xl transition" />
                    <div className="relative flex flex-col items-center justify-center h-full">
                      <span className="text-2xl font-black text-white">B</span>
                      <span className="text-xs text-white/80 -mt-1">{team2.name || "فريق 2"}</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:w-72 flex flex-col gap-3">
          <div className="bg-white/[0.05] glass rounded-2xl p-4 border border-white/10">
            <h4 className="font-bold mb-3 text-center text-sm text-white/60">وسائل المساعدة</h4>
            <div className="grid grid-cols-3 gap-2">
              {(['swap','call','twoAnswers'] as const).map((aid,i)=>(
                <button key={aid} disabled={!(currentTurn===1?team1:team2).aids[aid]} onClick={()=>{useAid(currentTurn,aid); if(aid==='swap')swapActiveQuestion();}} className="flex-col h-auto py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl disabled:opacity-40">
                  <span className="text-2xl">{['🔄','📞','✌️'][i]}</span>
                  <span className="text-xs mt-1 block">{['تبديل','اتصال','إجابتين'][i]}</span>
                </button>
              ))}
            </div>
          </div>
          <TeamScoreBar team={1} />
          <TeamScoreBar team={2} />
        </aside>
      </div>

      {zoomImg && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={()=>setZoomImg(null)}>
          <img src={zoomImg} className="max-w-full max-h-full object-contain rounded-2xl" />
        </div>
      )}
    </div>
  );
}
