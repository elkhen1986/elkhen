import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, RotateCcw, Maximize, Minimize, LogOut, Camera, Shield } from 'lucide-react'
import { auth, db, storage } from '@/lib/firebase'
import { signOut, updateProfile } from 'firebase/auth'
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { ThemeSelector } from '@/components/ThemeSelector'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from 'sonner'

const KEYS = [
  ['د','ج','ح','خ','ه','ع','غ','ف','ق','ث','ص','ض','ذ'],
  ['ط','ك','م','ن','ت','أ','ا','ل','ب','ي','س','ش'],
  ['Enter','ظ','ز','و','ة','ى','ر','ؤ','ء','ئ','⌫']
]

function shuffle(array: string[]) {
  const a = [...array]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Wordle() {
  const navigate = useNavigate()
  const [level, setLevel] = useState(1)
  const [target, setTarget] = useState('')
  const [guesses, setGuesses] = useState<string[]>(Array(5).fill(''))
  const [currentRow, setCurrentRow] = useState(0)
  const [currentGuess, setCurrentGuess] = useState('')
  const [status, setStatus] = useState<'playing'|'won'>('playing')
  const [loading, setLoading] = useState(true)

  // === هيدر الهاب ===
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

  // === تحميل الكلمات ===
  const loadProgress = useCallback(async () => {
    const uid = auth.currentUser?.uid
    if (!uid) { setLoading(false); return }
    const userRef = doc(db, 'users', uid)
    const snap = await getDoc(userRef)
    let progress = snap.data()?.wordleProgress
    if (!progress?.wordQueue) {
      const wordsSnap = await getDocs(collection(db, 'wordle_words'))
      const ids = wordsSnap.docs.map(d => d.id)
      progress = { currentLevel: 1, wordQueue: shuffle(ids) }
      await setDoc(userRef, { wordleProgress: progress }, { merge: true })
    }
    setLevel(progress.currentLevel)
    const currentWordId = progress.wordQueue[progress.currentLevel - 1]
    const wordSnap = await getDoc(doc(db, 'wordle_words', currentWordId))
    setTarget(wordSnap.data()?.word || 'بيت')
    setLoading(false)
  }, [])

  useEffect(() => { loadProgress() }, [loadProgress])

  const saveProgress = async (newLevel: number) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const snap = await getDoc(doc(db, 'users', uid))
    const queue = snap.data()?.wordleProgress?.wordQueue || []
    await setDoc(doc(db, 'users', uid), {
      wordleProgress: { currentLevel: newLevel, wordQueue: queue }
    }, { merge: true })
  }

  const getColors = (guess: string) => {
    const colors = Array(target.length).fill('bg-zinc-700/80')
    const t = target.split('')
    const g = guess.split('')
    g.forEach((l,i)=>{ if(l===t[i]){ colors[i]='bg-emerald-500'; t[i]=' ' } })
    g.forEach((l,i)=>{ if(colors[i]!=='bg-emerald-500' && t.includes(l)){ colors[i]='bg-amber-500'; t[t.indexOf(l)]=' ' } })
    return colors
  }

  const nextWord = async () => {
    const newLevel = level + 1
    setLevel(newLevel)
    await saveProgress(newLevel)
    setGuesses(Array(5).fill(''))
    setCurrentRow(0)
    setCurrentGuess('')
    setStatus('playing')
    await loadProgress()
  }

  const resetSameWord = () => {
    setGuesses(Array(5).fill(''))
    setCurrentRow(0)
    setCurrentGuess('')
    setStatus('playing')
    toast.error('حاول مرة تانية')
  }

  const submitGuess = () => {
    if (currentGuess.length!== target.length) return
    const newGuesses = [...guesses]
    newGuesses[currentRow] = currentGuess
    setGuesses(newGuesses)

    if (currentGuess === target) {
      setStatus('won')
      toast.success('صح!')
      setTimeout(nextWord, 1500)
    } else if (currentRow === 4) {
      setTimeout(resetSameWord, 500)
    } else {
      setCurrentRow(r => r + 1)
      setCurrentGuess('')
    }
  }

  const handleKey = (k: string) => {
    if (status!== 'playing' || loading) return
    if (k === 'Enter') submitGuess()
    else if (k === '⌫') setCurrentGuess(g => g.slice(0,-1))
    else if (currentGuess.length < target.length) setCurrentGuess(g => g + k)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleKey('Enter')
      else if (e.key === 'Backspace') handleKey('⌫')
      else if (/[\u0600-\u06FF]/.test(e.key)) handleKey(e.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (loading) return <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center text-white">جاري التحميل...</div>

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

      <div className="relative z-10 flex flex-col min-h-screen pt-10 pb-4 px-2">
        <div className="text-center mb-4">
          <h1 className="text-3xl md:text-3xl font-black text-gradient-primary">Level {level}</h1>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-2 max-w-md mx-auto w-full">
          {guesses.map((g,row)=>{
            const submitted = row < currentRow || (status==='won' && row === currentRow)
            const display = (row===currentRow && status==='playing'? currentGuess : g).padEnd(target.length,' ')
            const colors = submitted? getColors(g) : Array(target.length).fill('bg-zinc-800/70')
            return (
              <div key={row} className="flex gap-1.5 sm:gap-2 justify-center">
                {display.split('').map((ch,i)=>(
                  <div key={i} className={`w- h- max-w- max-h- sm:w-14 sm:h-14 border-2 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-bold backdrop-blur ${colors[i]} ${row===currentRow &&!submitted? 'border-emerald-500 animate-pulse' : 'border-zinc-700/50'}`}>
                    {ch.trim()}
                  </div>
                ))}
              </div>
            )
          })}

          <div className="flex gap-1.5 sm:gap-2 justify-center mt-5 pt-5 border-t border-white/10 w-full">
            {target.split('').map((ch,i)=>(
              <div key={i} className={`w- h- max-w- max-h- sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-xl sm:text-2xl font-black ${status==='won'? 'bg-emerald-600 text-white' : 'bg-zinc-900/40 text-zinc-700 border border-dashed border-zinc-700'}`}>
                {status==='won'? ch : ''}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 w-full max-w- mx-auto">
          {KEYS.map((r,i)=><div key={i} className="flex justify-center gap-1.5 mb-1.5">
            {r.map(k=><button key={k} onClick={()=>handleKey(k)} className={`h-10 sm:h-10 rounded-lg font-bold text- active:scale-95 select-none ${k.length>1?'px-3 bg-zinc-700':'w- max-w- sm:w-12 bg-zinc-800'} hover:bg-zinc-600`}>{k}</button>)}
          </div>)}
          
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