import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const talleresCollection = collection(db, 'talleres');

export const talleresService = {
  async getAllTalleres() {
    try {
      const q = query(talleresCollection, orderBy('nombre', 'asc'));
      const snapshot = await getDocs(q);
      const talleres = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, talleres };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getTallerById(tallerId) {
    try {
      const tallerDoc = await getDoc(doc(talleresCollection, tallerId));
      if (tallerDoc.exists()) {
        return { success: true, taller: { id: tallerDoc.id, ...tallerDoc.data() } };
      }
      return { success: false, error: 'Taller no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getTalleresByTallerista(talleristaUid) {
    try {
      const q = query(
        talleresCollection,
        where('talleristaId', 'array-contains', talleristaUid)
      );
      const snapshot = await getDocs(q);
      const talleres = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, talleres };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createTaller(data) {
    try {
      let talleristaId = data.talleristaId;
      if (talleristaId && !Array.isArray(talleristaId)) {
        talleristaId = [talleristaId];
      }
      const docRef = await addDoc(talleresCollection, {
        ...data,
        talleristaId,
        estado: 'activo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateTaller(tallerId, data) {
    try {
      const updatedData = { ...data };
      if (updatedData.talleristaId && !Array.isArray(updatedData.talleristaId)) {
        updatedData.talleristaId = [updatedData.talleristaId];
      }
      await updateDoc(doc(talleresCollection, tallerId), {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteTaller(tallerId) {
    try {
      await deleteDoc(doc(talleresCollection, tallerId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getGallery(tallerId) {
    try {
      const galleryCollection = collection(db, `talleres/${tallerId}/gallery`);
      const q = query(galleryCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async addGalleryItem(tallerId, data) {
    try {
      const galleryCollection = collection(db, `talleres/${tallerId}/gallery`);
      const docRef = await addDoc(galleryCollection, {
        ...data,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteGalleryItem(tallerId, itemId) {
    try {
      const itemDoc = doc(db, `talleres/${tallerId}/gallery`, itemId);
      await deleteDoc(itemDoc);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
