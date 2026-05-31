import { useState } from 'react'
import { auth } from '../lib/firebase'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

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
      const functions = getFunctions()
      const fn = httpsCallable(functions, 'finalizePhoneSignup')
      const deviceId = localStorage.getItem('deviceId') || crypto.randomUUID()
      localStorage.setItem('deviceId', deviceId)
      await fn({ phone, name, password, deviceId })
      alert('تم إنشاء الحساب! سجل دخول دلوقتي')
      window.location.href = '/login'
    } catch (e:any) {
      alert(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div style={{maxWidth:400,margin:'50px auto',padding:20}}>
      <h2>إنشاء حساب برقم الهاتف</h2>
      
      {step==='phone' && (
        <>
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+965XXXXXXXX" style={{width:'100%',padding:10,margin:'10px 0'}}/>
          <button onClick={sendCode} disabled={loading} style={{width:'100%',padding:12}}>{loading?'...':'إرسال الكود'}</button>
        </>
      )}

      {step==='code' && (
        <>
          <input value={code} onChange={e=>setCode(e.target.value)} placeholder="الكود" style={{width:'100%',padding:10,margin:'10px 0'}}/>
          <button onClick={verifyCode} disabled={loading} style={{width:'100%',padding:12}}>تأكيد</button>
        </>
      )}

      {step==='info' && (
        <>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="الاسم (8 حروف+)" style={{width:'100%',padding:10,margin:'10px 0'}}/>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="كلمة المرور (8 حروف+)" style={{width:'100%',padding:10,margin:'10px 0'}}/>
          <button onClick={finish} disabled={loading} style={{width:'100%',padding:12}}>إنشاء الحساب</button>
        </>
      )}
      <div id="recaptcha-container"></div>
    </div>
  )
}