const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { resendLimiter } = require('../utils/rateLimiter');

const resendApiKey = defineSecret('RESEND_API_KEY');

const AREA_ROLE_MAP = {
  coordinacion: ['coordinacion'],
  administracion: ['superadmin'],
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
      recipientUids = usersSnap.docs.map(doc => doc.id);
    } else if (conversation.familiaUid) {
      recipientUids = [conversation.familiaUid];
    }

    if (recipientUids.length === 0) return;

    const batchSize = 10;
    const tokens = [];

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
            const payload = {
              from: 'onboarding@resend.dev',
              to: email,
              subject: `${title} - ${conversation.asunto || 'Conversación'}`,
              html: `
                <p>${title}</p>
                <p><strong>Asunto:</strong> ${conversation.asunto || 'Conversación'}</p>
                <p>${message.texto || ''}</p>
                ${Array.isArray(message.adjuntos) && message.adjuntos.length > 0
                  ? `<p><strong>Adjuntos:</strong></p><ul>${message.adjuntos.map(a => `<li><a href="${a.url}">${a.name}</a></li>`).join('')}</ul>`
                  : ''}
                <p>Ingresá a la plataforma para responder.</p>
              `
            };

            await resendLimiter.retryWithBackoff(async () => {
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
          } catch (err) {
            console.error('Error enviando email de conversación:', err);
          }
        }

        if (Array.isArray(u.fcmTokens) && u.fcmTokens.length > 0) {
          tokens.push(...u.fcmTokens);
        }
      }
    }

    if (tokens.length > 0) {
      try {
        await admin.messaging().sendMulticast({
          notification: {
            title,
            body: body
          },
          tokens
        });
      } catch (err) {
        console.error('Error enviando push de conversación:', err);
      }
    }
  }
);
