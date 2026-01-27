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
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { fixMojibakeDeep } from '../utils/textEncoding';

const documentsCollection = collection(db, 'documents');

export const documentsService = {
  async getAllDocuments() {
    try {
      const q = query(documentsCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, documents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getDocumentsByRole(role) {
    try {
      const q = query(
        documentsCollection,
        where('roles', 'array-contains', role),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, documents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getDocumentsByCategory(categoria) {
    try {
      const q = query(
        documentsCollection,
        where('categoria', '==', categoria),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, documents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getDocumentById(docId) {
    try {
      const docRef = await getDoc(doc(documentsCollection, docId));
      if (docRef.exists()) {
        return { success: true, document: { id: docRef.id, ...fixMojibakeDeep(docRef.data()) } };
      }
      return { success: false, error: 'Documento no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async uploadDocument(file, metadata) {
    try {
      const storageRef = ref(storage, `documents/${metadata.categoria}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const docRef = await addDoc(documentsCollection, {
        ...metadata,
        archivoURL: downloadURL,
        archivoNombre: file.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true, id: docRef.id, url: downloadURL };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateDocument(docId, data) {
    try {
      await updateDoc(doc(documentsCollection, docId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteDocument(docId, categoria, fileName) {
    try {
      await deleteDoc(doc(documentsCollection, docId));
      const storageRef = ref(storage, `documents/${categoria}/${fileName}`);
      await deleteObject(storageRef);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
