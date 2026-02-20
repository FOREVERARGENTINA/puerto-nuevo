const admin = require('firebase-admin');
const { toPlainText } = require('./sanitize');

const MAX_IN_QUERY = 10;
const MAX_MULTICAST_TOKENS = 500;
const MAX_ARRAY_REMOVE_TOKENS = 20;
const DEFAULT_CLICK_ACTION = '/portal/familia';
const DEFAULT_TITLE = 'Puerto Nuevo';
const DEFAULT_BODY = 'Tienes una notificacion nueva';

const CLEANUP_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

function chunkArray(items, size) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function sanitizeToken(tokenValue) {
  if (typeof tokenValue !== 'string') return null;
  const token = tokenValue.trim();
  return token ? token : null;
}

async function resolveUsersAndTokens(userIds, options = {}) {
  const familyOnly = options.familyOnly !== false;
  const uniqueUserIds = Array.from(
    new Set(
      (Array.isArray(userIds) ? userIds : [])
        .filter((uid) => typeof uid === 'string')
        .map((uid) => uid.trim())
        .filter(Boolean)
    )
  );

  const tokenOwners = new Map();
  if (uniqueUserIds.length === 0) {
    return { tokens: [], tokenOwners, usersLoaded: 0 };
  }

  let usersLoaded = 0;
  const userChunks = chunkArray(uniqueUserIds, MAX_IN_QUERY);

  for (const userChunk of userChunks) {
    const usersSnap = await admin
      .firestore()
      .collection('users')
      .where(admin.firestore.FieldPath.documentId(), 'in', userChunk)
      .get();

    usersSnap.forEach((userDoc) => {
      usersLoaded++;
      const userData = userDoc.data() || {};

      if (userData.disabled === true) return;
      if (familyOnly && userData.role !== 'family') return;

      const tokens = Array.isArray(userData.fcmTokens) ? userData.fcmTokens : [];
      tokens.forEach((tokenValue) => {
        const token = sanitizeToken(tokenValue);
        if (!token) return;
        if (!tokenOwners.has(token)) {
          tokenOwners.set(token, new Set());
        }
        tokenOwners.get(token).add(userDoc.id);
      });
    });
  }

  return {
    tokens: Array.from(tokenOwners.keys()),
    tokenOwners,
    usersLoaded,
  };
}

async function cleanupInvalidTokens(invalidTokens, tokenOwners) {
  if (!(invalidTokens instanceof Set) || invalidTokens.size === 0) {
    return 0;
  }

  const uidToTokens = new Map();

  invalidTokens.forEach((token) => {
    const owners = tokenOwners.get(token);
    if (!owners) return;

    owners.forEach((uid) => {
      if (!uidToTokens.has(uid)) {
        uidToTokens.set(uid, new Set());
      }
      uidToTokens.get(uid).add(token);
    });
  });

  let cleanedCount = 0;

  for (const [uid, tokenSet] of uidToTokens.entries()) {
    const tokens = Array.from(tokenSet);
    const tokenChunks = chunkArray(tokens, MAX_ARRAY_REMOVE_TOKENS);

    for (const tokenChunk of tokenChunks) {
      try {
        await admin
          .firestore()
          .collection('users')
          .doc(uid)
          .set(
            {
              fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokenChunk),
              fcmTokensUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        cleanedCount += tokenChunk.length;
      } catch (error) {
        console.error(`[pushNotifications] Error limpiando tokens para ${uid}:`, error);
      }
    }
  }

  return cleanedCount;
}

async function sendPushNotificationToUsers(payload, options = {}) {
  const {
    userIds = [],
    familyOnly = true,
  } = options;

  const title = toPlainText(payload?.title || DEFAULT_TITLE).slice(0, 80) || DEFAULT_TITLE;
  const body = toPlainText(payload?.body || DEFAULT_BODY).slice(0, 200) || DEFAULT_BODY;
  const clickAction = typeof payload?.clickAction === 'string' && payload.clickAction.trim()
    ? payload.clickAction.trim()
    : DEFAULT_CLICK_ACTION;

  const { tokens, tokenOwners, usersLoaded } = await resolveUsersAndTokens(userIds, { familyOnly });
  if (tokens.length === 0) {
    return {
      usersLoaded,
      tokensTargeted: 0,
      successCount: 0,
      failureCount: 0,
      cleanedCount: 0,
    };
  }

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = new Set();

  const tokenChunks = chunkArray(tokens, MAX_MULTICAST_TOKENS);
  for (const tokenChunk of tokenChunks) {
    const response = await admin.messaging().sendEachForMulticast({
      data: {
        title,
        body,
        clickAction,
        url: clickAction,
      },
      tokens: tokenChunk,
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((result, idx) => {
      if (!result.error?.code) return;
      if (!CLEANUP_ERROR_CODES.has(result.error.code)) return;
      invalidTokens.add(tokenChunk[idx]);
    });
  }

  const cleanedCount = await cleanupInvalidTokens(invalidTokens, tokenOwners);

  return {
    usersLoaded,
    tokensTargeted: tokens.length,
    successCount,
    failureCount,
    cleanedCount,
  };
}

module.exports = {
  resolveUsersAndTokens,
  sendPushNotificationToUsers,
};
