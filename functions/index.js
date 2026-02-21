const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

// Inicializar Admin SDK
admin.initializeApp();

// Importar triggers
const { onCommunicationCreated, onCommunicationUpdated } = require('./src/triggers/onCommunicationCreated');
const { onConversationMessageCreated } = require('./src/triggers/onConversationMessageCreated');
const { onConversationUpdated } = require('./src/triggers/onConversationUpdated');
const { onAppointmentAssigned } = require('./src/triggers/onAppointmentAssigned');
const { onDocumentWithMandatoryReading } = require('./src/triggers/onDocumentCreated');
const { onEventCreated } = require('./src/triggers/onEventCreated');
const { onTallerResourcePostCreated } = require('./src/triggers/onTallerResourcePostCreated');
const { onAmbienteActivityCreated } = require('./src/triggers/onAmbienteActivityCreated');
const { sendSnacksReminder } = require('./src/scheduled/snacksReminder');
const { maskEmail } = require('./src/utils/logging');

const onCallWithCors = (handler) => onCall({ cors: true }, handler);
const VALID_ROLES = ['superadmin', 'coordinacion', 'docente', 'tallerista', 'family', 'aspirante'];

const ensureDataObject = (data) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new HttpsError('invalid-argument', 'request.data debe ser un objeto');
  }
  return data;
};

const requireNonEmptyString = (value, field, maxLength = 256) => {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${field} debe ser string`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpsError('invalid-argument', `${field} es requerido`);
  }

  if (trimmed.length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} supera el largo permitido`);
  }

  return trimmed;
};

const optionalString = (value, field, maxLength = 256) => {
  if (value == null) return null;
  return requireNonEmptyString(value, field, maxLength);
};

const normalizeAndValidateEmail = (emailValue) => {
  const email = requireNonEmptyString(emailValue, 'email', 320).toLowerCase();
  const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!basicEmailPattern.test(email)) {
    throw new HttpsError('invalid-argument', 'email invalido');
  }

  return email;
};

const getUserRole = async (uid) => {
  const authUser = await admin.auth().getUser(uid);
  let role = authUser.customClaims?.role || null;

  // Fallback para cuentas legacy sin custom claim pero con rol en Firestore.
  if (!role) {
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    role = userDoc.exists ? userDoc.data()?.role || null : null;
  }

  return role;
};

/**
 * Cloud Function: setUserRole
 * Asigna un custom claim (rol) a un usuario.
 * Solo puede ser llamada por usuarios con rol admin.
 */
exports.setUserRole = onCallWithCors(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado para asignar roles');
  }

  const callerRole = request.auth.token.role;
  if (!callerRole || !['superadmin', 'coordinacion'].includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden asignar roles');
  }

  const data = ensureDataObject(request.data);
  const uid = requireNonEmptyString(data.uid, 'uid', 128);
  const role = requireNonEmptyString(data.role, 'role', 64);

  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', `Rol invalido. Debe ser uno de: ${VALID_ROLES.join(', ')}`);
  }

  if (callerRole === 'coordinacion' && role === 'superadmin') {
    throw new HttpsError('permission-denied', 'Coordinacion no puede asignar rol superadmin');
  }

  try {
    const targetRole = await getUserRole(uid);
    if (callerRole === 'coordinacion' && targetRole === 'superadmin') {
      throw new HttpsError('permission-denied', 'Coordinacion no puede modificar a un superadmin');
    }

    await admin.auth().setCustomUserClaims(uid, { role });

    await admin.firestore().collection('users').doc(uid).set(
      { role },
      { merge: true }
    );

    console.log(`Rol ${role} asignado a usuario ${uid} por ${request.auth.uid}`);

    return {
      success: true,
      message: `Rol ${role} asignado correctamente`,
      uid,
      role,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error asignando rol:', error);
    throw new HttpsError('internal', `Error asignando rol: ${error.message}`);
  }
});

/**
 * Cloud Function: createUserWithRole
 * Crea un usuario nuevo con email/password y le asigna un rol.
 * Solo para superadmin/coordinacion.
 */
exports.createUserWithRole = onCallWithCors(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado');
  }

  const callerRole = request.auth.token.role;
  if (!['superadmin', 'coordinacion'].includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden crear usuarios');
  }

  const data = ensureDataObject(request.data);
  const email = normalizeAndValidateEmail(data.email);
  const password = requireNonEmptyString(data.password, 'password', 1024);
  const role = requireNonEmptyString(data.role, 'role', 64);
  const displayName = optionalString(data.displayName, 'displayName', 128);

  if (password.length < 8) {
    throw new HttpsError('invalid-argument', 'password debe tener al menos 8 caracteres');
  }

  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', 'Rol invalido');
  }

  if (callerRole === 'coordinacion' && role === 'superadmin') {
    throw new HttpsError('permission-denied', 'Coordinacion no puede crear usuarios superadmin');
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email,
      displayName: displayName || email.split('@')[0],
      role,
      children: [],
      fcmTokens: [],
      disabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
    });

    console.log(`Usuario ${maskEmail(email)} creado con rol ${role} por ${request.auth.uid}`);

    return {
      success: true,
      message: 'Usuario creado correctamente',
      uid: userRecord.uid,
      email,
      role,
    };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error creando usuario:', error);
    throw new HttpsError('internal', `Error creando usuario: ${error.message}`);
  }
});

/**
 * Cloud Function: updateUserAuth
 * Actualiza email y displayName en Firebase Authentication y Firestore.
 * Permitido solo para superadmin y coordinacion.
 */
exports.updateUserAuth = onCallWithCors(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado');
  }

  const callerRole = request.auth.token.role;
  if (!['superadmin', 'coordinacion'].includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden actualizar Auth');
  }

  const data = ensureDataObject(request.data);
  const uid = requireNonEmptyString(data.uid, 'uid', 128);
  const email = data.email == null ? null : normalizeAndValidateEmail(data.email);
  const displayName = optionalString(data.displayName, 'displayName', 128);

  try {
    const targetRole = await getUserRole(uid);
    if (callerRole === 'coordinacion' && targetRole === 'superadmin') {
      throw new HttpsError('permission-denied', 'Coordinacion no puede editar a un superadmin');
    }

    const updateParams = {};
    if (email) updateParams.email = email;
    if (displayName) updateParams.displayName = displayName;

    if (Object.keys(updateParams).length === 0) {
      throw new HttpsError('invalid-argument', 'email o displayName son requeridos');
    }

    await admin.auth().updateUser(uid, updateParams);

    const updates = {};
    if (email) updates.email = email;
    if (displayName) updates.displayName = displayName;
    if (Object.keys(updates).length > 0) {
      await admin.firestore().collection('users').doc(uid).set(updates, { merge: true });
    }

    console.log(`Auth actualizado para ${uid} por ${request.auth.uid}`);

    return { success: true, message: 'Usuario actualizado en Auth y Firestore' };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error actualizando usuario en Auth:', error);
    throw new HttpsError('internal', `Error actualizando usuario: ${error.message}`);
  }
});

/**
 * Cloud Function: checkUserEmail
 * Verifica si un email existe en la coleccion users (Firestore).
 */
exports.checkUserEmail = onCallWithCors(async (request) => {
  const data = ensureDataObject(request.data || {});
  const rawEmail = requireNonEmptyString(data.email, 'email', 320);
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
 * Elimina un usuario en Auth y su perfil en Firestore.
 */
exports.deleteUser = onCallWithCors(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado');
  }

  const callerRole = request.auth.token.role;
  if (!['superadmin', 'coordinacion'].includes(callerRole)) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden eliminar usuarios');
  }

  const data = ensureDataObject(request.data || {});
  const uid = requireNonEmptyString(data.uid, 'uid', 128);

  if (uid === request.auth.uid) {
    throw new HttpsError('failed-precondition', 'No puedes eliminar tu propio usuario');
  }

  try {
    const targetRole = await getUserRole(uid);

    if (callerRole === 'coordinacion' && targetRole === 'superadmin') {
      throw new HttpsError('permission-denied', 'Coordinacion no puede eliminar a un superadmin');
    }

    await admin.auth().deleteUser(uid);
    await admin.firestore().collection('users').doc(uid).delete();

    console.log(`Usuario ${uid} eliminado por ${request.auth.uid}`);

    return { success: true, message: 'Usuario eliminado correctamente', uid };
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error eliminando usuario:', error);
    throw new HttpsError('internal', `Error eliminando usuario: ${error.message}`);
  }
});

// Exportar triggers
exports.onCommunicationCreated = onCommunicationCreated;
exports.onCommunicationUpdated = onCommunicationUpdated;
exports.onConversationMessageCreated = onConversationMessageCreated;
exports.onConversationUpdated = onConversationUpdated;
exports.onAppointmentAssigned = onAppointmentAssigned;
exports.onDocumentWithMandatoryReading = onDocumentWithMandatoryReading;
exports.onEventCreated = onEventCreated;
exports.onTallerResourcePostCreated = onTallerResourcePostCreated;
exports.onAmbienteActivityCreated = onAmbienteActivityCreated;

// Exportar scheduled functions
exports.sendSnacksReminder = sendSnacksReminder;
