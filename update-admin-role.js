/**
 * Script para actualizar el rol del usuario admin existente
 * De 'admin' → 'superadmin'
 *
 * USO:
 * node update-admin-role.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./functions/service-account-key.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function updateAdminRole() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  ACTUALIZAR ROL ADMIN → SUPERADMIN');
  console.log('═══════════════════════════════════════════════════════\n');

  const adminEmail = 'admin@puerto.com';

  try {
    // Buscar usuario por email
    const user = await auth.getUserByEmail(adminEmail);
    console.log(`✅ Usuario encontrado: ${adminEmail}`);
    console.log(`   UID: ${user.uid}`);
    console.log(`   Rol actual: ${user.customClaims?.role || 'sin rol'}\n`);

    // Actualizar custom claim
    await auth.setCustomUserClaims(user.uid, { role: 'superadmin' });
    console.log('✅ Custom claim actualizado a "superadmin"\n');

    // Actualizar documento en Firestore
    await db.collection('users').doc(user.uid).set({
      email: adminEmail,
      displayName: 'Admin',
      role: 'superadmin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log('✅ Documento en Firestore actualizado\n');

    console.log('═══════════════════════════════════════════════════════');
    console.log('  ✨ ACTUALIZACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('IMPORTANTE:');
    console.log('- Cierra sesión en el portal');
    console.log('- Vuelve a iniciar sesión para que el rol se aplique\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar
updateAdminRole();
