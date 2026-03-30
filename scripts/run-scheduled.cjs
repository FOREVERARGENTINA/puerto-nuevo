const {
  PROJECT_ID,
  STORAGE_BUCKET,
  withAdminEmulatorEnv,
} = require('./emulator-config.cjs');
const { waitForEmulators } = require('./wait-for-emulators.cjs');

process.env = withAdminEmulatorEnv(process.env);

async function runScheduled() {
  const target = process.argv[2];
  if (!target) {
    throw new Error('Debes indicar "snacks" o "appointments"');
  }

  await waitForEmulators();

  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: PROJECT_ID,
      storageBucket: STORAGE_BUCKET,
    });
  }

  if (target === 'snacks') {
    const { runSnacksReminder } = require('../functions/src/scheduled/snacksReminder');
    const result = await runSnacksReminder();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (target === 'appointments') {
    const { runAppointmentSameDayReminder } = require('../functions/src/scheduled/appointmentSameDayReminder');
    const result = await runAppointmentSameDayReminder();
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  throw new Error(`Scheduled desconocido: ${target}`);
}

runScheduled().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
