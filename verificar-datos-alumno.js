const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'puerto-nuevo-montessori'
  });
}

const db = admin.firestore();

async function verificarDatosAlumno() {
  console.log('\n🔍 VERIFICACIÓN DE DATOS DE ALUMNOS Y FAMILIAS\n');
  console.log('='.repeat(60));

  const [alumnosSnapshot, familiasSnapshot] = await Promise.all([
    db.collection('children').get(),
    db.collection('users').where('role', '==', 'family').get()
  ]);

  console.log(`\n📚 Total de alumnos: ${alumnosSnapshot.size}`);
  console.log(`👨‍👩‍👧‍👦 Total de familias: ${familiasSnapshot.size}\n`);

  console.log('='.repeat(60));
  console.log('\n👨‍👩‍👧‍👦 FAMILIAS REGISTRADAS:\n');
  
  const familiasMap = {};
  familiasSnapshot.forEach(doc => {
    const familia = doc.data();
    familiasMap[doc.id] = familia;
    console.log(`  ID: ${doc.id}`);
    console.log(`  Email: ${familia.email}`);
    console.log(`  Nombre: ${familia.displayName || 'Sin nombre'}`);
    console.log('  ---');
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n📚 ALUMNOS REGISTRADOS Y SUS RESPONSABLES:\n');

  if (alumnosSnapshot.empty) {
    console.log('  ❌ No hay alumnos registrados\n');
  } else {
    alumnosSnapshot.forEach(doc => {
      const alumno = doc.data();
      console.log(`  Alumno: ${alumno.nombreCompleto}`);
      console.log(`  ID: ${doc.id}`);
      console.log(`  Ambiente: ${alumno.ambiente}`);
      
      if (alumno.responsables && Array.isArray(alumno.responsables)) {
        console.log(`  Responsables (${alumno.responsables.length}):`);
        alumno.responsables.forEach((responsableId, index) => {
          const familia = familiasMap[responsableId];
          if (familia) {
            console.log(`    ${index + 1}. ✅ ${familia.email} (${responsableId})`);
          } else {
            console.log(`    ${index + 1}. ❌ ID no encontrado: ${responsableId}`);
          }
        });
      } else {
        console.log('  ⚠️  SIN RESPONSABLES ASIGNADOS (esto es un problema!)');
      }
      console.log('  ' + '-'.repeat(58));
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ VERIFICACIÓN COMPLETADA\n');

  process.exit(0);
}

verificarDatosAlumno().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
