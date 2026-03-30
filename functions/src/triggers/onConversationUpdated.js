const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

// Cuando una conversación cambia a estado CERRADA, la escuela deja de tener
// pendientes propios. No debemos marcar como leido lo de la familia porque el
// cierre no implica que ya vio el ultimo mensaje.
async function handleConversationUpdated({
  before,
  after,
  convId,
  db = admin.firestore(),
}) {
  if (!before || !after) return { skipped: 'missing-data' };

  try {
    if (before.estado !== 'cerrada' && after.estado === 'cerrada') {
      const convRef = db.collection('conversations').doc(convId);
      await convRef.update({
        mensajesSinLeerEscuela: 0,
        ultimoMensajeVistoPorEscuela: admin.firestore.FieldValue.serverTimestamp(),
        actualizadoAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Conversacion ${convId} cerrada: preservado estado de lectura familiar`);
      return { success: true, updated: true };
    }
    return { success: true, updated: false };
  } catch (err) {
    console.error('Error en onConversationUpdated:', err);
    throw err;
  }
}

exports.handleConversationUpdated = handleConversationUpdated;

exports.onConversationUpdated = onDocumentUpdated(
  { document: 'conversations/{convId}' },
  async (event) => handleConversationUpdated({
    before: event.data?.before?.data(),
    after: event.data?.after?.data(),
    convId: event.params.convId,
  })
);
