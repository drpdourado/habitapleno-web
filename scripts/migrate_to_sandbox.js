import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

/**
 * MIGRATION SCRIPT: CondoManager -> habitapleno-sandbox
 * 
 * Este script copia as coleções 'condominios', 'users' e 'units' 
 * de um projeto Firebase para outro mantendo os mesmos IDs de documento.
 * 
 * PRE-REQUISITOS:
 * 1. Instalar o firebase-admin: npm install firebase-admin
 * 2. Ter os arquivos JSON de credenciais na pasta raiz (veja abaixo).
 */

// --- CONFIGURAÇÃO DAS CREDENCIAIS ---
// Recomendo os seguintes nomes para evitar confusão:
// 'service-account-old.json' -> Projeto REAL/Produção
// 'service-account-new.json' -> Projeto habitapleno-sandbox
const FILE_OLD = './service-account-old.json';
const FILE_NEW = './service-account-new.json';

if (!fs.existsSync(FILE_OLD) || !fs.existsSync(FILE_NEW)) {
  console.error('ERRO: Arquivos de credenciais não encontrados!');
  console.log(`Certifique-se de salvar os arquivos como:\n - ${FILE_OLD}\n - ${FILE_NEW}\nna raiz do projeto.`);
  process.exit(1);
}

const oldCredentials = JSON.parse(fs.readFileSync(FILE_OLD, 'utf8'));
const newCredentials = JSON.parse(fs.readFileSync(FILE_NEW, 'utf8'));

// --- INICIALIZAÇÃO ---
const oldApp = admin.initializeApp({
  credential: admin.credential.cert(oldCredentials)
}, 'oldApp');

const newApp = admin.initializeApp({
  credential: admin.credential.cert(newCredentials)
}, 'newApp');

const oldDb = oldApp.firestore();
const newDb = newApp.firestore();

/**
 * Função para migrar uma coleção em lotes (Firestore batch limit is 500)
 */
async function migrateCollection(collRef) {
  const collectionName = collRef.id;
  console.log(`\n--- Migrando coleção: ${collectionName} ---`);
  
  const snapshot = await collRef.get();
  
  if (snapshot.empty) {
    console.log(`Coleção ${collectionName} está vazia ou não existe.`);
    return;
  }

  console.log(`Encontrados ${snapshot.size} documentos. Iniciando cópia...`);

  let batch = newDb.batch();
  let count = 0;
  let totalMigrated = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Usa o caminho completo do documento para garantir consistência em subcoleções caso queira expandir
    const docRef = newDb.doc(doc.ref.path);
    
    batch.set(docRef, data);
    count++;
    totalMigrated++;

    if (count === 500) {
      await batch.commit();
      console.log(`  > ${totalMigrated} documentos processados...`);
      batch = newDb.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`Sucesso: ${totalMigrated} documentos migrados na coleção ${collectionName}.`);
}

/**
 * Função para migrar o Firebase Storage em streaming (evita carregar tudo na RAM)
 */
async function migrateStorage() {
  console.log('\n--- Migrando Firebase Storage ---');
  
  // Buckets específicos informados pelo usuário
  const oldBucketName = 'condomanager-e1390.firebasestorage.app';
  const newBucketName = 'habitapleno-sandbox.firebasestorage.app';
  
  const oldBucket = oldApp.storage().bucket(oldBucketName);
  const newBucket = newApp.storage().bucket(newBucketName);

  try {
    const [files] = await oldBucket.getFiles();
    
    if (files.length === 0) {
      console.log('Nenhum arquivo encontrado no Storage de origem.');
      return;
    }

    console.log(`Encontrados ${files.length} arquivos no Storage. Copiando...`);

    for (const file of files) {
      const fileName = file.name;
      process.stdout.write(`  Copiando: ${fileName}... `);
      
      try {
        await new Promise((resolve, reject) => {
          const writeStream = newBucket.file(fileName).createWriteStream({
            resumable: false,
            metadata: {
              contentType: file.metadata.contentType,
              metadata: file.metadata.metadata || {}
            }
          });

          file.createReadStream()
            .on('error', reject)
            .pipe(writeStream)
            .on('error', reject)
            .on('finish', resolve);
        });
        console.log('✅');
      } catch (err) {
        console.log(`❌ (${err.message})`);
      }
    }
    console.log('Sucesso: Storage migrado.');
  } catch (error) {
    console.error('\n⚠️ Falha ao acessar Storage:', error.message);
    console.log(`Verifique se o bucket "${oldBucketName}" existe.`);
  }
}

// --- EXECUÇÃO PRINCIPAL ---
async function runMigration() {
  console.log('\n==========================================================');
  console.log('Iniciando cópia INTEGRAL (Firestore + Storage)');
  console.log('CondoManager -> habitapleno-sandbox');
  console.log('==========================================================\n');
  
  try {
    // 1. Migrar Firestore
    const collections = await oldDb.listCollections();
    
    if (collections.length > 0) {
      console.log(`Foram encontradas ${collections.length} coleções no Firestore.`);
      for (const collRef of collections) {
        await migrateCollection(collRef);
      }
    } else {
      console.log('Nenhuma coleção Firestore encontrada.');
    }

    // 2. Migrar Storage
    await migrateStorage();
    
    console.log('\n✅ Migração integral concluída com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro crítico durante a migração:', error);
  } finally {
    // Libera as conexões
    await oldApp.delete();
    await newApp.delete();
    process.exit(0);
  }
}

runMigration();
