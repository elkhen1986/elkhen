import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { TopBar } from "@/components/game/TopBar";
import { TeamScoreBar } from "@/components/game/TeamScoreBar";
import { QuestionTimer } from "@/components/game/QuestionTimer";
import { QUESTIONS } from "@/data/questions";
import { getCategory } from "@/data/categories";
import { Button } from "@/components/ui/button";

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
  const [timeLeft, setTimeLeft] = useState<number>(timerDuration);
  const [knockoutWindow, setKnockoutWindow] = useState(true); // 👈

  const sounds = useRef({
    correct: typeof Audio!== 'undefined'? new Audio('/sounds/correct.mp3') : null,
    none: typeof Audio!== 'undefined'? new Audio('/sounds/none.mp3') : null,
    tick: typeof Audio!== 'undefined'? new Audio('/sounds/tick.mp3') : null,
    timeup: typeof Audio!== 'undefined'? new Audio('/sounds/timeup.mp3') : null,
  }).current;

  const finalAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    Object.values(sounds).forEach(s => { if(s) { s.preload = 'auto'; s.volume = 0.75; } });
    if (sounds.tick) sounds.tick.volume = 0.45;
  }, [sounds]);

  useEffect(() => {
    if (!active) navigate("/board", { replace: true });
  }, [active, navigate]);

  // ===== تفعيل الضربة القاضية =====
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

  // تايمر
  useEffect(() => {
    setTimeLeft(timerDuration);
    if (!active) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        const next = t - 1;
        if (next > 0 && next <= 5) {
          sounds.tick!.currentTime = 0;
          sounds.tick?.play().catch(()=>{});
        }
        if (next === 0) {
          sounds.timeup!.currentTime = 0;
          sounds.timeup?.play().catch(()=>{});
          clearInterval(id);
        }
        return Math.max(0, next);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, timerDuration, sounds]);

  const question = useMemo(() => {
    if (!active) return null;
    return QUESTIONS[active.categoryId][active.points].find((q) => q.id === active.questionId)?? null;
  }, [active]);

  if (!active ||!question) return null;
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
          <div className="absolute -inset-1 bg-gradient-to-b from-emerald-500/20 via-transparent to-amber-500/20 rounded-3xl blur-2xl opacity-70"></div>
          <div className="relative h-full bg-gradient-to-b from-white/[0.09] to-white/[0.03] glass rounded-3xl border border-white/15 overflow-hidden shadow-[0_25px_80px_-25px_rgba(0,0,0,0.8)]">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent"></div>
            <div className="p-6 md:p-8 flex flex-col h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500 blur-xl opacity-60 rounded-full"></div>
                  <div className={`relative flex items-center gap-1.5 ${active.points===600 && knockoutWindow?'bg-gradient-to-b from-red-500 to-red-700 animate-pulse':'bg-gradient-to-b from-amber-300 to-amber-500'} text-black font-black px-4 py-2 rounded-full text-lg shadow-xl border border-amber-200/50`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    {active.points}
                  </div>
                </div>
                <QuestionTimer duration={timerDuration} />
                <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm font-bold text-white/70">{cat?.name}</div>
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
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600/30 to-amber-500/30 rounded-2xl blur-2xl opacity-0 group-hover/img:opacity-70 transition duration-700"></div>
                    <img src={question.image} className="relative w-full max-w-xl max-h-80 object-contain rounded-2xl border border-white/15" />
                  </button>
                )}
                <button
                  onClick={() => setRevealed(true)}
                  disabled={revealed}
                  className="w-full max-w-md relative overflow-hidden group/btn bg-gradient-to-b from-white/[0.08] to-white/[0.03] hover:from-white/[0.12] hover:to-white/[0.06] border border-white/15 hover:border-amber-400/50 rounded-2xl py-4 font-bold text-lg transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(251,191,36,0.4)] disabled:opacity-60"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/10 to-amber-500/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                  <span className="relative flex items-center justify-center gap-2">
                    {revealed? (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        تم الكشف
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-300"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        كشف الإجابة
                      </>
                    )}
                  </span>
                </button>

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

              <div className="grid grid-cols-3 gap-3 mt-6">
                <Button onClick={() => handleWinner(1)} className="bg-green-500 hover:bg-green-600 text-black font-bold h-12">{team1.name || "فريق 1"}</Button>
                <Button onClick={() => handleWinner(0)} variant="secondary" className="h-12 bg-white/5 hover:bg-white/10">لا أحد</Button>
                <Button onClick={() => handleWinner(2)} className="bg-green-500 hover:bg-green-600 text-black font-bold h-12">{team2.name || "فريق 2"}</Button>
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:w-72 flex flex-col gap-3">
          <div className="bg-white/[0.05] glass rounded-2xl p-4 border border-white/10">
            <h4 className="font-bold mb-3 text-center text-sm text-white/60">وسائل المساعدة</h4>
            <div className="grid grid-cols-3 gap-2">
              {(['swap','call','twoAnswers'] as const).map((aid,i)=>(
                <Button key={aid} variant="outline" disabled={!(currentTurn===1?team1:team2).aids[aid]} onClick={()=>{useAid(currentTurn,aid); if(aid==='swap')swapActiveQuestion();}} className="flex-col h-auto py-3 bg-white/5 border-white/10 hover:bg-white/10">
                  <span className="text-2xl">{['🔄','📞','✌️'][i]}</span>
                  <span className="text-xs mt-1">{['تبديل','اتصال','إجابتين'][i]}</span>
                </Button>
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