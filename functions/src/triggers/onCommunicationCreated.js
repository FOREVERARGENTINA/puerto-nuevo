const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { FieldPath } = require('firebase-admin/firestore');
const {
  escapeHtml,
  toSafeHtmlParagraph,
  sanitizeRichHtml,
  toPlainText,
  renderAttachmentList,
} = require('../utils/sanitize');
const { maskEmail } = require('../utils/logging');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');
const { sendEmailMessage } = require('../utils/emailDelivery');
const { isEmulatorRuntime } = require('../utils/emulatorMode');
const { filterVisibleUserDocs, filterVisibleUserIds, isVisibleUserData } = require('../utils/testUsers');

const brevoApiKey = defineSecret('BREVO_API_KEY');

function getSafeCommunicationBodyHtml(communicationData) {
  const richBodyHtml = sanitizeRichHtml(communicationData?.bodyRich || '');
  return richBodyHtml || toSafeHtmlParagraph(communicationData?.body || '');
}

exports.onCommunicationCreated = onDocumentCreated(
  {
    document: 'communications/{commId}',
    secrets: [brevoApiKey],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data associated with the event');
      return;
    }

    const commData = snapshot.data();
    const commId = event.params.commId;

    console.log('Debug: BREVO_API_KEY present?', !!brevoApiKey.value());
    console.log(`Nuevo comunicado creado: ${commId}`);

    // Paso 1: expandir destinatarios antes de cualquier envio.
    let destinatarios = Array.isArray(commData.destinatarios) ? commData.destinatarios : [];
    const parentToStudents = new Map();

    try {
      if (commData.type === 'global') {
        destinatarios = await getGlobalRecipients();
      } else if (commData.type === 'ambiente') {
        destinatarios = await getAmbienteRecipients(commData.ambiente);
      } else if (commData.type === 'taller') {
        destinatarios = await getTallerRecipients(commData.tallerEspecial);
      }

      if (destinatarios.length > 0) {
        const db = admin.firestore();
        const finalSet = new Set();

        // Promise.allSettled evita que una sola lectura fallida tumbe toda la expansion.
        const childFetches = await Promise.allSettled(
          destinatarios.map((id) => db.collection('children').doc(id).get())
        );

        for (let idx = 0; idx < destinatarios.length; idx++) {
          // eslint-disable-next-line security/detect-object-injection
          const id = destinatarios[idx];
          // eslint-disable-next-line security/detect-object-injection
          const childFetch = childFetches[idx];
          const childSnap = childFetch && childFetch.status === 'fulfilled' ? childFetch.value : null;

          if (childFetch && childFetch.status === 'rejected') {
            console.warn(`No se pudo cargar children/${id} para ${commId}:`, childFetch.reason?.message || childFetch.reason);
          }

          if (childSnap && childSnap.exists) {
            const childData = childSnap.data();
            const childName =
              childData.nombreCompleto ||
              childData.name ||
              `${childData.firstName || ''} ${childData.lastName || ''}`.trim() ||
              id;

            if (Array.isArray(childData.responsables)) {
              childData.responsables.forEach((uid) => {
                finalSet.add(uid);
                if (!parentToStudents.has(uid)) parentToStudents.set(uid, []);
                parentToStudents.get(uid).push(childName);
              });
            }
          } else {
            // Si no existe como child, tratarlo como uid de usuario.
            finalSet.add(id);
          }
        }

        const finalRecipients = await filterVisibleUserIds(db, Array.from(finalSet));

        // Update transaccional para evitar perder cambios por carreras en escritura concurrente.
        destinatarios = await db.runTransaction(async (tx) => {
          const latestSnap = await tx.get(snapshot.ref);
          if (!latestSnap.exists) return finalRecipients;

          const latestData = latestSnap.data() || {};
          const existingRecipients = Array.isArray(latestData.destinatarios) ? latestData.destinatarios : [];
          const mergedRecipients = Array.from(new Set([...existingRecipients, ...finalRecipients]));

          tx.update(snapshot.ref, {
            destinatarios: mergedRecipients,
          });

          return mergedRecipients;
        });

        console.log(`Destinatarios expandidos para ${commId}: ${destinatarios.length} usuarios`);
      } else {
        console.log(`Comunicado ${commId} no tiene destinatarios`);
      }
    } catch (error) {
      console.error(`Error expandiendo destinatarios para ${commId}:`, error);
    }

    // Paso 2: envio push (siempre) sin depender de email o adjuntos.
    if (destinatarios.length > 0) {
      try {
        const pushTitle = toPlainText(commData.title || 'Nuevo comunicado') || 'Nuevo comunicado';
        const pushBody = toPlainText(commData.body || '').slice(0, 200) || 'Hay un comunicado importante';

        const pushResult = await sendPushNotificationToUsers(
          {
            title: pushTitle,
            body: pushBody,
            clickAction: `/portal/familia/comunicados/${commId}`,
          },
          {
            userIds: destinatarios,
            familyOnly: true,
          }
        );

        console.log(
          `[Push] Comunicado ${commId}: tokens=${pushResult.tokensTargeted}, success=${pushResult.successCount}, failure=${pushResult.failureCount}, cleaned=${pushResult.cleanedCount}`
        );
      } catch (pushError) {
        console.error(`Error enviando push para comunicado ${commId}:`, pushError);
      }
    }

    // Paso 3: envio por email, sin afectar persistencia del comunicado.
    console.log(
      `Verificando envio de emails para ${commId}: sendByEmail=${commData.sendByEmail}, hasPendingAttachments=${commData.hasPendingAttachments}, destinatarios=${destinatarios.length}`
    );

    if (commData.hasPendingAttachments) {
      console.log(`Comunicado ${commId} tiene adjuntos pendientes. Envio de emails pospuesto.`);
      return;
    }

    if (!commData.sendByEmail) {
      console.log(`Comunicado ${commId} no requiere envio por email (sendByEmail=false).`);
      return;
    }

    if (destinatarios.length === 0) {
      console.log(`Comunicado ${commId} no tiene destinatarios. No se enviara email.`);
      return;
    }

    try {
      console.log(`Comunicado ${commId} solicita envio por email. Iniciando envio...`);
      const commRef = admin.firestore().collection('communications').doc(commId);
      const BATCH_SIZE = 10;
      let totalSent = 0;
      let totalFailed = 0;

      for (let i = 0; i < destinatarios.length; i += BATCH_SIZE) {
        const batchUids = destinatarios.slice(i, i + BATCH_SIZE);
        const usersSnap = await admin
          .firestore()
          .collection('users')
          .where(FieldPath.documentId(), 'in', batchUids)
          .get();

        for (const uDoc of usersSnap.docs) {
          const u = uDoc.data();
          if (!isVisibleUserData(u)) continue;
          const uid = uDoc.id;
          const email = u.email || null;

          const statusRef = commRef.collection('emailStatus').doc(uid);
          const statusSnap = await statusRef.get();
          if (statusSnap.exists && statusSnap.data().status === 'sent') {
            console.log(`Email ya enviado a ${uid}, se omite`);
            continue;
          }

          await statusRef.set(
            {
              status: 'pending',
              email: email,
              attempts: 0,
              lastError: null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          if (email) {
            try {
              if (brevoApiKey.value() || isEmulatorRuntime()) {
                const studentList = parentToStudents.has(uid) ? parentToStudents.get(uid).join(', ') : null;
                const safeStudentList = studentList ? escapeHtml(studentList) : null;
                const safeBodyHtml = getSafeCommunicationBodyHtml(commData);
                const attachmentList = renderAttachmentList(commData.attachments);
                const attachmentsHtml = attachmentList ? `<h4>Archivos adjuntos</h4>${attachmentList}` : '';
                const safeSenderName = escapeHtml(commData.sentByDisplayName || 'Equipo de Montessori Puerto Nuevo');
                const isFamilyRecipient = u.role === 'family';
                const safePortalUrl = escapeHtml(getCommunicationPortalUrl(u.role, commId));

                const payload = {
                  sender: {
                    name: 'Montessori Puerto Nuevo',
                    email: 'info@montessoripuertonuevo.com.ar',
                  },
                  to: [{ email }],
                  subject:
                    (commData.title || 'Comunicado de la escuela') + (studentList ? ` - ${studentList}` : ''),
                  htmlContent: buildCommunicationEmailHtml({
                    safeStudentList,
                    safeSenderName,
                    safeBodyHtml,
                    attachmentsHtml,
                    safePortalUrl,
                    isFamilyRecipient,
                  }),
                };

                const result = await sendEmailMessage({
                  apiKey: brevoApiKey.value(),
                  payload,
                  source: 'onCommunicationCreated',
                  metadata: {
                    communicationId: commId,
                    userId: uid,
                  },
                });

                if (result.mode === 'missing-api-key') {
                  await statusRef.update({
                    status: 'queued',
                    lastError: 'BREVO_API_KEY not configured',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  console.log(`BREVO_API_KEY no configurada: ${maskEmail(email)} marcado como queued`);
                } else {
                  await statusRef.update({
                    status: 'sent',
                    attempts: admin.firestore.FieldValue.increment(1),
                    providerMessageId: result.messageId || null,
                    deliveryMode: result.mode,
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  console.log(`Email enviado a ${maskEmail(email)} (uid: ${uid})`);
                  totalSent++;
                }
              } else {
                await statusRef.update({
                  status: 'queued',
                  lastError: 'BREVO_API_KEY not configured',
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`BREVO_API_KEY no configurada: ${maskEmail(email)} marcado como queued`);
              }
            } catch (err) {
              console.error(`Error enviando email a ${maskEmail(email)} (uid: ${uid}):`, err);
              totalFailed++;
              await statusRef.update({
                status: 'failed',
                attempts: admin.firestore.FieldValue.increment(1),
                lastError: err.message ? err.message.slice(0, 1024) : String(err),
                failedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
      }

      console.log(
        `Resumen envio ${commId}: ${totalSent} enviados, ${totalFailed} fallidos, ${destinatarios.length} total`
      );
    } catch (emailError) {
      console.error(`Error enviando emails para ${commId}:`, emailError);
    }
  }
);

exports.onCommunicationUpdated = onDocumentUpdated(
  {
    document: 'communications/{commId}',
    secrets: [brevoApiKey],
  },
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    if (!afterSnap) return;

    const before = beforeSnap ? beforeSnap.data() : {};
    const after = afterSnap.data();
    const commId = event.params.commId;

    if (!after.sendByEmail || !Array.isArray(after.destinatarios) || after.destinatarios.length === 0) return;

    const hadPendingAttachments = before.hasPendingAttachments === true;
    const nowHasNoPendingAttachments = after.hasPendingAttachments === false;
    const attachmentsWereAdded = Array.isArray(after.attachments) && after.attachments.length > 0;

    if (!hadPendingAttachments || !nowHasNoPendingAttachments || !attachmentsWereAdded) {
      console.log(
        `Comunicacion ${commId} actualizada pero no requiere envio de emails (pending: ${hadPendingAttachments}, completed: ${nowHasNoPendingAttachments}, hasAttachments: ${attachmentsWereAdded})`
      );
      return;
    }

    console.log(
      `Comunicacion ${commId} completo subida de ${after.attachments.length} adjuntos; iniciando envio de emails...`
    );

    try {
      const commRef = admin.firestore().collection('communications').doc(commId);
      const BATCH_SIZE = 10;

      for (let i = 0; i < after.destinatarios.length; i += BATCH_SIZE) {
        const batchUids = after.destinatarios.slice(i, i + BATCH_SIZE);

        const usersSnap = await admin
          .firestore()
          .collection('users')
          .where(FieldPath.documentId(), 'in', batchUids)
          .get();

        for (const uDoc of usersSnap.docs) {
          const u = uDoc.data();
          if (!isVisibleUserData(u)) continue;
          const uid = uDoc.id;
          const email = u.email || null;

          const statusRef = commRef.collection('emailStatus').doc(uid);
          const statusSnap = await statusRef.get();
          const statusData = statusSnap.exists ? statusSnap.data() : null;

          if (statusData && statusData.status === 'sent') {
            console.log(`Email ya enviado a ${uid}, se omite`);
            continue;
          }

          const safeBodyHtml = getSafeCommunicationBodyHtml(after);
          const attachmentList = renderAttachmentList(after.attachments);
          const attachmentsHtml = attachmentList ? `<h4>Archivos adjuntos</h4>${attachmentList}` : '';
          const safeSenderName = escapeHtml(after.sentByDisplayName || 'Equipo de Montessori Puerto Nuevo');
          const isFamilyRecipient = u.role === 'family';
          const safePortalUrl = escapeHtml(getCommunicationPortalUrl(u.role, commId));

          await statusRef.set(
            {
              status: 'pending',
              email: email,
              attempts: 0,
              lastError: null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

          if (email) {
            try {
              if (brevoApiKey.value() || isEmulatorRuntime()) {
                const payload = {
                  sender: {
                    name: 'Montessori Puerto Nuevo',
                    email: 'info@montessoripuertonuevo.com.ar',
                  },
                  to: [{ email }],
                  subject: after.title || 'Comunicado de la escuela',
                  htmlContent: buildCommunicationEmailHtml({
                    safeSenderName,
                    safeBodyHtml,
                    attachmentsHtml,
                    safePortalUrl,
                    isFamilyRecipient,
                  }),
                };

                const result = await sendEmailMessage({
                  apiKey: brevoApiKey.value(),
                  payload,
                  source: 'onCommunicationUpdated',
                  metadata: {
                    communicationId: commId,
                    userId: uid,
                  },
                });

                if (result.mode === 'missing-api-key') {
                  await statusRef.update({
                    status: 'queued',
                    lastError: 'BREVO_API_KEY not configured',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  console.log(`BREVO_API_KEY no configurada: ${maskEmail(email)} marcado como queued`);
                } else {
                  await statusRef.update({
                    status: 'sent',
                    attempts: admin.firestore.FieldValue.increment(1),
                    providerMessageId: result.messageId || null,
                    deliveryMode: result.mode,
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                  });

                  console.log(`Email con adjuntos enviado a ${maskEmail(email)} (uid: ${uid})`);
                }
              } else {
                await statusRef.update({
                  status: 'queued',
                  lastError: 'BREVO_API_KEY not configured',
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`BREVO_API_KEY no configurada: ${maskEmail(email)} marcado como queued`);
              }
            } catch (err) {
              console.error(`Error enviando email con adjuntos a ${maskEmail(email)} (uid: ${uid}):`, err);
              await statusRef.update({
                status: 'failed',
                attempts: admin.firestore.FieldValue.increment(1),
                lastError: err.message ? err.message.slice(0, 1024) : String(err),
                failedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          }
        }
      }
    } catch (emailError) {
      console.error(`Error enviando emails con adjuntos para ${commId}:`, emailError);
    }
  }
);

function getCommunicationPortalUrl(role, commId) {
  if (role === 'family') {
    return `https://montessoripuertonuevo.com.ar/portal/familia/comunicados/${encodeURIComponent(commId)}`;
  }

  if (role === 'docente') {
    return 'https://montessoripuertonuevo.com.ar/portal/docente';
  }

  if (role === 'tallerista') {
    return 'https://montessoripuertonuevo.com.ar/portal/tallerista';
  }

  return 'https://montessoripuertonuevo.com.ar/portal/admin/comunicar';
}

function buildCommunicationEmailHtml({
  safeStudentList = null,
  safeSenderName = 'Equipo de Montessori Puerto Nuevo',
  safeBodyHtml,
  attachmentsHtml = '',
  safePortalUrl,
  isFamilyRecipient,
}) {
  const openingText = isFamilyRecipient
    ? 'Hola, compartimos un nuevo comunicado para tu familia.'
    : 'Hola, se publico un nuevo comunicado institucional.';
  const ctaLabel = isFamilyRecipient ? 'Ver comunicado' : 'Abrir panel de comunicados';
  const closingText = isFamilyRecipient
    ? 'Cariños,<br>Equipo de Montessori Puerto Nuevo'
    : 'Equipo de Montessori Puerto Nuevo';

  return `
    <div lang="es">
    <p>${openingText}</p>
    <p style="font-size:0.95em;color:#555;"><strong>Enviado por:</strong> ${safeSenderName}</p>
    ${safeStudentList ? `<p><strong>Comunicado para:</strong> ${safeStudentList}</p>` : ''}
    <div>${safeBodyHtml}</div>
    ${attachmentsHtml}
    <p style="margin:16px 0;">
      <a href="${safePortalUrl}" style="background-color:#488284;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;">${ctaLabel}</a>
    </p>
    <p style="font-size:0.92em;color:#555;">
      Si no podes abrir el boton, copia este enlace:<br>
      <a href="${safePortalUrl}" style="color:#1a73e8;">${safePortalUrl}</a>
    </p>
    <p style="color:#666;font-size:0.9em;">${closingText}</p>
    </div>
  `;
}

async function getGlobalRecipients() {
  const usersSnapshot = await admin
    .firestore()
    .collection('users')
    .where('role', 'in', ['family', 'docente', 'coordinacion', 'superadmin', 'facturacion'])
    .where('disabled', '==', false)
    .get();

  return filterVisibleUserDocs(usersSnapshot.docs).map((doc) => doc.id);
}

async function getAmbienteRecipients(ambiente) {
  const recipients = [];

  const childrenSnapshot = await admin
    .firestore()
    .collection('children')
    .where('ambiente', '==', ambiente)
    .get();

  childrenSnapshot.docs.forEach((doc) => {
    const childData = doc.data();
    if (Array.isArray(childData.responsables)) {
      recipients.push(...childData.responsables);
    }
  });

  const teachersSnapshot = await admin
    .firestore()
    .collection('users')
    .where('role', '==', 'docente')
    .where('disabled', '==', false)
    .get();

  filterVisibleUserDocs(teachersSnapshot.docs, { role: 'docente' }).forEach((doc) => {
    recipients.push(doc.id);
  });

  return filterVisibleUserIds(admin.firestore(), [...new Set(recipients)]);
}

async function getTallerRecipients(tallerEspecial) {
  const recipients = [];

  const childrenSnapshot = await admin
    .firestore()
    .collection('children')
    .where('talleresEspeciales', 'array-contains', tallerEspecial)
    .get();

  childrenSnapshot.docs.forEach((doc) => {
    const childData = doc.data();
    if (Array.isArray(childData.responsables)) {
      recipients.push(...childData.responsables);
    }
  });

  return [...new Set(recipients)];
}
