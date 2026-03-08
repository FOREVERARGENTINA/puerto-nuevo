const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');
const {
  STAFF_ROLES,
  sanitizeText,
  hasFamilyAccess,
  isSendingLockActive,
  normalizeFamilyNotification,
  getFamilyRecipients,
  getEffectiveUserRole,
  buildAlbumNotificationBody,
  buildAlbumClickAction,
  countPendingAlbumMedia,
  buildFamilyNotificationState,
  FieldValue,
} = require('../utils/institutionalGalleryNotifications');

const onCallWithCors = (handler) => onCall({ cors: true }, handler);

function requireAlbumId(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'request.data debe ser un objeto');
  }

  if (typeof data.albumId !== 'string') {
    throw new HttpsError('invalid-argument', 'albumId debe ser string');
  }

  const albumId = data.albumId.trim();
  if (!albumId) {
    throw new HttpsError('invalid-argument', 'albumId es requerido');
  }

  if (albumId.length > 128) {
    throw new HttpsError('invalid-argument', 'albumId supera el largo permitido');
  }

  return albumId;
}

async function finalizeAlbumNotification(db, albumRef, startedState) {
  await db.runTransaction(async (tx) => {
    const currentSnap = await tx.get(albumRef);
    if (!currentSnap.exists) return;

    const currentState = normalizeFamilyNotification(currentSnap.data()?.familyNotification);
    const hasNewPendingContent = currentState.pendingRevision > startedState.pendingRevision;

    tx.set(
      albumRef,
      {
        familyNotification: buildFamilyNotificationState({
          pending: hasNewPendingContent,
          pendingRevision: hasNewPendingContent ? currentState.pendingRevision : startedState.pendingRevision,
          pendingLastMediaAt: hasNewPendingContent ? currentState.pendingLastMediaAt : startedState.pendingLastMediaAt,
          lastNotifiedAt: startedState.pendingLastMediaAt,
          sendingAt: null,
        }),
      },
      { merge: true }
    );
  });
}

async function releaseAlbumNotificationLock(albumRef) {
  await albumRef.set(
    {
      familyNotification: {
        sendingAt: null,
      },
    },
    { merge: true }
  );
}

exports.sendInstitutionalGalleryAlbumNotification = onCallWithCors(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado');
  }

  const db = admin.firestore();
  const callerRole = await getEffectiveUserRole(db, request.auth.uid, request.auth.token?.role);
  if (!STAFF_ROLES.has(callerRole)) {
    throw new HttpsError('permission-denied', 'No tiene permisos para enviar esta notificacion');
  }

  const albumId = requireAlbumId(request.data);
  const albumRef = db.collection('gallery-albums').doc(albumId);
  let startedState = null;
  let finalized = false;

  try {
    await db.runTransaction(async (tx) => {
      const albumSnap = await tx.get(albumRef);
      if (!albumSnap.exists) {
        throw new HttpsError('not-found', 'Album no encontrado');
      }

      const albumData = albumSnap.data() || {};
      const familyNotification = normalizeFamilyNotification(albumData.familyNotification);

      if (!familyNotification.pending || !familyNotification.pendingLastMediaAt) {
        throw new HttpsError('failed-precondition', 'No hay contenido pendiente para notificar');
      }

      if (isSendingLockActive(familyNotification.sendingAt)) {
        throw new HttpsError('failed-precondition', 'Ya hay un envio de notificacion en curso');
      }

      startedState = {
        albumName: sanitizeText(albumData.name, 120) || 'este album',
        categoryId: sanitizeText(albumData.categoryId, 128),
        pendingRevision: familyNotification.pendingRevision,
        pendingLastMediaAt: familyNotification.pendingLastMediaAt,
        lastNotifiedAt: familyNotification.lastNotifiedAt,
      };

      tx.set(
        albumRef,
        {
          familyNotification: buildFamilyNotificationState({
            pending: true,
            pendingRevision: familyNotification.pendingRevision,
            pendingLastMediaAt: familyNotification.pendingLastMediaAt,
            lastNotifiedAt: familyNotification.lastNotifiedAt,
            sendingAt: FieldValue.serverTimestamp(),
          }),
        },
        { merge: true }
      );
    });

    if (!startedState?.categoryId) {
      await finalizeAlbumNotification(db, albumRef, startedState);
      finalized = true;
      return { success: true, skipped: true, reason: 'missing-category' };
    }

    const categorySnap = await db.collection('gallery-categories').doc(startedState.categoryId).get();
    const categoryData = categorySnap.exists ? categorySnap.data() || {} : null;
    if (!categoryData || categoryData.isActive === false || !hasFamilyAccess(categoryData)) {
      await finalizeAlbumNotification(db, albumRef, startedState);
      finalized = true;
      return { success: true, skipped: true, reason: 'category-unavailable' };
    }

    const recipients = await getFamilyRecipients(db);
    if (recipients.length === 0) {
      await finalizeAlbumNotification(db, albumRef, startedState);
      finalized = true;
      return { success: true, skipped: true, reason: 'no-recipients' };
    }

    const pendingMediaCount = await countPendingAlbumMedia(
      db,
      albumId,
      startedState.lastNotifiedAt,
      startedState.pendingLastMediaAt
    );

    if (pendingMediaCount === 0) {
      await finalizeAlbumNotification(db, albumRef, startedState);
      finalized = true;
      return { success: true, skipped: true, reason: 'no-media' };
    }

    const pushResult = await sendPushNotificationToUsers(
      {
        title: 'Nuevo contenido en la galeria',
        body: buildAlbumNotificationBody(startedState.albumName, pendingMediaCount),
        clickAction: buildAlbumClickAction(startedState.categoryId, albumId),
      },
      {
        userIds: recipients,
        familyOnly: true,
      }
    );

    await finalizeAlbumNotification(db, albumRef, startedState);
    finalized = true;

    return {
      success: true,
      notifiedMediaCount: pendingMediaCount,
      tokensTargeted: pushResult.tokensTargeted,
      successCount: pushResult.successCount,
      failureCount: pushResult.failureCount,
      cleanedCount: pushResult.cleanedCount,
    };
  } catch (error) {
    if (startedState && !finalized) {
      try {
        await releaseAlbumNotificationLock(albumRef);
      } catch (releaseError) {
        console.error(`[InstitutionalGallery Album ${albumId}] Error liberando lock:`, releaseError);
      }
    }

    if (error instanceof HttpsError) {
      throw error;
    }

    console.error(`[InstitutionalGallery Album ${albumId}] Error enviando notificacion manual:`, error);
    throw new HttpsError('internal', 'No se pudo enviar la notificacion del album');
  }
});
