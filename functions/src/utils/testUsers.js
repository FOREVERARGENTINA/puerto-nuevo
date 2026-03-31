const admin = require('firebase-admin');
const { FieldPath } = require('firebase-admin/firestore');

const MAX_IN_QUERY = 10;

function chunkArray(items, size) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function isTestUser(userData = {}) {
  return userData?.isTestUser === true;
}

function isVisibleUserData(userData = {}) {
  return userData?.disabled !== true && !isTestUser(userData);
}

function filterVisibleUserDocs(docs = [], options = {}) {
  const requiredRole = typeof options?.role === 'string' ? options.role.trim() : '';

  return (Array.isArray(docs) ? docs : []).filter((userDoc) => {
    const userData = typeof userDoc?.data === 'function' ? (userDoc.data() || {}) : (userDoc || {});
    if (!isVisibleUserData(userData)) return false;
    if (requiredRole && userData.role !== requiredRole) return false;
    return true;
  });
}

async function filterVisibleUserIds(db, userIds = [], options = {}) {
  const requiredRole = typeof options?.role === 'string' ? options.role.trim() : '';
  const normalizedIds = Array.from(
    new Set(
      (Array.isArray(userIds) ? userIds : [])
        .filter((uid) => typeof uid === 'string')
        .map((uid) => uid.trim())
        .filter(Boolean)
    )
  );

  if (normalizedIds.length === 0) return [];

  const visibleIds = new Set();
  const chunks = chunkArray(normalizedIds, MAX_IN_QUERY);

  for (const chunk of chunks) {
    const snapshot = await db
      .collection('users')
      .where(FieldPath.documentId(), 'in', chunk)
      .get();

    filterVisibleUserDocs(snapshot.docs, { role: requiredRole }).forEach((userDoc) => {
      visibleIds.add(userDoc.id);
    });
  }

  return normalizedIds.filter((uid) => visibleIds.has(uid));
}

module.exports = {
  isTestUser,
  isVisibleUserData,
  filterVisibleUserDocs,
  filterVisibleUserIds,
};
