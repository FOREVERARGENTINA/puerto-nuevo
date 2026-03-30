const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { toPlainText } = require('../utils/sanitize');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');

async function handleConversationMessageCreated({
  snapshot,
  convId,
  db = admin.firestore(),
  sendPush = sendPushNotificationToUsers,
}) {
  if (!snapshot) return { skipped: 'missing-snapshot' };

  const message = snapshot.data();
  if (!message || (message.tipoMensaje && message.tipoMensaje !== 'normal')) {
    return { skipped: 'unsupported-message' };
  }

  const convSnap = await db.collection('conversations').doc(convId).get();
  if (!convSnap.exists) return { skipped: 'missing-conversation' };

  const conversation = convSnap.data();
  const isFromFamily = message.autorRol === 'family';
  const recipientUserIds = conversation.esGrupal
    ? (conversation.participantesUids || [])
    : (conversation.familiaUid ? [conversation.familiaUid] : []);

  // Conversaciones: no enviar emails (solo push + in-app).
  // In-app queda cubierto por la lectura directa en Firestore desde el frontend.
  if (isFromFamily || recipientUserIds.length === 0) {
    return { skipped: 'no-school-recipients' };
  }

  const body = (message.texto || '').slice(0, 180) || (message.adjuntos && message.adjuntos.length ? 'Adjunto disponible' : '');

  // Fase 1: push solo cuando la escuela responde a la familia.
  // No usamos conversation.estado para bloquear el envio: el mensaje pudo
  // haberse creado validamente y la conversacion cerrarse inmediatamente
  // despues. Firestore rules ya impiden crear mensajes nuevos si ya estaba cerrada.

  try {
    const pushResult = await sendPush(
      {
        title: 'Nuevo mensaje de la escuela',
        body: toPlainText(body || '').slice(0, 180) || 'Tienes una respuesta',
        clickAction: `/portal/familia/conversaciones/${convId}`,
      },
      {
        userIds: recipientUserIds,
        familyOnly: true,
      }
    );
    console.log(
      `[Push] Conversacion ${convId}: tokens=${pushResult.tokensTargeted}, success=${pushResult.successCount}, failure=${pushResult.failureCount}, cleaned=${pushResult.cleanedCount}`
    );
    return { success: true, pushResult };
  } catch (err) {
    console.error('Error enviando push de conversacion:', err);
    throw err;
  }
}

exports.handleConversationMessageCreated = handleConversationMessageCreated;

exports.onConversationMessageCreated = onDocumentCreated(
  {
    document: 'conversations/{convId}/messages/{messageId}'
  },
  async (event) => handleConversationMessageCreated({
    snapshot: event.data,
    convId: event.params.convId,
  })
);
