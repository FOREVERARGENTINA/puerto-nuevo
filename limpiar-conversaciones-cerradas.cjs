const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'puerto-nuevo-montessori'
  });
}

const db = admin.firestore();

async function limpiarConversacionesCerradas() {
  console.log('\n🧹 LIMPIEZA DE CONVERSACIONES CERRADAS (contadores sin leer)\n');
  console.log('='.repeat(60));

  try {
    const snapshot = await db.collection('conversations').where('estado', '==', 'cerrada').get();
    console.log(`👀 Conversaciones cerradas encontradas: ${snapshot.size}`);

    const toFix = [];
    snapshot.forEach(doc => {
      const d = doc.data();
      const sf = d.mensajesSinLeerFamilia || 0;
      const se = d.mensajesSinLeerEscuela || 0;
      if (sf > 0 || se > 0) {
        toFix.push({ id: doc.id, mensajesSinLeerFamilia: sf, mensajesSinLeerEscuela: se });
      }
    });

    if (toFix.length === 0) {
      console.log('✅ No se encontraron conversaciones cerradas con contadores pendientes.');
      process.exit(0);
    }

    console.log(`🔧 Conversaciones a corregir: ${toFix.length}`);

    let fixed = 0;
    for (const c of toFix) {
      console.log(` - Corregir ${c.id}: familia=${c.mensajesSinLeerFamilia}, escuela=${c.mensajesSinLeerEscuela}`);
      await db.collection('conversations').doc(c.id).update({
        mensajesSinLeerFamilia: 0,
        mensajesSinLeerEscuela: 0,
        ultimoMensajeVistoPorFamilia: admin.firestore.FieldValue.serverTimestamp(),
        ultimoMensajeVistoPorEscuela: admin.firestore.FieldValue.serverTimestamp(),
        actualizadoAt: admin.firestore.FieldValue.serverTimestamp()
      });
      fixed++;
    }

    console.log(`\n🎉 Limpieza completada: ${fixed} conversaciones corregidas.`);
  } catch (err) {
    console.error('❌ Error durante la limpieza:', err);
    process.exit(1);
  }

  process.exit(0);
}

limpiarConversacionesCerradas();
