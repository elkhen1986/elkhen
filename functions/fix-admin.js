const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const UID = "h5tHIqzxJiQ2QmSSw3DiYLuS0q23";

admin.auth().setCustomUserClaims(UID, { admin: true, role: "admin" })
  .then(() => {
    console.log("✅ تم تفعيل الأدمن");
    return admin.firestore().doc(`users/${UID}`).set({
      email: "elkhen@elkhen.app",
      username: "admin",
      role: "admin",
      status: "active",
      deviceId: "admin-console",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  })
  .then(() => {
    console.log("✅ تم تحديث بروفايل الأدمن في Firestore");
    process.exit(0);
  })
  .catch(err => {
    console.error("❌", err);
    process.exit(1);
  });