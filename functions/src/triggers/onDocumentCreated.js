const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { toPlainText } = require('../utils/sanitize');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');

const RECEIPT_RETRY_ATTEMPTS = 4;
const RECEIPT_RETRY_DELAY_MS = 700;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadFamilyPendingReceipts(db, documentId) {
  let snapshot = null;

  for (let attempt = 0; attempt < RECEIPT_RETRY_ATTEMPTS; attempt += 1) {
    snapshot = await db
      .collection('documentReadReceipts')
      .where('documentId', '==', documentId)
      .where('status', '==', 'pending')
      .where('userRole', '==', 'family')
      .get();

    if (!snapshot.empty) {
      return snapshot;
    }

    if (attempt < RECEIPT_RETRY_ATTEMPTS - 1) {
      await sleep(RECEIPT_RETRY_DELAY_MS * (attempt + 1));
    }
  }

  return snapshot;
}

/**
 * Trigger cuando se crea un documento.
 * Para documentos dirigidos a familias envia push (sin email) usando
 * documentReadReceipts como source of truth de destinatarios.
 */
exports.onDocumentWithMandatoryReading = onDocumentCreated(
  {
    document: 'documents/{documentId}',
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const documentData = snapshot.data() || {};
    const documentId = event.params.documentId;
    const targetRoles = Array.isArray(documentData.roles) ? documentData.roles : [];

    if (!targetRoles.includes('family')) {
      return;
    }

    try {
      const db = admin.firestore();
      const receiptsSnapshot = await loadFamilyPendingReceipts(db, documentId);

      if (!receiptsSnapshot || receiptsSnapshot.empty) {
        console.log(`[Document ${documentId}] sin receipts pendientes de familias.`);
        return;
      }

      const recipients = Array.from(
        new Set(
          receiptsSnapshot.docs
            .map((docRef) => docRef.data()?.userId)
            .filter((uid) => typeof uid === 'string' && uid.trim())
            .map((uid) => uid.trim())
        )
      );

      if (recipients.length === 0) {
        console.log(`[Document ${documentId}] receipts sin userId valido.`);
        return;
      }

      const title = documentData.requiereLectura ? 'Documento obligatorio' : 'Nuevo documento';
      const body = toPlainText(documentData.titulo || '').slice(0, 180) || 'Hay un nuevo documento disponible';

      const pushResult = await sendPushNotificationToUsers(
        {
          title,
          body,
          clickAction: '/portal/familia/documentos',
        },
        {
          userIds: recipients,
          familyOnly: true,
        }
      );

      console.log(
        `[Document ${documentId}] receipts=${receiptsSnapshot.size}, recipients=${recipients.length}, tokens=${pushResult.tokensTargeted}, success=${pushResult.successCount}, failure=${pushResult.failureCount}, cleaned=${pushResult.cleanedCount}`
      );
    } catch (error) {
      console.error(`[Document ${documentId}] Error enviando push:`, error);
    }
  }
);
