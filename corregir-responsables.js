const admin = require('firebase-admin');
const readline = require('readline');

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'puerto-nuevo-montessori'
  });
}

const db = admin.firestore();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pregunta(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function corregirResponsables() {
  console.log('\n🔧 CORRECCIÓN DE RESPONSABLES DE ALUMNOS\n');
  console.log('='.repeat(60));

  const [alumnosSnapshot, familiasSnapshot] = await Promise.all([
    db.collection('children').get(),
    db.collection('users').where('role', '==', 'family').get()
  ]);

  const familias = [];
  const familiasMap = {};
  
  console.log('\n👨‍👩‍👧‍👦 Familias disponibles:\n');
  familiasSnapshot.forEach((doc, index) => {
    const familia = doc.data();
    familias.push({ id: doc.id, ...familia });
    familiasMap[doc.id] = familia;
    console.log(`  ${index + 1}. ${familia.displayName || familia.email} (ID: ${doc.id})`);
  });

  console.log('\n📚 Alumnos registrados:\n');
  const alumnos = [];
  alumnosSnapshot.forEach((doc, index) => {
    const alumno = doc.data();
    alumnos.push({ id: doc.id, ...alumno });
    console.log(`  ${index + 1}. ${alumno.nombreCompleto}`);
    if (alumno.responsables && alumno.responsables.length > 0) {
      console.log(`     Responsables actuales: ${alumno.responsables.length}`);
      alumno.responsables.forEach(respId => {
        const fam = familiasMap[respId];
        console.log(`       - ${fam ? fam.email : `❌ ID inválido: ${respId}`}`);
      });
    } else {
      console.log('     ⚠️  SIN RESPONSABLES');
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n¿Qué alumno deseas corregir?');
  const alumnoIndex = parseInt(await pregunta('Número de alumno (o 0 para salir): ')) - 1;

  if (alumnoIndex < 0 || alumnoIndex >= alumnos.length) {
    console.log('\n❌ Operación cancelada\n');
    rl.close();
    process.exit(0);
  }

  const alumnoSeleccionado = alumnos[alumnoIndex];
  console.log(`\n✅ Alumno seleccionado: ${alumnoSeleccionado.nombreCompleto}\n`);

  console.log('¿Qué familia(s) deben ser responsables? (números separados por comas, ej: 1,2)');
  const familiasInput = await pregunta('Familias: ');
  
  const familiasIndices = familiasInput.split(',').map(n => parseInt(n.trim()) - 1);
  const responsablesIds = familiasIndices
    .filter(i => i >= 0 && i < familias.length)
    .map(i => familias[i].id);

  if (responsablesIds.length === 0) {
    console.log('\n❌ No se seleccionaron familias válidas\n');
    rl.close();
    process.exit(0);
  }

  console.log('\n📝 Se asignarán los siguientes responsables:');
  responsablesIds.forEach(id => {
    const fam = familiasMap[id];
    console.log(`  - ${fam.displayName || fam.email} (${id})`);
  });

  const confirmar = await pregunta('\n¿Confirmar cambios? (s/n): ');
  
  if (confirmar.toLowerCase() === 's' || confirmar.toLowerCase() === 'si') {
    await db.collection('children').doc(alumnoSeleccionado.id).update({
      responsables: responsablesIds,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('\n✅ Responsables actualizados correctamente!\n');
  } else {
    console.log('\n❌ Operación cancelada\n');
  }

  rl.close();
  process.exit(0);
}

corregirResponsables().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});
