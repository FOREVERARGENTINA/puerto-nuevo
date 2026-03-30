import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  PROJECT_ID,
  STORAGE_BUCKET,
  withAdminEmulatorEnv,
} = require('../../scripts/emulator-config.cjs');

Object.assign(process.env, withAdminEmulatorEnv(process.env), {
  FUNCTIONS_EMULATOR: 'true',
  FIREBASE_STORAGE_BUCKET: STORAGE_BUCKET,
  STORAGE_BUCKET,
  FIREBASE_CONFIG: JSON.stringify({
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  }),
});

process.env.GCP_PROJECT = PROJECT_ID;
process.env.TZ = 'America/Argentina/Buenos_Aires';
