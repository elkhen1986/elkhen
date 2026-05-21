import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { CATEGORY_GROUPS } from "@/data/categories";
import { CategoryGroupSection } from "@/components/game/CategoryGroupSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Users2, Timer, Maximize, Minimize, LogOut, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeSelector } from "@/components/ThemeSelector";
import { auth, storage } from "@/lib/firebase";
import { signOut, onAuthStateChanged, updateProfile, User } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
  const [user, setUser] = useState<User | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
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

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login", { replace: true });
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file ||!auth.currentUser) return;
    const storageRef = ref(storage, `avatars/${auth.currentUser.uid}.jpg`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateProfile(auth.currentUser, { photoURL: url });
    setUser({...auth.currentUser });
  };

  const canStart = team1.name.trim().length > 0 && team2.name.trim().length > 0 && selectedCategories.length === 6;

  const handleStart = () => {
    if (!canStart) return;
    startGame();
    navigate("/board");
  };

  const username = user?.email?.split("@")[0] || "";
  const photoURL = user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`;

  return (
    <div className="min-h-screen relative z-10 px-3 sm:px-6 py-6 sm:py-10">
      <div className="absolute top-4 left-4 z-50">
        <ThemeSelector />
      </div>

      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {/* الاسم والصورة */}
        {user && (
          <div className="flex items-center gap-2 glass rounded-full pl-3 pr-1 py-1">
            <span className="text-sm font-bold hidden sm:block">{username}</span>
            <button onClick={() => fileRef.current?.click()} className="relative group">
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
          </div>

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
              canStart? "glow-primary animate-pulse-glow hover:scale-[1.02]" : "opacity-50",
            )}
          >
            {canStart? "ابدأ اللعبة 🚀" : `أكمل البيانات لتفعيل الزر`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;