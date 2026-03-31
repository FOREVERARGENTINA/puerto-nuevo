// scripts/create-e2e-accounts.cjs
// Crea o actualiza cuentas de prueba para E2E con custom claims correctos.
// Lee credenciales desde .env.test.local — no versionar passwords.
// Requiere service-account.json en la raíz del proyecto.
// Correr: node scripts/create-e2e-accounts.cjs

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.test.local'), quiet: true });

const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const TEST_USERS = [
  {
    email: process.env.PLAYWRIGHT_FAMILY_EMAIL,
    password: process.env.PLAYWRIGHT_FAMILY_PASSWORD,
    role: 'family',
    displayName: 'E2E Family',
  },
  {
    email: process.env.PLAYWRIGHT_ADMIN_EMAIL,
    password: process.env.PLAYWRIGHT_ADMIN_PASSWORD,
    role: 'coordinacion',
    displayName: 'E2E Coordinacion',
  },
  {
    email: process.env.PLAYWRIGHT_SUPERADMIN_EMAIL,
    password: process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD,
    role: 'superadmin',
    displayName: 'E2E SuperAdmin',
  },
];

async function createOrUpdateUser({ email, password, role, displayName }) {
  if (!email || !password) {
    throw new Error(`Falta email o password para rol "${role}". Revisar .env.test.local`);
  }

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, { password, displayName });
    console.log(`Usuario ${email} actualizado (password + claims sincronizados).`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      userRecord = await admin.auth().createUser({ email, password, displayName });
      console.log(`Usuario ${email} creado.`);
    } else {
      throw err;
    }
  }

  await admin.auth().setCustomUserClaims(userRecord.uid, { role });

  await admin.firestore().collection('users').doc(userRecord.uid).set(
    {
      email,
      displayName,
      role,
      disabled: false,
      isTestUser: true,
      testUserType: role
    },
    { merge: true }
  );

  console.log(`  → rol "${role}" asignado (uid: ${userRecord.uid})`);
}

async function main() {
  for (const user of TEST_USERS) {
    await createOrUpdateUser(user);
  }
  console.log('\n✓ Cuentas E2E listas y sincronizadas con .env.test.local');
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
