const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { resendLimiter } = require('../utils/rateLimiter');

const resendApiKey = defineSecret('RESEND_API_KEY');

exports.onCommunicationCreated = onDocumentCreated(
  {
    document: 'communications/{commId}',
    secrets: [resendApiKey],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data associated with the event');
      return;
    }

    const commData = snapshot.data();
    const commId = event.params.commId;

    console.log('Debug: RESEND_API_KEY present?', !!resendApiKey.value());

    console.log(`Nuevo comunicado creado: ${commId}`, commData);

    // PASO 1: EXPANDIR DESTINATARIOS (SIEMPRE, ANTES DE CUALQUIER ENVÍO)
    // Esto asegura que el comunicado esté correcto en Firestore aunque falle el envío de emails
    let destinatarios = commData.destinatarios || [];
    let parentToStudents = {};

    try {
      if (commData.type === 'global') {
        destinatarios = await getGlobalRecipients();
      } else if (commData.type === 'ambiente') {
        destinatarios = await getAmbienteRecipients(commData.ambiente);
      } else if (commData.type === 'taller') {
        destinatarios = await getTallerRecipients(commData.tallerEspecial);
      }

      if (destinatarios.length > 0) {
        // Expandir posibles IDs de alumno a sus responsables (UIDs)
        const db = admin.firestore();
        const finalSet = new Set();

        // Intentamos leer cada id como alumno; si existe, añadimos sus responsables
        const childFetches = await Promise.all(destinatarios.map(id => db.collection('children').doc(id).get()));

        for (let idx = 0; idx < destinatarios.length; idx++) {
          const id = destinatarios[idx];
          const childSnap = childFetches[idx];

          if (childSnap && childSnap.exists) {
            const childData = childSnap.data();
            const childName = childData.nombreCompleto || childData.name || `${childData.firstName || ''} ${childData.lastName || ''}`.trim() || id;

            if (childData.responsables && Array.isArray(childData.responsables)) {
              childData.responsables.forEach(uid => {
                finalSet.add(uid);
                parentToStudents[uid] = parentToStudents[uid] || [];
                parentToStudents[uid].push(childName);
              });
            }
          } else {
            // No es alumno -> asumimos es UID de usuario
            finalSet.add(id);
          }
        }

        const finalRecipients = Array.from(finalSet);

        // CRÍTICO: Actualizar destinatarios en Firestore ANTES de intentar enviar emails
        await snapshot.ref.update({
          destinatarios: finalRecipients
        });

        console.log(`Destinatarios expandidos para ${commId}: ${finalRecipients.length} usuarios (incluyendo responsables de alumnos)`);

        // Reasignamos destinatarios para el proceso de envío más abajo
        destinatarios = finalRecipients;
      } else {
        console.log(`Comunicado ${commId} no tiene destinatarios`);
      }
    } catch (error) {
      console.error(`Error expandiendo destinatarios para ${commId}:`, error);
      // Aunque falle la expansión, continuamos para registrar el error
    }

    // PASO 2: ENVÍO POR EMAIL Y PUSH (SI CORRESPONDE)
    // Los errores aquí NO deben afectar que el comunicado ya esté guardado correctamente
    // NO enviar si hay adjuntos pendientes (se enviarán cuando se complete la subida)
    console.log(`📧 Verificando envío de emails para ${commId}: sendByEmail=${commData.sendByEmail}, hasPendingAttachments=${commData.hasPendingAttachments}, destinatarios=${destinatarios.length}`);

    if (commData.hasPendingAttachments) {
      console.log(`⏸️ Comunicado ${commId} tiene adjuntos pendientes. Envío de emails pospuesto hasta que se completen.`);
    } else if (!commData.sendByEmail) {
      console.log(`📭 Comunicado ${commId} no requiere envío por email (sendByEmail=false).`);
    } else if (destinatarios.length === 0) {
      console.log(`⚠️ Comunicado ${commId} no tiene destinatarios. No se enviará email.`);
    } else if (commData.sendByEmail && destinatarios.length > 0) {
      try {
        console.log(`📨 Comunicado ${commId} solicita envío por email. Iniciando envío...`);
        const commRef = admin.firestore().collection('communications').doc(commId);

        // Enviar en batches para controlar rate limits
        const BATCH_SIZE = 50;
        let totalSent = 0;
        let totalFailed = 0;

        for (let i = 0; i < destinatarios.length; i += BATCH_SIZE) {
          const batchUids = destinatarios.slice(i, i + BATCH_SIZE);

          // Obtener usuarios por batch
          const usersSnap = await admin.firestore().collection('users')
            .where(admin.firestore.FieldPath.documentId(), 'in', batchUids)
            .get();

          const tokens = [];

          // Procesar secuencialmente para respetar rate limit
          for (const uDoc of usersSnap.docs) {
            const u = uDoc.data();
            const uid = uDoc.id;
            const email = u.email || null;

            // Idempotencia: si ya se envió, saltar
            const statusRef = commRef.collection('emailStatus').doc(uid);
            const statusSnap = await statusRef.get();
            if (statusSnap.exists && statusSnap.data().status === 'sent') {
              console.log(`Email ya enviado a ${uid}, se omite`);
              continue;
            }

            // Marcar pending
            await statusRef.set({
              status: 'pending',
              email: email,
              attempts: 0,
              lastError: null,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            if (email) {
              try {
                if (resendApiKey.value()) {
                  const studentList = parentToStudents[uid] ? parentToStudents[uid].join(', ') : null;

                  // Incluir adjuntos si existen
                  const attachmentsHtml = Array.isArray(commData.attachments) && commData.attachments.length > 0
                    ? `<h4>Archivos adjuntos</h4><ul>${commData.attachments.map(a => `<li><a href="${a.url}">${a.name}</a></li>`).join('')}</ul>`
                    : '';

                  const payload = {
                    from: 'onboarding@resend.dev',
                    to: email,
                    subject: (commData.title || 'Comunicado de la escuela') + (studentList ? ` - ${studentList}` : ''),
                    html: `${studentList ? `<p><strong>Comunicado para: ${studentList}</strong></p>` : ''}<p>${commData.body || ''}</p>${attachmentsHtml}`
                  };

                  // Usar retry con backoff para manejar rate limits
                  const result = await resendLimiter.retryWithBackoff(async () => {
                    const res = await fetch('https://api.resend.com/emails', {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${resendApiKey.value()}`,
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify(payload)
                    });

                    if (!res.ok) {
                      const text = await res.text();
                      throw new Error(`Resend error: ${res.status} ${text}`);
                    }

                    return await res.json();
                  });

                  await statusRef.update({
                    status: 'sent',
                    attempts: admin.firestore.FieldValue.increment(1),
                    resendMessageId: result.id || null,
                    sentAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });

                  console.log(`✓ Email enviado a ${email} (uid: ${uid})`);
                  totalSent++;
                } else {
                  await statusRef.update({
                    status: 'queued',
                    lastError: 'RESEND_API_KEY not configured',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                  console.log(`RESEND_API_KEY no configurada: ${email} marcado como queued`);
                }
              } catch (err) {
                console.error(`✗ Error enviando email a ${email} (uid: ${uid}):`, err);
                totalFailed++;
                await statusRef.update({
                  status: 'failed',
                  attempts: admin.firestore.FieldValue.increment(1),
                  lastError: err.message ? err.message.slice(0, 1024) : String(err),
                  failedAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
              }
            }

            // Collect FCM tokens for push notifications
            if (Array.isArray(u.fcmTokens) && u.fcmTokens.length > 0) {
              tokens.push(...u.fcmTokens);
            }
          }

          // Send push notifications
          if (tokens.length > 0) {
            try {
              const message = {
                notification: {
                  title: commData.title || 'Nuevo comunicado',
                  body: (commData.body || '').slice(0, 200)
                },
                tokens: tokens
              };

              const response = await admin.messaging().sendMulticast(message);
              console.log(`Push enviados: success ${response.successCount}, failure ${response.failureCount}`);
            } catch (err) {
              console.error('Error enviando push:', err);
            }
          }
        }

        // Resumen final
        console.log(`📊 Resumen envío ${commId}: ${totalSent} enviados ✓, ${totalFailed} fallidos ✗, ${destinatarios.length} total`);
      } catch (emailError) {
        console.error(`Error enviando emails para ${commId}:`, emailError);
        // Continuamos - el comunicado ya está guardado correctamente en Firestore
      }
    }
  }
);

// Trigger para actualizaciones: enviar (o reintentar) emails cuando se agreguen adjuntos u ocurra algún cambio relevante
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

exports.onCommunicationUpdated = onDocumentUpdated(
  {
    document: 'communications/{commId}',
    secrets: [resendApiKey]
  },
  async (event) => {
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;
    if (!afterSnap) return;

    const before = beforeSnap ? beforeSnap.data() : {};
    const after = afterSnap.data();
    const commId = event.params.commId;

    // Solo proceder si está marcado para envío por email y hay destinatarios
    if (!after.sendByEmail || !after.destinatarios || after.destinatarios.length === 0) return;

    // Detectar si se completaron los adjuntos pendientes
    const hadPendingAttachments = before.hasPendingAttachments === true;
    const nowHasNoPendingAttachments = after.hasPendingAttachments === false;
    const attachmentsWereAdded = Array.isArray(after.attachments) && after.attachments.length > 0;

    // Solo enviar si se completaron adjuntos pendientes
    if (!hadPendingAttachments || !nowHasNoPendingAttachments || !attachmentsWereAdded) {
      console.log(`Comunicación ${commId} actualizada pero no requiere envío de emails (pending: ${hadPendingAttachments}, completed: ${nowHasNoPendingAttachments}, hasAttachments: ${attachmentsWereAdded})`);
      return;
    }

    console.log(`Comunicación ${commId} completó subida de ${after.attachments.length} adjuntos; iniciando envío de emails...`);

    try {
      const commRef = admin.firestore().collection('communications').doc(commId);
      const BATCH_SIZE = 50;

      for (let i = 0; i < after.destinatarios.length; i += BATCH_SIZE) {
        const batchUids = after.destinatarios.slice(i, i + BATCH_SIZE);

        const usersSnap = await admin.firestore().collection('users')
          .where(admin.firestore.FieldPath.documentId(), 'in', batchUids)
          .get();

        const tokens = [];

        // Procesar secuencialmente para respetar rate limit
        for (const uDoc of usersSnap.docs) {
          const u = uDoc.data();
          const uid = uDoc.id;
          const email = u.email || null;

          // Idempotencia: si ya se envió, saltar
          const statusRef = commRef.collection('emailStatus').doc(uid);
          const statusSnap = await statusRef.get();
          const statusData = statusSnap.exists ? statusSnap.data() : null;

          // Solo saltar si ya se envió
          if (statusData && statusData.status === 'sent') {
            console.log(`Email ya enviado a ${uid}, se omite`);
            continue;
          }

          // Construir HTML del email con adjuntos
          const attachmentsHtml = Array.isArray(after.attachments) && after.attachments.length > 0
            ? `<h4>Archivos adjuntos</h4><ul>${after.attachments.map(a => `<li><a href="${a.url}">${a.name}</a></li>`).join('')}</ul>`
            : '';

          // Marcar pending
          await statusRef.set({
            status: 'pending',
            email: email,
            attempts: 0,
            lastError: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });

          if (email) {
            try {
              if (resendApiKey.value()) {
                const payload = {
                  from: 'onboarding@resend.dev',
                  to: email,
                  subject: (after.title || 'Comunicado de la escuela'),
                  html: `${after.body || ''}${attachmentsHtml}`
                };

                // Usar retry con backoff para manejar rate limits
                const result = await resendLimiter.retryWithBackoff(async () => {
                  const res = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${resendApiKey.value()}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                  });

                  if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`Resend error: ${res.status} ${text}`);
                  }

                  return await res.json();
                });

                await statusRef.update({
                  status: 'sent',
                  attempts: admin.firestore.FieldValue.increment(1),
                  resendMessageId: result.id || null,
                  sentAt: admin.firestore.FieldValue.serverTimestamp(),
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`✓ Email con adjuntos enviado a ${email} (uid: ${uid})`);
              } else {
                await statusRef.update({
                  status: 'queued',
                  lastError: 'RESEND_API_KEY not configured',
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`RESEND_API_KEY no configurada: ${email} marcado como queued`);
              }
            } catch (err) {
              console.error(`✗ Error enviando email con adjuntos a ${email} (uid: ${uid}):`, err);
              await statusRef.update({
                status: 'failed',
                attempts: admin.firestore.FieldValue.increment(1),
                lastError: err.message ? err.message.slice(0, 1024) : String(err),
                failedAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
            }
          }

          // Collect FCM tokens for push notifications
          if (Array.isArray(u.fcmTokens) && u.fcmTokens.length > 0) {
            tokens.push(...u.fcmTokens);
          }
        }

        // Send push notifications summarizing attachments
        if (tokens.length > 0) {
          try {
            const message = {
              notification: {
                title: after.title || 'Nuevo comunicado',
                body: ((after.body || '') + (after.attachments && after.attachments.length ? ' • Adjuntos disponibles' : '')).slice(0, 200)
              },
              tokens: tokens
            };

            const response = await admin.messaging().sendMulticast(message);
            console.log(`Push enviados: success ${response.successCount}, failure ${response.failureCount}`);
          } catch (err) {
            console.error('Error enviando push (actualizado):', err);
          }
        }
      }
    } catch (emailError) {
      console.error(`Error enviando emails con adjuntos para ${commId}:`, emailError);
    }
  }
);

async function getGlobalRecipients() {
  const usersSnapshot = await admin
    .firestore()
    .collection('users')
    .where('role', 'in', ['family', 'teacher', 'tallerista', 'admin', 'direccion', 'coordinacion'])
    .where('disabled', '==', false)
    .get();

  return usersSnapshot.docs.map(doc => doc.id);
}

async function getAmbienteRecipients(ambiente) {
  const recipients = [];

  const childrenSnapshot = await admin
    .firestore()
    .collection('children')
    .where('ambiente', '==', ambiente)
    .get();

  childrenSnapshot.docs.forEach(doc => {
    const childData = doc.data();
    if (childData.responsables && Array.isArray(childData.responsables)) {
      recipients.push(...childData.responsables);
    }
  });

  const teachersSnapshot = await admin
    .firestore()
    .collection('users')
    .where('role', '==', 'teacher')
    .where('tallerAsignado', '==', ambiente)
    .where('disabled', '==', false)
    .get();

  teachersSnapshot.docs.forEach(doc => {
    recipients.push(doc.id);
  });

  return [...new Set(recipients)];
}

async function getTallerRecipients(tallerEspecial) {
  const recipients = [];

  const talleristasSnapshot = await admin
    .firestore()
    .collection('users')
    .where('role', '==', 'tallerista')
    .where('tallerAsignado', '==', tallerEspecial)
    .where('disabled', '==', false)
    .get();

  talleristasSnapshot.docs.forEach(doc => {
    recipients.push(doc.id);
  });

  const childrenSnapshot = await admin
    .firestore()
    .collection('children')
    .where('talleresEspeciales', 'array-contains', tallerEspecial)
    .get();

  childrenSnapshot.docs.forEach(doc => {
    const childData = doc.data();
    if (childData.responsables && Array.isArray(childData.responsables)) {
      recipients.push(...childData.responsables);
    }
  });

  return [...new Set(recipients)];
}
