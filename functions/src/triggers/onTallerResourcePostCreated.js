const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');
const { toPlainText } = require('../utils/sanitize');

const LOCK_COLLECTION = 'notificationLocks';
const LOCK_TYPE = 'taller-resource';
const ALREADY_EXISTS_CODES = new Set([6, '6', 'already-exists', 'ALREADY_EXISTS']);

function sanitizeText(value, maxLength = 120) {
  return toPlainText(value || '').slice(0, maxLength).trim();
}

function toRecipientUid(rawValue) {
  if (typeof rawValue === 'string') {
    const uid = rawValue.trim();
    return uid || null;
  }

  if (rawValue && typeof rawValue.uid === 'string') {
    const uid = rawValue.uid.trim();
    return uid || null;
  }

  return null;
}

async function acquireNotificationLock(tallerId, postId) {
  const db = admin.firestore();
  const lockId = `${LOCK_TYPE}-${tallerId}-${postId}`;
  const lockRef = db.collection(LOCK_COLLECTION).doc(lockId);

  try {
    await lockRef.create({
      type: LOCK_TYPE,
      tallerId,
      postId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    if (ALREADY_EXISTS_CODES.has(error?.code)) {
      console.log(`[ResourcePost ${postId}] lock existente (${lockId}), se omite duplicado.`);
      return false;
    }
    throw error;
  }
}

async function getFamilyRecipientsByAmbiente(ambiente) {
  if (!ambiente) return [];

  const db = admin.firestore();
  const recipients = new Set();

  const childrenSnapshot = await db
    .collection('children')
    .where('ambiente', '==', ambiente)
    .get();

  childrenSnapshot.forEach((childDoc) => {
    const childData = childDoc.data() || {};
    const responsables = Array.isArray(childData.responsables) ? childData.responsables : [];

    responsables.forEach((responsable) => {
      const uid = toRecipientUid(responsable);
      if (uid) recipients.add(uid);
    });
  });

  return Array.from(recipients);
}

exports.onTallerResourcePostCreated = onDocumentCreated(
  {
    document: 'talleres/{tallerId}/resourcePosts/{postId}',
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const { tallerId, postId } = event.params;
    const postData = snapshot.data() || {};

    try {
      const lockAcquired = await acquireNotificationLock(tallerId, postId);
      if (!lockAcquired) return;

      const db = admin.firestore();
      const tallerSnapshot = await db.collection('talleres').doc(tallerId).get();
      if (!tallerSnapshot.exists) {
        console.log(`[ResourcePost ${postId}] Taller ${tallerId} no encontrado.`);
        return;
      }

      const tallerData = tallerSnapshot.data() || {};
      const ambiente = sanitizeText(postData.ambiente || tallerData.ambiente, 80);

      if (!ambiente) {
        console.log(`[ResourcePost ${postId}] Sin ambiente asociado. No se envia push.`);
        return;
      }

      const recipients = await getFamilyRecipientsByAmbiente(ambiente);
      if (recipients.length === 0) {
        console.log(`[ResourcePost ${postId}] Sin familias destinatarias en ambiente ${ambiente}.`);
        return;
      }

      const tallerNombre = sanitizeText(postData.tallerNombre || tallerData.nombre, 120) || 'tu taller';
      const postTitle = sanitizeText(postData.title, 140) || 'Nuevo recurso disponible';
      const itemCount = Number.isFinite(postData.itemCount) && postData.itemCount > 0
        ? Math.floor(postData.itemCount)
        : (Array.isArray(postData.items) ? postData.items.length : 1);

      const pushTitle = `Nuevo recurso en ${tallerNombre}`;
      const pushBody = itemCount > 1
        ? `${postTitle} (${itemCount} recursos)`
        : postTitle;
      const clickAction = `/portal/familia/talleres?tallerId=${encodeURIComponent(tallerId)}&tab=recursos`;

      const pushResult = await sendPushNotificationToUsers(
        {
          title: pushTitle,
          body: pushBody,
          clickAction,
        },
        {
          userIds: recipients,
          familyOnly: true,
        }
      );

      console.log(
        `[ResourcePost ${postId}] recipients=${recipients.length}, tokens=${pushResult.tokensTargeted}, success=${pushResult.successCount}, failure=${pushResult.failureCount}, cleaned=${pushResult.cleanedCount}`
      );
    } catch (error) {
      console.error(`[ResourcePost ${postId}] Error enviando push:`, error);
    }
  }
);
