import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const USER = "elkhen";
const PASS = "1412";

export default function Login() {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (u === USER && p === PASS) {
      localStorage.setItem("elkhen_auth", "true");
      nav("/", { replace: true });
    } else {
      setErr("بيانات خاطئة");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
      {/* خلفية خضراء خفيفة */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w- h- bg-green-600/8 rounded-full blur-" />
      </div>

      {/* الكارت الصغير */}
      <div className="relative w-">
        <form onSubmit={handleLogin} className="bg-[#080808] border border-green-900/30 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_80px_rgba(34,197,94,0.08)] hover:shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_100px_rgba(34,197,94,0.15)] hover:border-green-800/50 transition-all duration-500">

          {/* عنوان */}
          <div className="text-center mb-6">
            <h1 className="text-white text- font-bold tracking-wider">ELKHEN</h1>
            <div className="w-12 h- bg-gradient-to-r from-transparent via-green-500 to-transparent mx-auto mt-2" />
          </div>

          {/* حقول */}
          <div className="space-y-3">
            <input
              type="text"
              placeholder="المستخدم"
              value={u}
              onChange={(e) => setU(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-black border-zinc-900 text-white text-sm placeholder:text-zinc-700 outline-none focus:border-green-600/70 focus:bg-[#0a0f0a] hover:border-zinc-800 transition"
              dir="rtl"
            />

            <div className="relative">
              <input
                type={show? "text" : "password"}
                placeholder="كلمة السر"
                value={p}
                onChange={(e) => setP(e.target.value)}
                className="w-full h-10 px-3 pl-9 rounded-lg bg-black border border-zinc-900 text-white text-sm placeholder:text-zinc-700 outline-none focus:border-green-600/70 focus:bg-[#0a0f0a] hover:border-zinc-800 transition"
                dir="rtl"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-green-500 transition"
              >
                {show? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {err && <p className="text-red-500 text- text-center mt-3">{err}</p>}

          <button className="w-full h-10 mt-5 rounded-lg bg-[#0f1f14] border border-green-900/50 text-green-400 text-sm font-medium hover:bg-green-600 hover:text-black hover:border-green-500 hover:shadow-[0_0_20px_rgba(34,197,94,0.5)] active:scale-[0.97] transition-all">
            دخول
          </button>
        </form>

        {/* للحصول على حساب + واتساب */}
        <div className="text-center mt-5">
          <p className="text-zinc-600 text- mb-2.5">للحصول على حساب</p>
          <a
            href="https://wa.me/96555959295"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#050a06] border border-green-950 hover:bg-green-500 hover:border-green-400 hover:scale-110 hover:shadow-[0_0_15px_rgba(34,197,94,0.6)] transition-all duration-300 group"
          >
            <svg className="w-4 h-4 text-green-600 group-hover:text-black transition-colors" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0.16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.746 1.464h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}