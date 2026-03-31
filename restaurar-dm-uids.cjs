const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const auth = admin.auth();
const db = admin.firestore();

const EMAILS_TO_ADD = [
  'hernanfrandolich@gmail.com',
  'careliagajardo@gmail.com'
];

async function main() {
  // Obtener UIDs
  const uids = [];
  for (const email of EMAILS_TO_ADD) {
    try {
      const user = await auth.getUserByEmail(email);
      uids.push(user.uid);
      console.log(`✓ ${email} → ${user.uid}`);
    } catch (err) {
      console.error(`✗ ${email} → NO ENCONTRADO: ${err.message}`);
    }
  }

  if (uids.length === 0) { process.exit(1); }

  // Agregar al array existente sin pisar lo que ya hay
  const dmRef = db.collection('appConfig').doc('directMessages');
  await dmRef.update({
    pilotFamilyUids: admin.firestore.FieldValue.arrayUnion(...uids),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`\n✓ Agregados ${uids.length} UIDs a pilotFamilyUids`);

  // Verificar estado final
  const snap = await dmRef.get();
  console.log('Estado final pilotFamilyUids:', snap.data().pilotFamilyUids);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
