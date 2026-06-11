import { useState } from "react";
import { AidCard, type AidInfo } from "./AidCard";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";

const AIDS: AidInfo[] = [
  { id: "swap", name: "تبديل", desc: "غير السؤال", icon: "/aids/swap.jpg", color: "from-blue-500 to-cyan-500" },
  { id: "pit", name: "حفرة", desc: "تاخذ نقاط السؤال والخصم ينزل", icon: "/aids/pit.jpg", color: "from-zinc-600 to-zinc-800" },
  { id: "twoAnswers", name: "إجابتين", desc: "ليك تجاوب مرتين", icon: "/aids/twoAnswers.jpg", color: "from-green-500 to-emerald-600" },
  { id: "trap", name: "فخ", desc: "الخصم يخسر لو غلط", icon: "/aids/trap.jpg", color: "from-amber-500 to-orange-600" },
  { id: "freeze", name: "تجميد", desc: "امنع الخصم من الإجابة", icon: "/aids/freeze.jpg", color: "from-red-400 to-red-600" },
  { id: "shield", name: "درع", desc: "يحميك من التجميد / الفخ", icon: "/aids/shield.jpg", color: "from-violet-500 to-purple-700" },
];


export function AidSelection({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<1 | 2>(1); // ← محتفظ بيه للتوافق
  const [t1, setT1] = useState<string[]>([]);
  const [t2, setT2] = useState<string[]>([]);
  const setTeamAids = useGameStore(s => s.setTeamAids);
  const team1Name = useGameStore(s => s.team1.name) || "الفريق 1";
  const team2Name = useGameStore(s => s.team2.name) || "الفريق 2";
  const current = step === 1? t1 : t2;
  const setCurrent = step === 1? setT1 : setT2;
  const limitReached = current.length >= 3;
  const toggle = (id: string) => {
    if (current.includes(id)) setCurrent(current.filter(x => x!== id));
    else if (!limitReached) setCurrent([...current, id]);
  };
  const next = () => {
    if (step === 1) { setTeamAids(1, t1 as any); setStep(2); }
    else { setTeamAids(2, t2 as any); onComplete(); }
  };

  // ← جديد: اختيار متوازي
  const toggleTeam = (team: 1|2, id: string) => {
    const cur = team===1? t1 : t2;
    const setCur = team===1? setT1 : setT2;
    if (cur.includes(id)) setCur(cur.filter(x=>x!==id));
    else if (cur.length<3) setCur([...cur, id]);
  };
  const bothReady = t1.length===3 && t2.length===3;
  const startBoth = () => {
    if (!bothReady) return;
    setTeamAids(1, t1 as any);
    setTeamAids(2, t2 as any);
    onComplete();
  };

  return (
    <section className="relative mb-8">
      <div className={cn("absolute -inset-1 rounded-[1.8rem] blur-2xl opacity-20", "bg-gradient-to-r from-fuchsia-600 to-cyan-500")} />
      <div className="relative p-5 sm:p-6 rounded-2xl bg-black/40 backdrop-blur-2xl border border-white/15 shadow-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-1 w-8 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-500" />
          <h3 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-cyan-400">
            كل فريق يختار 3 وسائل
          </h3>
          <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-fuchsia-600/70 to-cyan-500/70" />
        </div>

        {/* ← جديد: الفريقين جنب بعض */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* الفريق 1 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-cyan-300">{team1Name}</span>
              <span className="text-sm text-white/70">{t1.length}/3</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {AIDS.map(aid => (
                <AidCard key={`1-${aid.id}`} aid={aid} selected={t1.includes(aid.id)} disabled={t1.length>=3 &&!t1.includes(aid.id)} onClick={() => toggleTeam(1, aid.id)} />
              ))}
            </div>
          </div>

          {/* الفريق 2 */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-fuchsia-300">{team2Name}</span>
              <span className="text-sm text-white/70">{t2.length}/3</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {AIDS.map(aid => (
                <AidCard key={`2-${aid.id}`} aid={aid} selected={t2.includes(aid.id)} disabled={t2.length>=3 &&!t2.includes(aid.id)} onClick={() => toggleTeam(2, aid.id)} />
              ))}
            </div>
          </div>
        </div>

        <button onClick={startBoth} disabled={!bothReady} className="mt-6 w-full py-3 rounded-xl bg-primary text-white font-bold disabled:opacity-40 disabled:cursor-not-allowed">
          ابدأ المعركة 🚀
        </button>
      </div>
    </section>
  );
}