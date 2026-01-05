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
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

const communicationsCollection = collection(db, 'communications');

export const communicationsService = {
  async createCommunication(data) {
    try {
      const docRef = await addDoc(communicationsCollection, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async uploadAttachments(commId, files) {
    try {
      const attachments = [];
      for (const file of files) {
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const storageRef = ref(storage, `communications/${commId}/${fileName}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        attachments.push({ name: file.name, url: downloadURL, path: `communications/${commId}/${fileName}` });
      }

      // Guardar metadata en el documento y marcar adjuntos como completos
      await updateDoc(doc(communicationsCollection, commId), {
        attachments,
        hasPendingAttachments: false,
        updatedAt: serverTimestamp()
      });

      return { success: true, attachments };
    } catch (error) {
      console.error('Error subiendo adjuntos:', error);
      return { success: false, error: error.message };
    }
  },

  async getCommunicationById(commId) {
    try {
      const commDoc = await getDoc(doc(communicationsCollection, commId));
      if (commDoc.exists()) {
        return { success: true, communication: { id: commDoc.id, ...commDoc.data() } };
      }
      return { success: false, error: 'Comunicado no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAllCommunications(limitCount = 50) {
    try {
      const q = query(
        communicationsCollection,
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const communications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, communications };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getCommunicationsByType(type, limitCount = 50) {
    try {
      const q = query(
        communicationsCollection,
        where('type', '==', type),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const communications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, communications };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getCommunicationsForUser(userId, limitCount = 50) {
    try {
      const q = query(
        communicationsCollection,
        where('destinatarios', 'array-contains', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);
      const communications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, communications };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateCommunication(commId, data) {
    try {
      await updateDoc(doc(communicationsCollection, commId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteCommunication(commId) {
    try {
      await deleteDoc(doc(communicationsCollection, commId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
