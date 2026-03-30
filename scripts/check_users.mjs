import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const sandboxKey = JSON.parse(readFileSync('../habitapleno-api/firebase-key.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(sandboxKey)
});

const db = admin.firestore();

async function checkUsers() {
    const querySnapshot = await db.collection('users').get();
    console.log(`Found ${querySnapshot.size} documents in users`);
    querySnapshot.forEach(doc => {
        const data = doc.data();
        console.log("UserID:", doc.id, "Email:", data.email);
        if (data.vinculos) {
            data.vinculos.forEach(v => {
                console.log(`  - Vinculo: CondominiumId: ${v.condominiumId}, UnitId: ${v.unitId}`);
            });
        }
    });
}

checkUsers().catch(console.error);
