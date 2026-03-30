const admin = require('firebase-admin');
const {
  PROJECT_ID,
  HOST,
  PORTS,
  STORAGE_BUCKET,
  withAdminEmulatorEnv,
} = require('./emulator-config.cjs');
const { waitForEmulators } = require('./wait-for-emulators.cjs');

process.env = withAdminEmulatorEnv(process.env);

function ensureAdminApp() {
  return admin.apps[0] || admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  });
}

async function flushFirestore() {
  const response = await fetch(
    `http://${HOST}:${PORTS.firestore}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo vaciar Firestore emulator: ${response.status} ${text}`);
  }
}

async function flushAuth() {
  const response = await fetch(
    `http://${HOST}:${PORTS.auth}/emulator/v1/projects/${PROJECT_ID}/accounts`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`No se pudo vaciar Auth emulator: ${response.status} ${text}`);
  }
}

async function flushStorage() {
  ensureAdminApp();
  const bucket = admin.storage().bucket(STORAGE_BUCKET);
  const [files] = await bucket.getFiles();
  await Promise.all(files.map((file) => file.delete().catch(() => null)));
}

async function resetEmulators() {
  await waitForEmulators();
  await flushFirestore();
  await flushAuth();
  await flushStorage();
  console.log('Firebase emulators reseteados');
}

module.exports = {
  resetEmulators,
};

if (require.main === module) {
  resetEmulators().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
