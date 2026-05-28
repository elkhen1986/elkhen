import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { getCategory } from "@/data/categories";
import { TopBar } from "@/components/game/TopBar";
import { TeamScoreBar } from "@/components/game/TeamScoreBar";
import { cn } from "@/lib/utils";
import { loadCategory, subscribeToAllRemaining } from "../lib/questionsLoader";
import { toast } from "sonner";
import { FaWhatsapp, FaTelegramPlane, FaInstagram, FaFacebookF } from "react-icons/fa";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const POINTS_VALUES = [200, 400, 600] as const;
type Points = typeof POINTS_VALUES[number];

const POINT_STYLES: Record<Points, string> = {
  200: "from-emerald-500/25 to-teal-600/25 border-emerald-400/40 hover:border-emerald-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] text-emerald-100",
  400: "from-amber-500/25 to-orange-500/25 border-amber-400/40 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.3)] text-amber-100",
  600: "from-rose-500/25 to-pink-600/25 border-rose-400/40 hover:border-rose-300 hover:shadow-[0_0_20px_rgba(244,63,94,0.3)] text-rose-100",
};

export default function Board(): JSX.Element {
  const navigate = useNavigate();
  const selectedCategories = useGameStore((s) => s.selectedCategories);
  const team1 = useGameStore((s) => s.team1);
  const team2 = useGameStore((s) => s.team2);
  const usedSlots = useGameStore((s) => s.usedSlots);
  const pickQuestion = useGameStore((s) => s.pickQuestion);

  const [loadingCat, setLoadingCat] = useState<string | null>(null);
  const hasEndedRef = useRef(false);

  const [isTrial, setIsTrial] = useState(false);
  useEffect(() => {
    const check = () => setIsTrial(localStorage.getItem("elkhen_trial") === "true");
    check();
    const onStorage = (e: StorageEvent) => { if (e.key === "elkhen_trial") check(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // === فحص الاشتراك الجديد - لا يمسح أي كود قديم ===
  useEffect(() => {
    const checkSubscription = async () => {
      const isTrialUser = localStorage.getItem("elkhen_trial") === "true";
      if (isTrialUser) return;

      const email = localStorage.getItem("elkhen_user");
      if (!email) {
        navigate("/login", { replace: true });
        return;
      }

      try {
        const uid = auth.currentUser?.uid || email;
        const userDoc = await getDoc(doc(db, "users", uid));
        const userData = userDoc.data();

        const now = new Date();
        const end = userData?.subscriptionEnd?.toDate
       ? userData.subscriptionEnd.toDate()
          : userData?.subscriptionEnd?.seconds
         ? new Date(userData.subscriptionEnd.seconds * 1000)
            : null;

        if (!userData?.isAdmin && (!userData?.isActive ||!end || end <= now)) {
          toast.error("انتهى اشتراكك - جدد للاستمرار");
          navigate("/", { replace: true });
        }
      } catch (e) {
        console.error("Subscription check failed:", e);
      }
    };

    checkSubscription();
  }, [navigate]);
  // === نهاية فحص الاشتراك ===

// كاشف نهاية اللعبة - يعتمد على usedSlots المحلي
  useEffect(() => {
    if (loadingCat) return; // مهم: استنى لما نخلص تحميل السؤال

    const totalSlots = selectedCategories.length * 6; // 3 نقط × يمين وشمال
    const usedCount = Object.values(usedSlots).filter(Boolean).length;

    console.log(`مستخدم: ${usedCount} / ${totalSlots}`); // شوف في الكونسول

    if (totalSlots > 0 && usedCount >= totalSlots &&!hasEndedRef.current) {
      hasEndedRef.current = true;
      console.log("اللعبة خلصت! رايح لصفحة الفوز...");
      setTimeout(() => {
        navigate("/victory");
      }, 2500);
    }
  }, [usedSlots, selectedCategories, navigate, loadingCat]);

  // كاشف نهاية اللعبة
  useEffect(() => {
    if (selectedCategories.length!== 6) return;
    if (loadingCat) return; // استنى

    const unsub = subscribeToAllRemaining(selectedCategories, (counts) => {
      if (loadingCat) return; // تحقق تاني جوه
      const total = selectedCategories.reduce((sum, id) => sum + (counts[id]?.remaining || 0), 0);
      if (total === 0 &&!hasEndedRef.current) {
        hasEndedRef.current = true;
        setTimeout(() => navigate("/victory"), 2500);
      }
    });
    return () => unsub();
  }, [selectedCategories, navigate, loadingCat]);

  const handlePick = async (catId: string, pts: Points, side: "left" | "right") => {
    if (usedSlots[`${catId}-${pts}-${side}`]) return;
    if (isTrial) {
      const usedCount = Object.keys(usedSlots).filter(k => k.startsWith(`${catId}-`) && usedSlots[k]).length;
      if (usedCount >= 999) {
        toast.error("التجربة المجانية: سؤالين فقط من كل فئة - اشترك لفتح الكل");
        return;
      }
    }
    setLoadingCat(`${catId}-${pts}-${side}`);
    try {
      await loadCategory(catId);
      if (await pickQuestion(catId, pts, side)) {
        navigate("/question");
      }
    } finally {
      setLoadingCat(null);
    }
  };

  return (
    <div className="h-dvh flex-col overflow-hidden" dir="rtl">
      <div className="flex flex-col h-full p-2 sm:p-3 gap-2">
        <div className="shrink-0"><TopBar /></div>
        {isTrial && (
          <div className="shrink-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-black px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 shadow-lg border-yellow-600/50">
            <span className="font-black text-sm sm:text-base">🎮 تجربة مجانية - هنا متعة اللعبة</span>
            <div className="flex items-center gap-3">
              <a href="https://wa.me/96555959295" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition"><FaWhatsapp size={18} /></a>
              <a href="https://t.me/96555959295" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition"><FaTelegramPlane size={16} /></a>
              <a href="https://instagram.com/elkhen" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition"><FaInstagram size={16} /></a>
              <a href="https://facebook.com/elkhen" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition"><FaFacebookF size={14} /></a>
            </div>
          </div>
        )}
        <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 lg:h-full">
            {selectedCategories.map((catId) => {
              const cat = getCategory(catId);
              if (!cat) return null;
              const usedCountCat = Object.keys(usedSlots).filter(k => k.startsWith(`${catId}-`) && usedSlots[k]).length;
              const trialLocked = isTrial && usedCountCat >= 999;
              return (
                <div key={catId} className="relative lg:h-full group">
                  <div className={cn("absolute -inset-1 rounded-[1.6rem] blur-2xl opacity-20 group-hover:opacity-40 transition-all duration-500", `bg-gradient-to-br ${cat.color}`)} />
                  <div className="relative h-full flex flex-col bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/15 overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-1.5 hover:scale-[1.02] hover:border-white/25 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0.7)]">
                    {isTrial && (
                      <div className="absolute top-2 left-2 z-20 bg-yellow-500/90 text-black text- font-bold px-2 py-0.5 rounded-full">تجربة</div>
                    )}
                    <div className="flex-1 grid grid-cols-[1fr_auto_1fr] gap-3 p-4 items-center">
                      <div className="flex flex-col gap-2.5 h-full justify-center">
                        {POINTS_VALUES.map((pts) => {
                          const key = `${catId}-${pts}-right`;
                          const used = usedSlots[key];
                          const isLoading = loadingCat === key;
                          const isLockedByTrial = trialLocked &&!used;
                          return (
                            <button key={`r-${pts}`} onClick={() => handlePick(catId, pts, "right")} disabled={used || isLoading || isLockedByTrial} className={cn("relative flex-1 min-h- rounded-xl font-black text-lg border-2 backdrop-blur-xl transition-all duration-300", used? "bg-black/40 text-white/15 border-white/5 cursor-not-allowed" : isLockedByTrial? "bg-black/60 text-white/30 border-yellow-500/30 cursor-not-allowed" : `bg-gradient-to-br ${POINT_STYLES[pts]} hover:scale-105 hover:-translate-y-0.5 active:scale-95`)}>
                              <span className="relative z-10">{isLoading? "..." : isLockedByTrial? "🔒" : pts}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative">
                          <div className={cn("absolute -inset-4 rounded-2xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity", `bg-gradient-to-br ${cat.color}`)} />
                          <div className="relative w-24 h-28 sm:w-28 sm:h-32 lg:w-32 lg:h-36 rounded-2xl overflow-hidden border-2 border-white/25 shadow-xl flex flex-col bg-black/40">
                            <div className="relative flex-1">
                              <img src={`/images/categories/${cat.image}`} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                            </div>
                            <div className={cn("w-full py-1.5 px-1 text-center", "bg-gradient-to-r", cat.color)}>
                              <span className="text-xs sm:text-xs font-bold text-white truncate block leading-tight">{cat.name}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2.5 h-full justify-center">
                        {POINTS_VALUES.map((pts) => {
                          const key = `${catId}-${pts}-left`;
                          const used = usedSlots[key];
                          const isLoading = loadingCat === key;
                          const isLockedByTrial = trialLocked &&!used;
                          return (
                            <button key={`l-${pts}`} onClick={() => handlePick(catId, pts, "left")} disabled={used || isLoading || isLockedByTrial} className={cn("relative flex-1 min-h- rounded-xl font-black text-lg border-2 backdrop-blur-xl transition-all duration-300", used? "bg-black/40 text-white/15 border-white/5 cursor-not-allowed" : isLockedByTrial? "bg-black/60 text-white/30 border-yellow-500/30 cursor-not-allowed" : `bg-gradient-to-br ${POINT_STYLES[pts]} hover:scale-105 hover:-translate-y-0.5 active:scale-95`)}>
                              <span className="relative z-10">{isLoading? "..." : isLockedByTrial? "🔒" : pts}</span>
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