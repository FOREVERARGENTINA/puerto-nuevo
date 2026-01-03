const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'puerto-nuevo-montessori'
  });
}

const db = admin.firestore();

async function limpiarResponsables() {
  console.log('\n🧹 LIMPIEZA DE RESPONSABLES INVÁLIDOS\n');
  console.log('='.repeat(50));

  try {
    // 1. Obtener todos los UIDs de usuarios válidos con rol family
    const familiasSnapshot = await db.collection('users').where('role', '==', 'family').get();
    const familiasValidasIds = new Set();
    
    console.log(`\n✅ Familias válidas encontradas: ${familiasSnapshot.size}`);
    familiasSnapshot.forEach(doc => {
      familiasValidasIds.add(doc.id);
      const data = doc.data();
      console.log(`  - ${data.email} (${doc.id})`);
    });

    // 2. Revisar todos los alumnos
    const alumnosSnapshot = await db.collection('children').get();
    console.log(`\n📚 Revisando ${alumnosSnapshot.size} alumnos...\n`);

    let alumnosCorregidos = 0;
    
    for (const doc of alumnosSnapshot.docs) {
      const alumno = doc.data();
      const responsablesOriginales = alumno.responsables || [];
      
      // Filtrar solo responsables válidos
      const responsablesValidos = responsablesOriginales.filter(id => {
        const esValido = familiasValidasIds.has(id);
        if (!esValido) {
          console.log(`❌ ${alumno.nombreCompleto}: UID inválido encontrado: ${id}`);
        }
        return esValido;
      });

      // Si hay diferencias, actualizar
      if (responsablesOriginales.length !== responsablesValidos.length) {
        console.log(`🔧 Corrigiendo ${alumno.nombreCompleto}:`);
        console.log(`   Antes: ${responsablesOriginales.length} responsables`);
        console.log(`   Después: ${responsablesValidos.length} responsables`);
        
        await db.collection('children').doc(doc.id).update({
          responsables: responsablesValidos,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        alumnosCorregidos++;
      } else {
        console.log(`✅ ${alumno.nombreCompleto}: Sin problemas`);
      }
    }

    console.log(`\n🎉 Limpieza completada:`);
    console.log(`   - Alumnos corregidos: ${alumnosCorregidos}`);
    console.log(`   - Total alumnos: ${alumnosSnapshot.size}`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }

  process.exit(0);
}

limpiarResponsables();