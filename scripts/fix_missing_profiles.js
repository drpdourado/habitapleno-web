import admin from 'firebase-admin';
import fs from 'fs';

const FILE_NEW = './service-account-new.json';

if (!fs.existsSync(FILE_NEW)) {
  console.error('ERRO: Arquivo service-account-new.json não encontrado!');
  process.exit(1);
}

const newCredentials = JSON.parse(fs.readFileSync(FILE_NEW, 'utf8'));
const newApp = admin.initializeApp({ credential: admin.credential.cert(newCredentials) });
const db = newApp.firestore();

async function fixMissingProfiles() {
  console.log('Verificando usuários no Sandbox que perderam seus perfis vinculados...');
  const usersSnap = await db.collection('users').get();
  
  const allPermissions = {
      gas: 'all', financial: 'all', units: 'all', mural: 'all', users: 'all',
      profiles: 'all', settings: 'all', history: 'all', reconciliation: 'all',
      documents: 'all', improvements: 'all', categories: 'all', access: 'all',
      ocorrencias: 'all', packages: 'all', manutencoes: 'all', closures: 'all',
      reports: 'all', areas: 'all', polls: 'all', contact: 'all', bank_accounts: 'all'
  };

  let restoredCount = 0;

  for (const doc of usersSnap.docs) {
    const userData = doc.data();
    const vinculos = userData.vinculos || [];
    
    for (const v of vinculos) {
      if (v.profileId) {
        const profRef = db.collection('access_profiles').doc(v.profileId);
        const profSnap = await profRef.get();
        
        if (!profSnap.exists) {
          console.log(`> Perfil referenciado ausente: ${v.profileId} (Exigido pelo usuário: ${userData.email})`);
          console.log(`  Restaurando perfil ${v.profileId} para recuperar o acesso...`);
          
          await profRef.set({
            id: v.profileId,
            name: 'Perfil Restaurado (Root)',
            description: 'Perfil criado emergencialmente pelo script para não travar o login do usuário',
            condominiumId: v.condominiumId || '',
            permissions: allPermissions,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          restoredCount++;
        }
      }
    }
  }
  
  console.log(`\nConcluído: ${restoredCount} perfis recriados no modo de segurança!`);
  process.exit(0);
}

fixMissingProfiles().catch(console.error);
