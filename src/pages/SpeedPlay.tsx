import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useGameStore } from "@/store/gameStore";
import { QuestionTimer } from "@/components/game/QuestionTimer";
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage'
import { storage, db, auth } from '@/lib/firebase'
import { collection, getDocs, doc, writeBatch, getDoc, setDoc } from 'firebase/firestore'
import { signOut, updateProfile } from 'firebase/auth'
import * as XLSX from 'xlsx'
import { ArrowRight, Maximize, Minimize, LogOut, Shield, Trophy } from 'lucide-react'
import { ThemeSelector } from '@/components/ThemeSelector'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from 'sonner'
// @ts-ignore
import confetti from 'canvas-confetti'

type SpeedQ = { code: string; question: string; answer: string; category: string }
function shuffle<T>(a: T[]) { const arr=[...a]; for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]]} return arr }

export default function SpeedPlay() {
  const navigate = useNavigate();
  const team1 = useGameStore(s=>s.team1);
  const team2 = useGameStore(s=>s.team2);
  const adjustScore = useGameStore(s=>s.adjustScore);
  const endGame = useGameStore(s=>s.endGame);
  const [questions,setQuestions]=useState<SpeedQ[]>([]); const [idx,setIdx]=useState(0); const [revealed,setRevealed]=useState(false);
  const [seconds,setSeconds]=useState(10); const [total,setTotal]=useState(20); const [loading,setLoading]=useState(true);
  const [gameFinished,setGameFinished]=useState(false);

  const [isFullscreen,setIsFullscreen]=useState(false); const [user,setUser]=useState<{email:string,uid:string,photoURL?:string}|null>(null);
  const [showSubModal,setShowSubModal]=useState(false); const [subInfo,setSubInfo]=useState<any>(null); const fileRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{const onChange=()=>setIsFullscreen(!!document.fullscreenElement); document.addEventListener("fullscreenchange",onChange); return()=>document.removeEventListener("fullscreenchange",onChange)},[]);
  useEffect(()=>{const email=localStorage.getItem("elkhen_user"); if(!email){navigate("/",{replace:true});return}; const loadUser=async()=>{const fbUser=auth.currentUser; const uid=fbUser?.uid||email; let photoURL=localStorage.getItem("elkhen_photo")||undefined; try{const snap=await getDoc(doc(db,"users",uid)); if(snap.exists()){const data=snap.data(); setSubInfo(data); if(data.photoURL){photoURL=data.photoURL; localStorage.setItem("elkhen_photo",photoURL!)}}}catch{} setUser({email,uid,photoURL})}; loadUser()},[navigate]);
  const toggleFullscreen=async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen(); else await document.exitFullscreen()}catch{}};
  const handleLogout=async()=>{try{await signOut(auth)}catch{}; localStorage.removeItem('elkhen_trial'); localStorage.removeItem('isLoggedIn'); localStorage.removeItem('elkhen_user'); localStorage.removeItem('elkhen_photo'); navigate('/',{replace:true})};
  const handleAvatar=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0]; if(!file||!user)return; try{const uid=auth.currentUser?.uid||user.uid; const storageRef=ref(storage,`profile_images/${uid}/avatar.jpg`); await uploadBytes(storageRef,file); const url=await getDownloadURL(storageRef); if(auth.currentUser)await updateProfile(auth.currentUser,{photoURL:url}); await setDoc(doc(db,"users",uid),{photoURL:url,email:user.email,updatedAt:new Date()},{merge:true}); localStorage.setItem("elkhen_photo",url); setUser({...user,photoURL:url}); toast.success("تم تحديث الصورة")}catch{toast.error("فشل رفع الصورة")}};
  const username=user?.email?.split("@")[0]||""; const photoURL=user?.photoURL||`https://api.dicebear.com/7.x/initials/svg?seed=${username}`; const isAdmin=user?.email==="elkhen@elkhen.app";

  useEffect(()=>{const cfg=JSON.parse(localStorage.getItem('speed_config')||'{}'); setSeconds(cfg.seconds||10); setTotal(cfg.count||20); const load=async()=>{try{setLoading(true); const uid=auth.currentUser?.uid; if(!uid)throw new Error('no user'); const url=await getDownloadURL(ref(storage,'questions/speed.xlsx')); const buf=await fetch(url).then(r=>r.arrayBuffer()); const wb=XLSX.read(buf,{type:'array'}); let all:SpeedQ[]=[]; wb.SheetNames.forEach(name=>{const ws=wb.Sheets[name]; const data=XLSX.utils.sheet_to_json(ws) as any[]; data.forEach(row=>{if(row.code&&row.question&&row.answer){all.push({code:String(row.code),question:String(row.question),answer:String(row.answer),category:name})}})}); const usedSnap=await getDocs(collection(db,'users',uid,'usedQuestions_speed')); const usedCodes=usedSnap.docs.map(d=>d.id); let available=all.filter(q=>!usedCodes.includes(q.code)); if(available.length<(cfg.count||20)){const batchDel=writeBatch(db); usedSnap.docs.forEach(d=>batchDel.delete(d.ref)); await batchDel.commit(); available=all} const selected=shuffle(available).slice(0,cfg.count||20); setQuestions(selected); const batch=writeBatch(db); selected.forEach(q=>{const r=doc(db,'users',uid,'usedQuestions_speed',q.code); batch.set(r,{usedAt:new Date(),mode:'speed',category:q.category})}); await batch.commit()}catch(e){console.error(e); alert('فشل تحميل الأسئلة')}finally{setLoading(false)}}; load()},[]);

  const q=questions[idx]; const remaining=total-idx-1; const isLast=idx===questions.length-1;
  const winner = team1.score >= team2.score? team1 : team2;
  const isDraw = team1.score === team2.score;

  // احتفال
  useEffect(()=>{ if(gameFinished){ const end=Date.now()+3000; const frame=()=>{ confetti({particleCount:4,angle:60,spread:55,origin:{x:0}}); confetti({particleCount:4,angle:120,spread:55,origin:{x:1}}); if(Date.now()<end) requestAnimationFrame(frame)}; frame() } },[gameFinished]);

  const next=()=>{setRevealed(false); if(!isLast)setIdx(i=>i+1)};
  const finishGame=()=>setGameFinished(true);
  const givePoint=(team:1|2)=>{adjustScore(team,1); setRevealed(true); if(isLast){ setTimeout(()=>setGameFinished(true), 700) }};
  const takePoint=(team:1|2)=>adjustScore(team,-1);

  if(loading) return <div className="h-screen flex items-center justify-center bg-[#0a0e17] text-white" dir="rtl">جاري تحميل الأسئلة...</div>
  if(!q &&!gameFinished) return <div className="h-screen flex items-center justify-center">لا توجد أسئلة</div>

  return (
    <div className="h-[100dvh] p-3 flex flex-col gap-3 bg-[#0a0e17] relative overflow-hidden" dir="rtl">
      <div className="absolute top-4 left-4 z-50"><ThemeSelector /></div>
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <Button onClick={()=>navigate('/hub')} variant="outline" size="sm" className="glass rounded-full gap-2"><ArrowRight className="w-4 h-4"/><span className="hidden sm:inline text-xs">الساحة</span></Button>
        {isAdmin&&<Button onClick={()=>navigate("/admin")} variant="outline" size="sm" className="glass rounded-full gap-2"><Shield className="w-4 h-4 text-primary"/><span className="hidden sm:inline text-xs">لوحة التحكم</span></Button>}
        {user&&<div className="flex items-center gap-2 glass rounded-full pl-3 pr-1 py-1 cursor-pointer" onClick={()=>setShowSubModal(true)}><span className="text-sm font-bold hidden sm:block">{username}</span><button onClick={e=>{e.stopPropagation();fileRef.current?.click()}}><img src={photoURL} className="w-9 h-9 rounded-full object-cover border-2 border-primary/40"/></button><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar}/></div>}
        <Button onClick={handleLogout} variant="outline" size="icon" className="glass rounded-full w-10 h-10"><LogOut className="w-5 h-5"/></Button>
        <Button onClick={toggleFullscreen} variant="outline" size="icon" className="glass rounded-full w-10 h-10">{isFullscreen?<Minimize className="w-5 h-5"/>:<Maximize className="w-5 h-5"/>}</Button>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-3 max-w-7xl mx-auto w-full min-h-0 pt-16">
        <div className="col-span-2">
          <div className={`h-full glass rounded-2xl p-4 border-pink-500/30 bg-pink-950/30 flex flex-col items-center justify-center transition-all ${gameFinished && winner.name===team2.name &&!isDraw? 'border-2!border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.5)]' : ''}`}>
            <div className="font-bold text-center text-white text-lg mb-2">{team2.name}</div>
            <div className="text-5xl font-black text-pink-400">{team2.score}</div>
            <div className="flex gap-2 mt-4 w-full">
              <button disabled={gameFinished} onClick={()=>takePoint(2)} className="basis-1/3 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 text-sm font-bold text-white">-1</button>
              <button disabled={gameFinished} onClick={()=>givePoint(2)} className="basis-2/3 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-30 text-sm font-bold text-white">+1</button>
            </div>
          </div>
        </div>

        <div className="col-span-8 relative">
          <div className="absolute -inset-1 bg-gradient-to-b from-cyan-500/20 to-blue-600/20 rounded-3xl blur-2xl"></div>
          <div className="relative h-full glass rounded-3xl border-white/15 flex flex-col">
            {!gameFinished? (
              <>
                <div className="p-4 flex items-center justify-between border-b border-white/10 text-white">
                  <div className="text-sm opacity-70">سؤال {idx+1} من {total}</div>
                  <QuestionTimer duration={seconds} isReady={true} key={idx}/>
                  <div className="text-sm opacity-70">متبقي {remaining}</div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <div className="text-xs px-3 py-1 rounded-full bg-white/10 mb-4 text-white">{q?.category}</div>
                  <h2 className="text-2xl md:text-3xl font-black leading-relaxed max-w-3xl text-white" dangerouslySetInnerHTML={{__html:q?.question||''}}/>
                  {revealed&&<div className="mt-6 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/30"><div className="text-xs text-emerald-400 mb-1">الإجابة</div><div className="text-xl font-bold text-white">{q?.answer}</div></div>}
                </div>
                <div className="p-4 border-t border-white/10 flex gap-3">
                  <button onClick={()=>setRevealed(!revealed)} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]">{revealed?'إخفاء':'كشف الإجابة'}</button>
                  {isLast?<button onClick={finishGame} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-black text-white">انتهت المسابقة</button>:<button onClick={next} className="flex-1 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-black text-white">السؤال التالي →</button>}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <Trophy className="w-24 h-24 text-yellow-400 mb-4 animate-bounce" />
                <h1 className="text-4xl md:text-3xl font-black mb-4 leading-[1.6] pb-3 overflow-visible">
                  {isDraw? <span className="text-white">تعادل!</span> : (
                    <div className="flex flex-col items-center gap-5">
                      <span className="text-yellow-400">مبرووووك</span>
                      <span className="text-gradient-primary">{winner.name}</span>
                    </div>
                  )}
                </h1>
                <p className="text-white/70 mt-2">النتيجة النهائية</p>
                <div className="flex gap-12 mt-2">
                  <div><span className="text-blue-400 font-bold">{team1.name}</span> <span className="text-3xl font-black text-white">{team1.score}</span></div>
                  <div><span className="text-pink-400 font-bold">{team2.name}</span> <span className="text-3xl font-black text-white">{team2.score}</span></div>
                </div>
                <div className="flex gap-3 mt-8">
                  <button onClick={()=>{endGame(); navigate('/speed');}} className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-white">جولة جديدة</button>
                  <button onClick={()=>navigate('/hub')} className="px-6 py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 font-bold text-white">الساحة</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-2">
          <div className={`h-full glass rounded-2xl p-4 border-blue-500/30 bg-blue-950/30 flex flex-col items-center justify-center transition-all ${gameFinished && winner.name===team1.name &&!isDraw? 'border-2!border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.5)]' : ''}`}>
            <div className="font-bold text-center text-white text-lg mb-2">{team1.name}</div>
            <div className="text-5xl font-black text-blue-400">{team1.score}</div>
            <div className="flex gap-2 mt-4 w-full">
              <button disabled={gameFinished} onClick={()=>takePoint(1)} className="basis-1/3 py-2 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-30 text-sm font-bold text-white">-1</button>
              <button disabled={gameFinished} onClick={()=>givePoint(1)} className="basis-2/3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-sm font-bold text-white">+1</button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showSubModal} onOpenChange={setShowSubModal}><DialogContent className="glass-strong max-w-sm" dir="rtl"><DialogHeader><DialogTitle className="text-center">اشتراكك</DialogTitle><DialogDescription className="text-center">{username}</DialogDescription></DialogHeader><div className="py-4 text-center">{(()=>{const isTrial=localStorage.getItem("elkhen_trial")==="true"; if(isTrial)return<div className="text-xl font-bold text-yellow-500">وضع التجربة</div>; const end=subInfo?.subscriptionEnd?.toDate?subInfo.subscriptionEnd.toDate():subInfo?.subscriptionEnd?.seconds?new Date(subInfo.subscriptionEnd.seconds*1000):null; const remaining=end?Math.max(0,Math.ceil((end.getTime()-Date.now())/86400000)):0; return<div className="text-2xl font-black text-green-500">{remaining} يوم</div>})()}</div></DialogContent></Dialog>
    </div>
  )
}
