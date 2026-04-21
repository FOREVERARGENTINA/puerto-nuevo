const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');
const { toPlainText } = require('../utils/sanitize');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');
const { filterVisibleUserDocs, filterVisibleUserIds } = require('../utils/testUsers');

const IN_APP_BATCH_LIMIT = 450;

async function runEventSameDayReminder({
  db = admin.firestore(),
  now = new Date(),
} = {}) {
  const { startUtc, endUtc, localDateKey } = getArgentinaDayWindow(now);

  console.log(`Running same-day event reminders for ${localDateKey}`);

  const snapshot = await db
    .collection('events')
    .where('fecha', '>=', admin.firestore.Timestamp.fromDate(startUtc))
    .where('fecha', '<=', admin.firestore.Timestamp.fromDate(endUtc))
    .orderBy('fecha', 'asc')
    .get();

  if (snapshot.empty) {
    console.log('No events found for today.');
    return { success: true, reminders: 0 };
  }

  let remindersSent = 0;

  for (const docSnap of snapshot.docs) {
    const eventData = docSnap.data() || {};
    const eventId = docSnap.id;

    if (eventData.recordatorioEnviado === true) continue;

    try {
      const recipients = await getFamilyRecipientsForEvent(db, eventData);
      if (recipients.length === 0) {
        console.log(`Evento ${eventId}: sin destinatarios para recordatorio.`);
        continue;
      }

      const eventTitle = normalizeString(eventData?.titulo, 140) || 'Hay un evento hoy en el calendario';
      const pushTitle = 'Recordatorio: evento de hoy';
      const reminderMessage = buildReminderMessage(eventData, eventTitle);

      const [inAppCount, pushResult] = await Promise.all([
        createInAppNotifications(db, recipients, eventId, eventData, {
          title: pushTitle,
          message: reminderMessage,
          localDateKey,
        }),
        sendPushNotificationToUsers(
          {
            title: pushTitle,
            body: reminderMessage,
            clickAction: '/portal/familia/eventos',
          },
          {
            userIds: recipients,
            familyOnly: true,
          }
        ),
      ]);

      await db.collection('events').doc(eventId).update({
        recordatorioEnviado: true,
        fechaRecordatorio: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      remindersSent += recipients.length;
      console.log(
        `[Evento ${eventId}] Recordatorio fecha=${localDateKey}, destinatarios=${recipients.length}, In-app=${inAppCount}, Push tokens=${pushResult.tokensTargeted}, success=${pushResult.successCount}, failure=${pushResult.failureCount}, cleaned=${pushResult.cleanedCount}`
      );
    } catch (error) {
      console.error(`Error enviando recordatorio del evento ${eventId}:`, error);
    }
  }

  console.log(`Same-day event reminders sent: ${remindersSent}`);
  return { success: true, reminders: remindersSent };
}

exports.runEventSameDayReminder = runEventSameDayReminder;

exports.sendEventSameDayReminder = onSchedule(
  {
    schedule: '0 8 * * *',
    timeZone: 'America/Argentina/Buenos_Aires',
    region: 'us-central1',
  },
  async () => runEventSameDayReminder()
);

function normalizeString(value, maxLength = 120) {
  return toPlainText(value || '').slice(0, maxLength).trim();
}

async function getFamilyRecipientsForEvent(db, eventData) {
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

    return filterVisibleUserIds(db, Array.from(recipients), { role: 'family' });
  }

  const usersSnapshot = await db
    .collection('users')
    .where('role', '==', 'family')
    .where('disabled', '==', false)
    .get();

  return filterVisibleUserDocs(usersSnapshot.docs, { role: 'family' }).map((doc) => doc.id);
}

async function createInAppNotifications(db, userIds, eventId, eventData, reminderData) {
  if (!Array.isArray(userIds) || userIds.length === 0) return 0;

  const title = normalizeString(reminderData?.title, 80) || 'Recordatorio: evento de hoy';
  const eventTitle = normalizeString(eventData?.titulo, 140) || 'Hay un evento hoy en el calendario';
  const message = normalizeString(reminderData?.message, 220) || eventTitle;
  const now = FieldValue.serverTimestamp();

  let batch = db.batch();
  let writes = 0;
  let total = 0;

  for (const userId of userIds) {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      userId,
      type: 'evento',
      title,
      message,
      metadata: {
        eventId,
        eventTitle,
        tipo: eventData?.tipo || null,
        scope: eventData?.scope || null,
        ambiente: eventData?.ambiente || null,
        reminderType: 'same-day',
        reminderDate: reminderData?.localDateKey || null,
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

function buildReminderMessage(eventData, eventTitle) {
  const hora = normalizeString(eventData?.hora, 20);
  if (hora) return `Hoy a las ${hora}: ${eventTitle}`;
  return `Hoy: ${eventTitle}`;
}

function getArgentinaDayWindow(baseDate) {
  const localDateKey = baseDate.toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  const [year, month, day] = localDateKey.split('-').map(Number);
  // Argentina is UTC-3 year-round; local 00:00 corresponds to UTC 03:00.
  const startUtc = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  const endUtc = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));

  return { startUtc, endUtc, localDateKey };
}
