import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

const FILE_OLD = './scripts/credentials/service-account-old.json';
const FILE_NEW = './scripts/credentials/service-account-new.json';

if (!fs.existsSync(FILE_OLD) || !fs.existsSync(FILE_NEW)) {
  console.error('[ERRO] Credenciais não encontradas.');
  process.exit(1);
}

const oldCredentials = JSON.parse(fs.readFileSync(FILE_OLD, 'utf8'));
const newCredentials = JSON.parse(fs.readFileSync(FILE_NEW, 'utf8'));

const oldBucketName = 'condomanager-e1390.firebasestorage.app';
const newBucketName = 'habitapleno-sandbox.firebasestorage.app';

try {
    admin.initializeApp({ credential: admin.credential.cert(oldCredentials), storageBucket: oldBucketName }, 'oldApp');
    admin.initializeApp({ credential: admin.credential.cert(newCredentials), storageBucket: newBucketName }, 'newApp');
} catch (e) {
    if (!e.message.includes('already exists')) throw e;
}

const oldApp = admin.app('oldApp');
const newApp = admin.app('newApp');
const oldDb = oldApp.firestore();
const newDb = newApp.firestore();
const oldStorage = oldApp.storage();
const newStorage = newApp.storage();

function renameStrings(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/HabitaPleno/g, 'HabitarPleno').replace(/habitapleno\.com\.br/g, 'habitarpleno\.com\.br');
  }
  if (Array.isArray(obj)) return obj.map(renameStrings);
  if (typeof obj === 'object' && obj !== null) {
    if (obj.constructor && ['Timestamp', 'FieldValue', 'DocumentReference', 'GeoPoint'].includes(obj.constructor.name)) {
        return obj;
    }
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
          newObj[key] = renameStrings(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}

async function deleteCollection(db, collectionRef) {
  const query = collectionRef.limit(500);
  const snapshot = await query.get();
  if (snapshot.size === 0) return;
  const batch = db.batch();
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
  console.log(`- Lote de 500 deletados em ${collectionRef.id}...`);
  return deleteCollection(db, collectionRef);
}

async function clearDatabase() {
    console.log("\n[1/4] Limpando Firestore Sandbox...");
    const collections = await newDb.listCollections();
    for (const collection of collections) {
      console.log(`- Apagando coleção root: ${collection.id}...`);
      await deleteCollection(newDb, collection);
    }
}

async function clearStorage() {
  console.log("\n[2/4] Limpando Storage Sandbox...");
  const bucket = newStorage.bucket();
  try {
    const [files] = await bucket.getFiles();
    if (files.length === 0) return;
    console.log(`- Deletando ${files.length} arquivos antigos...`);
    for (let i = 0; i < files.length; i += 20) {
        await Promise.all(files.slice(i, i + 20).map(file => file.delete().catch(() => {})));
    }
  } catch (err) { console.error("Erro no clearStorage:", err.message); }
}

async function copyCollection(oldCollRef, newCollRef) {
  const snapshot = await oldCollRef.get();
  if (snapshot.empty) return;
  console.log(`- Copiando: ${oldCollRef.path} (${snapshot.size} docs)`);
  
  let batch = newDb.batch();
  let count = 0;
  for (const doc of snapshot.docs) {
    batch.set(newCollRef.doc(doc.id), renameStrings(doc.data()));
    count++;
    if (count === 400) {
        await batch.commit();
        batch = newDb.batch();
        count = 0;
    }
    const subCollections = await doc.ref.listCollections();
    for (const subColl of subCollections) {
        await copyCollection(subColl, newCollRef.doc(doc.id).collection(subColl.id));
    }
  }
  if (count > 0) await batch.commit();
}

async function copyStorage() {
  console.log("\n[4/4] Copiando Storage...");
  const oldBucket = oldStorage.bucket();
  const newBucket = newStorage.bucket();
  try {
    const [files] = await oldBucket.getFiles();
    console.log(`- ${files.length} arquivos encontrados.`);
    for (const file of files) {
      const fileName = file.name;
      process.stdout.write(`  > ${fileName}... `);
      try {
        const safeTempName = `mig-${crypto.randomBytes(8).toString('hex')}.tmp`;
        const tempPath = path.join(os.tmpdir(), safeTempName);
        
        await file.download({ destination: tempPath });
        // CORREÇÃO: bucket.upload em vez de file.upload
        await newBucket.upload(tempPath, {
            destination: fileName,
            metadata: {
                contentType: file.metadata.contentType,
                metadata: file.metadata.metadata || {}
            }
        });
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        console.log("OK");
      } catch (err) {
        console.log(`ERRO Download/Upload Local: ${err.message}. Tentando stream...`);
        try {
            await new Promise((resolve, reject) => {
              file.createReadStream().on('error', reject).pipe(newBucket.file(fileName).createWriteStream({
                  metadata: {
                      contentType: file.metadata.contentType,
                      metadata: file.metadata.metadata || {}
                  }
              })).on('error', reject).on('finish', resolve);
            });
            console.log("OK (stream fallback)");
        } catch (e2) { console.log(`FALHA TOTAL: ${e2.message}`); }
      }
    }
  } catch (err) { console.error("Erro crítico Storage:", err.message); }
}

async function start() {
    try {
        console.log("=========================================");
        console.log("MIGRAÇÃO HABITARPLENO (V. FINAL 2)");
        console.log("=========================================");
        await clearDatabase();
        await clearStorage();
        console.log("\n[3/4] Firestore -> HabitarPleno...");
        const oldCollections = await oldDb.listCollections();
        for (const coll of oldCollections) await copyCollection(coll, newDb.collection(coll.id));
        await copyStorage();
        console.log("\n=== CONCLUÍDO COM SUCESSO! ===");
        process.exit(0);
    } catch (err) {
        console.error("\n[ERRO GERAL]:", err);
        process.exit(1);
    }
}

start();
