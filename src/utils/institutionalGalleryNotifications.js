export const GALLERY_NOTIFICATION_LOCK_TTL_MS = 3 * 60 * 1000;

export function toTimestampMillis(value) {
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

export function normalizeFamilyNotificationState(album) {
  const raw = album?.familyNotification && typeof album.familyNotification === 'object'
    ? album.familyNotification
    : {};

  return {
    pending: raw.pending === true,
    pendingRevision: Number.isFinite(raw.pendingRevision) && raw.pendingRevision > 0
      ? Math.floor(raw.pendingRevision)
      : 0,
    pendingLastMediaAt: raw.pendingLastMediaAt || null,
    lastNotifiedAt: raw.lastNotifiedAt || null,
    sendingAt: raw.sendingAt || null,
  };
}

export function isGalleryNotificationSending(album, nowMs = Date.now()) {
  const sendingAtMs = toTimestampMillis(normalizeFamilyNotificationState(album).sendingAt);
  if (!Number.isFinite(sendingAtMs)) return false;
  return nowMs - sendingAtMs < GALLERY_NOTIFICATION_LOCK_TTL_MS;
}

export function countPendingGalleryMedia(mediaItems, album) {
  const items = Array.isArray(mediaItems) ? mediaItems : [];
  const { lastNotifiedAt } = normalizeFamilyNotificationState(album);
  const lastNotifiedAtMs = toTimestampMillis(lastNotifiedAt);

  return items.reduce((count, item) => {
    const createdAtMs = toTimestampMillis(item?.createdAt);
    if (!Number.isFinite(createdAtMs)) return count;
    if (Number.isFinite(lastNotifiedAtMs) && createdAtMs <= lastNotifiedAtMs) {
      return count;
    }
    return count + 1;
  }, 0);
}
