import admin from 'firebase-admin';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const serviceAccount = require('./serviceAccountKey.json');
const words = require('./wordle_words_500.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const batch = db.batch();
words.forEach(w => {
  const ref = db.collection('wordle_words').doc(w.id);
  batch.set(ref, w);
});
await batch.commit();
console.log('✅ تم رفع 500 كلمة');
