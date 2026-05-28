import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, PlayCircle } from "lucide-react";
import { FaWhatsapp, FaTelegramPlane, FaInstagram, FaFacebookF } from "react-icons/fa";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/main";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function getOrCreateDeviceId() {
  let id = localStorage.getItem("elkhen_device");
  if (!id) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      id = window.crypto.randomUUID();
    } else {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x'? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem("elkhen_device", id);
  }
  return id;
}

const toEmail = (input: string) => {
  const v = input.trim().toLowerCase();
  return v.includes("@")? v : `${v}@elkhen.app`;
};

export default function Login(): JSX.Element {
  const navigate = useNavigate();
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && localStorage.getItem("isLoggedIn") === "true") {
        navigate("/", { replace: true });
      } else {
        setCheckingAuth(false);
      }
    });
    const timeout = setTimeout(() => setCheckingAuth(false), 2500);
    return () => { unsub(); clearTimeout(timeout); };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUser ||!password) { toast.error("اكتب البيانات"); return; }
    setLoading(true);
    try {
      const email = toEmail(emailOrUser);
      const deviceId = getOrCreateDeviceId();
      const cred = await signInWithEmailAndPassword(auth, email, password);

      // === فحص الاشتراك الجديد - لا يمسح أي كود قديم ===
      const userDoc = await getDoc(doc(db, "users", cred.user.uid));
      const userData = userDoc.data();
      const now = new Date();
      const subscriptionEnd = userData?.subscriptionEnd?.toDate
      ? userData.subscriptionEnd.toDate()
        : userData?.subscriptionEnd?.seconds
        ? new Date(userData.subscriptionEnd.seconds * 1000)
          : null;

      if (!userData?.isAdmin && (!userData?.isActive ||!subscriptionEnd || subscriptionEnd <= now)) {
        await signOut(auth);
        localStorage.removeItem("isLoggedIn");
        toast.error("انتهى اشتراكك - تواصل مع الأدمن على واتساب 55959295");
        return;
      }
      // === نهاية فحص الاشتراك ===

      const verifyDevice = httpsCallable(functions, "verifyDevice");
      await verifyDevice({ deviceId });
      localStorage.setItem("elkhen_user", email);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.removeItem("elkhen_trial");
      toast.success("تم تسجيل الدخول");
      navigate("/", { replace: true });
    } catch (err: any) {
      await auth.signOut();
      localStorage.removeItem("isLoggedIn");
      let msg = "فشل تسجيل الدخول";
      if (err.code === "auth/invalid-credential") msg = "اسم المستخدم أو كلمة المرور غلط";
      else if (err.code === "functions/permission-denied") msg = "الحساب مربوط بجهاز آخر";
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const handleTrial = async () => {
    try {
      setLoading(true);

      // 1- اطرد أي مستخدم
      await signOut(auth);

      // 2- امسح كاش الأسئلة
      const { clearQuestionCache } = await import('../lib/questionsLoader');
      await clearQuestionCache();

      // 3- امسح كاش الفايربيز (بالطريقة الصح)
      try {
        const { resetFirebaseCache } = await import('../store/gameStore');
        resetFirebaseCache();
      } catch {}

      // 4- امسح localStorage بأمان
      const keysToDelete: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('elkhen-') || k.startsWith('used_') || k.includes('game-state'))) {
          keysToDelete.push(k);
        }
      }
      keysToDelete.forEach(k => localStorage.removeItem(k));

      // 5- امسح IndexedDB
      try {
        if ('indexedDB' in window && indexedDB.databases) {
          const dbs = await indexedDB.databases();
          await Promise.all(
            dbs.filter(db => db.name?.includes('elkhen')).map(db =>
              new Promise<void>(res => {
                const del = indexedDB.deleteDatabase(db.name!);
                del.onsuccess = del.onerror = () => res();
              })
            )
          );
        }
      } catch {}

      sessionStorage.clear();
      localStorage.removeItem("elkhen_device");

      // 6- فعل التجربة
      localStorage.setItem("elkhen_trial", "true");
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("elkhen_user", "trial@elkhen.app");

      toast.success("تم مسح الكاش - تجربة نظيفة 100%");

      setTimeout(() => {
        setLoading(false);
        navigate("/", { replace: true });
      }, 400);

    } catch (err) {
      console.error('Trial error:', err);
      // حتى لو في خطأ، دخل تجربة
      localStorage.setItem("elkhen_trial", "true");
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("elkhen_user", "trial@elkhen.app");
      setLoading(false);
      navigate("/", { replace: true });
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <p className="text-primary animate-pulse text-lg font-bold">جاري التحقق...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
      <div className="w-full max-w-md relative z-10">
        <Card className="w-full relative z-10 glass-strong border-primary/20 shadow-2xl transition-all duration-500 hover:shadow-[0_0_60px_rgba(16,185,129,0.3)] hover:border-primary/50 hover:-translate-y-1">
          <CardHeader className="text-center space-y-3 pb-6">
            <CardTitle className="text-5xl font-black text-gradient-primary">KHON</CardTitle>
            <p className="text-xl font-extrabold">
              <span className="text-red-800">خلِّكـ </span>
              <span className="text-yellow-800 mx-1.5">قد </span>
              <span className="text-violet-800">التحديـ</span>
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-bold">اسم المستخدم</label>
                <Input value={emailOrUser} onChange={(e) => setEmailOrUser(e.target.value)} placeholder="ادخل اسمك" className="h-12 glass border-primary/30 focus-visible:ring-primary text-base" disabled={loading} autoComplete="username" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold">كلمة المرور</label>
                <div className="relative">
                  <Input type={showPassword? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-12 glass border-primary/30 focus-visible:ring-primary text-base pl-12" disabled={loading} autoComplete="current-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors" tabIndex={-1}>
                    {showPassword? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="w-2/3 h-12 text-base font-bold bg-gradient-primary hover:opacity-90 glow-primary" disabled={loading}>
                  {loading? "جاري الدخول..." : "حياك"}
                </Button>
                <Button type="button" onClick={handleTrial} variant="outline" className="w-1/3 h-12 font-bold border-yellow-700/60 text-yellow-600 hover:bg-yellow-700/10 hover:text-yellow-300 hover:border-yellow-700" disabled={loading}>
                  <PlayCircle className="w-4 h-4 ml-1" />
                  لعبة مجانية
                </Button>
              </div>
            </form>
            <p className="text-center text-sm font-bold text-red-500 mt-6">كل حساب مربوط بجهاز واحد فقط</p>
          </CardContent>
        </Card>
        <div className="mt-5 text-center">
          <p className="text-sm text-primary mb-3"><span className="text">للحصول على حساب تواصل معنا</span></p>
          <div className="flex items-center justify-center gap-5">
            <a href="https://wa.me/96555959295" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/70 transition-all hover:scale-110" title="واتساب"><FaWhatsapp size={26} /></a>
            <a href="https://t.me/96555959295" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/70 transition-all hover:scale-110" title="تيليجرام"><FaTelegramPlane size={24} /></a>
            <a href="https://instagram.com/elkhen" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/70 transition-all hover:scale-110" title="انستجرام"><FaInstagram size={24} /></a>
            <a href="https://facebook.com/elkhen" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/70 transition-all hover:scale-110" title="فيسبوك"><FaFacebookF size={22} /></a>
          </div>
        </div>
      </div>
    </div>
  );
}