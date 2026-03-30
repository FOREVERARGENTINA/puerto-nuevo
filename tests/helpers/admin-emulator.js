import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const functionsRequire = createRequire(new URL('../../functions/index.js', import.meta.url));
const admin = functionsRequire('firebase-admin');
const {
  PROJECT_ID,
  STORAGE_BUCKET,
} = require('../../scripts/emulator-config.cjs');

export { admin, PROJECT_ID, STORAGE_BUCKET };

export function getAdminApp() {
  return admin.apps[0] || admin.initializeApp({
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  });
}

export function getAdminDb() {
  getAdminApp();
  return admin.firestore();
}

export async function clearCollection(collectionName, batchSize = 200) {
  const db = getAdminDb();

  while (true) {
    const snapshot = await db.collection(collectionName).limit(batchSize).get();
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    if (snapshot.size < batchSize) return;
  }
}

export async function waitForCollectionMatch(
  collectionName,
  predicate,
  {
    timeoutMs = 8000,
    intervalMs = 150,
  } = {}
) {
  const db = getAdminDb();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const snapshot = await db.collection(collectionName).get();
    const match = snapshot.docs.find((docSnap) => predicate(docSnap));
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`No se encontro coincidencia en ${collectionName} dentro de ${timeoutMs}ms`);
}

export async function deleteAdminApps() {
  await Promise.all(admin.apps.map((app) => app.delete()));
}
