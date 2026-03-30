import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const sandboxKey = JSON.parse(readFileSync('../habitapleno-api/firebase-key.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(sandboxKey)
});

const db = admin.firestore();

async function checkDoc() {
    const querySnapshot = await db.collection('reservas').get();
    console.log(`Found ${querySnapshot.size} documents in reservas`);
    querySnapshot.forEach(doc => {
        console.log(doc.id, doc.data());
    });
}

checkDoc().catch(console.error);
