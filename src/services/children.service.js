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
import { fixMojibakeDeep } from '../utils/textEncoding';

const childrenCollection = collection(db, 'children');

export const childrenService = {
  async createChild(data) {
    try {
      console.log('🔍 DEBUG: Creando alumno con datos:', data);
      console.log('🔍 DEBUG: Responsables que se guardarán:', data.responsables);
      const docRef = await addDoc(childrenCollection, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('✅ Alumno creado con ID:', docRef.id);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('❌ ERROR al crear alumno:', error);
      return { success: false, error: error.message };
    }
  },

  async getChildById(childId) {
    try {
      const childDoc = await getDoc(doc(childrenCollection, childId));
      if (childDoc.exists()) {
        return { success: true, child: { id: childDoc.id, ...fixMojibakeDeep(childDoc.data()) } };
      }
      return { success: false, error: 'Alumno no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAllChildren() {
    try {
      const q = query(childrenCollection, orderBy('nombreCompleto', 'asc'));
      const snapshot = await getDocs(q);
      const children = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, children };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getChildrenByAmbiente(ambiente) {
    try {
      const q = query(
        childrenCollection,
        where('ambiente', '==', ambiente),
        orderBy('nombreCompleto', 'asc')
      );
      const snapshot = await getDocs(q);
      const children = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, children };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getChildrenByResponsable(responsableUid) {
    try {
      console.log('🔍 DEBUG: Buscando hijos para responsableUid:', responsableUid);
      const q = query(
        childrenCollection,
        where('responsables', 'array-contains', responsableUid)
      );
      const snapshot = await getDocs(q);
      console.log('🔍 DEBUG: Documentos encontrados:', snapshot.size);
      const children = snapshot.docs.map(doc => {
        const data = fixMojibakeDeep(doc.data());
        console.log(`🔍 DEBUG: Alumno ${doc.id}:`, data.nombreCompleto, 'Responsables:', data.responsables);
        return {
          id: doc.id,
          ...data
        };
      }).sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
      return { success: true, children };
    } catch (error) {
      console.error('❌ ERROR en getChildrenByResponsable:', error);
      return { success: false, error: error.message };
    }
  },

  async updateChild(childId, data) {
    try {
      await updateDoc(doc(childrenCollection, childId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteChild(childId) {
    try {
      await deleteDoc(doc(childrenCollection, childId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateDatosMedicos(childId, datosMedicos) {
    try {
      await updateDoc(doc(childrenCollection, childId), {
        datosMedicos,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
