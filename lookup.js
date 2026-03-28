import admin from 'firebase-admin';
import fs from 'fs';

const FILE_OLD = './service-account-old.json';
const FILE_NEW = './service-account-new.json';

const oldCredentials = JSON.parse(fs.readFileSync(FILE_OLD, 'utf8'));
const newCredentials = JSON.parse(fs.readFileSync(FILE_NEW, 'utf8'));

const oldApp = admin.initializeApp({ credential: admin.credential.cert(oldCredentials) }, 'oldApp');
const newApp = admin.initializeApp({ credential: admin.credential.cert(newCredentials) }, 'newApp');

const oldDb = oldApp.firestore();
const newDb = newApp.firestore();

async function findProfile() {
  const targetId = 'profile_1770562086870';
  
  // No banco antigo
  let doc = await oldDb.collection('profiles').doc(targetId).get();
  console.log('Old DB (profiles):', doc.exists ? doc.data() : 'NOT FOUND');
  
  doc = await oldDb.collection('access_profiles').doc(targetId).get();
  console.log('Old DB (access_profiles):', doc.exists ? doc.data() : 'NOT FOUND');
  
  // No banco novo
  doc = await newDb.collection('access_profiles').doc(targetId).get();
  console.log('New DB (access_profiles):', doc.exists ? doc.data() : 'NOT FOUND');

  doc = await newDb.collection('profiles').doc(targetId).get();
  console.log('New DB (profiles):', doc.exists ? doc.data() : 'NOT FOUND');
  
  if (!doc.exists) {
    // Busca em todos para ver se estava com outro nome
    const allOld = await oldDb.collection('profiles').get();
    for (let d of allOld.docs) {
      if (d.data().id === targetId || d.id === targetId || d.id === '1770562086870') {
         console.log('FOUND BY SCAN in Old DB profiles under ID:', d.id);
         console.log(d.data());
      }
    }
    const allOldAcc = await oldDb.collection('access_profiles').get();
    for (let d of allOldAcc.docs) {
      if (d.data().id === targetId || d.id === targetId || d.id === '1770562086870') {
         console.log('FOUND BY SCAN in Old DB access_profiles under ID:', d.id);
         console.log(d.data());
         // Vamos copiar pra cá na força bruta!
         console.log('Forcing copy to New DB access_profiles id: ' + targetId);
         await newDb.collection('access_profiles').doc(targetId).set({ ...d.data(), id: targetId });
      }
    }
  }

  process.exit(0);
}
findProfile().catch(console.error);
