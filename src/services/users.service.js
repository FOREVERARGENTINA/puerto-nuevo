import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { fixMojibakeDeep } from '../utils/textEncoding';

const usersCollection = collection(db, 'users');

export const usersService = {
  // Crear usuario en Firestore (después de crear en Auth)
  async createUserProfile(uid, data) {
    try {
      await setDoc(doc(usersCollection, uid), {
        ...data,
        createdAt: serverTimestamp(),
        disabled: false,
        fcmTokens: []
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Obtener usuario por UID
  async getUserById(uid) {
    try {
      const userDoc = await getDoc(doc(usersCollection, uid));
      if (userDoc.exists()) {
        return { success: true, user: { id: userDoc.id, ...fixMojibakeDeep(userDoc.data()) } };
      }
      return { success: false, error: 'Usuario no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Obtener todos los usuarios (solo admin)
  async getAllUsers() {
    try {
      const snapshot = await getDocs(usersCollection);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, users };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Obtener usuarios por rol
  async getUsersByRole(role) {
    try {
      const q = query(usersCollection, where('role', '==', role));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, users };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Actualizar usuario
  async updateUser(uid, data) {
    try {
      await updateDoc(doc(usersCollection, uid), data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Soft delete (disabled = true)
  async disableUser(uid) {
    try {
      await updateDoc(doc(usersCollection, uid), { disabled: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Hard delete (Auth + Firestore) via callable
  async deleteUser(uid) {
    try {
      const deleteUserCallable = httpsCallable(functions, 'deleteUser');
      const result = await deleteUserCallable({ uid });
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createUserWithRole(userData) {
    try {
      const createUser = httpsCallable(functions, 'createUserWithRole');
      const result = await createUser(userData);
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async setUserRole(uid, role) {
    try {
      const setRole = httpsCallable(functions, 'setUserRole');
      const result = await setRole({ uid, role });
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Actualiza email/displayName en Firebase Auth y Firestore (callable)
  async updateUserAuth(uid, data) {
    try {
      const updateUser = httpsCallable(functions, 'updateUserAuth');
      const result = await updateUser({ uid, ...data });
      return { success: true, data: result.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
