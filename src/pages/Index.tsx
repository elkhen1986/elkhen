import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useGameStore, preloadFirebaseCategories } from "@/store/gameStore";
import { CATEGORY_GROUPS } from "@/data/categories";
import { CategoryGroupSection } from "@/components/game/CategoryGroupSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Users2, Timer, Maximize, Minimize, LogOut, Camera, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/ThemeSelector";
import { storage, auth, db } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { subscribeToAllRemaining, getRemainingForCategory } from "@/lib/questionsLoader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

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
  const [user, setUser] = useState<{email: string, uid: string, photoURL?: string} | null>(null);
  const [counts, setCounts] = useState<Record<string, { remaining: number; total: number }>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subInfo, setSubInfo] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

useEffect(() => {
    const email = localStorage.getItem("elkhen_user");
    if (!email) {
      navigate("/", { replace: true });
      return;
    }

    const loadUser = async () => {
      const fbUser = auth.currentUser;
      const uid = fbUser?.uid || email;

      let photoURL: string | undefined = localStorage.getItem("elkhen_photo") || undefined;

      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const data = snap.data();
          setSubInfo(data);
          if (data.photoURL) {
            photoURL = data.photoURL as string;
            if (photoURL) localStorage.setItem("elkhen_photo", photoURL);
          }
        } else if (fbUser?.photoURL) {
          photoURL = fbUser.photoURL;
        }
      } catch {}

      setUser({ email, uid, photoURL });
    };

    loadUser();
  }, [navigate]);

  // === تحميل العدادات - LIVE مع تحميل أولي ===
  useEffect(() => {
    if (!user?.uid) return;

    const allCats = CATEGORY_GROUPS.flatMap(g => g.categories.map(c => c.id));

    // 1) حمّل مرة واحدة فورا (عشان العداد يظهر)
    (async () => {
      const initial: Record<string, { remaining: number; total: number }> = {};
      for (const id of allCats) {
        initial[id] = await getRemainingForCategory(id);
      }
      setCounts(initial);
    })();

    // 2) بعد كده اسمع التغييرات live
    const unsubscribe = subscribeToAllRemaining(allCats, setCounts);
    return () => unsubscribe();
  }, [user?.uid]);

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

  const handleLogout = async () => {
    try { await auth.signOut(); } catch {}
    localStorage.removeItem("elkhen_user");
    localStorage.removeItem("elkhen_device");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("elkhen_photo");
    localStorage.removeItem("elkhen_trial");
    navigate("/", { replace: true });
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file ||!user) return;

    try {
      // استخدم uid الحقيقي من Firebase لو موجود
      const uid = auth.currentUser?.uid || user.uid;
      const storageRef = ref(storage, `profile_images/${uid}/avatar.jpg`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // 1. حدث Firebase Auth
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: url });
      }

      // 2. حدث Firestore
      await setDoc(doc(db, "users", uid),
        { photoURL: url, email: user.email, updatedAt: new Date() },
        { merge: true }
      );

      // 3. حدث الواجهة + localStorage
      localStorage.setItem("elkhen_photo", url);
      setUser({...user, uid, photoURL: url });
    } catch (err: any) {
      console.error("فشل رفع الصورة:", err);
      alert("فشل رفع الصورة: " + err.message);
    }
  };

  const canStart = team1.name.trim().length > 0 && team2.name.trim().length > 0 && selectedCategories.length === 6;

  const handleStart = async () => {
    if (!canStart) return;

    // === فحص الاشتراك الجديد ===
    const isTrial = localStorage.getItem("elkhen_trial") === "true";
    if (!isTrial && user) {
      const now = new Date();
      const end = subInfo?.subscriptionEnd?.toDate
     ? subInfo.subscriptionEnd.toDate()
        : subInfo?.subscriptionEnd?.seconds
       ? new Date(subInfo.subscriptionEnd.seconds * 1000)
          : null;

      if (!subInfo?.isActive ||!end || end <= now) {
        setShowSubModal(true);
        toast.error("انتهى اشتراكك - جدد للاستمرار");
        return;
      }
    }
    // === نهاية فحص الاشتراك ===

    setIsLoadingQuestions(true);
    startGame();
    await preloadFirebaseCategories(selectedCategories);
    setIsLoadingQuestions(false);
    navigate("/board");
  };

  const username = user?.email?.split("@")[0] || "";
  const photoURL = user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`;
  const isAdmin = user?.email === "elkhen@elkhen.app"; // ← إضافة

  return (
    <div className="min-h-screen relative z-10 px-3 sm:px-6 py-6 sm:py-10">
      {isLoadingQuestions && (
        <div className="fixed inset-0 z-[100] bg-background/90 backdrop-blur flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <h3 className="text-2xl font-bold">جاري تحميل الأسئلة...</h3>
          </div>
        </div>
      )}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
        <ThemeSelector />
        {/* ✅ زرار الرجوع للساحة */}
        <Button
          onClick={() => navigate("/hub")}
          variant="outline"
          size="sm"
          className="glass rounded-full gap-2 hover:bg-primary/20 hover:border-primary"
          title="الرجوع للساحة"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline text-xs font-bold">الساحة</span>
        </Button>
      </div>

      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {/* زرار لوحة التحكم - للأدمن فقط */}
        {isAdmin && (
          <Button
            onClick={() => navigate("/admin")}
            variant="outline"
            size="sm"
            className="glass rounded-full gap-2 hover:bg-primary/20 hover:border-primary"
            title="لوحة التحكم"
          >
            <Shield className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline text-xs font-bold">لوحة التحكم</span>
          </Button>
        )}

        {/* الاسم والصورة - الضغط يفتح الاشتراك */}
        {user && (
          <div
            className="flex items-center gap-2 glass rounded-full pl-3 pr-1 py-1 cursor-pointer hover:bg-white/10 transition"
            onClick={() => setShowSubModal(true)}
            title="عرض الاشتراك"
          >
            <span className="text-sm font-bold hidden sm:block">{username}</span>
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="relative group"
            >
              <img src={photoURL} className="w-9 h-9 rounded-full object-cover border-2 border-primary/40 group-hover:border-primary transition" alt="avatar" />
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>
        )}

        {/* زرار الخروج */}
        <Button
          onClick={handleLogout}
          variant="outline"
          size="icon"
          className="glass rounded-full w-10 h-10 hover:bg-red-500/20 hover:border-red-500/50 group"
          aria-label="تسجيل خروج"
          title="تسجيل خروج"
        >
          <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-red-400 transition-colors" />
        </Button>

        {/* زرار الفول سكرين */}
        <Button
          onClick={toggleFullscreen}
          variant="outline"
          size="icon"
          className="glass rounded-full w-10 h-10"
          aria-label={isFullscreen? "الخروج من ملء الشاشة" : "ملء الشاشة"}
        >
          {isFullscreen? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center space-y-3 animate-fade-in">
          <div className="inline-flex items-center gap-3 glass rounded-full px-7 py-2">
              <span className="text-red-600 font-black text-5xl md:text-xl tracking-tight">خلِّكـ</span>
              <span className="text-yellow-500 font-black text-5xl md:text-xl mx-2">قد</span>
              <span className="text-violet-600 font-black text-5xl md:text-xl tracking-tight">التحديـ</span>
              </div>
          <h1 className="text-5xl sm:text-7xl font-black text-gradient-primary tracking-tight">
            KHON
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
          </div>

          <div className="space-y-6">
            {CATEGORY_GROUPS.map((group) => (
              <CategoryGroupSection key={group.title} group={group} counts={counts} />
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
              canStart? "glow-primary animate-pulse-glow hover:scale-[1.02]" : "opacity-50",
            )}
          >
            {canStart? "ابدأ اللعبة 🚀" : `أكمل البيانات لتفعيل الزر`}
          </Button>
        </div>
      </div>

      {/* === مودال الاشتراك الجديد === */}
      <Dialog open={showSubModal} onOpenChange={setShowSubModal}>
        <DialogContent className="glass-strong max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">اشتراكك</DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              {username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            {(() => {
              const isTrial = localStorage.getItem("elkhen_trial") === "true";
              if (isTrial) {
                return (
                  <>
                    <div className="text-5xl">🎮</div>
                    <div className="text-xl font-bold text-yellow-500">وضع التجربة</div>
                    <p className="text-sm text-muted-foreground">استمتع بلعبة مجانية كاملة</p>
                  </>
                );
              }

              const end = subInfo?.subscriptionEnd?.toDate
             ? subInfo.subscriptionEnd.toDate()
                : subInfo?.subscriptionEnd?.seconds
               ? new Date(subInfo.subscriptionEnd.seconds * 1000)
                  : null;
              const remaining = end? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000)) : 0;
              const isActive = subInfo?.isActive && remaining > 0;

              return (
                <>
                  <div className="text-5xl">{isActive? "✅" : "❌"}</div>
                  <div className={`text-xl font-bold ${isActive? 'text-green-500' : 'text-red-500'}`}>
                    {isActive? "اشتراك فعال" : "اشتراك منتهي"}
                  </div>
                  {end && (
                    <>
                      <div className="text-sm">
                        ينتهي في: <span className="font-bold">{end.toLocaleDateString('ar-EG')}</span>
                      </div>
                      <div className="text-3xl font-black text-yellow-500">
                        {remaining} يوم متبقي
                      </div>
                    </>
                  )}
                  {!isActive && (
                    <Button asChild className="w-full mt-2 bg-green-600 hover:bg-green-700">
                      <a href="https://wa.me/96555959295" target="_blank">
                        جدد عبر واتساب
                      </a>
                    </Button>
                  )}
                </>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;