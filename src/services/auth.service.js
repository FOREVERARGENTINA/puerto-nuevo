import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth } from '../config/firebase';
import { functions } from '../config/firebase';

const PASSWORD_RESET_URL =
  import.meta.env.VITE_PASSWORD_RESET_URL || 'https://montessoripuertonuevo.com.ar/auth/accion';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getFriendlyAuthError(error, context = 'generic') {
  const code = typeof error?.code === 'string' ? error.code : '';

  switch (code) {
    case 'auth/invalid-email':
      return 'El email no es valido.';
    case 'auth/user-disabled':
      return 'Tu cuenta esta deshabilitada. Contacta a la escuela.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return context === 'login'
        ? 'Email o contrasena incorrectos. Si no recuerdas la clave, usa el enlace para recuperarla.'
        : 'No se pudo validar las credenciales.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.';
    case 'auth/network-request-failed':
      return 'No se pudo conectar con Firebase. Revisa tu conexion e intenta nuevamente.';
    case 'auth/invalid-continue-uri':
    case 'auth/unauthorized-continue-uri':
      return 'No se pudo preparar el enlace de recuperacion. Contacta a la escuela.';
    default:
      break;
  }

  if (typeof error?.message === 'string' && error.message && !error.message.startsWith('Firebase: Error')) {
    return error.message;
  }

  if (context === 'login') {
    return 'No se pudo iniciar sesion. Intenta nuevamente.';
  }

  if (context === 'reset') {
    return 'No se pudo enviar el correo de recuperacion.';
  }

  return 'Ocurrio un error inesperado.';
}

export const authService = {
  // Login
  async login(email, password) {
    try {
      const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      return { success: true, user: credential.user };
    } catch (error) {
      return { success: false, error: getFriendlyAuthError(error, 'login') };
    }
  },

  // Logout
  async logout() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Reset password
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, normalizeEmail(email), {
        url: PASSWORD_RESET_URL,
        handleCodeInApp: false
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: getFriendlyAuthError(error, 'reset') };
    }
  },

  // Verificar si un email existe en la lista de usuarios (Firestore)
  async checkUserEmail(email) {
    try {
      const checkUserEmail = httpsCallable(functions, 'checkUserEmail');
      const result = await checkUserEmail({ email: normalizeEmail(email) });
      return { success: true, exists: !!result.data?.exists };
    } catch (error) {
      return { success: false, error: getFriendlyAuthError(error) };
    }
  },

  // Crear usuario (solo para testing inicial, luego admin lo hace)
  async createUser(email, password) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
      return { success: true, user: credential.user };
    } catch (error) {
      return { success: false, error: getFriendlyAuthError(error) };
    }
  },

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }
};
