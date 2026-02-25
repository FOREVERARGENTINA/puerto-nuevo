const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

const LOCK_COLLECTION = 'notificationLocks';
const LOCK_TYPE = 'snack-cancelled';
const ALREADY_EXISTS_CODES = new Set([6, '6', 'already-exists', 'ALREADY_EXISTS']);
const TARGET_ROLES = ['superadmin', 'coordinacion', 'admin'];

exports.onSnackAssignmentCancelled = onDocumentUpdated(
  {
    document: 'snackAssignments/{assignmentId}',
  },
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    if (!afterSnap || !afterSnap.exists) return;

    const before = beforeSnap?.data() || {};
    const after = afterSnap.data() || {};
    const assignmentId = event.params.assignmentId;

    const transitionedToCancelled = before.estado !== 'cancelado' && after.estado === 'cancelado';
    if (!transitionedToCancelled) return;

    const cancelledByFamily = after.canceladoPor === 'familia';
    if (!cancelledByFamily) {
      console.log(`[Snack ${assignmentId}] Cancelacion detectada sin marca de familia. Se omite alerta.`);
      return;
    }

    try {
      const lockAcquired = await acquireNotificationLock(event.id, assignmentId);
      if (!lockAcquired) return;

      const recipients = await getStaffRecipients();
      if (recipients.length === 0) {
        console.log(`[Snack ${assignmentId}] Sin destinatarios admin/coordinacion para alertar.`);
        return;
      }

      const familyLabel = resolveFamilyLabel(after);
      const weekLabel = formatWeekRange(after.fechaInicio, after.fechaFin);
      const ambienteLabel = formatAmbiente(after.ambiente);
      const studentLabel = normalizeText(after.childName, 120);
      const cancelReason = normalizeText(after.motivoCancelacion, 300) || 'No especificado';
      const cancelDate = formatDateTimeLabel(after.fechaCancelacion);

      const title = studentLabel
        ? `Cancelacion de snacks: ${studentLabel}`
        : 'Cancelacion de turno de snacks';

      const bodyLines = [
        `${familyLabel} cancelo su turno de snacks.`,
        `Semana: ${weekLabel}`,
        `Ambiente: ${ambienteLabel}`,
        studentLabel ? `Alumno/a: ${studentLabel}` : null,
        cancelDate ? `Fecha de cancelacion: ${cancelDate}` : null,
        `Motivo: ${cancelReason}`,
        '',
        'Revisa el calendario de snacks para reasignar la semana.',
      ].filter(Boolean);

      const communicationPayload = {
        title,
        body: bodyLines.join('\n'),
        destinatarios: recipients,
        type: 'individual',
        sentBy: 'sistema',
        sentByDisplayName: 'Sistema',
        sendByEmail: true,
        hasPendingAttachments: false,
        requiresConfirmation: false,
        requiereLecturaObligatoria: false,
        tipo: 'snack_cancelled_family',
        metadata: {
          assignmentId,
          ambiente: after.ambiente || null,
          fechaInicio: after.fechaInicio || null,
          fechaFin: after.fechaFin || null,
          childName: studentLabel || null,
          familyLabel,
          motivoCancelacion: cancelReason,
          canceladoPor: after.canceladoPor || null,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await admin.firestore().collection('communications').add(communicationPayload);

      console.log(
        `[Snack ${assignmentId}] Alerta creada para ${recipients.length} destinatarios (admin/coordinacion).`
      );
    } catch (error) {
      console.error(`[Snack ${assignmentId}] Error creando alerta de cancelacion:`, error);
    }
  }
);

async function acquireNotificationLock(eventId, assignmentId) {
  if (!eventId) return true;

  const safeEventId = String(eventId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 180);
  const lockId = `${LOCK_TYPE}-${safeEventId}`;
  const lockRef = admin.firestore().collection(LOCK_COLLECTION).doc(lockId);

  try {
    await lockRef.create({
      type: LOCK_TYPE,
      assignmentId,
      eventId: String(eventId),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    if (ALREADY_EXISTS_CODES.has(error?.code)) {
      console.log(`[Snack ${assignmentId}] lock existente (${lockId}), se omite duplicado.`);
      return false;
    }
    throw error;
  }
}

async function getStaffRecipients() {
  const db = admin.firestore();
  const recipients = new Set();

  const usersSnapshot = await db
    .collection('users')
    .where('role', 'in', TARGET_ROLES)
    .get();

  usersSnapshot.docs.forEach((userDoc) => {
    const userData = userDoc.data() || {};
    if (userData.disabled === true) return;
    recipients.add(userDoc.id);
  });

  return Array.from(recipients);
}

function resolveFamilyLabel(assignment) {
  const families = Array.isArray(assignment?.familias) ? assignment.familias : [];

  const familyNames = families
    .map((family) => (
      normalizeText(family?.name, 120)
      || normalizeText(family?.email, 120)
      || normalizeText(family?.uid, 120)
    ))
    .filter(Boolean);

  if (familyNames.length > 0) {
    return Array.from(new Set(familyNames)).join(' / ');
  }

  return (
    normalizeText(assignment?.familiaNombre, 120)
    || normalizeText(assignment?.familiaEmail, 120)
    || normalizeText(assignment?.familiaUid, 120)
    || 'Una familia'
  );
}

function formatAmbiente(ambiente) {
  const normalized = normalizeText(ambiente, 60).toLowerCase();
  if (normalized === 'taller1') return 'Taller 1';
  if (normalized === 'taller2') return 'Taller 2';
  return normalized || 'No informado';
}

function formatWeekRange(fechaInicio, fechaFin) {
  const from = formatDateLabel(fechaInicio);
  const to = formatDateLabel(fechaFin);

  if (from && to) return `${from} al ${to}`;
  if (from) return from;
  if (to) return to;
  return 'No informada';
}

function formatDateLabel(value) {
  if (!value || typeof value !== 'string') return null;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function formatDateTimeLabel(value) {
  const date = toDateSafe(value);
  if (!date) return null;

  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

function toDateSafe(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === 'function') {
    const maybeDate = value.toDate();
    return maybeDate instanceof Date && !Number.isNaN(maybeDate.getTime()) ? maybeDate : null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function normalizeText(value, maxLength = 140) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}
