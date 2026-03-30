import admin from 'firebase-admin';
import fs from 'fs';

const FILE_NEW = './service-account-new.json';
const newCredentials = JSON.parse(fs.readFileSync(FILE_NEW, 'utf8'));
const newApp = admin.initializeApp({ credential: admin.credential.cert(newCredentials) });
const db = newApp.firestore();

async function checkUser() {
  const usersSnap = await db.collection('users').get();
  
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    let found = false;
    for (const v of (data.vinculos || [])) {
      if (v.profileId && v.profileId.includes('1770562086870')) {
        console.log(`\n=== Usuário encontrado: ${data.email} ===`);
        console.log('Dados do Vínculo que contém o ID:', v);
        
        // Verifica se o perfil bate com os dados
        const profileSnap = await db.collection('profiles').doc(v.profileId).get();
        if (profileSnap.exists) {
           console.log(`Perfil ${v.profileId} EXISTE na coleção 'profiles'!`);
           console.log(`Dados do perfil: `, profileSnap.data());
           
           if (profileSnap.data().condominiumId !== v.condominiumId) {
               console.log(`ALERTA: O CondominiumId do Perfil (${profileSnap.data().condominiumId}) não bate com o do Vínculo do usuário (${v.condominiumId})! Corrigindo.`);
               await db.collection('profiles').doc(v.profileId).update({ condominiumId: v.condominiumId });
           }
        } else {
           console.log(`ERRO: Perfil ${v.profileId} NÃO EXISTE na coleção 'profiles'!`);
           // Create it exactly as requested inside 'profiles' with matching condo
           await db.collection('profiles').doc(v.profileId).set({
               id: v.profileId,
               name: 'Perfil Temporário de Recuperação (Auto-Fix)',
               condominiumId: v.condominiumId || '',
               permissions: {
                  gas: 'all', financial: 'all', units: 'all', mural: 'all', users: 'all',
                  profiles: 'all', settings: 'all', history: 'all', reconciliation: 'all',
                  documents: 'all', improvements: 'all', categories: 'all', access: 'all',
                  ocorrencias: 'all', packages: 'all', manutencoes: 'all', closures: 'all',
                  reports: 'all', areas: 'all', polls: 'all', contact: 'all', bank_accounts: 'all'
               },
               updatedAt: admin.firestore.FieldValue.serverTimestamp()
           });
           console.log(`Criado perfil ${v.profileId} na coleção 'profiles' agora!`);
        }
        found = true;
      }
    }
    
    // Check root profileId as well
    if (!found && data.profileId && data.profileId.includes('1770562086870')) {
        console.log(`\n=== Usuário encontrado: ${data.email} (Root profileId) ===`);
        console.log('profileId root:', data.profileId);
        const profileSnap = await db.collection('profiles').doc(data.profileId).get();
        if (profileSnap.exists) {
           console.log(`Perfil ${data.profileId} EXISTE em 'profiles'`);
        } else {
           console.log(`ERRO: Perfil ${data.profileId} NÃO EXISTE em 'profiles'! Criando...`);
           await db.collection('profiles').doc(data.profileId).set({
               id: data.profileId,
               name: 'Perfil Temporário',
               condominiumId: data.condominiumId || '',
               permissions: {
                  gas: 'all', financial: 'all', units: 'all', mural: 'all', users: 'all',
                  profiles: 'all', settings: 'all', history: 'all', reconciliation: 'all',
                  documents: 'all', improvements: 'all', categories: 'all', access: 'all',
                  ocorrencias: 'all', packages: 'all', manutencoes: 'all', closures: 'all',
                  reports: 'all', areas: 'all', polls: 'all', contact: 'all', bank_accounts: 'all'
               },
               updatedAt: admin.firestore.FieldValue.serverTimestamp()
           });
           console.log('Criado');
        }
    }
  }

  process.exit(0);
}

checkUser().catch(console.error);
