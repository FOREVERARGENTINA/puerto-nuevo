const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { toPlainText } = require('../utils/sanitize');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');

const LOCK_COLLECTION = 'notificationLocks';
const LOCK_TYPE = 'institutional-gallery-media';
const ALREADY_EXISTS_CODES = new Set([6, '6', 'already-exists', 'ALREADY_EXISTS']);
const NON_SCHOOL_ROLES = new Set(['family', 'aspirante']);

function sanitizeText(value, maxLength = 120) {
  return toPlainText(value || '').slice(0, maxLength).trim();
}

function hasFamilyAccess(categoryData) {
  const allowedRoles = Array.isArray(categoryData?.allowedRoles)
    ? categoryData.allowedRoles
    : [];

  return allowedRoles.includes('family');
}

async function acquireNotificationLock(mediaId) {
  const db = admin.firestore();
  const lockId = `${LOCK_TYPE}-${mediaId}`;
  const lockRef = db.collection(LOCK_COLLECTION).doc(lockId);

  try {
    await lockRef.create({
      type: LOCK_TYPE,
      mediaId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    if (ALREADY_EXISTS_CODES.has(error?.code)) {
      console.log(`[InstitutionalGallery ${mediaId}] lock existente (${lockId}), se omite duplicado.`);
      return false;
    }
    throw error;
  }
}

async function isSchoolUpload(db, uploadedBy) {
  const uploaderId = sanitizeText(uploadedBy, 128);
  if (!uploaderId) return true;

  try {
    const uploaderDoc = await db.collection('users').doc(uploaderId).get();
    if (!uploaderDoc.exists) return true;

    const role = sanitizeText(uploaderDoc.data()?.role, 40).toLowerCase();
    return !NON_SCHOOL_ROLES.has(role);
  } catch (error) {
    console.log('[InstitutionalGallery] No se pudo validar rol de uploadedBy. Se continua con notificacion.', error?.message);
    return true;
  }
}

async function getFamilyRecipients(db) {
  const usersSnapshot = await db
    .collection('users')
    .where('role', '==', 'family')
    .where('disabled', '==', false)
    .get();

  return usersSnapshot.docs
    .map((userDoc) => userDoc.id)
    .filter((uid) => typeof uid === 'string' && uid.trim())
    .map((uid) => uid.trim());
}

function buildNotificationBody(categoryName, fileName, mediaType) {
  if (fileName) {
    return `${fileName} ya esta disponible en ${categoryName}`.slice(0, 180);
  }

  if (mediaType === 'video-externo' || mediaType === 'video') {
    return `Se agrego un nuevo video en ${categoryName}`.slice(0, 180);
  }

  return `Hay nuevo contenido en ${categoryName}`.slice(0, 180);
}

exports.onInstitutionalGalleryMediaCreated = onDocumentCreated(
  {
    document: 'gallery-media/{mediaId}',
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const mediaId = event.params.mediaId;
    const mediaData = snapshot.data() || {};
    const db = admin.firestore();

    try {
      const lockAcquired = await acquireNotificationLock(mediaId);
      if (!lockAcquired) return;

      const schoolUpload = await isSchoolUpload(db, mediaData.uploadedBy);
      if (!schoolUpload) {
        console.log(`[InstitutionalGallery ${mediaId}] upload no escolar. Se omite notificacion.`);
        return;
      }

      const categoryId = sanitizeText(mediaData.categoryId, 128);
      if (!categoryId) {
        console.log(`[InstitutionalGallery ${mediaId}] Sin categoryId. Se omite notificacion.`);
        return;
      }

      const categorySnapshot = await db.collection('gallery-categories').doc(categoryId).get();
      if (!categorySnapshot.exists) {
        console.log(`[InstitutionalGallery ${mediaId}] Categoria ${categoryId} no encontrada.`);
        return;
      }

      const categoryData = categorySnapshot.data() || {};
      if (categoryData.isActive === false || !hasFamilyAccess(categoryData)) {
        console.log(`[InstitutionalGallery ${mediaId}] Categoria sin acceso para familias.`);
        return;
      }

      const recipients = await getFamilyRecipients(db);
      if (recipients.length === 0) {
        console.log(`[InstitutionalGallery ${mediaId}] Sin familias destinatarias.`);
        return;
      }

      const categoryName = sanitizeText(categoryData.name, 80) || 'la galeria institucional';
      const fileName = sanitizeText(mediaData.fileName, 120);
      const mediaType = sanitizeText(mediaData.tipo, 40).toLowerCase();
      const pushBody = buildNotificationBody(categoryName, fileName, mediaType);

      const pushResult = await sendPushNotificationToUsers(
        {
          title: 'Nuevo contenido en la galeria',
          body: pushBody,
          clickAction: '/portal/familia/galeria',
        },
        {
          userIds: recipients,
          familyOnly: true,
        }
      );

      console.log(
        `[InstitutionalGallery ${mediaId}] category=${categoryId}, recipients=${recipients.length}, tokens=${pushResult.tokensTargeted}, success=${pushResult.successCount}, failure=${pushResult.failureCount}, cleaned=${pushResult.cleanedCount}`
      );
    } catch (error) {
      console.error(`[InstitutionalGallery ${mediaId}] Error enviando push:`, error);
    }
  }
);

