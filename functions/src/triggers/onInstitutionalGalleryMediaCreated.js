const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const {
  sanitizeText,
  hasFamilyAccess,
  normalizeFamilyNotification,
  isSchoolUpload,
  buildFamilyNotificationState,
  FieldValue,
} = require('../utils/institutionalGalleryNotifications');

const LOCK_COLLECTION = 'notificationLocks';
const LOCK_TYPE = 'institutional-gallery-media';
const ALREADY_EXISTS_CODES = new Set([6, '6', 'already-exists', 'ALREADY_EXISTS']);

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

async function markAlbumNotificationPending(db, albumId, mediaCreatedAt) {
  const albumRef = db.collection('gallery-albums').doc(albumId);

  await db.runTransaction(async (tx) => {
    const albumSnap = await tx.get(albumRef);
    if (!albumSnap.exists) {
      throw new Error(`Album ${albumId} no encontrado`);
    }

    const albumData = albumSnap.data() || {};
    const currentState = normalizeFamilyNotification(albumData.familyNotification);

    tx.set(
      albumRef,
      {
        familyNotification: buildFamilyNotificationState({
          pending: true,
          pendingRevision: currentState.pendingRevision + 1,
          pendingLastMediaAt: mediaCreatedAt || FieldValue.serverTimestamp(),
          lastNotifiedAt: currentState.lastNotifiedAt,
          sendingAt: currentState.sendingAt,
        }),
      },
      { merge: true }
    );
  });
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
      const albumId = sanitizeText(mediaData.albumId, 128);
      if (!categoryId) {
        console.log(`[InstitutionalGallery ${mediaId}] Sin categoryId. Se omite notificacion.`);
        return;
      }
      if (!albumId) {
        console.log(`[InstitutionalGallery ${mediaId}] Sin albumId. Se omite marcado pendiente.`);
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

      await markAlbumNotificationPending(db, albumId, mediaData.createdAt || null);

      console.log(
        `[InstitutionalGallery ${mediaId}] category=${categoryId}, album=${albumId} marcado con contenido pendiente para notificacion manual.`
      );
    } catch (error) {
      console.error(`[InstitutionalGallery ${mediaId}] Error marcando notificacion pendiente:`, error);
    }
  }
);
