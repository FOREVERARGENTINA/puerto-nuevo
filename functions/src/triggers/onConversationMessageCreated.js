const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const { toPlainText } = require('../utils/sanitize');
const { sendPushNotificationToUsers } = require('../utils/pushNotifications');

exports.onConversationMessageCreated = onDocumentCreated(
  {
    document: 'conversations/{convId}/messages/{messageId}'
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

    // Conversaciones: no enviar emails (solo push + in-app).
    // In-app queda cubierto por la lectura directa en Firestore desde el frontend.
    if (isFromFamily || !conversation.familiaUid) return;

    const body = (message.texto || '').slice(0, 180) || (message.adjuntos && message.adjuntos.length ? 'Adjunto disponible' : '');

    // Fase 1: push solo cuando la escuela responde a la familia.
    // Protección adicional: no enviar push si la conversación está cerrada (evita notificaciones inválidas)
    if (conversation.estado === 'cerrada') {
      console.log(`[Push] Ignorar push para conversacion cerrada ${convId}`);
      return;
    }

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
);
