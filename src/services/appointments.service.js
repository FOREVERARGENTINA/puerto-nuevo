import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { fixMojibakeDeep } from '../utils/textEncoding';
import { AMBIENTES } from '../config/constants';

const appointmentsCollection = collection(db, 'appointments');
const getNotesDocRef = (appointmentId) => (
  doc(db, 'appointments', appointmentId, 'notes', 'summary')
);
const emitAppointmentsUpdated = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('appointments:updated'));
  }
};
const normalizeAppointmentMode = (value) => (
  value === 'virtual' || value === 'presencial' ? value : null
);
const APPOINTMENT_CONFLICT_BUFFER_MINUTES = 10;
const APPOINTMENT_DEFAULT_DURATION_MINUTES = 30;
const ACTIVE_CONFLICT_STATUSES = new Set(['disponible', 'reservado', 'bloqueado', 'asistio']);
const toDate = (value) => (
  value?.toDate ? value.toDate() : new Date(value)
);
const getDayBounds = (date) => ({
  start: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0),
  end: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
});
const hasMinimumBufferBetweenIntervals = (startA, endA, startB, endB, bufferMinutes = APPOINTMENT_CONFLICT_BUFFER_MINUTES) => {
  const bufferMs = bufferMinutes * 60 * 1000;
  return startA.getTime() >= endB.getTime() + bufferMs || startB.getTime() >= endA.getTime() + bufferMs;
};
const formatConflictTime = (date) => (
  date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
);
const buildSlotGroupKey = (date) => {
  const d = date?.toDate ? date.toDate() : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hour}:${minute}`;
};

export const appointmentsService = {
  async createAppointment(data) {
    try {
      const mode = normalizeAppointmentMode(data?.modalidad);
      const docRef = await addDoc(appointmentsCollection, {
        ...data,
        ...(mode ? { modalidad: mode } : {}),
        estado: 'reservado',
        createdAt: serverTimestamp()
      });
      emitAppointmentsUpdated();
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAppointmentNote(appointmentId) {
    try {
      const noteDoc = await getDoc(getNotesDocRef(appointmentId));
      if (noteDoc.exists()) {
        return { success: true, note: { id: noteDoc.id, ...fixMojibakeDeep(noteDoc.data()) } };
      }
      return { success: true, note: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async saveAppointmentNote(appointmentId, data) {
    try {
      const noteRef = getNotesDocRef(appointmentId);
      const existing = await getDoc(noteRef);
      if (existing.exists()) {
        await updateDoc(noteRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else {
        await setDoc(noteRef, {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async uploadAppointmentNoteAttachments(appointmentId, files, existingAttachments = []) {
    try {
      const baseAttachments = Array.isArray(existingAttachments) ? existingAttachments : [];
      const uploads = [];
      const timestamp = Date.now();

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const safeName = String(file.name || 'archivo')
          .replace(/\s+/g, '_')
          .replace(/[^\w.-]/g, '');
        const fileName = `${timestamp}_${i}_${safeName}`;
        const storagePath = `private/appointments/${appointmentId}/notes/${fileName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        uploads.push({
          name: file.name || fileName,
          url: downloadURL,
          path: storagePath,
          type: file.type || '',
          size: file.size || 0
        });
      }

      await updateDoc(getNotesDocRef(appointmentId), {
        attachments: [...baseAttachments, ...uploads],
        updatedAt: serverTimestamp()
      });

      return { success: true, attachments: uploads };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAppointmentById(appointmentId) {
    try {
      const appDoc = await getDoc(doc(appointmentsCollection, appointmentId));
      if (appDoc.exists()) {
        return { success: true, appointment: { id: appDoc.id, ...fixMojibakeDeep(appDoc.data()) } };
      }
      return { success: false, error: 'Turno no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAllAppointments() {
    try {
      const q = query(appointmentsCollection, orderBy('fechaHora', 'asc'));
      const snapshot = await getDocs(q);
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, appointments };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAppointmentsByFamily(familiaUid) {
    try {
      const legacyQuery = query(
        appointmentsCollection,
        where('familiaUid', '==', familiaUid),
        orderBy('fechaHora', 'desc')
      );

      const arrayQuery = query(
        appointmentsCollection,
        where('familiasUids', 'array-contains', familiaUid)
      );

      const [legacySnap, arraySnap] = await Promise.all([
        getDocs(legacyQuery),
        getDocs(arrayQuery)
      ]);

      const map = new Map();
      legacySnap.docs.forEach(doc => {
        map.set(doc.id, { id: doc.id, ...fixMojibakeDeep(doc.data()) });
      });
      arraySnap.docs.forEach(doc => {
        map.set(doc.id, { id: doc.id, ...fixMojibakeDeep(doc.data()) });
      });

      const appointments = Array.from(map.values()).sort((a, b) => {
        const dateA = a.fechaHora?.toDate ? a.fechaHora.toDate() : new Date(a.fechaHora);
        const dateB = b.fechaHora?.toDate ? b.fechaHora.toDate() : new Date(b.fechaHora);
        return dateB - dateA;
      });

      return { success: true, appointments };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAppointmentsByChild(childId) {
    try {
      const q = query(
        appointmentsCollection,
        where('hijoId', '==', childId)
      );
      const snapshot = await getDocs(q);
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      })).sort((a, b) => {
        const dateA = a.fechaHora?.toDate ? a.fechaHora.toDate() : new Date(a.fechaHora);
        const dateB = b.fechaHora?.toDate ? b.fechaHora.toDate() : new Date(b.fechaHora);
        return dateB - dateA;
      });
      return { success: true, appointments };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAppointmentsByDateRange(startDate, endDate) {
    try {
      const q = query(
        appointmentsCollection,
        where('fechaHora', '>=', Timestamp.fromDate(startDate)),
        where('fechaHora', '<=', Timestamp.fromDate(endDate)),
        orderBy('fechaHora', 'asc')
      );
      const snapshot = await getDocs(q);
      const appointments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, appointments };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAvailableSlots(date) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const q = query(
        appointmentsCollection,
        where('fechaHora', '>=', Timestamp.fromDate(startOfDay)),
        where('fechaHora', '<=', Timestamp.fromDate(endOfDay)),
        where('estado', '==', 'disponible')
      );
      const snapshot = await getDocs(q);
      const slots = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, slots };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateAppointment(appointmentId, data) {
    try {
      await updateDoc(doc(appointmentsCollection, appointmentId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      emitAppointmentsUpdated();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async cancelAppointment(appointmentId, canceladoPor = '') {
    try {
      const payload = {
        estado: 'cancelado',
        updatedAt: serverTimestamp()
      };
      if (canceladoPor) {
        payload.canceladoPor = canceladoPor;
        payload.canceladoAt = serverTimestamp();
      }
      await updateDoc(doc(appointmentsCollection, appointmentId), payload);
      emitAppointmentsUpdated();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async markAsAttended(appointmentId) {
    try {
      await updateDoc(doc(appointmentsCollection, appointmentId), {
        estado: 'asistio',
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteAppointment(appointmentId) {
    try {
      await deleteDoc(doc(appointmentsCollection, appointmentId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async blockAppointment(appointmentId) {
    try {
      await updateDoc(doc(appointmentsCollection, appointmentId), {
        estado: 'bloqueado',
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async unblockAppointment(appointmentId) {
    try {
      await updateDoc(doc(appointmentsCollection, appointmentId), {
        estado: 'disponible',
        familiaUid: null,
        familiasUids: [],
        familiaEmail: null,
        familiaDisplayName: null,
        hijoId: null,
        hijoNombre: null,
        nota: null,
        canceladoPor: null,
        canceladoAt: null,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async blockDay(date) {
    try {
      const result = await this.getAppointmentsByDateRange(date, date);
      if (!result.success) return result;

      const promises = result.appointments
        .filter(app => app.estado === 'disponible')
        .map(app => this.blockAppointment(app.id));
      
      await Promise.all(promises);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createTimeSlots(slotsData) {
    try {
      const writes = slotsData.flatMap(slot => {
        const mode = normalizeAppointmentMode(slot?.modalidad);
        const slotGroupKey = buildSlotGroupKey(slot.fechaHora);
        const base = {
          ...slot,
          ...(mode ? { modalidad: mode } : {}),
          slotGroupKey,
          estado: 'disponible',
          familiaUid: null,
          familiasUids: [],
          hijoId: null,
          createdAt: serverTimestamp()
        };
        return [
          addDoc(appointmentsCollection, { ...base, ambiente: AMBIENTES.TALLER_1 }),
          addDoc(appointmentsCollection, { ...base, ambiente: AMBIENTES.TALLER_2 })
        ];
      });
      await Promise.all(writes);
      emitAppointmentsUpdated();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createManualSlot(data) {
    try {
      const startDate = toDate(data?.fechaHora);
      const durationMinutes = parseInt(data?.duracionMinutos, 10);

      if (Number.isNaN(startDate.getTime())) {
        return { success: false, error: 'La fecha u hora del sobreturno no es válida.' };
      }

      if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
        return { success: false, error: 'La duración del sobreturno no es válida.' };
      }

      if (startDate.getTime() < Date.now()) {
        return { success: false, error: 'No se puede crear un sobreturno en una fecha u hora pasada.' };
      }

      const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
      const { start, end } = getDayBounds(startDate);
      const dayQuery = query(
        appointmentsCollection,
        where('fechaHora', '>=', Timestamp.fromDate(start)),
        where('fechaHora', '<=', Timestamp.fromDate(end)),
        orderBy('fechaHora', 'asc')
      );
      const snapshot = await getDocs(dayQuery);
      const newAmbiente = data?.ambiente || null;
      const conflictingAppointment = snapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...fixMojibakeDeep(docSnapshot.data()) }))
        .find((appointment) => {
          if (!ACTIVE_CONFLICT_STATUSES.has(appointment.estado)) return false;
          // El buffer y solapamiento solo aplican dentro del mismo ambiente.
          // Si ambos tienen ambiente definido y son distintos: compatible.
          // Slots legacy sin ambiente siempre se consideran conflicto (conservador).
          if (newAmbiente && appointment.ambiente && appointment.ambiente !== newAmbiente) return false;
          const appointmentStart = toDate(appointment.fechaHora);
          const appointmentDuration = parseInt(
            appointment?.duracionMinutos ?? APPOINTMENT_DEFAULT_DURATION_MINUTES,
            10
          );
          const safeDuration = Number.isInteger(appointmentDuration) && appointmentDuration > 0
            ? appointmentDuration
            : APPOINTMENT_DEFAULT_DURATION_MINUTES;
          const appointmentEnd = new Date(appointmentStart.getTime() + (safeDuration * 60 * 1000));
          return !hasMinimumBufferBetweenIntervals(
            startDate,
            endDate,
            appointmentStart,
            appointmentEnd
          );
        });

      if (conflictingAppointment) {
        const conflictStart = toDate(conflictingAppointment.fechaHora);
        return {
          success: false,
          error: `Conflicto con un turno ${conflictingAppointment.estado} a las ${formatConflictTime(conflictStart)}.`,
          code: 'APPOINTMENT_CONFLICT',
          conflict: conflictingAppointment
        };
      }

      const mode = normalizeAppointmentMode(data?.modalidad);
      const docRef = await addDoc(appointmentsCollection, {
        fechaHora: Timestamp.fromDate(startDate),
        duracionMinutos: durationMinutes,
        ...(mode ? { modalidad: mode } : {}),
        estado: 'disponible',
        familiaUid: null,
        hijoId: null,
        origenSlot: 'manual',
        creadoPorUid: data?.creadoPorUid || '',
        createdAt: serverTimestamp()
      });
      const assignmentPayload = data?.assignmentPayload && typeof data.assignmentPayload === 'object'
        ? data.assignmentPayload
        : null;

      if (assignmentPayload) {
        try {
          await updateDoc(doc(appointmentsCollection, docRef.id), {
            ...assignmentPayload,
            updatedAt: serverTimestamp()
          });
          emitAppointmentsUpdated();
          return { success: true, id: docRef.id, assigned: true };
        } catch (assignmentError) {
          emitAppointmentsUpdated();
          return {
            success: false,
            error: `El sobreturno se creó, pero no se pudo asignar a la familia. ${assignmentError.message}`,
            code: 'MANUAL_SLOT_ASSIGNMENT_FAILED',
            partialSuccess: true,
            id: docRef.id
          };
        }
      }

      emitAppointmentsUpdated();
      return { success: true, id: docRef.id, assigned: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async bookSlot(appointmentId, data) {
    try {
      const slotRef = doc(appointmentsCollection, appointmentId);
      const childRef = doc(collection(db, 'children'), data.payload.hijoId);

      const result = await runTransaction(db, async (transaction) => {
        const [slotDoc, childDoc] = await Promise.all([
          transaction.get(slotRef),
          transaction.get(childRef)
        ]);

        if (!slotDoc.exists()) {
          return { success: false, error: 'El turno no existe.' };
        }

        const slot = slotDoc.data();

        if (slot.estado !== 'disponible') {
          return { success: false, error: 'El turno ya no esta disponible.' };
        }

        // Validacion defensiva: leer ambiente del hijo directamente de Firestore.
        // No se confia en ningun valor enviado por el cliente.
        const slotAmbiente = slot.ambiente || null;
        const childAmbiente = childDoc.exists() ? (childDoc.data().ambiente || null) : null;

        if (slotAmbiente && childAmbiente && slotAmbiente !== childAmbiente) {
          return {
            success: false,
            error: 'El alumno seleccionado no corresponde al taller de este turno.',
            code: 'AMBIENTE_MISMATCH'
          };
        }

        transaction.update(slotRef, {
          ...data.payload,
          updatedAt: serverTimestamp()
        });

        return { success: true };
      });

      if (result.success) {
        emitAppointmentsUpdated();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};
