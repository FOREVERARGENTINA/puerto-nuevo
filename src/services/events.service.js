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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { fixMojibakeDeep } from '../utils/textEncoding';

const eventsCollection = collection(db, 'events');

const normalizeDateInput = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const [datePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    if (year && month && day) {
      return new Date(year, month - 1, day);
    }
  }
  return new Date(value);
};

/**
 * Servicio para gestión de eventos del calendario
 */
export const eventsService = {
  /**
   * Crear nuevo evento
   */
  async createEvent(data) {
    try {
      const eventDate = normalizeDateInput(data.fecha);
      const docRef = await addDoc(eventsCollection, {
        ...data,
        fecha: eventDate ? Timestamp.fromDate(eventDate) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      window.dispatchEvent(new CustomEvent('events:updated'));
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error al crear evento:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener evento por ID
   */
  async getEventById(eventId) {
    try {
      const eventDoc = await getDoc(doc(eventsCollection, eventId));
      if (eventDoc.exists()) {
        return {
          success: true,
          event: { id: eventDoc.id, ...fixMojibakeDeep(eventDoc.data()) }
        };
      }
      return { success: false, error: 'Evento no encontrado' };
    } catch (error) {
      console.error('Error al obtener evento:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener todos los eventos
   */
  async getAllEvents() {
    try {
      const q = query(eventsCollection, orderBy('fecha', 'asc'));
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, events };
    } catch (error) {
      console.error('Error al obtener eventos:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener eventos de un mes específico
   */
  async getEventsByMonth(year, month) {
    try {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const q = query(
        eventsCollection,
        where('fecha', '>=', Timestamp.fromDate(startDate)),
        where('fecha', '<=', Timestamp.fromDate(endDate)),
        orderBy('fecha', 'asc')
      );

      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, events };
    } catch (error) {
      console.error('Error al obtener eventos del mes:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener eventos futuros
   */
  async getUpcomingEvents(limit = 10) {
    try {
      const now = Timestamp.now();
      const q = query(
        eventsCollection,
        where('fecha', '>=', now),
        orderBy('fecha', 'asc')
      );

      const snapshot = await getDocs(q);
      const events = snapshot.docs
        .slice(0, limit)
        .map(doc => ({
          id: doc.id,
          ...fixMojibakeDeep(doc.data())
        }));
      return { success: true, events };
    } catch (error) {
      console.error('Error al obtener eventos próximos:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Actualizar evento
   */
  async updateEvent(eventId, data) {
    try {
      const eventRef = doc(eventsCollection, eventId);
      const updateData = { ...data, updatedAt: serverTimestamp() };

      if (data.fecha) {
        const eventDate = normalizeDateInput(data.fecha);
        updateData.fecha = eventDate ? Timestamp.fromDate(eventDate) : null;
      }

      await updateDoc(eventRef, updateData);
      window.dispatchEvent(new CustomEvent('events:updated'));
      return { success: true };
    } catch (error) {
      console.error('Error al actualizar evento:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Subir media (imagenes/videos) asociada a un evento
   */
  async uploadEventMedia(eventId, files, existingMedia = []) {
    try {
      const baseMedia = Array.isArray(existingMedia) ? existingMedia : [];
      const uploads = [];
      const timestamp = Date.now();

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const safeName = String(file.name || 'archivo')
          .replace(/\s+/g, '_')
          .replace(/[^\w.\-]/g, '');
        const fileName = `${timestamp}_${i}_${safeName}`;
        const storagePath = `public/events/${eventId}/${fileName}`;
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

      await updateDoc(doc(eventsCollection, eventId), {
        media: [...baseMedia, ...uploads],
        updatedAt: serverTimestamp()
      });

      window.dispatchEvent(new CustomEvent('events:updated'));
      return { success: true, media: uploads };
    } catch (error) {
      console.error('Error al subir media del evento:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Eliminar media asociada a un evento
   */
  async deleteEventMedia(eventId, mediaItem, existingMedia = []) {
    try {
      const media = Array.isArray(existingMedia) ? existingMedia : [];
      const path = mediaItem?.path || null;
      const filtered = media.filter(item =>
        (path && item.path !== path) ||
        (!path && item.url !== mediaItem?.url && item.name !== mediaItem?.name)
      );

      if (path) {
        const storageRef = ref(storage, path);
        try {
          await deleteObject(storageRef);
        } catch (storageError) {
          if (storageError?.code !== 'storage/object-not-found') {
            throw storageError;
          }
        }
      }

      await updateDoc(doc(eventsCollection, eventId), {
        media: filtered,
        updatedAt: serverTimestamp()
      });

      window.dispatchEvent(new CustomEvent('events:updated'));
      return { success: true, media: filtered };
    } catch (error) {
      console.error('Error al eliminar media del evento:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener eventos en un rango de fechas
   */
  async getEventsByRange(startDate, endDate) {
    try {
      const start = startDate instanceof Date ? startDate : new Date(startDate);
      const end = endDate instanceof Date ? endDate : new Date(endDate);

      const q = query(
        eventsCollection,
        where('fecha', '>=', Timestamp.fromDate(start)),
        where('fecha', '<=', Timestamp.fromDate(end)),
        orderBy('fecha', 'asc')
      );

      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, events };
    } catch (error) {
      console.error('Error al obtener eventos por rango:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Eliminar evento
   */
  async deleteEvent(eventId) {
    try {
      await deleteDoc(doc(eventsCollection, eventId));
      window.dispatchEvent(new CustomEvent('events:updated'));
      return { success: true };
    } catch (error) {
      console.error('Error al eliminar evento:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener eventos asociados a un comunicado
   */
  async getEventByCommunicationId(commId) {
    try {
      const q = query(
        eventsCollection,
        where('communicationId', '==', commId)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: true, event: null };
      }

      const eventDoc = snapshot.docs[0];
      return {
        success: true,
        event: { id: eventDoc.id, ...fixMojibakeDeep(eventDoc.data()) }
      };
    } catch (error) {
      console.error('Error al obtener evento por comunicado:', error);
      return { success: false, error: error.message };
    }
  }
};
