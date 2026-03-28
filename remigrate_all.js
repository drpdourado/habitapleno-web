import admin from 'firebase-admin';
import fs from 'fs';

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

// ========= FASE 1: APAGAR TUDO NO SANDBOX =========
async function deleteCollection(db, collectionRef) {
  const query = collectionRef.limit(500);
  return new Promise((resolve, reject) => {
    deleteQueryBatch(db, query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(db, query, resolve) {
  const snapshot = await query.get();
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }
  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
  process.nextTick(() => {
    deleteQueryBatch(db, query, resolve);
  });
}

async function clearDatabase() {
    console.log("\n[1/2] Apagando TODAS as coleções do banco de dados Sandbox (newDb)...");
    const collections = await newDb.listCollections();
    for (const collection of collections) {
      console.log(`- Apagando raiz e subcoleções de: ${collection.id}...`);
      await deleteCollection(newDb, collection);
    }
}

// ========= FASE 2: COPIAR BANCO ANTIGO 1:1 ===========
async function copyCollection(oldCollRef, newCollRef) {
  const snapshot = await oldCollRef.get();
  if (snapshot.empty) return;
  
  console.log(`> Copiando coleção: ${oldCollRef.path} (${snapshot.size} documentos)`);
  
  let batch = newDb.batch();
  let count = 0;
  
  for (const doc of snapshot.docs) {
    batch.set(newCollRef.doc(doc.id), doc.data());
    count++;
    
    if (count === 500) {
      await batch.commit();
      batch = newDb.batch();
      count = 0;
    }
    
    // MIGRAR SUBCOLEÇÕES RECURSIVAMENTE (ex: polls/votes)
    const subCollections = await doc.ref.listCollections();
    for (const subColl of subCollections) {
      await copyCollection(subColl, newCollRef.doc(doc.id).collection(subColl.id));
    }
  }
  
  if (count > 0) {
    await batch.commit();
  }
}

async function startMigration() {
    console.log("=== INICIANDO RESET GERAL DO SANDBOX ===");
    await clearDatabase();
    console.log("=> Banco Sandbox formatado com sucesso!\n");
    
    console.log("=== INICIANDO CÓPIA DIRETA DO CONDOMANAGER (BANCO LEGADO) ===");
    const oldCollections = await oldDb.listCollections();
    for (const coll of oldCollections) {
       await copyCollection(coll, newDb.collection(coll.id));
    }
    
    console.log("\n=== OPERAÇÃO CONCLUÍDA COMPLETAMENTE ===");
    console.log("Banco Sandbox agora é um clone idêntico do CondoManager.");
    process.exit(0);
}

startMigration().catch(console.error);
