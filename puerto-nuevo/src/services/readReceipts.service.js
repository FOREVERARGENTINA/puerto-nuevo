import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const readReceiptsService = {
  async markAsRead(commId, userId, userDisplayName) {
    try {
      const lecturaRef = doc(db, 'communications', commId, 'lecturas', userId);
      await setDoc(lecturaRef, {
        leidoAt: serverTimestamp(),
        userDisplayName: userDisplayName || 'Usuario'
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async hasUserRead(commId, userId) {
    try {
      const lecturaRef = doc(db, 'communications', commId, 'lecturas', userId);
      const lecturaDoc = await getDoc(lecturaRef);
      return { success: true, hasRead: lecturaDoc.exists() };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getReadReceipts(commId) {
    try {
      const lecturasRef = collection(db, 'communications', commId, 'lecturas');
      const snapshot = await getDocs(lecturasRef);
      const lecturas = snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      }));
      return { success: true, lecturas };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getPendingUsers(commId, destinatarios) {
    try {
      const lecturasRef = collection(db, 'communications', commId, 'lecturas');
      const snapshot = await getDocs(lecturasRef);
      const userIdsRead = snapshot.docs.map(doc => doc.id);
      
      const pending = destinatarios.filter(uid => !userIdsRead.includes(uid));
      
      return { success: true, pendingUserIds: pending };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getReadStats(commId, destinatarios) {
    try {
      const lecturasRef = collection(db, 'communications', commId, 'lecturas');
      const snapshot = await getDocs(lecturasRef);
      
      const totalDestinatarios = destinatarios.length;
      const totalLeidos = snapshot.size;
      const totalPendientes = totalDestinatarios - totalLeidos;
      const porcentaje = totalDestinatarios > 0 
        ? Math.round((totalLeidos / totalDestinatarios) * 100) 
        : 0;

      return {
        success: true,
        stats: {
          total: totalDestinatarios,
          leidos: totalLeidos,
          pendientes: totalPendientes,
          porcentaje
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
