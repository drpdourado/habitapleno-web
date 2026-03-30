import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const credPath = 'scripts/credentials/service-account-old.json';
const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(credentials)
  });
}

const db = admin.firestore();

async function inspectCondo() {
  const condoId = 'vista-verde-01';
  const doc = await db.collection('condominios').doc(condoId).get();
  
  if (doc.exists) {
    console.log('--- CONDOMINIO:', condoId, '---');
    console.log(JSON.stringify(doc.data(), null, 2));
  } else {
    console.log('CONDOMINIO', condoId, 'NOT FOUND');
  }
  process.exit(0);
}

inspectCondo().catch(console.error);
