import admin from 'firebase-admin';
import fs from 'fs';

/**
 * Script para re-migrar a coleção de perfis do projeto antigo para o Sandbox.
 * Durante a migração, ele corrige os IDs que foram gerados erroneamente
 * pela API nova (Hashes aleatórios) para o padrão \`profile_...\`.
 * Além disso, ele atualiza a coleção 'users' no Sandbox para não quebrar 
 * vínculos com os perfis cujos IDs foram corrigidos!
 */

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

async function migrateAndFixProfiles() {
  console.log('\n--- Iniciando Migração e Correção de Perfis ---');
  
  // Vamos puxar de 'profiles' (legado) e 'access_profiles' (novo) do banco antigo
  // e unificar tudo na 'access_profiles' do novo banco (sandbox).
  const oldProfilesSnap = await oldDb.collection('profiles').get();
  const oldAccessProfilesSnap = await oldDb.collection('access_profiles').get();
  
  const allDocs = [...oldProfilesSnap.docs, ...oldAccessProfilesSnap.docs];
  
  if (allDocs.length === 0) {
    console.log('Nenhum perfil encontrado no banco antigo.');
    return;
  }

  // Mapa para rastrear IDs antigos que foram modificados -> novos IDs
  const idMapping = new Map();

  let batch = newDb.batch();
  let count = 0;
  let totalMigrated = 0;

  // Filtrar duplicados se a mesma chave existir nas duas coleções (migração parcial prévia)
  const processedIds = new Set();

  for (const doc of allDocs) {
    if (processedIds.has(doc.id)) continue;
    processedIds.add(doc.id);

    const data = doc.data();
    let originalId = doc.id;
    let finalId = originalId;

    // Se o ID não começa com "profile_" e nem "perfil_", consideramos que é um hash aleatório do Firestore.
    // Iremos ajustá-lo para que comece com 'profile_' para manter o padrão.
    if (!originalId.startsWith('profile_') && !originalId.startsWith('perfil_')) {
      finalId = `profile_${originalId}`;
      idMapping.set(originalId, finalId);
    }

    // Se no corpo do dado tem o ID errado, ajusta ele também
    if (data.id) {
        data.id = finalId;
    }

    const docRef = newDb.collection('access_profiles').doc(finalId);
    batch.set(docRef, data);
    
    count++;
    totalMigrated++;

    if (count === 500) {
      await batch.commit();
      batch = newDb.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`Sucesso: ${totalMigrated} perfis migrados/corrigidos para a coleção 'access_profiles'.`);

  // --- Fase 2: Consertar a coleção de Usuários ---
  if (idMapping.size > 0) {
    console.log(`\nDetectados ${idMapping.size} perfis com IDs corrigidos.`);
    console.log('Ajustando vínculos na coleção de usuários para evitar perda de acesso...');

    const usersSnap = await newDb.collection('users').get();
    let userBatch = newDb.batch();
    let usersUpdatedCount = 0;
    let updatesInBatch = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      let needsUpdate = false;
      const vinculos = userData.vinculos || [];

      const updatedVinculos = vinculos.map(v => {
        if (v.profileId && idMapping.has(v.profileId)) {
          needsUpdate = true;
          return { ...v, profileId: idMapping.get(v.profileId) };
        }
        return v;
      });

      if (needsUpdate) {
        userBatch.update(userDoc.ref, { vinculos: updatedVinculos });
        usersUpdatedCount++;
        updatesInBatch++;

        if (updatesInBatch === 500) {
          await userBatch.commit();
          userBatch = newDb.batch();
          updatesInBatch = 0;
        }
      }
    }

    if (updatesInBatch > 0) {
      await userBatch.commit();
    }

    if (usersUpdatedCount > 0) {
       console.log(`Sucesso: Vínculos atualizados em ${usersUpdatedCount} usuários!`);
    } else {
       console.log('Nenhum vínculo de usuário precisou ser atualizado.');
    }
  }

  console.log('\n--- Operação Concluída ---');
  process.exit(0);
}

migrateAndFixProfiles().catch(console.error);
