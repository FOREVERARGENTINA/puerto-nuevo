import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';

const require = createRequire(import.meta.url);
const {
  PROJECT_ID,
  HOST,
  PORTS,
} = require('../../scripts/emulator-config.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..', '..');

let rulesTestEnvironmentPromise;

export async function getRulesTestEnvironment() {
  if (!rulesTestEnvironmentPromise) {
    rulesTestEnvironmentPromise = Promise.all([
      readFile(path.join(ROOT_DIR, 'firestore.rules'), 'utf8'),
      readFile(path.join(ROOT_DIR, 'storage.rules'), 'utf8'),
    ]).then(([firestoreRules, storageRules]) => initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: HOST,
        port: PORTS.firestore,
        rules: firestoreRules,
      },
      storage: {
        host: HOST,
        port: PORTS.storage,
        rules: storageRules,
      },
    }));
  }

  return rulesTestEnvironmentPromise;
}

export async function cleanupRulesTestEnvironment() {
  if (!rulesTestEnvironmentPromise) return;
  const rulesTestEnvironment = await rulesTestEnvironmentPromise;
  await rulesTestEnvironment.cleanup();
  rulesTestEnvironmentPromise = undefined;
}
