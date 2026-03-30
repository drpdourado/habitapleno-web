import admin from 'firebase-admin';
import fs from 'fs';

const FILE_NEW = './service-account-new.json';
const newCredentials = JSON.parse(fs.readFileSync(FILE_NEW, 'utf8'));
const newApp = admin.initializeApp({ credential: admin.credential.cert(newCredentials) });
const db = newApp.firestore();

async function forceProfiles() {
  const targetId = 'profile_1770562086870';
  const condoId = 'vista-verde-01';

  const allPermissions = {
      gas: 'all', financial: 'all', units: 'all', mural: 'all', users: 'all',
      profiles: 'all', settings: 'all', history: 'all', reconciliation: 'all',
      documents: 'all', improvements: 'all', categories: 'all', access: 'all',
      ocorrencias: 'all', packages: 'all', manutencoes: 'all', closures: 'all',
      reports: 'all', areas: 'all', polls: 'all', contact: 'all', bank_accounts: 'all'
  };

  // Cria na coleção "profiles" (com s) e "profile" (sem s), só para garantir
  await db.collection('profiles').doc(targetId).set({
    id: targetId,
    name: 'Perfil Temporário de Recuperação',
    description: 'Criado para você conseguir logar.',
    condominiumId: condoId,
    permissions: allPermissions,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await db.collection('profile').doc(targetId).set({
    id: targetId,
    name: 'Perfil Temporário de Recuperação',
    description: 'Criado para você conseguir logar.',
    condominiumId: condoId,
    permissions: allPermissions,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`Sucesso! Criado nas coleções "profiles" e "profile".`);
  process.exit(0);
}

forceProfiles().catch(console.error);
