import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const FILE_NEW = './credentials/service-account-new.json';
const newCredentials = JSON.parse(fs.readFileSync(FILE_NEW, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(newCredentials),
  projectId: newCredentials.project_id
});

const newDb = admin.firestore();

async function verify() {
  const condominios = await newDb.collection('condominios').get();
  console.log(`Found ${condominios.size} condominios in the new database.`);
  condominios.forEach(doc => {
    console.log(`Condo ID: ${doc.id}, Data: ${JSON.stringify(doc.data())}`);
  });
}

verify().catch(console.error);
