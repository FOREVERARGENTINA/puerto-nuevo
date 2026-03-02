import {
  collection,
  doc,
  getDocs,
  addDoc,
  query,
  where,
  limit,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

const readReceiptsCollection = collection(db, 'documentReadReceipts');

const getTimestampMs = (value) => {
  if (!value) return 0;

  if (typeof value.toMillis === 'function') {
    return value.toMillis();
  }

  if (typeof value.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date?.getTime?.()) ? 0 : date.getTime();
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? 0 : value.getTime();
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  return 0;
};

async function createReadReceipt(documentId, userId) {
  const receiptData = {
    documentId,
    userId,
    status: 'read',
    createdAt: serverTimestamp(),
    readAt: serverTimestamp()
  };

  await addDoc(readReceiptsCollection, receiptData);
}

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
   * Marca un documento como leído por un usuario
   * @param {string} documentId - ID del documento
   * @param {string} userId - UID del usuario
   */
  async markAsRead(documentId, userId) {
    try {
      const alreadyReadQuery = query(
        readReceiptsCollection,
        where('documentId', '==', documentId),
        where('userId', '==', userId),
        where('status', '==', 'read'),
        limit(1)
      );

      const alreadyReadSnapshot = await getDocs(alreadyReadQuery);
      if (!alreadyReadSnapshot.empty) {
        return { success: true };
      }

      const pendingQuery = query(
        readReceiptsCollection,
        where('documentId', '==', documentId),
        where('userId', '==', userId),
        where('status', '==', 'pending'),
        limit(1)
      );

      const pendingSnapshot = await getDocs(pendingQuery);

      if (pendingSnapshot.empty) {
        await createReadReceipt(documentId, userId);
        return { success: true };
      }

      const receiptDoc = pendingSnapshot.docs[0];
      if (!receiptDoc?.id) {
        await createReadReceipt(documentId, userId);
        return { success: true };
      }

      try {
        await updateDoc(doc(readReceiptsCollection, receiptDoc.id), {
          status: 'read',
          readAt: serverTimestamp()
        });
      } catch (_updateError) {
        // Fallback para receipts legacy que no se pueden actualizar por reglas o datos.
        await createReadReceipt(documentId, userId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error marcando como leído:', error);
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
      const readQuery = query(
        readReceiptsCollection,
        where('documentId', '==', documentId),
        where('userId', '==', userId),
        where('status', '==', 'read'),
        limit(1)
      );

      const readSnapshot = await getDocs(readQuery);
      if (!readSnapshot.empty) {
        const receipt = {
          id: readSnapshot.docs[0].id,
          ...readSnapshot.docs[0].data()
        };

        return { success: true, receipt };
      }

      const q = query(
        readReceiptsCollection,
        where('documentId', '==', documentId),
        where('userId', '==', userId),
        limit(1)
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
   * Obtiene mapa de receipts para un usuario.
   * Prioriza status 'read' por sobre 'pending' cuando hay duplicados legacy.
   * @param {string} userId - UID del usuario
   * @param {Array<string>} documentIds - IDs de documentos a evaluar
   */
  async getUserReceiptsMap(userId, documentIds = []) {
    try {
      if (!userId) return { success: true, receiptsMap: {} };

      const targetIds = new Set(
        (Array.isArray(documentIds) ? documentIds : [])
          .filter((id) => typeof id === 'string' && id.trim())
          .map((id) => id.trim())
      );

      const q = query(
        readReceiptsCollection,
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const receiptsMap = {};

      snapshot.docs.forEach((docRef) => {
        const receipt = { id: docRef.id, ...docRef.data() };
        const docId = typeof receipt.documentId === 'string' ? receipt.documentId.trim() : '';
        if (!docId) return;
        if (targetIds.size > 0 && !targetIds.has(docId)) return;

        const current = receiptsMap[docId];
        if (!current) {
          receiptsMap[docId] = receipt;
          return;
        }

        if (current.status !== 'read' && receipt.status === 'read') {
          receiptsMap[docId] = receipt;
          return;
        }

        if (current.status === receipt.status) {
          const currentMs = Math.max(getTimestampMs(current.readAt), getTimestampMs(current.createdAt));
          const nextMs = Math.max(getTimestampMs(receipt.readAt), getTimestampMs(receipt.createdAt));
          if (nextMs > currentMs) {
            receiptsMap[docId] = receipt;
          }
        }
      });

      return { success: true, receiptsMap };
    } catch (error) {
      console.error('Error obteniendo mapa de receipts:', error);
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
