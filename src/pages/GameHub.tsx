import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { Trophy, Gavel, Zap, Crown, LogOut, Camera, Shield, Maximize, Minimize } from 'lucide-react'
import { signOut, updateProfile } from 'firebase/auth'
import { auth, db, storage } from '@/lib/firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { ThemeSelector } from '@/components/ThemeSelector'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from 'sonner'

const modes = [
  {
    id: 'classic',
    title: 'مسابقة خُن',
    tag: 'خُنها',
    desc: 'لو عرفتها.. خُنها.',
    icon: Trophy,
    color: 'from-violet-600 to-indigo-700',
    glow: 'rgba(124,58,237,0.5)',
    path: '/categories',
    active: true,
  },
  {
    id: 'auction',
    title: 'مزاد خُن',
    tag: 'المزاد',
    desc: 'لا مكان للجبناء.',
    icon: Gavel,
    color: 'from-amber-500 to-orange-600',
    glow: 'rgba(245,158,11,0.5)',
    path: '/auction',
    active: false,
  },
  {
    id: 'speed',
    title: 'أسئلة سرعة',
    tag: 'البرق',
    desc: 'خُن قبل ما الوقت يخونك.',
    icon: Zap,
    color: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6,182,212,0.5)',
    path: '/speed',
    active: false,
  },
]

export default function GameHub() {
  const navigate = useNavigate()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [user, setUser] = useState<{email: string, uid: string, photoURL?: string} | null>(null)
  const [showSubModal, setShowSubModal] = useState(false)
  const [subInfo, setSubInfo] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  useEffect(() => {
    const email = localStorage.getItem("elkhen_user")
    if (!email) { navigate("/", { replace: true }); return }

    const loadUser = async () => {
      const fbUser = auth.currentUser
      const uid = fbUser?.uid || email
      let photoURL = localStorage.getItem("elkhen_photo") || undefined
      try {
        const snap = await getDoc(doc(db, "users", uid))
        if (snap.exists()) {
          const data = snap.data()
          setSubInfo(data)
          if (data.photoURL) {
            photoURL = data.photoURL
            localStorage.setItem("elkhen_photo", photoURL!)
          }
        }
      } catch {}
      setUser({ email, uid, photoURL })
    }
    loadUser()
  }, [navigate])

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
      else await document.exitFullscreen()
    } catch {}
  }

  const handleLogout = async () => {
    try { await signOut(auth) } catch {}
    localStorage.removeItem('elkhen_trial')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('elkhen_user')
    localStorage.removeItem('elkhen_photo')
    navigate('/', { replace: true })
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file ||!user) return
    try {
      const uid = auth.currentUser?.uid || user.uid
      const storageRef = ref(storage, `profile_images/${uid}/avatar.jpg`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      if (auth.currentUser) await updateProfile(auth.currentUser, { photoURL: url })
      await setDoc(doc(db, "users", uid), { photoURL: url, email: user.email, updatedAt: new Date() }, { merge: true })
      localStorage.setItem("elkhen_photo", url)
      setUser({...user, photoURL: url })
      toast.success("تم تحديث الصورة")
    } catch (err: any) {
      toast.error("فشل رفع الصورة")
    }
  }

  const username = user?.email?.split("@")[0] || ""
  const photoURL = user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`
  const isAdmin = user?.email === "elkhen@elkhen.app"

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />

      <div className="absolute top-4 left-4 z-50">
        <ThemeSelector />
      </div>

      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        {isAdmin && (
          <Button onClick={() => navigate("/admin")} variant="outline" size="sm" className="glass rounded-full gap-2 hover:bg-primary/20">
            <Shield className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline text-xs font-bold">لوحة التحكم</span>
          </Button>
        )}
        {user && (
          <div
            className="flex items-center gap-2 glass rounded-full pl-3 pr-1 py-1 cursor-pointer hover:bg-white/10 transition"
            onClick={() => setShowSubModal(true)}
            title="عرض الاشتراك"
          >
            <span className="text-sm font-bold hidden sm:block">{username}</span>
            <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }} className="relative group">
              <img src={photoURL} className="w-9 h-9 rounded-full object-cover border-2 border-primary/40 group-hover:border-primary transition" alt="avatar" />
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Camera className="w-4 h-4 text-white" />
              </div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>
        )}
        <Button onClick={handleLogout} variant="outline" size="icon" className="glass rounded-full w-10 h-10 hover:bg-red-500/20 hover:border-red-500/50 group">
          <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-red-400" />
        </Button>
        <Button onClick={toggleFullscreen} variant="outline" size="icon" className="glass rounded-full w-10 h-10">
          {isFullscreen? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8 py-10">
        <div className="text-center mb-6 animate-fade-in">
          <div className="inline-flex items-center gap-3 glass rounded-full px-7 py-2 mb-4">
            <span className="text-red-600 font-black text-xl">خلِّكـ</span>
            <span className="text-yellow-500 font-black text-xl mx-1">قد</span>
            <span className="text-violet-600 font-black text-xl">التحديـ</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-gradient-primary">KHON</h1>
          <p className="text-muted-foreground mt-2">اختار اللعبة وابدأ التحدي</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modes.map((m) => {
            const Icon = m.icon
            return (
              <button
                key={m.id}
                onClick={() => m.active && navigate(m.path)}
                disabled={!m.active}
                className="group relative text-right"
              >
                <div className={`absolute -inset-0.5 bg-gradient-to-br ${m.color} rounded-3xl blur-2xl opacity-40 group-hover:opacity-80 transition duration-500`} style={{ boxShadow: `0 60px ${m.glow}` }} />
                <div className={`relative h-full glass-strong border border-white/10 rounded-3xl p- overflow-hidden transition-all duration-500 group-hover:-translate-y-2 group-hover:border-white/20 ${!m.active? 'opacity-60' : ''}`}>
                  <div className="bg-[#0f1320]/90 backdrop-blur-xl rounded- p-6 h-full">
                    <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                    <div className="relative flex justify-between items-start mb-5">
                      <div className={`p-3.5 rounded-2xl bg-gradient-to-br ${m.color} shadow-lg`} style={{ boxShadow: `0 8px 30px ${m.glow}` }}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-xs px-3 py-1.5 bg-white/10 backdrop-blur rounded-full border border-white/10">{m.tag}</span>
                    </div>
                    <h3 className="text-2xl font-black mb-2">{m.title}</h3>
                    <p className="text-gray-400 text-sm h-12">{m.desc}</p>
                    <div className="mt-6 flex items-center justify-between">
                      <div className="w-12 h- bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                      <span className={`font-bold text-sm transition-all ${m.active? 'text-white group-hover:tracking-wider' : 'text-gray-500'}`}>
                        {m.active? 'العب الآن ←' : 'قريباً'}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* مودال الاشتراك */}
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
                      <a href="https://wa.me/96555959295" target="_blank" rel="noreferrer">
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
  )
}