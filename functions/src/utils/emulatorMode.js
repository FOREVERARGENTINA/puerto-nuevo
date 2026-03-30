function isEmulatorRuntime() {
  return (
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    Boolean(process.env.FIRESTORE_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) ||
    Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST)
  );
}

function getRuntimeProjectId() {
  return process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || 'demo-puerto-nuevo';
}

module.exports = {
  isEmulatorRuntime,
  getRuntimeProjectId,
};
