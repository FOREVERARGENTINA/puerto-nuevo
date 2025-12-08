const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Inicializar Admin SDK
admin.initializeApp();

// Importar triggers
const { onCommunicationCreated } = require('./src/triggers/onCommunicationCreated');

/**
 * Cloud Function: setUserRole
 * Asigna un custom claim (rol) a un usuario
 * Solo puede ser llamada por usuarios con rol admin, direccion o coordinacion
 */
exports.setUserRole = onCall(async (request) => {
  // Verificar que el usuario que llama está autenticado
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado para asignar roles');
  }

  // Verificar que quien llama tiene permisos de admin
  const callerRole = request.auth.token.role;
  if (!callerRole || !['admin', 'direccion', 'coordinacion'].includes(callerRole)) {
    throw new HttpsError(
      'permission-denied',
      'Solo administradores pueden asignar roles'
    );
  }

  const { uid, role } = request.data;

  // Validar parámetros
  if (!uid || !role) {
    throw new HttpsError('invalid-argument', 'uid y role son requeridos');
  }

  // Validar que el rol es válido
  const validRoles = ['direccion', 'coordinacion', 'admin', 'teacher', 'tallerista', 'family', 'aspirante'];
  if (!validRoles.includes(role)) {
    throw new HttpsError('invalid-argument', `Rol inválido. Debe ser uno de: ${validRoles.join(', ')}`);
  }

  try {
    // Asignar custom claim
    await admin.auth().setCustomUserClaims(uid, { role });

    // Actualizar Firestore (para queries)
    await admin.firestore().collection('users').doc(uid).set(
      { role },
      { merge: true }
    );

    console.log(`Rol ${role} asignado a usuario ${uid} por ${request.auth.uid}`);

    return {
      success: true,
      message: `Rol ${role} asignado correctamente`,
      uid,
      role
    };
  } catch (error) {
    console.error('Error asignando rol:', error);
    throw new HttpsError('internal', `Error asignando rol: ${error.message}`);
  }
});

/**
 * Cloud Function: createUserWithRole
 * Crea un usuario nuevo con email/password y le asigna un rol
 * Solo para admin/direccion
 */
exports.createUserWithRole = onCall(async (request) => {
  // Verificar autenticación y permisos
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado');
  }

  const callerRole = request.auth.token.role;
  if (!['admin', 'direccion', 'coordinacion'].includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden crear usuarios');
  }

  const { email, password, role, displayName } = request.data;

  // Validar parámetros
  if (!email || !password || !role) {
    throw new HttpsError('invalid-argument', 'email, password y role son requeridos');
  }

  const validRoles = ['direccion', 'coordinacion', 'admin', 'teacher', 'tallerista', 'family', 'aspirante'];
  if (!validRoles.includes(role)) {
    throw new HttpsError('invalid-argument', `Rol inválido`);
  }

  try {
    // Crear usuario en Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0]
    });

    // Asignar custom claim
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    // Crear perfil en Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      displayName: displayName || email.split('@')[0],
      role,
      children: [],
      fcmTokens: [],
      disabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid
    });

    console.log(`Usuario ${email} creado con rol ${role} por ${request.auth.uid}`);

    return {
      success: true,
      message: 'Usuario creado correctamente',
      uid: userRecord.uid,
      email,
      role
    };
  } catch (error) {
    console.error('Error creando usuario:', error);
    throw new HttpsError('internal', `Error creando usuario: ${error.message}`);
  }
});

// Exportar triggers
exports.onCommunicationCreated = onCommunicationCreated;
