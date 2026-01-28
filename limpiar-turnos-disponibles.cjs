/**
 * Script para limpiar datos residuales de turnos con estado "disponible"
 * Elimina información de familias/alumnos que quedó de turnos cancelados
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./functions/service-account-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function limpiarTurnosDisponibles() {
  try {
    console.log('🔍 Buscando turnos disponibles con datos residuales...\n');

    const appointmentsRef = db.collection('appointments');
    const snapshot = await appointmentsRef
      .where('estado', '==', 'disponible')
      .get();

    if (snapshot.empty) {
      console.log('✅ No hay turnos disponibles en el sistema');
      return;
    }

    let limpiosCount = 0;
    let conDatosCount = 0;
    const turnosParaLimpiar = [];

    // Identificar turnos con datos residuales
    snapshot.forEach(doc => {
      const data = doc.data();
      const tieneDatosResiduales = 
        data.familiaUid || 
        data.familiaEmail || 
        data.familiaDisplayName || 
        data.hijoId || 
        data.hijoNombre || 
        data.nota ||
        data.canceladoPor ||
        data.canceladoAt ||
        (data.familiasUids && data.familiasUids.length > 0);

      if (tieneDatosResiduales) {
        conDatosCount++;
        turnosParaLimpiar.push({
          id: doc.id,
          fechaHora: data.fechaHora?.toDate?.() || data.fechaHora,
          familiaEmail: data.familiaEmail,
          hijoNombre: data.hijoNombre
        });
      } else {
        limpiosCount++;
      }
    });

    console.log(`📊 Resumen:`);
    console.log(`   Total de turnos disponibles: ${snapshot.size}`);
    console.log(`   ✅ Turnos limpios: ${limpiosCount}`);
    console.log(`   🔧 Turnos con datos residuales: ${conDatosCount}\n`);

    if (conDatosCount === 0) {
      console.log('✨ Todos los turnos disponibles están limpios. No hay nada que hacer.');
      return;
    }

    // Mostrar muestra de turnos a limpiar
    console.log('🔍 Muestra de turnos a limpiar:');
    turnosParaLimpiar.slice(0, 5).forEach(t => {
      console.log(`   - ${t.fechaHora} | ${t.familiaEmail || 'sin email'} | ${t.hijoNombre || 'sin alumno'}`);
    });
    if (turnosParaLimpiar.length > 5) {
      console.log(`   ... y ${turnosParaLimpiar.length - 5} más`);
    }

    // Confirmar antes de proceder
    console.log('\n⚠️  ¿Deseas limpiar estos turnos? Escribe "SI" para confirmar');
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('> ', async (respuesta) => {
      readline.close();

      if (respuesta.trim().toUpperCase() !== 'SI') {
        console.log('❌ Operación cancelada');
        process.exit(0);
      }

      console.log('\n🧹 Limpiando turnos...');
      
      const batch = db.batch();
      let batchCount = 0;
      let totalLimpiados = 0;

      for (const turno of turnosParaLimpiar) {
        const docRef = appointmentsRef.doc(turno.id);
        batch.update(docRef, {
          familiaUid: null,
          familiasUids: [],
          familiaEmail: null,
          familiaDisplayName: null,
          hijoId: null,
          hijoNombre: null,
          nota: null,
          canceladoPor: null,
          canceladoAt: null,
          updatedAt: new Date()
        });

        batchCount++;
        totalLimpiados++;

        // Firestore batch tiene límite de 500 operaciones
        if (batchCount === 500) {
          await batch.commit();
          console.log(`   ✅ Limpiados ${totalLimpiados} de ${turnosParaLimpiar.length}`);
          batchCount = 0;
        }
      }

      // Commit del batch final si hay operaciones pendientes
      if (batchCount > 0) {
        await batch.commit();
      }

      console.log(`\n✨ Proceso completado: ${totalLimpiados} turnos limpiados`);
      console.log('✅ Todos los turnos disponibles ahora están limpios\n');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

limpiarTurnosDisponibles();
