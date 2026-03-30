const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { isEmulatorRuntime } = require('./emulatorMode');

async function writeEmulatorOutboxEntry({
  type,
  source,
  recipientUids = [],
  recipientEmails = [],
  payload = {},
  metadata = {},
}) {
  if (!isEmulatorRuntime()) {
    return null;
  }

  const db = admin.firestore();
  const docRef = await db.collection('emulatorOutbox').add({
    type,
    source,
    recipientUids,
    recipientEmails,
    payload,
    metadata,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: docRef.id };
}

module.exports = {
  writeEmulatorOutboxEntry,
};
