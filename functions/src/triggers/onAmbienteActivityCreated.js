const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');
const { toPlainText } = require('../utils/sanitize');

const LOCK_COLLECTION = 'notificationLocks';
const LOCK_TYPE = 'ambiente-activity';
const ALREADY_EXISTS_CODES = new Set([6, '6', 'already-exists', 'ALREADY_EXISTS']);

const CATEGORY_LABELS = {
  matematica: 'Matemática',
  lengua: 'Lengua',
  ingles: 'Inglés',
  'ciencias-naturales': 'Cs. Naturales',
  'ciencias-sociales': 'Cs. Sociales',
  arte: 'Arte',
  musica: 'Música',
  'educacion-fisica': 'Ed. Física',
  'vida-practica': 'Vida Práctica',
  sensorial: 'Sensorial',
  cultura: 'Cultura',
  otra: 'Otra',
};

function sanitizeText(value, maxLength = 140) {
  return toPlainText(value || '').slice(0, maxLength).trim();
}

function normalizeCategory(value) {
  const category = sanitizeText(value, 40).toLowerCase();
  return CATEGORY_LABELS[category] ? category : 'otra';
}

function normalizeCustomCategory(value) {
  return sanitizeText(value, 60);
}

function resolveCategoryLabel(category, customCategory) {
  if (category === 'otra') {
    return customCategory || 'Otra';
  }
  return CATEGORY_LABELS[category] || 'Actividad';
}

function toRecipientUid(rawValue) {
  if (typeof rawValue === 'string') {
    const uid = rawValue.trim();
    return uid || null;
  }

  if (rawValue && typeof rawValue.uid === 'string') {
    const uid = rawValue.uid.trim();
    return uid || null;
  }

  return null;
}

async function acquireNotificationLock(ambiente, activityId) {
  const db = admin.firestore();
  const lockId = `${LOCK_TYPE}-${ambiente}-${activityId}`;
  const lockRef = db.collection(LOCK_COLLECTION).doc(lockId);

  try {
    await lockRef.create({
      type: LOCK_TYPE,
      ambiente,
      activityId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return true;
  } catch (error) {
    if (ALREADY_EXISTS_CODES.has(error?.code)) {
      console.log(`[AmbienteActivity ${activityId}] lock existente (${lockId}), se omite duplicado.`);
      return false;
    }
    throw error;
  }
}

async function getFamilyRecipientsByAmbiente(ambiente) {
  if (!ambiente) return [];

  const db = admin.firestore();
  const recipients = new Set();

  const childrenSnapshot = await db
    .collection('children')
    .where('ambiente', '==', ambiente)
    .get();

  childrenSnapshot.forEach((childDoc) => {
    const childData = childDoc.data() || {};
    const responsables = Array.isArray(childData.responsables) ? childData.responsables : [];

    responsables.forEach((responsable) => {
      const uid = toRecipientUid(responsable);
      if (uid) recipients.add(uid);
    });
  });

  return Array.from(recipients);
}

exports.onAmbienteActivityCreated = onDocumentCreated(
  {
    document: 'ambienteActivities/{activityId}',
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const { activityId } = event.params;
    const activityData = snapshot.data() || {};
    const ambiente = sanitizeText(activityData.ambiente, 80).toLowerCase();

    if (!ambiente) {
      console.log(`[AmbienteActivity ${activityId}] Sin ambiente valido. No se envia push.`);
      return;
    }

    try {
      const lockAcquired = await acquireNotificationLock(ambiente, activityId);
      if (!lockAcquired) return;

      const category = normalizeCategory(activityData.category);
      const customCategory = category === 'otra'
        ? normalizeCustomCategory(activityData.customCategory)
        : '';
      const categoryLabel = resolveCategoryLabel(category, customCategory);

      const normalizedPatch = {
        category,
        customCategory,
        categoryLabel,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const shouldNormalizeDoc = (
        activityData.category !== category
        || String(activityData.customCategory || '') !== customCategory
        || String(activityData.categoryLabel || '') !== categoryLabel
      );

      if (shouldNormalizeDoc) {
        await snapshot.ref.set(normalizedPatch, { merge: true });
      }

      const recipients = await getFamilyRecipientsByAmbiente(ambiente);
      if (recipients.length === 0) {
        console.log(`[AmbienteActivity ${activityId}] Sin familias destinatarias en ambiente ${ambiente}.`);
        return;
      }

      const activityTitle = sanitizeText(activityData.title, 140) || 'Hay una nueva actividad';
      const pushTitle = `Nueva actividad de ${categoryLabel}`;
      const clickAction = `/portal/familia/actividades?ambiente=${encodeURIComponent(ambiente)}&activityId=${encodeURIComponent(activityId)}`;

      const pushResult = await sendPushNotificationToUsers(
        {
          title: pushTitle,
          body: activityTitle,
          clickAction,
        },
        {
          userIds: recipients,
          familyOnly: true,
        }
      );

      console.log(
        `[AmbienteActivity ${activityId}] ambiente=${ambiente}, category=${category}, recipients=${recipients.length}, tokens=${pushResult.tokensTargeted}, success=${pushResult.successCount}, failure=${pushResult.failureCount}, cleaned=${pushResult.cleanedCount}`
      );
    } catch (error) {
      console.error(`[AmbienteActivity ${activityId}] Error enviando push:`, error);
    }
  }
);
