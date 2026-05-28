import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGameStore } from "@/store/gameStore";
import { auth } from "@/main";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import Index from "./pages/Index";
import Board from "./pages/Board";
import Question from "./pages/Question";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import Victory from "@/pages/Victory";
import GameHub from "./pages/GameHub"; // ✅ أضفنا GameHub

const queryClient = new QueryClient();

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'elkhen_trial') {
        const isTrial = localStorage.getItem('elkhen_trial') === 'true';
        setUser(isTrial? { isTrial: true } : auth.currentUser);
      }
    };
    window.addEventListener('storage', onStorage);

    const unsub = onAuthStateChanged(auth, async (u) => {
      const isTrial = localStorage.getItem("elkhen_trial") === "true";
      if (isTrial && u) {
        await signOut(auth);
        setUser({ isTrial: true });
      } else if (u &&!isTrial) {
        try {
          const userDoc = await getDoc(doc(db, "users", u.uid));
          const userData = userDoc.data();
          const now = new Date();
          const end = userData?.subscriptionEnd?.toDate
           ? userData.subscriptionEnd.toDate()
            : userData?.subscriptionEnd?.seconds
           ? new Date(userData.subscriptionEnd.seconds * 1000)
            : null;

          if (!userData?.isAdmin && (!userData?.isActive ||!end || end <= now)) {
            await signOut(auth);
            localStorage.removeItem("isLoggedIn");
            toast.error("انتهى اشتراكك - تم تسجيل الخروج");
            setUser(null);
          } else {
            setUser(u);
          }
        } catch {
          setUser(u);
        }
      } else {
        setUser(u || (isTrial? { isTrial: true } : null));
      }
      setLoading(false);
    });
    return () => { unsub(); window.removeEventListener('storage', onStorage); };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <img src="/elkhen-logo.png" alt="loading" className="w-20 animate-pulse" />
      </div>
    );
  }
  return user? children : <Navigate to="/login" replace />;
};

const App = () => {
  const theme = useGameStore((s) => s.theme);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />

            {/* ✅ الصفحة الرئيسية بقت GameHub */}
            <Route path="/" element={<PrivateRoute><GameHub /></PrivateRoute>} />

            {/* ✅ صفحة الفئات القديمة اتنقلت هنا */}
            <Route path="/categories" element={<PrivateRoute><Index /></PrivateRoute>} />

            <Route path="/board" element={<PrivateRoute><Board /></PrivateRoute>} />
            <Route path="/question" element={<PrivateRoute><Question /></PrivateRoute>} />
            <Route path="/victory" element={<PrivateRoute><Victory /></PrivateRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;