import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeSelector } from "@/components/ThemeSelector";
import { Sparkles, Eye, EyeOff, Phone } from "lucide-react";
import { FaWhatsapp, FaFacebookF, FaInstagram } from "react-icons/fa6";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = u.includes("@")? u.trim() : `${u.trim()}@elkhen.app`;
    try {
      await signInWithEmailAndPassword(auth, email, p);
      nav("/", { replace: true });
    } catch {
      setErr("بيانات خاطئة");
      setTimeout(() => setErr(""), 2000);
    }
  };

  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center px-4 py-10">
      <div className="absolute top-4 left-4 z-50">
        <ThemeSelector />
      </div>

<div className="w-full max-w-[420px] animate-fade-in">
        <div className="glass-strong rounded-3xl p-7 sm:p-8 space-y-6">
          <header className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-muted-foreground">خلك قد التحدي</span>
            </div>
            <h1 className="text-4xl font-black text-gradient-primary tracking-tight">
              Elkhen
            </h1>
            <p className="text-muted-foreground text-sm">سجل دخولك لتبدأ التحدي</p>
          </header>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">المستخدم</label>
              <Input
                value={u}
                onChange={(e) => setU(e.target.value)}
                placeholder="ادخل اسمك"
                className="glass border-primary/30 h-12 text-base font-bold focus-visible:ring-primary"
                dir="rtl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-muted-foreground">كلمة السر</label>
              <div className="relative">
                <Input
                  type={show? "text" : "password"}
                  value={p}
                  onChange={(e) => setP(e.target.value)}
                  placeholder="أدخل الرقم السري"
                  className="glass border-primary/30 h-12 text-base font-bold focus-visible:ring-primary pl-11"
                  dir="rtl"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition"
                >
                  {show? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {err && (
              <div className="text-center text-sm font-bold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl py-2">
                {err}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className={cn(
                "w-full h-12 text-base font-black rounded-xl",
                "bg-gradient-primary text-primary-foreground",
                "glow-primary hover:scale-[1.02] active:scale-[0.98] transition-all"
              )}
            >حياك</Button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-3">
          <p className="text-muted-foreground text-sm">للحصول على حساب</p>
          <div className="flex items-center justify-center gap-3">
            <a
              href="https://wa.me/96555959295"
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp"
              className="w-10 h-10 glass rounded-full flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all duration-300 group"
            >
              <FaWhatsapp className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            </a>

            <a
              href="tel:55959295"
              title="اتصال"
              className="w-10 h-10 glass rounded-full flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all duration-300 group"
            >
              <Phone className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            </a>

            <a
              href="https://facebook.com/a.elkhen"
              target="_blank"
              rel="noopener noreferrer"
              title="Facebook"
              className="w-10 h-10 glass rounded-full flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all duration-300 group"
            >
              <FaFacebookF className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            </a>

            <a
              href="https://instagram.com/elkhen"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram"
              className="w-10 h-10 glass rounded-full flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 border border-transparent transition-all duration-300 group"
            >
              <FaInstagram className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}