import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const FILE_OLD = './service-account-old.json';
const FILE_NEW = './service-account-new.json';

if (!fs.existsSync(FILE_OLD) || !fs.existsSync(FILE_NEW)) {
  console.error('ERRO: Arquivos de credenciais não encontrados!');
  process.exit(1);
}

const oldCredentials = JSON.parse(fs.readFileSync(FILE_OLD, 'utf8'));
const newCredentials = JSON.parse(fs.readFileSync(FILE_NEW, 'utf8'));

const oldApp = admin.initializeApp({ credential: admin.credential.cert(oldCredentials) }, 'oldApp');
const newApp = admin.initializeApp({ credential: admin.credential.cert(newCredentials) }, 'newApp');

const oldDb = oldApp.firestore();
const newDb = newApp.firestore();

async function migratePollVotes() {
  console.log('--- Migrando subcoleções: polls/{pollId}/votes ---');
  
  const pollsSnap = await oldDb.collection('polls').get();
  
  if (pollsSnap.empty) {
    console.log('Nenhuma enquete encontrada.');
    return;
  }

  let totalMigrated = 0;
  let batch = newDb.batch();
  let count = 0;

  for (const pollDoc of pollsSnap.docs) {
    const votesSnap = await oldDb.collection(`polls/${pollDoc.id}/votes`).get();
    
    if (!votesSnap.empty) {
      console.log(`Encontrados ${votesSnap.size} votos para a enquete ${pollDoc.id}`);
      
      for (const voteDoc of votesSnap.docs) {
        const data = voteDoc.data();
        const docRef = newDb.doc(`polls/${pollDoc.id}/votes/${voteDoc.id}`);
        batch.set(docRef, data);
        count++;
        totalMigrated++;

        if (count === 500) {
          await batch.commit();
          console.log(`Lote processado... Total acumulado: ${totalMigrated}`);
          batch = newDb.batch();
          count = 0;
        }
      }
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`Sucesso: ${totalMigrated} votos migrados para as enquetes.`);
}

async function runMigration() {
  try {
    await migratePollVotes();
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    await oldApp.delete();
    await newApp.delete();
    process.exit(0);
  }
}

runMigration();
