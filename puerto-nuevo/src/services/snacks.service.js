import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Servicio para gestión de calendario de snacks
 */
export const snacksService = {
  /**
   * Crear asignación de snack
   */
  async createSnackAssignment(data) {
    try {
      // Validar que no exista ya una asignación para esa semana en ese ambiente
      const q = query(
        collection(db, 'snackAssignments'),
        where('ambiente', '==', data.ambiente),
        where('fechaInicio', '==', data.fechaInicio)
      );

      const existingSnapshot = await getDocs(q);

      if (!existingSnapshot.empty) {
        return {
          success: false,
          error: 'Ya existe una asignación para esta semana en este taller. Por favor selecciona otra fecha.'
        };
      }

      const snackData = {
        ambiente: data.ambiente,
        fechaInicio: data.fechaInicio, // Formato: "2026-03-03" (lunes)
        fechaFin: data.fechaFin,         // Formato: "2026-03-07" (viernes)
        familiaUid: data.familiaUid,
        familiaEmail: data.familiaEmail,
        familiaNombre: data.familiaNombre,
        estado: 'pendiente',              // pendiente | confirmado | completado | cambio_solicitado
        recordatorioEnviado: false,
        confirmadoPorFamilia: false,
        solicitudCambio: false,
        motivoCambio: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'snackAssignments'), snackData);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating snack assignment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener todas las asignaciones de un ambiente
   */
  async getAssignmentsByAmbiente(ambiente) {
    try {
      const q = query(
        collection(db, 'snackAssignments'),
        where('ambiente', '==', ambiente),
        orderBy('fechaInicio', 'asc')
      );

      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, assignments };
    } catch (error) {
      console.error('Error getting snack assignments:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener asignaciones de una familia específica
   */
  async getAssignmentsByFamily(familiaUid) {
    try {
      const q = query(
        collection(db, 'snackAssignments'),
        where('familiaUid', '==', familiaUid),
        orderBy('fechaInicio', 'asc')
      );

      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, assignments };
    } catch (error) {
      console.error('Error getting family assignments:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Familia confirma que traerá los snacks
   */
  async confirmAssignment(assignmentId) {
    try {
      const docRef = doc(db, 'snackAssignments', assignmentId);
      await updateDoc(docRef, {
        confirmadoPorFamilia: true,
        estado: 'confirmado',
        solicitudCambio: false,
        motivoCambio: null,
        fechaConfirmacion: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error confirming assignment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Familia solicita cambio de fecha (no puede llevar snacks)
   */
  async requestChange(assignmentId, motivo = '') {
    try {
      const docRef = doc(db, 'snackAssignments', assignmentId);
      await updateDoc(docRef, {
        solicitudCambio: true,
        motivoCambio: motivo,
        confirmadoPorFamilia: false,
        estado: 'cambio_solicitado',
        fechaSolicitudCambio: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error requesting change:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Admin marca como completado
   */
  async markAsCompleted(assignmentId) {
    try {
      const docRef = doc(db, 'snackAssignments', assignmentId);
      await updateDoc(docRef, {
        estado: 'completado',
        fechaCompletado: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error marking as completed:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Actualizar asignación
   */
  async updateAssignment(assignmentId, data) {
    try {
      const docRef = doc(db, 'snackAssignments', assignmentId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating assignment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Eliminar asignación
   */
  async deleteAssignment(assignmentId) {
    try {
      await deleteDoc(doc(db, 'snackAssignments', assignmentId));
      return { success: true };
    } catch (error) {
      console.error('Error deleting assignment:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener lista de snacks permitidos por ambiente
   */
  async getSnackList(ambiente) {
    try {
      const docRef = doc(db, 'snackLists', ambiente);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { success: true, snackList: docSnap.data() };
      } else {
        // Si no existe, devolver lista por defecto
        return {
          success: true,
          snackList: {
            items: [
              'Frutos secos sin azúcar 400g (almendras, semillas de girasol, nueces, pasas o maní)',
              'Pan casero 1 (considerar sin TACC)',
              '3 paquetes de galletas de arroz',
              'Frutas y/o verduras 2kg variado',
              'Queso cremoso 600g',
              'Huevos duros o revueltos (8 unidades)',
              '1 Leche'
            ],
            observaciones: 'Si desean enviar una preparación casera u otro alimento que no se encuentre en la lista, consultar previamente.'
          }
        };
      }
    } catch (error) {
      console.error('Error getting snack list:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Actualizar lista de snacks de un ambiente
   */
  async updateSnackList(ambiente, items, observaciones) {
    try {
      const docRef = doc(db, 'snackLists', ambiente);
      await updateDoc(docRef, {
        items,
        observaciones,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating snack list:', error);
      return { success: false, error: error.message };
    }
  }
};
