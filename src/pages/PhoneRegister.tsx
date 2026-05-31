import { useState } from 'react'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { auth, functions } from "@/main"

export default function PhoneRegister() {
  const [step, setStep] = useState<'phone'|'code'|'info'>('phone')
  const [phone, setPhone] = useState('+965')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState<ConfirmationResult | null>(null)
  const [loading, setLoading] = useState(false)

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
    }
    return (window as any).recaptchaVerifier
  }

  const sendCode = async () => {
    try {
      setLoading(true)
      const verifier = setupRecaptcha()
      const result = await signInWithPhoneNumber(auth, phone, verifier)
      setConfirm(result)
      setStep('code')
      alert('تم إرسال الكود')
    } catch (e:any) {
      alert(e.message)
    } finally { setLoading(false) }
  }

  const verifyCode = async () => {
    try {
      setLoading(true)
      await confirm?.confirm(code)
      setStep('info')
    } catch { alert('كود غلط') } finally { setLoading(false) }
  }

  const finish = async () => {
    if (name.trim().length < 8) return alert('الاسم 8 حروف على الأقل')
    if (password.length < 8) return alert('الباسورد 8 حروف على الأقل')
    try {
      setLoading(true)
      const fn = httpsCallable(functions, 'finalizePhoneSignup')
      const deviceId = localStorage.getItem('elkhen_device') || crypto.randomUUID()
      localStorage.setItem('elkhen_device', deviceId)
      await fn({ phone, name, password, deviceId })
      alert('تم إنشاء الحساب! سجل دخول دلوقتي')
      window.location.href = '/login'
    } catch (e:any) {
      alert(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md glass-strong p-6 rounded-2xl">
        <h2 className="text-2xl font-bold mb-4 text-center">إنشاء حساب برقم الهاتف</h2>
        
        {step==='phone' && (
          <>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+965XXXXXXXX" className="w-full p-3 mb-3 rounded bg-background border"/>
            <button onClick={sendCode} disabled={loading} className="w-full p-3 bg-primary text-white rounded font-bold">{loading?'...':'إرسال الكود'}</button>
          </>
        )}

        {step==='code' && (
          <>
            <input value={code} onChange={e=>setCode(e.target.value)} placeholder="الكود" className="w-full p-3 mb-3 rounded bg-background border"/>
            <button onClick={verifyCode} disabled={loading} className="w-full p-3 bg-primary text-white rounded font-bold">تأكيد</button>
          </>
        )}

        {step==='info' && (
          <>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="الاسم (8 حروف+)" className="w-full p-3 mb-3 rounded bg-background border"/>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور (8 حروف+)" className="w-full p-3 mb-3 rounded bg-background border"/>
            <button onClick={finish} disabled={loading} className="w-full p-3 bg-primary text-white rounded font-bold">إنشاء الحساب</button>
          </>
        )}
        <div id="recaptcha-container"></div>
        <p className="text-center mt-4 text-sm">عندك حساب؟ <a href="/login" className="text-primary">سجل دخول</a></p>
      </div>
    </div>
  )
}