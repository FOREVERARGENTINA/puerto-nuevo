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
import {
  normalizeSnackAssignmentState,
  SNACK_ASSIGNMENT_STATE
} from '../utils/snackAssignmentState';

const isPastAssignment = (fechaFin) => {
  if (!fechaFin) return false;
  const endDate = new Date(`${fechaFin}T23:59:59`);
  return endDate < new Date();
};

const isCurrentAssignmentWeek = (fechaInicio, fechaFin) => {
  if (!fechaInicio || !fechaFin) return false;
  const startDate = new Date(`${fechaInicio}T00:00:00`);
  const endDate = new Date(`${fechaFin}T23:59:59`);
  const now = new Date();
  return now >= startDate && now <= endDate;
};

const isTerminalState = (stateKey) => (
  stateKey === SNACK_ASSIGNMENT_STATE.CANCELLED
  || stateKey === SNACK_ASSIGNMENT_STATE.COMPLETED
);

const dispatchSnacksUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('snacks:updated'));
  }
};

const resetFamiliesConfirmation = (familias = []) => (
  Array.isArray(familias)
    ? familias.map((family) => ({
        ...family,
        confirmed: false,
        fechaConfirmacion: null,
        recordatorioEnviado: false,
        fechaRecordatorio: null
      }))
    : []
);

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
        const existingData = existingDoc.data();
        const updateData = {};
        if (data.childId) updateData.childId = data.childId;
        if (data.childName) updateData.childName = data.childName;
        if (familias.length > 0) {
          updateData.familias = resetFamiliesConfirmation(familias);
          updateData.familiasUids = familiasUids;
        }
        if (Object.keys(updateData).length > 0) {
          // Reasignación para la misma semana: reinicia estado y confirmaciones para evitar inconsistencias.
          updateData.estado = 'pendiente';
          updateData.assignedAt = serverTimestamp();
          updateData.confirmadoPorFamilia = false;
          updateData.confirmadoPor = null;
          updateData.solicitudCambio = false;
          updateData.motivoCambio = null;
          updateData.motivoCancelacion = null;
          updateData.fechaCancelacion = null;
          updateData.fechaConfirmacion = null;
          updateData.recordatorioEnviado = false;
          updateData.suspendido = false;
          updateData.motivoSuspension = null;
          if (!updateData.familias && Array.isArray(existingData.familias)) {
            updateData.familias = resetFamiliesConfirmation(existingData.familias);
          }
          updateData.updatedAt = serverTimestamp();
          await updateDoc(doc(db, 'snackAssignments', existingDoc.id), updateData);
        }
        return { success: true, id: existingDoc.id, updated: true };
      }

      const snackData = {
        ambiente: data.ambiente,
        fechaInicio: data.fechaInicio, // Formato: "2026-03-03" (lunes)
        fechaFin: data.fechaFin,         // Formato: "2026-03-07" (viernes)
        familias: resetFamiliesConfirmation(familias),
        familiasUids,
        // Soporte para alumno (child) cuando la asignación viene por alumno
        childId: data.childId || null,
        childName: data.childName || null,
        estado: 'pendiente',              // pendiente | confirmado | cambio_solicitado
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
      const snap = await getDoc(docRef);
      if (!snap.exists()) return { success: false, error: 'Assignment not found' };

      const data = snap.data();
      const state = normalizeSnackAssignmentState(data);
      if (state === SNACK_ASSIGNMENT_STATE.SUSPENDED || isTerminalState(state)) {
        return { success: false, error: 'No se puede confirmar este turno en su estado actual.' };
      }
      if (isPastAssignment(data.fechaFin)) {
        return { success: false, error: 'No se puede confirmar un turno pasado.' };
      }

      const families = Array.isArray(data.familias)
        ? data.familias.map((family, index, all) => (
            all.length === 1
              ? {
                  ...family,
                  confirmed: true,
                  fechaConfirmacion: family.fechaConfirmacion || new Date().toISOString()
                }
              : family
          ))
        : [];
      await updateDoc(docRef, {
        familias: families,
        confirmadoPorFamilia: true,
        confirmadoPor: data.confirmadoPor || 'Familia',
        estado: 'confirmado',
        solicitudCambio: false,
        assignedAt: serverTimestamp(),
        motivoCambio: null,
        motivoCancelacion: null,
        fechaCancelacion: null,
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
      const state = normalizeSnackAssignmentState(data);
      if (state === SNACK_ASSIGNMENT_STATE.SUSPENDED || isTerminalState(state)) {
        return { success: false, error: 'No se puede confirmar este turno en su estado actual.' };
      }
      if (isPastAssignment(data.fechaFin)) {
        return { success: false, error: 'No se puede confirmar un turno pasado.' };
      }

      const familias = Array.isArray(data.familias) ? data.familias : [];
      if (familias.length === 0) {
        return { success: false, error: 'Este turno no tiene familias responsables configuradas.' };
      }

      const targetFamily = familias.find((f) => f.uid === familyUid);
      if (!targetFamily) {
        return { success: false, error: 'La familia no esta vinculada a este turno.' };
      }

      const confirmedByName = targetFamily.name || targetFamily.email || familyUid;
      const nowIso = new Date().toISOString();
      const updatedFamilies = familias.map((family) => (
        family.uid === familyUid
          ? { ...family, confirmed: true, fechaConfirmacion: nowIso }
          : family
      ));

      await updateDoc(docRef, {
        familias: updatedFamilies,
        confirmadoPorFamilia: true,
        confirmadoPor: confirmedByName,
        estado: 'confirmado',
        solicitudCambio: false,
        motivoCambio: null,
        motivoCancelacion: null,
        fechaCancelacion: null,
        fechaConfirmacion: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      dispatchSnacksUpdated();
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
      const snap = await getDoc(docRef);
      if (!snap.exists()) return { success: false, error: 'Assignment not found' };

      const data = snap.data();
      const state = normalizeSnackAssignmentState(data);
      if (state === SNACK_ASSIGNMENT_STATE.SUSPENDED || isTerminalState(state)) {
        return { success: false, error: 'No se puede solicitar cambio para este turno.' };
      }
      if (isPastAssignment(data.fechaFin)) {
        return { success: false, error: 'No se puede solicitar cambio de un turno pasado.' };
      }
      if (isCurrentAssignmentWeek(data.fechaInicio, data.fechaFin)) {
        return { success: false, error: 'No se puede solicitar cambio durante la semana actual del turno.' };
      }

      await updateDoc(docRef, {
        solicitudCambio: true,
        motivoCambio: motivo,
        confirmadoPorFamilia: false,
        confirmadoPor: null,
        estado: 'cambio_solicitado',
        fechaSolicitudCambio: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      dispatchSnacksUpdated();
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
      const snap = await getDoc(docRef);
      if (!snap.exists()) return { success: false, error: 'Assignment not found' };

      const data = snap.data();
      const state = normalizeSnackAssignmentState(data);
      if (state === SNACK_ASSIGNMENT_STATE.SUSPENDED || state === SNACK_ASSIGNMENT_STATE.COMPLETED) {
        return { success: false, error: 'No se puede cancelar este turno en su estado actual.' };
      }
      if (isPastAssignment(data.fechaFin)) {
        return { success: false, error: 'No se puede cancelar un turno pasado.' };
      }

      await updateDoc(docRef, {
        familias: resetFamiliesConfirmation(data.familias),
        estado: 'cancelado',
        motivoCancelacion: motivo,
        confirmadoPorFamilia: false,
        confirmadoPor: null,
        solicitudCambio: false,
        motivoCambio: null,
        fechaCancelacion: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      dispatchSnacksUpdated();
      return { success: true };
    } catch (error) {
      console.error('Error canceling assignment:', error);
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
      const q = query(
        collection(db, 'snackAssignments'),
        where('ambiente', '==', ambiente),
        where('fechaInicio', '==', fechaInicio)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const updates = snapshot.docs.map(docSnap =>
          updateDoc(doc(db, 'snackAssignments', docSnap.id), {
            suspendido: true,
            motivoSuspension: motivo,
            confirmadoPorFamilia: false,
            confirmadoPor: null,
            solicitudCambio: false,
            motivoCambio: null,
            updatedAt: serverTimestamp()
          })
        );
        await Promise.all(updates);
        return { success: true, updated: true, ids: snapshot.docs.map(d => d.id) };
      }

      const suspendedData = {
        ambiente,
        fechaInicio,
        fechaFin,
        familiaUid: 'SUSPENDED',
        familiaEmail: '',
        familiaNombre: `Pausa: ${motivo}`,
        familiasUids: [],
        estado: 'suspendido',
        suspendido: true,
        motivoSuspension: motivo,
        recordatorioEnviado: false,
        confirmadoPorFamilia: false,
        confirmadoPor: null,
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
