import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const readReceiptsCollection = collection(db, 'documentReadReceipts');

export const documentReadReceiptsService = {
  /**
   * Crea receipts pendientes para todos los destinatarios de un documento
   * @param {string} documentId - ID del documento
   * @param {Array<Object>} destinatarios - Array de objetos con uid, email, role, ambiente
   */
  async createPendingReceipts(documentId, destinatarios) {
    try {
      const receipts = [];
      
      for (const destinatario of destinatarios) {
        const receiptData = {
          documentId,
          userId: destinatario.uid,
          userEmail: destinatario.email,
          userRole: destinatario.role,
          ambiente: destinatario.ambiente || null,
          status: 'pending',
          createdAt: serverTimestamp(),
          readAt: null
        };
        
        const receiptRef = await addDoc(readReceiptsCollection, receiptData);
        receipts.push({ id: receiptRef.id, ...receiptData });
      }

      return { success: true, receipts };
    } catch (error) {
      console.error('Error creando receipts:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Marca un documento como leÃ­do por un usuario
   * @param {string} documentId - ID del documento
   * @param {string} userId - UID del usuario
   */
  async markAsRead(documentId, userId) {
    try {
      const q = query(
        readReceiptsCollection,
        where('documentId', '==', documentId),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        const receiptData = {
          documentId,
          userId,
          status: 'read',
          createdAt: serverTimestamp(),
          readAt: serverTimestamp()
        };
        await addDoc(readReceiptsCollection, receiptData);
        return { success: true };
      }

      const receiptDoc = snapshot.docs[0];
      const currentStatus = receiptDoc.data()?.status;

      if (currentStatus === 'read') {
        return { success: true };
      }

      await updateDoc(doc(readReceiptsCollection, receiptDoc.id), {
        status: 'read',
        readAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error marcando como leÃ­do:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtiene el estado de lectura de un documento para un usuario
   * @param {string} documentId - ID del documento
   * @param {string} userId - UID del usuario
   */
  async getUserReceipt(documentId, userId) {
    try {
      const q = query(
        readReceiptsCollection,
        where('documentId', '==', documentId),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { success: true, receipt: null };
      }

      const receipt = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data()
      };

      return { success: true, receipt };
    } catch (error) {
      console.error('Error obteniendo receipt:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtiene todos los receipts de un documento (para admin)
   * @param {string} documentId - ID del documento
   */
  async getDocumentReceipts(documentId) {
    try {
      const q = query(
        readReceiptsCollection,
        where('documentId', '==', documentId)
      );
      
      const snapshot = await getDocs(q);
      const receipts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const pending = receipts.filter(r => r.status === 'pending').length;
      const read = receipts.filter(r => r.status === 'read').length;

      return { 
        success: true, 
        receipts,
        stats: {
          total: receipts.length,
          pending,
          read,
          percentage: receipts.length > 0 ? Math.round((read / receipts.length) * 100) : 0
        }
      };
    } catch (error) {
      console.error('Error obteniendo receipts del documento:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtiene documentos pendientes de lectura para un usuario
   * @param {string} userId - UID del usuario
   */
  async getPendingDocuments(userId) {
    try {
      const q = query(
        readReceiptsCollection,
        where('userId', '==', userId),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(q);
      const receipts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, receipts };
    } catch (error) {
      console.error('Error obteniendo documentos pendientes:', error);
      return { success: false, error: error.message };
    }
  }
};
