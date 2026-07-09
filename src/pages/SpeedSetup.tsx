import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Maximize, Minimize, LogOut, Shield } from 'lucide-react'
import { auth, db, storage } from '@/lib/firebase'
import { signOut, updateProfile } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { ThemeSelector } from '@/components/ThemeSelector'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from 'sonner'
import { useGameStore } from '@/store/gameStore'

export default function SpeedSetup() {
  const navigate = useNavigate()
  const [team1Name, setTeam1Name] = useState('الفريق الأزرق')
  const [team2Name, setTeam2Name] = useState('الفريق الأحمر')
  const [count, setCount] = useState(20)
  const [seconds, setSeconds] = useState(10)

  // === هيدر مطابق لـ Wordle ===
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
    } catch { toast.error("فشل رفع الصورة") }
  }

  const username = user?.email?.split("@")[0] || ""
  const photoURL = user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${username}`
  const isAdmin = user?.email === "elkhen@elkhen.app"

  const start = () => {
    useGameStore.setState((state) => ({
      team1: { ...state.team1, name: team1Name, score: 0 },
      team2: { ...state.team2, name: team2Name, score: 0 },
      currentTurn: 1,
    }))
    
    localStorage.setItem('speed_config', JSON.stringify({ count, seconds }))
    navigate('/speed/play')
  }

  return (
    <div className="min-h-screen relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/20" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />

      <div className="absolute top-4 left-4 z-50"><ThemeSelector /></div>
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <Button onClick={() => navigate('/hub')} variant="outline" size="sm" className="glass rounded-full gap-2">
          <ArrowRight className="w-4 h-4" />
          <span className="hidden sm:inline text-xs">الساحة</span>
        </Button>
        {isAdmin && (
          <Button onClick={() => navigate("/admin")} variant="outline" size="sm" className="glass rounded-full gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline text-xs">لوحة التحكم</span>
          </Button>
        )}
        {user && (
          <div className="flex items-center gap-2 glass rounded-full pl-3 pr-1 py-1 cursor-pointer" onClick={() => setShowSubModal(true)}>
            <span className="text-sm font-bold hidden sm:block">{username}</span>
            <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }} className="relative group">
              <img src={photoURL} className="w-9 h-9 rounded-full object-cover border-2 border-primary/40" alt="avatar" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>
        )}
        <Button onClick={handleLogout} variant="outline" size="icon" className="glass rounded-full w-10 h-10"><LogOut className="w-5 h-5" /></Button>
        <Button onClick={toggleFullscreen} variant="outline" size="icon" className="glass rounded-full w-10 h-10">
          {isFullscreen? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
        </Button>
      </div>

      <div className="relative z-10 flex flex-col min-h-screen pt-24 pb-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-4xl font-black text-gradient-primary">خُن بسرعة</h1>
          <p className="text-muted-foreground mt-2">جهز الفرق وابدأ التحدي</p>
        </div>

        <div className="w-full max-w-2xl mx-auto glass-strong rounded-3xl p-6 md:p-8 border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="order-2 md:order-1">
              <Input 
                value={team2Name} 
                onChange={e=>setTeam2Name(e.target.value)}
                className="h-14 text-lg font-bold text-center bg-red-950/50 border-red-500/50 focus:border-red-400 text-red-100 placeholder:text-red-300/50"
                placeholder="اسم الفريق الأحمر"
              />
            </div>
            <div className="order-1 md:order-2">
              <Input 
                value={team1Name} 
                onChange={e=>setTeam1Name(e.target.value)}
                className="h-14 text-lg font-bold text-center bg-blue-950/50 border-blue-500/50 focus:border-blue-400 text-blue-100 placeholder:text-blue-300/50"
                placeholder="اسم الفريق الأزرق"
              />
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm mb-3 block font-bold">عدد الأسئلة</label>
              <div className="grid grid-cols-3 gap-3">
                {[10,20,30].map(n => (
                  <Button key={n} variant={count===n?'default':'outline'} onClick={()=>setCount(n)} className="h-12 text-lg font-bold">{n}</Button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="text-sm mb-3 block font-bold">زمن الإجابة</label>
              <div className="grid grid-cols-2 gap-3">
                {[5,10].map(s => (
                  <Button key={s} variant={seconds===s?'default':'outline'} onClick={()=>setSeconds(s)} className="h-12 text-lg font-bold">{s} ثواني</Button>
                ))}
              </div>
            </div>
          </div>
          
          <Button onClick={start} className="w-full mt-8 h-14 text-lg font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90">
            ابدأ التحدي ⚡
          </Button>
        </div>
      </div>

      <Dialog open={showSubModal} onOpenChange={setShowSubModal}>
        <DialogContent className="glass-strong max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">اشتراكك</DialogTitle>
            <DialogDescription className="text-center">{username}</DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            {(() => {
              const isTrial = localStorage.getItem("elkhen_trial") === "true";
              if (isTrial) return <div className="text-xl font-bold text-yellow-500">وضع التجربة</div>
              const end = subInfo?.subscriptionEnd?.toDate? subInfo.subscriptionEnd.toDate() : subInfo?.subscriptionEnd?.seconds? new Date(subInfo.subscriptionEnd.seconds * 1000) : null;
              const remaining = end? Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000)) : 0;
              return <div className="text-2xl font-black text-green-500">{remaining} يوم</div>
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
