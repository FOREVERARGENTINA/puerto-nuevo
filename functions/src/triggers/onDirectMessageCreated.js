const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');

exports.onDirectMessageCreated = onDocumentCreated(
  { document: 'directMessages/{convId}/messages/{msgId}' },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const message = snapshot.data();
    if (!message || !message.authorUid || !message.text) return;

    const convId = event.params.convId;

    // Verificar piloto antes de enviar push
    const configSnap = await admin.firestore().doc('appConfig/directMessages').get();
    let pilotUids = [];
    let isEnabled = false;
    if (configSnap.exists) {
      const config = configSnap.data();
      pilotUids = Array.isArray(config.pilotFamilyUids) ? config.pilotFamilyUids : [];
      isEnabled = Boolean(config.enabled);
      if (!isEnabled && !pilotUids.includes(message.authorUid)) {
        return;
      }
    }

    const convSnap = await admin.firestore().collection('directMessages').doc(convId).get();
    if (!convSnap.exists) return;

    const conv = convSnap.data();
    if (!Array.isArray(conv.participants) || conv.participants.length !== 2) return;
    if (conv.status !== 'active') return;

    const recipientUid = conv.participants.find((uid) => uid !== message.authorUid);
    if (!recipientUid) return;

    // Verificar que el receptor tambien esta en piloto
    if (!isEnabled && !pilotUids.includes(recipientUid)) {
      return;
    }

    // Actualizar metadata del hilo: el trigger es la unica fuente de verdad para
    // lastMessage* y unreadCount[other], nunca el cliente.
    try {
      await admin.firestore().collection('directMessages').doc(convId).update({
        lastMessageAt: FieldValue.serverTimestamp(),
        lastMessageText: String(message.text || '').slice(0, 160),
        lastMessageAuthorUid: message.authorUid,
        updatedAt: FieldValue.serverTimestamp(),
        [`unreadCount.${recipientUid}`]: FieldValue.increment(1)
      });
    } catch (err) {
      console.error('[DM] Error actualizando metadata del hilo:', err);
    }

    const senderName = message.authorName || 'Una familia';
    const body = String(message.text || '').slice(0, 180);

    try {
      await sendPushNotificationToUsers(
        {
          title: `Mensaje de ${senderName}`,
          body: body || 'Nuevo mensaje',
          clickAction: `/portal/familia/mensajes/${convId}`
        },
        {
          userIds: [recipientUid],
          familyOnly: true
        }
      );
    } catch (err) {
      console.error('[Push] Error enviando push de DM:', err);
    }
  }
);
