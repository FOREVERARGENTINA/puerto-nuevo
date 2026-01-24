const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

/**
 * Cloud Function Scheduled: Recordatorio de Snacks (Viernes)
 * Se ejecuta todos los viernes a las 10:00 AM (hora Argentina)
 * Envía recordatorios a las familias que tienen asignación la próxima semana
 */
exports.sendSnacksReminder = onSchedule({
  schedule: '0 10 * * 5', // Cron: Todos los viernes a las 10:00 AM
  timeZone: 'America/Argentina/Buenos_Aires',
  region: 'us-central1'
}, async (_event) => {
  const db = admin.firestore();

  console.log('🍎 Ejecutando recordatorio de snacks...');

  try {
    // Calcular el próximo lunes (3 días después del viernes)
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + 3);
    nextMonday.setHours(0, 0, 0, 0);

    const mondayString = nextMonday.toISOString().split('T')[0];

    console.log(`Buscando asignaciones para la semana del ${mondayString}`);

    // Buscar asignaciones para la próxima semana que NO hayan sido confirmadas
    // Nota: verificaremos por familia dentro del loop para enviar recordatorios individuales
    const snapshot = await db.collection('snackAssignments')
      .where('fechaInicio', '==', mondayString)
      .where('confirmadoPorFamilia', '==', false)
      .get();

    if (snapshot.empty) {
      console.log('No hay asignaciones pendientes para la próxima semana');
      return null;
    }

    console.log(`Encontradas ${snapshot.size} asignaciones pendientes`);

    const promises = [];

    for (const doc of snapshot.docs) {
      const assignment = doc.data();

      console.log(`Procesando asignación para familia: ${assignment.familiaNombre || assignment.familiasUids?.[0] || 'N/D'} (child: ${assignment.childName || 'N/A'})`);

      // Si hay familias listadas, enviar recordatorio por cada familia pendiente
      if (Array.isArray(assignment.familias) && assignment.familias.length > 0) {
        const updates = [];
        const familiasToNotify = assignment.familias.filter(f => !f.recordatorioEnviado);
        for (const fam of familiasToNotify) {
          const comunicadoData = {
            titulo: '🍎 Recordatorio: Snacks de la próxima semana',
            mensaje: `Hola ${fam.name || ''},\n\nTe recordamos que la próxima semana (del ${formatDate(assignment.fechaInicio)} al ${formatDate(assignment.fechaFin)}) te corresponde traer los snacks para ${assignment.ambiente}${assignment.childName ? ' (Alumno: ' + assignment.childName + ')' : ''}.\n\nPor favor, trae los ingredientes el día lunes.\n\nSi tienes algún inconveniente, confirma o solicita un cambio desde el portal en la sección "Mis Turnos de Snacks".\n\n¡Gracias por tu colaboración!`,
            destinatarios: [fam.uid],
            sentBy: 'sistema',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            requiresConfirmation: false,
            tipo: 'recordatorio_snacks',
            metadata: {
              assignmentId: doc.id,
              fechaInicio: assignment.fechaInicio,
              fechaFin: assignment.fechaFin,
              childName: assignment.childName || null
            }
          };

          promises.push(db.collection('communications').add(comunicadoData));

          // marcar esta familia como notificada en el array
          updates.push(fam.uid);
        }

        if (updates.length > 0) {
          const updatedFamilias = assignment.familias.map(f => updates.includes(f.uid) ? { ...f, recordatorioEnviado: true } : f);
          promises.push(db.collection('snackAssignments').doc(doc.id).update({ familias: updatedFamilias, updatedAt: admin.firestore.FieldValue.serverTimestamp() }));
        }
      } else {
        // Compatibilidad hacia atrás: si no hay familias, usar familiaUid
        const comunicadoData = {
          titulo: '🍎 Recordatorio: Snacks de la próxima semana',
          mensaje: `Hola ${assignment.familiaNombre || ''},\n\nTe recordamos que la próxima semana (del ${formatDate(assignment.fechaInicio)} al ${formatDate(assignment.fechaFin)}) te corresponde traer los snacks para ${assignment.ambiente}${assignment.childName ? ' (Alumno: ' + assignment.childName + ')' : ''}.\n\nPor favor, trae los ingredientes el día lunes.\n\nSi tienes algún inconveniente, confirma o solicita un cambio desde el portal en la sección "Mis Turnos de Snacks".\n\n¡Gracias por tu colaboración!`,
          destinatarios: [assignment.familiaUid],
          sentBy: 'sistema',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          requiresConfirmation: false,
          tipo: 'recordatorio_snacks',
          metadata: {
            assignmentId: doc.id,
            fechaInicio: assignment.fechaInicio,
            fechaFin: assignment.fechaFin,
            childName: assignment.childName || null
          }
        };

        promises.push(db.collection('communications').add(comunicadoData));

        // Marcar recordatorio como enviado (compat)
        promises.push(db.collection('snackAssignments').doc(doc.id).update({
          recordatorioEnviado: true,
          fechaRecordatorio: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }));
      }
    }

    await Promise.all(promises);

    console.log(`✅ Recordatorios enviados exitosamente a ${snapshot.size} familias`);

    return {
      success: true,
      count: snapshot.size
    };

  } catch (error) {
    console.error('Error enviando recordatorios:', error);
    throw error;
  }
});

/**
 * Helper para formatear fechas
 */
function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const options = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires'
  };
  return date.toLocaleDateString('es-AR', options);
}
