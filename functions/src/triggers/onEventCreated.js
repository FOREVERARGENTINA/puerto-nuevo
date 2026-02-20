const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { toPlainText } = require('../utils/sanitize');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');

const IN_APP_BATCH_LIMIT = 450;

function normalizeString(value, maxLength = 120) {
  return toPlainText(value || '').slice(0, maxLength).trim();
}

async function getFamilyRecipientsForEvent(eventData) {
  const db = admin.firestore();
  const scope = normalizeString(eventData?.scope, 40).toLowerCase();
  const ambiente = normalizeString(eventData?.ambiente, 80);

  if (scope === 'taller' && ambiente) {
    const recipients = new Set();
    const childrenSnapshot = await db
      .collection('children')
      .where('ambiente', '==', ambiente)
      .get();

    childrenSnapshot.forEach((childDoc) => {
      const childData = childDoc.data() || {};
      const responsables = Array.isArray(childData.responsables) ? childData.responsables : [];
      responsables.forEach((uid) => {
        if (typeof uid === 'string' && uid.trim()) recipients.add(uid.trim());
      });
    });

    return Array.from(recipients);
  }

  const usersSnapshot = await db
    .collection('users')
    .where('role', '==', 'family')
    .where('disabled', '==', false)
    .get();

  return usersSnapshot.docs.map((doc) => doc.id);
}

async function createInAppNotifications(userIds, eventId, eventData) {
  if (!Array.isArray(userIds) || userIds.length === 0) return 0;

  const db = admin.firestore();
  const title = 'Nuevo evento';
  const eventTitle = normalizeString(eventData?.titulo, 140) || 'Hay un nuevo evento en el calendario';
  const now = admin.firestore.FieldValue.serverTimestamp();

  let batch = db.batch();
  let writes = 0;
  let total = 0;

  for (const userId of userIds) {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      type: 'evento',
      title,
      message: eventTitle,
      metadata: {
        eventId,
        eventTitle,
        tipo: eventData?.tipo || null,
        scope: eventData?.scope || null,
        ambiente: eventData?.ambiente || null,
      },
      read: false,
      createdAt: now,
      url: '/portal/familia/eventos',
    });
    writes += 1;
    total += 1;

    if (writes >= IN_APP_BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      writes = 0;
    }
  }

  if (writes > 0) {
    await batch.commit();
  }

  return total;
}

exports.onEventCreated = onDocumentCreated(
  {
    document: 'events/{eventId}',
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const eventId = event.params.eventId;
    const eventData = snapshot.data() || {};

    // Si el evento viene atado a un comunicado, ya existe flujo de notificaciones.
    if (eventData.communicationId) {
      console.log(`Evento ${eventId} asociado a comunicado ${eventData.communicationId}. Se omite notificacion duplicada.`);
      return;
    }

    try {
      const recipients = await getFamilyRecipientsForEvent(eventData);
      if (recipients.length === 0) {
        console.log(`Evento ${eventId}: sin destinatarios para notificar.`);
        return;
      }

      const eventTitle = normalizeString(eventData?.titulo, 140) || 'Hay un nuevo evento en el calendario';
      const pushTitle = 'Nuevo evento';

      const [inAppCount, pushResult] = await Promise.all([
        createInAppNotifications(recipients, eventId, eventData),
        sendPushNotificationToUsers(
          {
            title: pushTitle,
            body: eventTitle,
            clickAction: '/portal/familia/eventos',
          },
          {
            userIds: recipients,
            familyOnly: true,
          }
        ),
      ]);

      console.log(
        `[Evento ${eventId}] In-app=${inAppCount}, Push tokens=${pushResult.tokensTargeted}, success=${pushResult.successCount}, failure=${pushResult.failureCount}, cleaned=${pushResult.cleanedCount}`
      );
    } catch (error) {
      console.error(`Error notificando evento ${eventId}:`, error);
    }
  }
);

