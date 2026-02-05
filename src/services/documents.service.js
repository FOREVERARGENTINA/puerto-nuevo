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
import { documentReadReceiptsService } from './documentReadReceipts.service';

const documentsCollection = collection(db, 'documents');
const usersCollection = collection(db, 'users');
const childrenCollection = collection(db, 'children');

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

      const docData = {
        ...metadata,
        archivoURL: downloadURL,
        archivoNombre: file.name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(documentsCollection, docData);

      // Si requiere lectura, crear receipts para destinatarios
      if (metadata.requiereLectura && metadata.ambiente) {
        const destinatarios = await this.getDestinatariosByAmbiente(metadata.ambiente);
        
        if (destinatarios.length > 0) {
          await documentReadReceiptsService.createPendingReceipts(docRef.id, destinatarios);
        }
      }

      return { success: true, id: docRef.id, url: downloadURL };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtiene lista de destinatarios (familias) seg\u00fan el ambiente
   * @param {string} ambiente - 'todos', 'taller1', 'taller2'
   */
  async getDestinatariosByAmbiente(ambiente) {
    try {
      let destinatarios = [];

      if (ambiente === 'todos') {
        // Obtener todas las familias
        const q = query(usersCollection, where('role', '==', 'family'));
        const snapshot = await getDocs(q);
        destinatarios = snapshot.docs.map(doc => ({
          uid: doc.id,
          email: doc.data().email,
          role: 'family',
          ambiente: 'todos'
        }));
      } else {
        // Obtener familias de un taller espec\u00edfico
        // Primero obtenemos alumnos del taller
        const childrenQuery = query(
          childrenCollection,
          where('ambiente', '==', ambiente)
        );
        const childrenSnapshot = await getDocs(childrenQuery);
        
        // Extraer UIDs \u00fanicos de responsables
        const responsableUids = new Set();
        childrenSnapshot.docs.forEach(doc => {
          const child = doc.data();
          if (child.responsables && Array.isArray(child.responsables)) {
            child.responsables.forEach(resp => {
              if (resp.uid) {
                responsableUids.add(resp.uid);
              }
            });
          }
        });

        // Obtener datos de usuarios
        if (responsableUids.size > 0) {
          const uidArray = Array.from(responsableUids);
          // Firestore 'in' query tiene l\u00edmite de 10, dividir si es necesario
          const chunks = [];
          for (let i = 0; i < uidArray.length; i += 10) {
            chunks.push(uidArray.slice(i, i + 10));
          }

          for (const chunk of chunks) {
            const usersQuery = query(
              usersCollection,
              where('__name__', 'in', chunk)
            );
            const usersSnapshot = await getDocs(usersQuery);
            
            usersSnapshot.docs.forEach(doc => {
              destinatarios.push({
                uid: doc.id,
                email: doc.data().email,
                role: doc.data().role,
                ambiente
              });
            });
          }
        }
      }

      return destinatarios;
    } catch (error) {
      console.error('Error obteniendo destinatarios:', error);
      return [];
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
