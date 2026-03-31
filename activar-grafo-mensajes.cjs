/**
 * Activa el grafo social y los DMs para los usuarios del piloto.
 *
 * Grafo (appConfig/social → enabled: true):
 *   - Docentes, Talleristas y Familias del listado ganan acceso al grafo.
 *   - Coordinacion y Superadmin ya lo tienen siempre (por rol).
 *
 * DMs (appConfig/directMessages → pilotFamilyUids):
 *   - Solo las 4 familias del listado pueden enviarse mensajes entre sí.
 *   - enabled se mantiene en false (piloto cerrado).
 *
 * USO: node activar-grafo-mensajes.cjs
 */

const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

// Emails de las 4 familias que también tendrán acceso a DMs
const FAMILY_EMAILS = [
  'javrupp@hotmail.com',    // Javier Rupp
  'vanelowi@gmail.com',     // Vanesa Lowi
  'emilse.bosio@gmail.com', // Emilse Bosio
  'pabli.cesar.t@gmail.com' // Pablo Tocar
];

async function getUidsByEmail(emails) {
  const results = [];
  for (const email of emails) {
    try {
      const userRecord = await auth.getUserByEmail(email);
      results.push({ email, uid: userRecord.uid, found: true });
    } catch (err) {
      results.push({ email, uid: null, found: false, error: err.message });
    }
  }
  return results;
}

async function main() {
  console.log('=== Activar grafo y mensajes ===\n');

  // 1. Buscar UIDs de las 4 familias
  console.log('Buscando UIDs de las familias...');
  const familyResults = await getUidsByEmail(FAMILY_EMAILS);

  familyResults.forEach(({ email, uid, found, error }) => {
    if (found) {
      console.log(`  ✓ ${email} → ${uid}`);
    } else {
      console.log(`  ✗ ${email} → NO ENCONTRADO (${error})`);
    }
  });

  const foundUids = familyResults.filter((r) => r.found).map((r) => r.uid);
  const notFound = familyResults.filter((r) => !r.found);

  if (notFound.length > 0) {
    console.warn(`\n⚠️  ${notFound.length} usuario(s) no encontrados. Continúa con los encontrados.`);
  }

  if (foundUids.length === 0) {
    console.error('\n✗ No se encontró ningún UID de familia. Abortando.');
    process.exit(1);
  }

  // 2. Activar el grafo social (enabled: true)
  console.log('\nActivando grafo social...');
  const socialRef = db.collection('appConfig').doc('social');
  await socialRef.set(
    {
      enabled: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
  console.log('  ✓ appConfig/social → enabled: true');

  // 3. Activar DMs para las familias encontradas (piloto cerrado)
  console.log('\nActivando mensajes directos para familias del piloto...');
  const dmRef = db.collection('appConfig').doc('directMessages');
  await dmRef.set(
    {
      enabled: false,
      pilotFamilyUids: foundUids,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: false } // reemplaza pilotFamilyUids completo (no agrega a lo viejo)
  );
  console.log(`  ✓ appConfig/directMessages → pilotFamilyUids: [${foundUids.join(', ')}]`);
  console.log('  ✓ appConfig/directMessages → enabled: false (piloto cerrado)');

  console.log('\n=== Listo ===');
  console.log('Resumen:');
  console.log('  • Grafo social ACTIVADO para docentes, talleristas y familias del listado.');
  console.log('  • Mensajes directos activados solo para las familias encontradas.');
  familyResults.forEach(({ email, uid, found }) => {
    const icon = found ? '✓' : '✗';
    console.log(`    ${icon} ${email}${found ? '' : ' (no encontrado)'}`);
  });

  process.exit(0);
}

main().catch((err) => {
  console.error('\n✗ Error inesperado:', err.message);
  process.exit(1);
});
