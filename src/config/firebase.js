import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const PROD_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyB9ZC5CLGhtdm1_6Vjm5ASHW1xepoBO9PU',
  authDomain: 'puerto-nuevo-montessori.firebaseapp.com',
  projectId: 'puerto-nuevo-montessori',
  storageBucket: 'puerto-nuevo-montessori.firebasestorage.app',
  messagingSenderId: '651913667566',
  appId: '1:651913667566:web:1421f44f25481685d664ff',
  measurementId: 'G-3LQTZK2KNN'
};

const DEFAULT_EMULATOR_PROJECT_ID = 'demo-puerto-nuevo';
const DEFAULT_EMULATOR_HOST = '127.0.0.1';

const readPort = (rawValue, fallback) => {
  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const isUsingFirebaseEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === '1';

export const firebaseEmulatorConfig = {
  host: import.meta.env.VITE_FIREBASE_EMULATOR_HOST || DEFAULT_EMULATOR_HOST,
  authPort: readPort(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT, 9099),
  firestorePort: readPort(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT, 8080),
  functionsPort: readPort(import.meta.env.VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT, 5001),
  storagePort: readPort(import.meta.env.VITE_FIREBASE_STORAGE_EMULATOR_PORT, 9199)
};

const emulatorProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_EMULATOR_PROJECT_ID;

const firebaseConfig = isUsingFirebaseEmulators
  ? {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${emulatorProjectId}.firebaseapp.com`,
      projectId: emulatorProjectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${emulatorProjectId}.firebasestorage.app`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1234567890',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1234567890:web:demo-puerto-nuevo',
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-DEMOFIREBASE'
    }
  : PROD_FIREBASE_CONFIG;

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

const EMULATOR_CONNECTION_KEY = '__pnFirebaseEmulatorsConnected__';
const globalConnectionState = globalThis;

if (isUsingFirebaseEmulators && !globalConnectionState[EMULATOR_CONNECTION_KEY]) {
  connectAuthEmulator(
    auth,
    `http://${firebaseEmulatorConfig.host}:${firebaseEmulatorConfig.authPort}`,
    { disableWarnings: true }
  );
  connectFirestoreEmulator(
    db,
    firebaseEmulatorConfig.host,
    firebaseEmulatorConfig.firestorePort
  );
  connectFunctionsEmulator(
    functions,
    firebaseEmulatorConfig.host,
    firebaseEmulatorConfig.functionsPort
  );
  connectStorageEmulator(
    storage,
    firebaseEmulatorConfig.host,
    firebaseEmulatorConfig.storagePort
  );
  globalConnectionState[EMULATOR_CONNECTION_KEY] = true;
}

export { firebaseConfig };

export default app;
