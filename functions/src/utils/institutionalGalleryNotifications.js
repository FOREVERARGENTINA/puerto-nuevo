const admin = require('firebase-admin');
const { toPlainText } = require('./sanitize');

const NON_SCHOOL_ROLES = new Set(['family', 'aspirante']);
const STAFF_ROLES = new Set(['superadmin', 'coordinacion', 'docente']);
const FAMILY_NOTIFICATION_LOCK_TTL_MS = 3 * 60 * 1000;

function sanitizeText(value, maxLength = 120) {
  return toPlainText(value || '').slice(0, maxLength).trim();
}

function hasFamilyAccess(categoryData) {
  const allowedRoles = Array.isArray(categoryData?.allowedRoles)
    ? categoryData.allowedRoles
    : [];

  return allowedRoles.includes('family');
}

function toTimestampMillis(value) {
  if (!value) return null;

  if (typeof value?.toMillis === 'function') {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function isSendingLockActive(sendingAt, nowMs = Date.now()) {
  const sendingAtMs = toTimestampMillis(sendingAt);
  if (!Number.isFinite(sendingAtMs)) return false;
  return nowMs - sendingAtMs < FAMILY_NOTIFICATION_LOCK_TTL_MS;
}

function normalizeFamilyNotification(rawValue) {
  const raw = rawValue && typeof rawValue === 'object' ? rawValue : {};
  const pendingRevision = Number.isFinite(raw.pendingRevision) && raw.pendingRevision > 0
    ? Math.floor(raw.pendingRevision)
    : 0;

  return {
    pending: raw.pending === true,
    pendingRevision,
    pendingLastMediaAt: raw.pendingLastMediaAt || null,
    lastNotifiedAt: raw.lastNotifiedAt || null,
    sendingAt: raw.sendingAt || null,
  };
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

async function getEffectiveUserRole(db, uid, claimedRole) {
  const normalizedClaimedRole = sanitizeText(claimedRole, 40).toLowerCase();
  if (normalizedClaimedRole) {
    return normalizedClaimedRole;
  }

  if (!uid) return null;

  try {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) return null;
    return sanitizeText(userDoc.data()?.role, 40).toLowerCase() || null;
  } catch {
    return null;
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
    console.log('[InstitutionalGallery] No se pudo validar rol de uploadedBy. Se continua con el flujo.', error?.message);
    return true;
  }
}

function buildAlbumNotificationBody(albumName, mediaCount) {
  const safeAlbumName = sanitizeText(albumName, 100) || 'este album';

  if (mediaCount === 1) {
    return `Se agrego 1 elemento nuevo en "${safeAlbumName}"`.slice(0, 180);
  }

  return `Se agregaron ${mediaCount} elementos nuevos en "${safeAlbumName}"`.slice(0, 180);
}

function buildAlbumClickAction(categoryId, albumId) {
  return `/portal/familia/galeria?categoryId=${encodeURIComponent(categoryId)}&albumId=${encodeURIComponent(albumId)}`;
}

async function countPendingAlbumMedia(db, albumId, lastNotifiedAt, pendingLastMediaAt) {
  const pendingLastMediaAtMs = toTimestampMillis(pendingLastMediaAt);
  if (!Number.isFinite(pendingLastMediaAtMs)) {
    return 0;
  }

  const lastNotifiedAtMs = toTimestampMillis(lastNotifiedAt);
  const snapshot = await db
    .collection('gallery-media')
    .where('albumId', '==', albumId)
    .get();

  let count = 0;
  snapshot.forEach((docSnap) => {
    const mediaCreatedAtMs = toTimestampMillis(docSnap.data()?.createdAt);
    if (!Number.isFinite(mediaCreatedAtMs)) return;
    if (Number.isFinite(lastNotifiedAtMs) && mediaCreatedAtMs <= lastNotifiedAtMs) return;
    if (mediaCreatedAtMs > pendingLastMediaAtMs) return;
    count += 1;
  });

  return count;
}

function buildFamilyNotificationState({
  pending,
  pendingRevision,
  pendingLastMediaAt,
  lastNotifiedAt,
  sendingAt,
}) {
  return {
    pending: pending === true,
    pendingRevision: Number.isFinite(pendingRevision) && pendingRevision > 0
      ? Math.floor(pendingRevision)
      : 0,
    pendingLastMediaAt: pendingLastMediaAt || null,
    lastNotifiedAt: lastNotifiedAt || null,
    sendingAt: sendingAt || null,
  };
}

module.exports = {
  STAFF_ROLES,
  FAMILY_NOTIFICATION_LOCK_TTL_MS,
  sanitizeText,
  hasFamilyAccess,
  toTimestampMillis,
  isSendingLockActive,
  normalizeFamilyNotification,
  getFamilyRecipients,
  getEffectiveUserRole,
  isSchoolUpload,
  buildAlbumNotificationBody,
  buildAlbumClickAction,
  countPendingAlbumMedia,
  buildFamilyNotificationState,
  FieldValue: admin.firestore.FieldValue,
};
