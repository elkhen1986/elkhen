import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCotgqiPkV6YHAzbUmEn_tHtIMPdAuiByM",
  authDomain: "elkhen-login.firebaseapp.com",
  projectId: "elkhen-login",
  storageBucket: "elkhen-login.firebasestorage.app",
  messagingSenderId: "398315935930",
  appId: "1:398315935930:web:06b4b01f2dea9bcfd18a83"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);