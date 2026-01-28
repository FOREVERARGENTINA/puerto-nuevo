import { db } from '../config/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { fixMojibakeDeep } from '../utils/textEncoding';

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

      // Construir familias array si se pasaron responsables
      let familias = [];
      let familiasUids = [];
      if (Array.isArray(data.responsables) && data.responsables.length > 0) {
        // data.responsables = [{uid, name, email}] or [uid]
        familias = data.responsables.map(r => {
          if (typeof r === 'string') {
            return { uid: r, name: null, email: null, confirmed: false };
          }
          return { uid: r.uid, name: r.name || null, email: r.email || null, confirmed: false };
        });
        familiasUids = familias.map(f => f.uid);
      } else if (data.familiaUid) {
        familias = [{ uid: data.familiaUid, name: data.familiaNombre || null, email: data.familiaEmail || null, confirmed: false }];
        familiasUids = [data.familiaUid];
      }

      if (!existingSnapshot.empty) {
        // Si ya existe una asignación para este ambiente y semana, actualizamos con la información de child o familias si viene
        const existingDoc = existingSnapshot.docs[0];
        const updateData = {};
        if (data.childId) updateData.childId = data.childId;
        if (data.childName) updateData.childName = data.childName;
        if (familias.length > 0) {
          updateData.familias = familias;
          updateData.familiasUids = familiasUids;
        }
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = serverTimestamp();
          await updateDoc(doc(db, 'snackAssignments', existingDoc.id), updateData);
        }
        return { success: true, id: existingDoc.id, updated: true };
      }

      const snackData = {
        ambiente: data.ambiente,
        fechaInicio: data.fechaInicio, // Formato: "2026-03-03" (lunes)
        fechaFin: data.fechaFin,         // Formato: "2026-03-07" (viernes)
        familias,
        familiasUids,
        // Soporte para alumno (child) cuando la asignación viene por alumno
        childId: data.childId || null,
        childName: data.childName || null,
        estado: 'pendiente',              // pendiente | confirmado | completado | cambio_solicitado
        recordatorioEnviado: false,
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
        ...fixMojibakeDeep(doc.data())
      }));

      return { success: true, assignments };
    } catch (error) {
      console.error('Error getting snack assignments:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener asignaciones de un ambiente por rango de fechas
   */
  async getAssignmentsByAmbienteRange(ambiente, startDate, endDate) {
    try {
      const q = query(
        collection(db, 'snackAssignments'),
        where('ambiente', '==', ambiente),
        where('fechaInicio', '>=', startDate),
        where('fechaInicio', '<=', endDate),
        orderBy('fechaInicio', 'asc')
      );

      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));

      return { success: true, assignments };
    } catch (error) {
      console.error('Error getting snack assignments by range:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener asignaciones de una familia específica
   */
  async getAssignmentsByFamily(familiaUid) {
    try {
      // Ahora usamos familiasUids para poder devolver asignaciones donde la familia esté en la lista
      const q = query(
        collection(db, 'snackAssignments'),
        where('familiasUids', 'array-contains', familiaUid),
        orderBy('fechaInicio', 'asc')
      );

      const snapshot = await getDocs(q);
      const assignments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
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
   * Confirmación por familia dentro de una asignación
   * Con que 1 familia confirme, toda la asignación queda confirmada (son padres del mismo alumno)
   */
  async confirmFamilyAssignment(assignmentId, familyUid) {
    try {
      const docRef = doc(db, 'snackAssignments', assignmentId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return { success: false, error: 'Assignment not found' };

      const data = snap.data();
      const familias = Array.isArray(data.familias) ? data.familias : [];
      let changed = false;
      let confirmedByName = '';

      const newFamilias = familias.map(f => {
        if (f.uid === familyUid && !f.confirmed) {
          changed = true;
          confirmedByName = f.name || f.email || familyUid;
          return { ...f, confirmed: true, fechaConfirmacion: new Date().toISOString() };
        }
        return f;
      });

      if (changed) {
        // Una familia confirmó -> TODO confirmado (son padres del mismo alumno)
        await updateDoc(docRef, {
          familias: newFamilias,
          confirmadoPorFamilia: true,
          confirmadoPor: confirmedByName,
          estado: 'confirmado',
          updatedAt: serverTimestamp()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error confirming family assignment:', error);
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
   * Familia cancela/rechaza el turno
   */
  async cancelAssignment(assignmentId, motivo = '') {
    try {
      const docRef = doc(db, 'snackAssignments', assignmentId);
      await updateDoc(docRef, {
        estado: 'cancelado',
        motivoCancelacion: motivo,
        confirmadoPorFamilia: false,
        fechaCancelacion: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error canceling assignment:', error);
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
        return { success: true, snackList: fixMojibakeDeep(docSnap.data()) };
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
      await setDoc(docRef, {
        items,
        observaciones,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error('Error updating snack list:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Crear "semana suspendida" (vacaciones, no hay snacks)
   */
  async createSuspendedWeek(ambiente, fechaInicio, fechaFin, motivo = 'Vacaciones') {
    try {
      const suspendedData = {
        ambiente,
        fechaInicio,
        fechaFin,
        familiaUid: 'SUSPENDED',
        familiaEmail: '',
        familiaNombre: `⛔ ${motivo}`,
        estado: 'suspendido',
        suspendido: true,
        motivoSuspension: motivo,
        recordatorioEnviado: false,
        confirmadoPorFamilia: false,
        solicitudCambio: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'snackAssignments'), suspendedData);
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating suspended week:', error);
      return { success: false, error: error.message };
    }
  }
};
