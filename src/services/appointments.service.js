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
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const appointmentsCollection = collection(db, 'appointments');

export const appointmentsService = {
  async createAppointment(data) {
    try {
      const docRef = await addDoc(appointmentsCollection, {
        ...data,
        estado: 'reservado',
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAppointmentById(appointmentId) {
    try {
      const appDoc = await getDoc(doc(appointmentsCollection, appointmentId));
      if (appDoc.exists()) {
        return { success: true, appointment: { id: appDoc.id, ...appDoc.data() } };
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
        ...doc.data()
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
        map.set(doc.id, { id: doc.id, ...doc.data() });
      });
      arraySnap.docs.forEach(doc => {
        map.set(doc.id, { id: doc.id, ...doc.data() });
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
        ...doc.data()
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
        ...doc.data()
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
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async cancelAppointment(appointmentId) {
    try {
      await updateDoc(doc(appointmentsCollection, appointmentId), {
        estado: 'cancelado',
        updatedAt: serverTimestamp()
      });
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
        hijoId: null,
        nota: null,
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
      const promises = slotsData.map(slot => 
        addDoc(appointmentsCollection, {
          ...slot,
          estado: 'disponible',
          familiaUid: null,
          hijoId: null,
          createdAt: serverTimestamp()
        })
      );
      await Promise.all(promises);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
