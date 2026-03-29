const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

const TERMINAL_STATES = new Set(['cancelado', 'completado']);

/**
 * Scheduled function: weekly snacks reminder (Friday 10:00 AM Argentina time).
 * Sends reminders for next week assignments.
 */
exports.sendSnacksReminder = onSchedule(
  {
    schedule: '0 10 * * 5',
    timeZone: 'America/Argentina/Buenos_Aires',
    region: 'us-central1'
  },
  async (_event) => {
    const db = admin.firestore();

    console.log('Running weekly snacks reminder...');

    try {
      const mondayString = getNextMondayString();
      console.log(`Searching assignments for week starting ${mondayString}`);

      const snapshot = await db.collection('snackAssignments').where('fechaInicio', '==', mondayString).get();

      if (snapshot.empty) {
        console.log('No assignments found for next week.');
        return null;
      }

      const writes = [];
      let notificationsSent = 0;

      for (const docSnap of snapshot.docs) {
        const assignment = docSnap.data();
        const assignmentId = docSnap.id;

        const assignmentIsSuspended = assignment.suspendido === true || assignment.estado === 'suspendido';
        const assignmentIsTerminal = TERMINAL_STATES.has(assignment.estado);
        if (assignmentIsSuspended || assignmentIsTerminal) {
          continue;
        }

        if (Array.isArray(assignment.familias) && assignment.familias.length > 0) {
          const isAssignmentConfirmed =
            assignment.confirmadoPorFamilia === true || assignment.estado === 'confirmado';

          const pendingByReminderFlag = assignment.familias.filter((fam) => !fam?.recordatorioEnviado);
          const confirmedFamilies = pendingByReminderFlag.filter((fam) => fam?.confirmed === true);

          const familiesToNotify = pendingByReminderFlag.filter((fam) => {
            if (!fam?.uid || fam.recordatorioEnviado) return false;
            if (isAssignmentConfirmed) return fam.confirmed === true;
            return true;
          });

          const finalFamiliesToNotify =
            isAssignmentConfirmed && confirmedFamilies.length === 0
              ? pendingByReminderFlag.filter((fam) => Boolean(fam?.uid))
              : familiesToNotify;

          const notifiedUids = [];
          for (const fam of finalFamiliesToNotify) {
            writes.push(
              db.collection('communications').add(
                buildReminderCommunication({
                  assignment,
                  assignmentId,
                  recipientUid: fam.uid,
                  recipientName: fam.name || '',
                  isConfirmedReminder: isAssignmentConfirmed
                })
              )
            );
            notificationsSent += 1;
            notifiedUids.push(fam.uid);
          }

          if (notifiedUids.length > 0) {
            const nowIso = new Date().toISOString();
            const updatedFamilies = assignment.familias.map((fam) =>
              notifiedUids.includes(fam.uid)
                ? { ...fam, recordatorioEnviado: true, fechaRecordatorio: nowIso }
                : fam
            );

            writes.push(
              db.collection('snackAssignments').doc(assignmentId).update({
                familias: updatedFamilies,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              })
            );
          }
        } else {
          // Legacy document fallback.
          if (!assignment.familiaUid || assignment.recordatorioEnviado === true) {
            continue;
          }

          const isAssignmentConfirmed =
            assignment.confirmadoPorFamilia === true || assignment.estado === 'confirmado';

          writes.push(
            db.collection('communications').add(
              buildReminderCommunication({
                assignment,
                assignmentId,
                recipientUid: assignment.familiaUid,
                recipientName: assignment.familiaNombre || '',
                isConfirmedReminder: isAssignmentConfirmed
              })
            )
          );
          notificationsSent += 1;

          writes.push(
            db.collection('snackAssignments').doc(assignmentId).update({
              recordatorioEnviado: true,
              fechaRecordatorio: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            })
          );
        }
      }

      await Promise.all(writes);

      console.log(`Weekly snack reminders sent: ${notificationsSent}`);
      return { success: true, count: notificationsSent };
    } catch (error) {
      console.error('Error sending snack reminders:', error);
      throw error;
    }
  }
);

function buildReminderCommunication({
  assignment,
  assignmentId,
  recipientUid,
  recipientName,
  isConfirmedReminder
}) {
  const dateRange = `del ${formatDate(assignment.fechaInicio)} al ${formatDate(assignment.fechaFin)}`;
  const familyFirstName = getFirstName(recipientName);
  const childFirstName = getFirstName(assignment.childName);
  const ambienteLabel = formatAmbiente(assignment.ambiente);
  const targetLabel = childFirstName || ambienteLabel;
  const greeting = familyFirstName ? `Hola ${familyFirstName},` : 'Hola,';
  const automaticFooter =
    'Este recordatorio fue enviado automaticamente por la plataforma sobre una asignacion realizada por el equipo del colegio.';

  const body = isConfirmedReminder
    ? `${greeting}\n\nTe recordamos que tu semana de snacks es ${dateRange} para ${targetLabel}.\n\nPor favor, trae los ingredientes el dia lunes segun el listado que corresponde a ${ambienteLabel}.\n\nGracias por tu colaboracion.\n\n${automaticFooter}`
    : `${greeting}\n\nTe recordamos que la proxima semana (${dateRange}) te corresponde traer los snacks para ${targetLabel}.\n\nPor favor, confirma o solicita cambio desde el portal en "Mis Turnos de Snacks".\n\n${automaticFooter}`;

  return {
    title: 'Recordatorio de snacks de la proxima semana',
    body,
    destinatarios: [recipientUid],
    type: 'individual',
    sentBy: 'sistema',
    sentByDisplayName: 'Sistema',
    sendByEmail: true,
    hasPendingAttachments: false,
    requiresConfirmation: false,
    requiereLecturaObligatoria: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    tipo: 'recordatorio_snacks',
    metadata: {
      assignmentId,
      fechaInicio: assignment.fechaInicio,
      fechaFin: assignment.fechaFin,
      childName: assignment.childName || null,
      ambiente: assignment.ambiente || null,
      confirmado: Boolean(isConfirmedReminder)
    }
  };
}

function getNextMondayString() {
  const today = new Date();
  const baseDate = new Date(today);
  baseDate.setHours(0, 0, 0, 0);

  // 0=Sunday, 1=Monday, ..., 6=Saturday
  const dayOfWeek = baseDate.getDay();
  const daysUntilNextMonday = ((8 - dayOfWeek) % 7) || 7;

  baseDate.setDate(baseDate.getDate() + daysUntilNextMonday);
  return baseDate.toISOString().split('T')[0];
}

function formatDate(dateString) {
  const date = parseIsoDateAsNoonUtc(dateString);
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires'
  });
}

function parseIsoDateAsNoonUtc(dateString) {
  const match = String(dateString || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return new Date(`${dateString}T00:00:00`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);

  // Use noon UTC to avoid timezone backshift when rendering in America/Argentina/Buenos_Aires.
  return new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
}

function getFirstName(value) {
  const normalized = String(value || '').trim().replace(/\s+/g, ' ');
  if (!normalized) return '';

  return normalized.split(' ')[0] || '';
}

function formatAmbiente(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'taller1') return 'Taller 1';
  if (normalized === 'taller2') return 'Taller 2';
  return String(value || '').trim() || 'el taller asignado';
}
