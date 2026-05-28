import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFunctions } from "firebase/functions";

// Firebase config - مشروع elkhen-login
const firebaseConfig = {
  apiKey: "AIzaSyCotgqiPkV6YHAzbUmEn_tHtIMPdAuiByM",
  authDomain: "elkhen-login.firebaseapp.com",
  projectId: "elkhen-login",
  storageBucket: "elkhen-login.firebasestorage.app",
  messagingSenderId: "398315935930",
  appId: "1:398315935930:web:06b4b01f2dea9bcfd18a83"
};

// تهيئة Firebase مرة واحدة - يمنع التكرار مع lib/firebase
const app = getApps().length? getApps()[0] : initializeApp(firebaseConfig);

// تصدير Auth و Functions للاستخدام في باقي التطبيق
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-central1");

// حفظ جلسة تسجيل الدخول
setPersistence(auth, browserLocalPersistence);

createRoot(document.getElementById("root")!).render(<App />);