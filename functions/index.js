const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Inicializar Admin SDK
admin.initializeApp();

// Importar triggers
const { onCommunicationCreated, onCommunicationUpdated } = require('./src/triggers/onCommunicationCreated');
const { onConversationMessageCreated } = require('./src/triggers/onConversationMessageCreated');
const { onAppointmentAssigned } = require('./src/triggers/onAppointmentAssigned');
const { sendSnacksReminder } = require('./src/scheduled/snacksReminder');

const onCallWithCors = (handler) => onCall({ cors: true }, handler);

/**
 * Cloud Function: setUserRole
 * Asigna un custom claim (rol) a un usuario
 * Solo puede ser llamada por usuarios con rol admin, direccion o coordinacion
 */
exports.setUserRole = onCallWithCors(async (request) => {
  // Verificar que el usuario que llama está autenticado
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado para asignar roles');
  }

  // Verificar que quien llama tiene permisos de admin
  const callerRole = request.auth.token.role;
  if (!callerRole || !['superadmin', 'coordinacion'].includes(callerRole)) {
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
  const validRoles = ['superadmin', 'coordinacion', 'docente', 'tallerista', 'family', 'aspirante'];
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
exports.createUserWithRole = onCallWithCors(async (request) => {
  // Verificar autenticación y permisos
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado');
  }

  const callerRole = request.auth.token.role;
  if (!['superadmin', 'coordinacion'].includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden crear usuarios');
  }

  const { email, password, role, displayName } = request.data;

  // Validar parámetros
  if (!email || !password || !role) {
    throw new HttpsError('invalid-argument', 'email, password y role son requeridos');
  }

  const validRoles = ['superadmin', 'coordinacion', 'docente', 'tallerista', 'family', 'aspirante'];
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

/**
 * Cloud Function: updateUserAuth
 * Actualiza email y displayName en Firebase Authentication y Firestore
 * Permitido solo para superadmin y coordinacion
 */
exports.updateUserAuth = onCallWithCors(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado');
  }

  const callerRole = request.auth.token.role;
  if (!['superadmin', 'coordinacion'].includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden actualizar Auth');
  }

  const { uid, email, displayName } = request.data;
  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid es requerido');
  }

  try {
    const updateParams = {};
    if (email) updateParams.email = email;
    if (displayName) updateParams.displayName = displayName;

    if (Object.keys(updateParams).length === 0) {
      throw new HttpsError('invalid-argument', 'email o displayName son requeridos');
    }

    // Actualizar en Firebase Auth
    await admin.auth().updateUser(uid, updateParams);

    // Actualizar en Firestore
    const updates = {};
    if (email) updates.email = email;
    if (displayName) updates.displayName = displayName;
    if (Object.keys(updates).length > 0) {
      await admin.firestore().collection('users').doc(uid).set(updates, { merge: true });
    }

    console.log(`Auth actualizado para ${uid} por ${request.auth.uid}`);

    return { success: true, message: 'Usuario actualizado en Auth y Firestore' };
  } catch (error) {
    console.error('Error actualizando usuario en Auth:', error);
    throw new HttpsError('internal', `Error actualizando usuario: ${error.message}`);
  }
});

/**
 * Cloud Function: checkUserEmail
 * Verifica si un email existe en la colección users (Firestore)
 * Uso público para recuperar contraseña
 */
exports.checkUserEmail = onCallWithCors(async (request) => {
  const { email } = request.data || {};
  if (!email) {
    throw new HttpsError('invalid-argument', 'email es requerido');
  }

  const rawEmail = String(email).trim();
  if (!rawEmail) {
    throw new HttpsError('invalid-argument', 'email es requerido');
  }
  const normalizedEmail = rawEmail.toLowerCase();
  let snapshot = await admin.firestore()
    .collection('users')
    .where('email', '==', rawEmail)
    .limit(1)
    .get();

  if (snapshot.empty && normalizedEmail !== rawEmail) {
    snapshot = await admin.firestore()
      .collection('users')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();
  }

  return { exists: !snapshot.empty };
});

/**
 * Cloud Function: deleteUser
 * Elimina un usuario en Auth y su perfil en Firestore
 * Permitido solo para superadmin y coordinacion
 */
exports.deleteUser = onCallWithCors(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado');
  }

  const callerRole = request.auth.token.role;
  if (!['superadmin', 'coordinacion'].includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden eliminar usuarios');
  }

  const { uid } = request.data || {};
  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid es requerido');
  }

  if (uid === request.auth.uid) {
    throw new HttpsError('failed-precondition', 'No puedes eliminar tu propio usuario');
  }

  try {
    const targetUser = await admin.auth().getUser(uid);
    const targetRole = targetUser.customClaims?.role || null;

    if (callerRole === 'coordinacion' && targetRole === 'superadmin') {
      throw new HttpsError('permission-denied', 'Coordinación no puede eliminar a un superadmin');
    }

    await admin.auth().deleteUser(uid);
    await admin.firestore().collection('users').doc(uid).delete();

    console.log(`Usuario ${uid} eliminado por ${request.auth.uid}`);

    return { success: true, message: 'Usuario eliminado correctamente', uid };
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    throw new HttpsError('internal', `Error eliminando usuario: ${error.message}`);
  }
});

// Exportar triggers
exports.onCommunicationCreated = onCommunicationCreated;
exports.onCommunicationUpdated = onCommunicationUpdated;
exports.onConversationMessageCreated = onConversationMessageCreated;
exports.onAppointmentAssigned = onAppointmentAssigned;

// Exportar scheduled functions
exports.sendSnacksReminder = sendSnacksReminder;
