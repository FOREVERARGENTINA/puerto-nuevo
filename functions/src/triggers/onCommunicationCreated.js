const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

exports.onCommunicationCreated = onDocumentCreated(
  'communications/{commId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log('No data associated with the event');
      return;
    }

    const commData = snapshot.data();
    const commId = event.params.commId;

    console.log(`Nuevo comunicado creado: ${commId}`, commData);

    try {
      let destinatarios = commData.destinatarios || [];

      if (commData.type === 'global') {
        destinatarios = await getGlobalRecipients();
      } else if (commData.type === 'ambiente') {
        destinatarios = await getAmbienteRecipients(commData.ambiente);
      } else if (commData.type === 'taller') {
        destinatarios = await getTallerRecipients(commData.tallerEspecial);
      }

      if (destinatarios.length > 0) {
        await snapshot.ref.update({
          destinatarios: destinatarios
        });

        console.log(`Destinatarios expandidos para ${commId}: ${destinatarios.length} usuarios`);
      }

    } catch (error) {
      console.error('Error procesando comunicado:', error);
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
