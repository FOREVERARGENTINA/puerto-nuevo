const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { resendLimiter } = require('../utils/rateLimiter');
const { escapeHtml, toSafeHtmlParagraph, toPlainText, renderAttachmentList } = require('../utils/sanitize');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');

const resendApiKey = defineSecret('RESEND_API_KEY');

const AREA_ROLE_MAP = {
  coordinacion: ['coordinacion'],
  administracion: ['superadmin', 'facturacion'],
  direccion: ['superadmin']
};

exports.onConversationMessageCreated = onDocumentCreated(
  {
    document: 'conversations/{convId}/messages/{messageId}',
    secrets: [resendApiKey]
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const message = snapshot.data();
    if (!message || (message.tipoMensaje && message.tipoMensaje !== 'normal')) return;

    const convId = event.params.convId;
    const convSnap = await admin.firestore().collection('conversations').doc(convId).get();
    if (!convSnap.exists) return;

    const conversation = convSnap.data();
    const isFromFamily = message.autorRol === 'family';

    let recipientUids = [];
    if (isFromFamily) {
      const roles = AREA_ROLE_MAP[conversation.destinatarioEscuela] || ['coordinacion'];
      const usersSnap = await admin.firestore().collection('users')
        .where('role', 'in', roles)
        .where('disabled', '==', false)
        .get();
      recipientUids = usersSnap.docs.map((doc) => doc.id);
    } else if (conversation.familiaUid) {
      recipientUids = [conversation.familiaUid];
    }

    if (recipientUids.length === 0) return;

    const batchSize = 10;

    const title = isFromFamily
      ? `Nueva consulta de ${conversation.familiaDisplayName || 'Familia'}`
      : 'Nuevo mensaje de la escuela';

    const body = (message.texto || '').slice(0, 180) || (message.adjuntos && message.adjuntos.length ? 'Adjunto disponible' : '');

    for (let i = 0; i < recipientUids.length; i += batchSize) {
      const batch = recipientUids.slice(i, i + batchSize);
      const usersSnap = await admin.firestore().collection('users')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
        .get();

      for (const uDoc of usersSnap.docs) {
        const u = uDoc.data();
        const email = u.email || null;

        if (email && resendApiKey.value()) {
          try {
            const safeTitle = escapeHtml(title);
            const safeAsunto = escapeHtml(conversation.asunto || 'Conversacion');
            const safeMessageHtml = toSafeHtmlParagraph(message.texto || '');
            const attachmentList = renderAttachmentList(message.adjuntos);

            const payload = {
              from: 'Montessori Puerto Nuevo <info@montessoripuertonuevo.com.ar>',
              to: email,
              subject: `${title} - ${conversation.asunto || 'Conversacion'}`,
              html: `
                <p>${safeTitle}</p>
                <p><strong>Asunto:</strong> ${safeAsunto}</p>
                <p>${safeMessageHtml}</p>
                ${attachmentList ? `<p><strong>Adjuntos:</strong></p>${attachmentList}` : ''}
                <p>Ingresa a la plataforma para responder.</p>
              `
            };

            await resendLimiter.retryWithBackoff(async () => {
              const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${resendApiKey.value()}`,
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
          } catch (err) {
            console.error('Error enviando email de conversacion:', err);
          }
        }

      }
    }

    // Fase 1: push solo cuando la escuela responde a la familia.
    // Protección adicional: no enviar push si la conversación está cerrada (evita notificaciones inválidas)
    if (!isFromFamily && conversation.familiaUid) {
      if (conversation.estado === 'cerrada') {
        console.log(`[Push] Ignorar push para conversacion cerrada ${convId}`);
      } else {
        try {
          const pushResult = await sendPushNotificationToUsers(
            {
              title: 'Nuevo mensaje de la escuela',
              body: toPlainText(body || '').slice(0, 180) || 'Tienes una respuesta',
              clickAction: `/portal/familia/conversaciones/${convId}`,
            },
            {
              userIds: [conversation.familiaUid],
              familyOnly: true,
            }
          );
          console.log(
            `[Push] Conversacion ${convId}: tokens=${pushResult.tokensTargeted}, success=${pushResult.successCount}, failure=${pushResult.failureCount}, cleaned=${pushResult.cleanedCount}`
          );
        } catch (err) {
          console.error('Error enviando push de conversacion:', err);
        }
      }
    }
  }
);
