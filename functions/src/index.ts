import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// دالة مساعدة للتحقق من الأدمن (من Firestore أو من الـ token)
async function checkIsAdmin(uid: string, token?: any): Promise<boolean> {
  // جرب من Firestore الأول (ده اللي انت عامله)
  const userDoc = await db.collection('users').doc(uid).get();
  const isAdminFirestore = userDoc.data()?.isAdmin === true;
  
  // أو من الـ custom claims (لو فعلته قبل كده)
  const isAdminToken = token?.admin === true;
  
  return isAdminFirestore || isAdminToken;
}

export const adminCreateUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'لازم تسجيل دخول');
  }
  
  const isAdmin = await checkIsAdmin(request.auth.uid, request.auth.token);
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  
  // اللوحة بتبعت username مش email
  const { username, password, email: emailInput, displayName } = request.data as {
    username?: string;
    email?: string;
    password: string;
    displayName?: string;
  };

  const finalUsername = username || displayName || '';
  const email = emailInput || `${finalUsername.toLowerCase()}@elkhen.app`;

  const user = await admin.auth().createUser({ 
    email, 
    password, 
    displayName: finalUsername || '' 
  });

  const now = admin.firestore.Timestamp.now();
  const end = admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.collection('users').doc(user.uid).set({
    email,
    username: finalUsername.toLowerCase(),
    displayName: finalUsername || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    deviceId: null,
    // devices: [],  // ← ملغي - مش هنستخدم array تاني
    subscriptionStart: now,
    subscriptionEnd: end,
    isActive: true,
    isAdmin: false,
    days: 30,
    activatedBy: request.auth.uid,
    activatedAt: admin.firestore.FieldValue.serverTimestamp(),
    role: 'user',
    status: 'active',
  });

  return { uid: user.uid };
});

export const setAdmin = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'لازم تسجيل دخول');
  }
  
  const isAdmin = await checkIsAdmin(request.auth.uid, request.auth.token);
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  
  const { uid } = request.data as { uid: string };
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  
  // حدث Firestore كمان
  await db.collection('users').doc(uid).set({ isAdmin: true }, { merge: true });
  
  return { ok: true };
});

export const verifyDevice = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Login required');
  }

  const uid = request.auth.uid;
  const { deviceId } = request.data as { deviceId: string };
  
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  const userData = snap.data() || {};
  
  const isAdmin = await checkIsAdmin(uid, request.auth.token);

  if (isAdmin) {
    // الأدمن: اسمح من أي جهاز، وحدّث بس آخر جهاز
    await userRef.set({ 
      deviceId: deviceId,
      lastDeviceCheck: admin.firestore.FieldValue.serverTimestamp(),
      isAdmin: true,
    }, { merge: true });
    
    return { ok: true, admin: true };
  }

  // مستخدم عادي: جهاز واحد بس
  if (!userData.deviceId) {
    // أول مرة
    await userRef.set({
      deviceId: deviceId,
      lastDeviceCheck: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return { ok: true };
  }

  if (userData.deviceId !== deviceId) {
    throw new HttpsError('permission-denied', 'الحساب مفتوح على جهاز آخر');
  }

  // نفس الجهاز
  await userRef.update({
    lastDeviceCheck: admin.firestore.FieldValue.serverTimestamp()
  });
  return { ok: true };
});

export const listUsersWithDevices = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'لازم تسجيل دخول');
  }
  
  const isAdmin = await checkIsAdmin(request.auth.uid, request.auth.token);
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  
  const snap = await db.collection('users').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
});

export const unlinkDevice = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'لازم تسجيل دخول');
  }
  
  const isAdmin = await checkIsAdmin(request.auth.uid, request.auth.token);
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  
  const { uid } = request.data as { uid: string };
  const ref = db.collection('users').doc(uid);
  
  // امسح الجهاز المربوط فقط
  await ref.update({ 
    deviceId: null,
    lastDeviceCheck: admin.firestore.FieldValue.serverTimestamp()
  });
  return { ok: true };
});

export const adminSetSubscription = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'لازم تسجيل دخول');
  }
  
  const isAdmin = await checkIsAdmin(request.auth.uid, request.auth.token);
  if (!isAdmin) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  
  const { uid, days = 30 } = request.data as { uid: string; days?: number };
  const userRef = db.collection('users').doc(uid);
  const now = admin.firestore.Timestamp.now();
  const snap = await userRef.get();
  const prevEnd = snap.data()?.subscriptionEnd;

  const start = (prevEnd && prevEnd.toMillis() > now.toMillis()) ? prevEnd : now;
  const end = admin.firestore.Timestamp.fromMillis(
    start.toMillis() + days * 24 * 60 * 60 * 1000
  );

  await userRef.set({
    subscriptionStart: start,
    subscriptionEnd: end,
    isActive: true,
    isAdmin: false,
    days,
    activatedBy: request.auth.uid,
    activatedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'active',
  }, { merge: true });

  return { ok: true, end: end.toDate().toISOString() };
});

// ===== جديد: تسجيل بالرقم + SMS =====
export const finalizePhoneSignup = onCall(async (request) => {
  const { phone, name, password, deviceId } = request.data
  
  // لازم يكون عامل verify بالـ SMS الأول
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'يجب التحقق من الرقم أولاً')
  }
  if (request.auth.token.phone_number !== phone) {
    throw new HttpsError('permission-denied', 'الرقم غير متطابق')
  }
  
  if (!name || name.trim().length < 8) {
    throw new HttpsError('invalid-argument', 'الاسم لازم 8 حروف على الأقل')
  }
  if (!password || password.length < 8) {
    throw new HttpsError('invalid-argument', 'الباسورد لازم 8 حروف على الأقل')
  }

  // رقم واحد = حساب واحد
  const existing = await db.collection('users').where('phone', '==', phone).limit(1).get()
  if (!existing.empty) {
    throw new HttpsError('already-exists', 'الرقم ده مسجل قبل كده')
  }

  const email = `${phone.replace('+','') }@phone.elkhen.app`
  const userRecord = await admin.auth().createUser({
    phoneNumber: phone,
    email,
    password,
    displayName: name.trim(),
  })

  const now = admin.firestore.Timestamp.now()
  const trialEnd = admin.firestore.Timestamp.fromMillis(now.toMillis() + 7*24*60*60*1000)

  await db.collection('users').doc(userRecord.uid).set({
    phone,
    displayName: name.trim(),
    email,
    isActive: true,
    isAdmin: false,
    deviceId: deviceId || null,
    subscription: {
      type: 'trial',
      startDate: now,
      endDate: trialEnd,
    },
    createdAt: now,
  })

  return { success: true, uid: userRecord.uid }
})