import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const sandboxKey = JSON.parse(readFileSync('./serviceAccountKey-sandbox.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(sandboxKey)
});

const db = admin.firestore();

async function checkDoc() {
    const id = "e54a2acd-de9b-4b51-bee8-db1ea125c5ca";
    const docRef = db.collection('reservas').doc(id);
    const doc = await docRef.get();
    
    if (doc.exists) {
        console.log("Document exists!", doc.data());
    } else {
        console.log("Document DOES NOT exist!");
    }
}

checkDoc().catch(console.error);
