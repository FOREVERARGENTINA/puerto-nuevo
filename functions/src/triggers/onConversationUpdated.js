const { onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

// Cuando una conversación cambia a estado CERRADA, limpiamos contadores de "sin leer"
exports.onConversationUpdated = onDocumentUpdated(
  { document: 'conversations/{convId}' },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!before || !after) return;

    try {
      if (before.estado !== 'cerrada' && after.estado === 'cerrada') {
        const convRef = admin.firestore().collection('conversations').doc(event.params.convId);
        await convRef.update({
          mensajesSinLeerFamilia: 0,
          mensajesSinLeerEscuela: 0,
          ultimoMensajeVistoPorFamilia: admin.firestore.FieldValue.serverTimestamp(),
          ultimoMensajeVistoPorEscuela: admin.firestore.FieldValue.serverTimestamp(),
          actualizadoAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Conversacion ${event.params.convId} cerrada: limpiados contadores sin leer`);
      }
    } catch (err) {
      console.error('Error en onConversationUpdated:', err);
    }
  }
);
