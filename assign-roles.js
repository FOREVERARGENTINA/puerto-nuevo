/**
 * Script para asignar roles y permisos a usuarios del equipo
 *
 * USO:
 * node assign-roles.js
 *
 * Este script asigna roles específicos según el documento de Emilse:
 * - SuperAdmin: Emilse + otra persona
 * - Coordinación: Emilse, Camila, Rosana
 * - Docentes: Emilse, Camila, Rosana, Vanesa, Gise, Javi
 * - Talleristas: Camila (como nexo)
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

// ROLES según documento de Emilse
const ROLES = {
  SUPERADMIN: 'superadmin',
  COORDINACION: 'coordinacion',
  DOCENTE: 'docente',
  TALLERISTA: 'tallerista',
  FAMILY: 'family'
};

/**
 * Configuración del equipo docente
 *
 * IMPORTANTE: Actualizar estos emails cuando tengas el dominio
 * Por ahora usamos el patrón: nombre@montessoripuertonuevo.com.ar
 */
const EQUIPO_DOCENTE = {
  // SUPERADMIN - Emilse + otra persona a definir
  superadmin: [
    { email: 'emilse@montessoripuertonuevo.com.ar', displayName: 'Emilse', role: ROLES.SUPERADMIN }
    // Agregar otra persona cuando se defina
  ],

  // COORDINACIÓN - Emilse, Camila, Rosana
  // (Pueden enviar comunicados + aprobar + ver info médica + administrar turnos)
  coordinacion: [
    { email: 'emilse@montessoripuertonuevo.com.ar', displayName: 'Emilse', role: ROLES.COORDINACION },
    { email: 'camila@montessoripuertonuevo.com.ar', displayName: 'Camila', role: ROLES.COORDINACION },
    { email: 'rosana@montessoripuertonuevo.com.ar', displayName: 'Rosana', role: ROLES.COORDINACION }
  ],

  // DOCENTES - Emilse, Camila, Rosana, Vanesa, Gise, Javi
  // (Pueden enviar comunicados + algunos ven info médica)
  docentes: [
    { email: 'emilse@montessoripuertonuevo.com.ar', displayName: 'Emilse', role: ROLES.DOCENTE },
    { email: 'camila@montessoripuertonuevo.com.ar', displayName: 'Camila', role: ROLES.DOCENTE },
    { email: 'rosana@montessoripuertonuevo.com.ar', displayName: 'Rosana', role: ROLES.DOCENTE },
    { email: 'vanesa@montessoripuertonuevo.com.ar', displayName: 'Vanesa', role: ROLES.DOCENTE },
    { email: 'gise@montessoripuertonuevo.com.ar', displayName: 'Gise', role: ROLES.DOCENTE },
    { email: 'javi@montessoripuertonuevo.com.ar', displayName: 'Javi', role: ROLES.DOCENTE }
  ],

  // TALLERISTAS - Camila como nexo
  // (NO envían mensajes, solo suben documentos y editan info de talleres)
  talleristas: [
    { email: 'camila@montessoripuertonuevo.com.ar', displayName: 'Camila (Tallerista)', role: ROLES.TALLERISTA }
  ]
};

/**
 * Asigna un rol a un usuario mediante Custom Claims
 */
async function assignRoleToUser(email, role, displayName) {
  try {
    console.log(`\nAsignando rol "${role}" a ${email}...`);

    // Buscar usuario por email
    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`  ⚠️  Usuario no existe, creando cuenta para ${email}...`);

        // Crear usuario con password temporal
        const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
        user = await auth.createUser({
          email: email,
          emailVerified: false,
          password: tempPassword,
          displayName: displayName || email.split('@')[0],
          disabled: false
        });

        console.log(`  ✅ Usuario creado con password temporal`);
        console.log(`     IMPORTANTE: Enviar link de reset de password a ${email}`);
      } else {
        throw error;
      }
    }

    // Asignar custom claim (rol)
    await auth.setCustomUserClaims(user.uid, { role: role });
    console.log(`  ✅ Custom claim asignado`);

    // Actualizar o crear documento en Firestore /users
    const userDoc = {
      email: email,
      displayName: displayName || email.split('@')[0],
      role: role,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(user.uid).set(userDoc, { merge: true });
    console.log(`  ✅ Documento en Firestore actualizado`);

    return { success: true, uid: user.uid };

  } catch (error) {
    console.error(`  ❌ Error asignando rol a ${email}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ASIGNACIÓN DE ROLES Y PERMISOS - MONTESSORI PUERTO NUEVO');
  console.log('═══════════════════════════════════════════════════════════\n');

  const results = {
    success: [],
    failed: []
  };

  // Asignar SuperAdmin
  console.log('\n📌 ASIGNANDO SUPERADMIN...');
  for (const user of EQUIPO_DOCENTE.superadmin) {
    const result = await assignRoleToUser(user.email, user.role, user.displayName);
    if (result.success) {
      results.success.push({ ...user, uid: result.uid });
    } else {
      results.failed.push({ ...user, error: result.error });
    }
  }

  // Asignar Coordinación
  console.log('\n📌 ASIGNANDO COORDINACIÓN...');
  for (const user of EQUIPO_DOCENTE.coordinacion) {
    const result = await assignRoleToUser(user.email, user.role, user.displayName);
    if (result.success) {
      results.success.push({ ...user, uid: result.uid });
    } else {
      results.failed.push({ ...user, error: result.error });
    }
  }

  // Asignar Docentes
  console.log('\n📌 ASIGNANDO DOCENTES...');
  for (const user of EQUIPO_DOCENTE.docentes) {
    const result = await assignRoleToUser(user.email, user.role, user.displayName);
    if (result.success) {
      results.success.push({ ...user, uid: result.uid });
    } else {
      results.failed.push({ ...user, error: result.error });
    }
  }

  // Asignar Talleristas
  console.log('\n📌 ASIGNANDO TALLERISTAS...');
  for (const user of EQUIPO_DOCENTE.talleristas) {
    const result = await assignRoleToUser(user.email, user.role, user.displayName);
    if (result.success) {
      results.success.push({ ...user, uid: result.uid });
    } else {
      results.failed.push({ ...user, error: result.error });
    }
  }

  // Resumen
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESUMEN DE ASIGNACIÓN');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`✅ Exitosos: ${results.success.length}`);
  console.log(`❌ Fallidos: ${results.failed.length}\n`);

  if (results.failed.length > 0) {
    console.log('USUARIOS FALLIDOS:');
    results.failed.forEach(user => {
      console.log(`  - ${user.email}: ${user.error}`);
    });
  }

  console.log('\n✨ Proceso completado!\n');
  console.log('IMPORTANTE:');
  console.log('- Los usuarios deben cerrar sesión y volver a iniciar para que los roles se apliquen');
  console.log('- Enviar links de reset de password a usuarios nuevos\n');

  process.exit(0);
}

// Ejecutar script
main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
