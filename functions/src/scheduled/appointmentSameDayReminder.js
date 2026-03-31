const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { FieldPath } = require('firebase-admin/firestore');
const { escapeHtml } = require('../utils/sanitize');
const { sendEmailMessage } = require('../utils/emailDelivery');
const { isEmulatorRuntime } = require('../utils/emulatorMode');
const { isVisibleUserData } = require('../utils/testUsers');

const brevoApiKey = defineSecret('BREVO_API_KEY');

async function runAppointmentSameDayReminder({
  db = admin.firestore(),
  now = new Date(),
  apiKey = brevoApiKey.value(),
} = {}) {
  const { startUtc, endUtc, localDateKey } = getArgentinaDayWindow(now);

  console.log(`Running same-day appointment reminders for ${localDateKey}`);

  const snapshot = await db
    .collection('appointments')
    .where('fechaHora', '>=', admin.firestore.Timestamp.fromDate(startUtc))
    .where('fechaHora', '<=', admin.firestore.Timestamp.fromDate(endUtc))
    .orderBy('fechaHora', 'asc')
    .get();

  if (snapshot.empty) {
    console.log('No appointments found for today.');
    return { success: true, reminders: 0 };
  }

  if (!apiKey && !isEmulatorRuntime()) {
    console.log('BREVO_API_KEY not configured, skipping same-day appointment reminders.');
    return { success: true, reminders: 0, skipped: 'missing-brevo-key' };
  }

  let remindersSent = 0;

  for (const docSnap of snapshot.docs) {
    const appointment = docSnap.data() || {};
    const appointmentId = docSnap.id;

    if (appointment.estado !== 'reservado') continue;

    const appointmentDate = toJsDate(appointment.fechaHora);
    if (!appointmentDate || appointmentDate.getTime() <= now.getTime()) continue;

    const recipients = collectFamilyUids(appointment);
    if (recipients.length === 0) continue;

    const reminderState = appointment.recordatorioReunionMismoDia || {};
    const alreadySentToday = reminderState.fecha === localDateKey
      ? new Set(Array.isArray(reminderState.uids) ? reminderState.uids : [])
      : new Set();

    const pendingRecipients = recipients.filter((uid) => !alreadySentToday.has(uid));
    if (pendingRecipients.length === 0) continue;

    const sentToUids = await sendAppointmentReminderEmails({
      db,
      recipientUids: pendingRecipients,
      appointmentDate,
      modality: appointment.modalidad || null,
      childName: appointment.hijoNombre || appointment.childName || null,
      appointmentId,
      apiKey,
    });

    if (sentToUids.length === 0) continue;

    const mergedUids = Array.from(new Set([...alreadySentToday, ...sentToUids]));
    await db.collection('appointments').doc(appointmentId).update({
      recordatorioReunionMismoDia: {
        fecha: localDateKey,
        uids: mergedUids,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    remindersSent += sentToUids.length;
  }

  console.log(`Same-day appointment reminders sent: ${remindersSent}`);
  return { success: true, reminders: remindersSent };
}

exports.runAppointmentSameDayReminder = runAppointmentSameDayReminder;

exports.sendAppointmentSameDayReminder = onSchedule(
  {
    schedule: '15 8 * * *',
    timeZone: 'America/Argentina/Buenos_Aires',
    region: 'us-central1',
    secrets: [brevoApiKey]
  },
  async () => runAppointmentSameDayReminder()
);

async function sendAppointmentReminderEmails({
  db,
  recipientUids,
  appointmentDate,
  modality,
  childName,
  appointmentId,
  apiKey,
}) {
  const sentToUids = [];
  const batchSize = 10;
  const subject = 'Recordatorio: turno de hoy - Montessori Puerto Nuevo';
  const appointmentUrl = 'https://montessoripuertonuevo.com.ar/portal/familia/turnos';
  const safeAppointmentUrl = escapeHtml(appointmentUrl);

  const fechaTexto = appointmentDate.toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires'
  });

  const safeFechaTexto = escapeHtml(fechaTexto);
  const safeChildName = childName ? escapeHtml(String(childName)) : '';
  const modalidadTexto = formatAppointmentMode(modality);
  const safeModalidadTexto = modalidadTexto ? escapeHtml(modalidadTexto) : '';

  for (let i = 0; i < recipientUids.length; i += batchSize) {
    const chunk = recipientUids.slice(i, i + batchSize);
    const usersSnap = await db
      .collection('users')
      .where(FieldPath.documentId(), 'in', chunk)
      .get();

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data() || {};
      const uid = userDoc.id;
      if (!isVisibleUserData(user)) continue;
      const email = user.email || null;
      if (!email) continue;

      const firstName = getFirstName(user.displayName || user.nombre || user.name || '');
      const safeGreeting = firstName ? `Hola ${escapeHtml(firstName)},` : 'Hola,';

      const html = `
        <div lang="es">
          <p>${safeGreeting}</p>
          <p>Te recordamos que hoy tenés un turno programado en la escuela.</p>
          <p><strong>Horario:</strong> ${safeFechaTexto}</p>
          ${safeModalidadTexto ? `<p><strong>Modalidad:</strong> ${safeModalidadTexto}</p>` : ''}
          ${safeChildName ? `<p><strong>Alumno:</strong> ${safeChildName}</p>` : ''}
          <p style="margin:16px 0;">
            <a href="${safeAppointmentUrl}" style="background-color:#488284;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;">Ver detalle del turno</a>
          </p>
          <p style="font-size:0.92em;color:#555;">
            Si no podes abrir el boton, copia este enlace:<br>
            <a href="${safeAppointmentUrl}" style="color:#1a73e8;">${safeAppointmentUrl}</a>
          </p>
          <p style="color:#666;font-size:0.9em;">Este recordatorio fue enviado automaticamente por la plataforma.</p>
        </div>
      `;

      try {
        const result = await sendEmailMessage({
          apiKey,
          payload: {
            sender: {
              name: 'Montessori Puerto Nuevo',
              email: 'info@montessoripuertonuevo.com.ar'
            },
            to: [{ email }],
            subject,
            htmlContent: html
          },
          source: 'sendAppointmentSameDayReminder',
          metadata: {
            appointmentId,
            userId: uid,
          },
        });

        if (result.mode === 'missing-api-key') continue;
        sentToUids.push(uid);
      } catch (error) {
        console.error(
          `Error sending same-day appointment reminder for appointment ${appointmentId} to ${uid}:`,
          error
        );
      }
    }
  }

  return sentToUids;
}

function collectFamilyUids(appointment) {
  const set = new Set();
  if (Array.isArray(appointment.familiasUids)) {
    appointment.familiasUids.forEach((uid) => {
      if (uid) set.add(uid);
    });
  }

  if (appointment.familiaUid) set.add(appointment.familiaUid);
  return Array.from(set);
}

function toJsDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getArgentinaDayWindow(baseDate) {
  const localDateKey = baseDate.toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires'
  });

  const [year, month, day] = localDateKey.split('-').map(Number);
  // Argentina is UTC-3 year-round; local 00:00 corresponds to UTC 03:00.
  const startUtc = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  const endUtc = new Date(Date.UTC(year, month - 1, day + 1, 2, 59, 59, 999));

  return { startUtc, endUtc, localDateKey };
}

function getFirstName(value) {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  return normalized.split(' ')[0] || '';
}

function formatAppointmentMode(mode) {
  if (mode === 'virtual') return 'Virtual';
  if (mode === 'presencial') return 'Presencial';
  return '';
}
