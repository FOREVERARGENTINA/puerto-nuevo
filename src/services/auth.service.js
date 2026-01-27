import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth } from '../config/firebase';
import { functions } from '../config/firebase';

export const authService = {
  // Login
  async login(email, password) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: credential.user };
    } catch (error) {
      return { success: false, error: error.message };
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
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Verificar si un email existe en la lista de usuarios (Firestore)
  async checkUserEmail(email) {
    try {
      const checkUserEmail = httpsCallable(functions, 'checkUserEmail');
      const result = await checkUserEmail({ email });
      return { success: true, exists: !!result.data?.exists };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Crear usuario (solo para testing inicial, luego admin lo hace)
  async createUser(email, password) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: credential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser() {
    return auth.currentUser;
  }
};
