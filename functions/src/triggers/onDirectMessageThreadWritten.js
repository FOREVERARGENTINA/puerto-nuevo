const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

function inboxRef(uid, convId) {
  return admin.firestore().collection('users').doc(uid).collection('directMessageInbox').doc(convId);
}

function buildInboxDoc(convId, conv, ownerUid, otherUid) {
  return {
    convId,
    otherUid,
    // eslint-disable-next-line security/detect-object-injection -- hasOwn check guards access; otherUid is a Firebase UID
    otherName: (conv.participantNames && Object.hasOwn(conv.participantNames, otherUid)) ? conv.participantNames[otherUid] : 'Familia',
    participants: Array.isArray(conv.participants) ? conv.participants : [],
    createdAt: conv.createdAt || null,
    updatedAt: conv.updatedAt || conv.createdAt || null,
    lastMessageAt: conv.lastMessageAt || conv.updatedAt || conv.createdAt || null,
    lastMessageText: conv.lastMessageText || '',
    lastMessageAuthorUid: conv.lastMessageAuthorUid || null,
    // eslint-disable-next-line security/detect-object-injection -- hasOwn check guards access; ownerUid is a Firebase UID
    unreadCount: Number((conv.unreadCount && Object.hasOwn(conv.unreadCount, ownerUid)) ? conv.unreadCount[ownerUid] : 0),
    status: conv.status || 'active',
    blockedBy: conv.blockedBy || null
  };
}

exports.onDirectMessageThreadWritten = onDocumentWritten(
  { document: 'directMessages/{convId}' },
  async (event) => {
    if (!event.data) return;

    const convId = event.params.convId;
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;

    const beforeParticipants = Array.isArray(before?.participants) ? before.participants : [];
    const afterParticipants = Array.isArray(after?.participants) ? after.participants : [];
    const touchedUids = [...new Set([...beforeParticipants, ...afterParticipants].filter(Boolean))];

    if (!after) {
      await Promise.all(touchedUids.map((uid) => inboxRef(uid, convId).delete().catch(() => null)));
      return;
    }

    if (afterParticipants.length !== 2) return;

    const batch = admin.firestore().batch();

    for (const ownerUid of afterParticipants) {
      const otherUid = afterParticipants.find((uid) => uid !== ownerUid);
      if (!otherUid) continue;
      batch.set(
        inboxRef(ownerUid, convId),
        buildInboxDoc(convId, after, ownerUid, otherUid),
        { merge: true }
      );
    }

    await batch.commit();
  }
);
