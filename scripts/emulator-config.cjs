const path = require('path');

const PROJECT_ID = 'demo-puerto-nuevo';
const HOST = '127.0.0.1';
const PORTS = {
  ui: 4000,
  auth: 9099,
  firestore: 8080,
  functions: 5001,
  storage: 9199,
  vite: 5173,
  viteTest: 4173,
};
const STORAGE_BUCKET = `${PROJECT_ID}.firebasestorage.app`;
const ROOT_DIR = path.resolve(__dirname, '..');

function withFrontendEmulatorEnv(baseEnv = process.env, overrides = {}) {
  return {
    ...baseEnv,
    VITE_USE_FIREBASE_EMULATORS: '1',
    VITE_FIREBASE_PROJECT_ID: PROJECT_ID,
    VITE_FIREBASE_API_KEY: 'demo-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: `${PROJECT_ID}.firebaseapp.com`,
    VITE_FIREBASE_STORAGE_BUCKET: STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
    VITE_FIREBASE_APP_ID: '1:1234567890:web:demo-puerto-nuevo',
    VITE_FIREBASE_MEASUREMENT_ID: 'G-DEMOFIREBASE',
    VITE_FIREBASE_EMULATOR_HOST: HOST,
    VITE_FIREBASE_AUTH_EMULATOR_PORT: String(PORTS.auth),
    VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: String(PORTS.firestore),
    VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT: String(PORTS.functions),
    VITE_FIREBASE_STORAGE_EMULATOR_PORT: String(PORTS.storage),
    ...overrides,
  };
}

function withAdminEmulatorEnv(baseEnv = process.env, overrides = {}) {
  return {
    ...baseEnv,
    GCLOUD_PROJECT: PROJECT_ID,
    FIREBASE_AUTH_EMULATOR_HOST: `${HOST}:${PORTS.auth}`,
    FIRESTORE_EMULATOR_HOST: `${HOST}:${PORTS.firestore}`,
    FIREBASE_STORAGE_EMULATOR_HOST: `${HOST}:${PORTS.storage}`,
    ...overrides,
  };
}

function buildStorageDownloadUrl(objectPath) {
  return `http://${HOST}:${PORTS.storage}/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(objectPath)}?alt=media`;
}

module.exports = {
  PROJECT_ID,
  HOST,
  PORTS,
  STORAGE_BUCKET,
  ROOT_DIR,
  withFrontendEmulatorEnv,
  withAdminEmulatorEnv,
  buildStorageDownloadUrl,
};
