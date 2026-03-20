import {
  collection,
  doc,
  getDoc,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

const DM_CONFIG_PATH = 'appConfig/directMessages';
const directMessagesCollection = collection(db, 'directMessages');

function inboxCollection(uid) {
  return collection(db, 'users', uid, 'directMessageInbox');
}

/**
 * Ordena dos UIDs lexicograficamente y retorna el convId canonico.
 * Esta funcion es la unica fuente valida para generar IDs de hilo.
 */
export function getThreadIdForUsers(uidA, uidB) {
  const sorted = [String(uidA), String(uidB)].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

function getOtherUid(participants, myUid) {
  if (!Array.isArray(participants)) return null;
  return participants.find((uid) => uid !== myUid) || null;
}

export const directMessagesService = {
  async getDMsModuleConfig() {
    try {
      const snap = await getDoc(doc(db, DM_CONFIG_PATH));
      if (!snap.exists()) {
        return { enabled: false, pilotFamilyUids: [] };
      }
      const data = snap.data() || {};
      const pilotFamilyUids = Array.isArray(data.pilotFamilyUids)
        ? data.pilotFamilyUids.map((u) => String(u || '').trim()).filter(Boolean)
        : [];
      return {
        enabled: Boolean(data.enabled),
        pilotFamilyUids
      };
    } catch {
      return { enabled: false, pilotFamilyUids: [] };
    }
  },

  /**
   * Retorna el convId si el hilo ya existe, null si no.
   * No crea el hilo; el hilo se crea con el primer mensaje.
   */
  async getThreadIfExists(myUid, otherUid) {
    const convId = getThreadIdForUsers(myUid, otherUid);
    const snap = await getDoc(doc(directMessagesCollection, convId));
    return snap.exists() ? convId : null;
  },

  /**
   * Envia el primer mensaje creando el hilo atomicamente si no existe.
   * Usa runTransaction para garantizar que hilo + mensaje son coherentes.
   */
  async startThreadWithFirstMessage({ myUid, myName, otherUid, otherName, text }) {
    const convId = getThreadIdForUsers(myUid, otherUid);
    const convRef = doc(directMessagesCollection, convId);
    const messagesRef = collection(db, 'directMessages', convId, 'messages');
    const msgRef = doc(messagesRef);
    const trimmedText = String(text || '').trim();
    if (!trimmedText) return { success: false, error: 'El mensaje no puede estar vacio' };

    try {
      await runTransaction(db, async (tx) => {
        const convSnap = await tx.get(convRef);
        const now = serverTimestamp();

        if (!convSnap.exists()) {
          const participants = [myUid, otherUid].sort();
          tx.set(convRef, {
            participants,
            participantNames: {
              [myUid]: myName || '',
              [otherUid]: otherName || ''
            },
            createdBy: myUid,
            createdAt: now,
            updatedAt: now,
            unreadCount: { [myUid]: 0, [otherUid]: 0 },
            status: 'active',
            blockedBy: null
          });
          // El trigger onDirectMessageCreated actualiza lastMessage* y unreadCount[other]
        }

        tx.set(msgRef, {
          authorUid: myUid,
          authorName: myName || '',
          text: trimmedText,
          createdAt: now
        });
      });

      return { success: true, convId };
    } catch (error) {
      console.error('Error creando hilo con primer mensaje:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Envia un mensaje en un hilo existente.
   * Solo escribe el mensaje; el trigger actualiza lastMessage* y unreadCount[other].
   */
  async sendMessage({ convId, myUid, myName, text }) {
    const trimmedText = String(text || '').trim();
    if (!trimmedText) return { success: false, error: 'El mensaje no puede estar vacio' };

    const msgRef = doc(collection(db, 'directMessages', convId, 'messages'));

    try {
      await setDoc(msgRef, {
        authorUid: myUid,
        authorName: myName || '',
        text: trimmedText,
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error enviando mensaje DM:', error);
      return { success: false, error: error.message };
    }
  },

  async markThreadRead(convId, myUid) {
    try {
      await updateDoc(doc(directMessagesCollection, convId), {
        [`unreadCount.${myUid}`]: 0,
        [`lastReadAt.${myUid}`]: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async blockThread(convId, myUid) {
    try {
      const convRef = doc(directMessagesCollection, convId);
      const batch = writeBatch(db);
      batch.update(convRef, {
        status: 'blocked',
        blockedBy: myUid,
        updatedAt: serverTimestamp()
      });
      await batch.commit();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async unblockThread(convId) {
    try {
      const convRef = doc(directMessagesCollection, convId);
      const batch = writeBatch(db);
      batch.update(convRef, {
        status: 'active',
        blockedBy: null,
        updatedAt: serverTimestamp()
      });
      await batch.commit();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  subscribeThreadsForFamily(uid, callback, onError) {
    const q = query(
      inboxCollection(uid),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snap) => {
      const threads = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(threads);
    }, (error) => {
      if (onError) onError(error);
    });
  },

  subscribeThreadMessages(convId, callback) {
    const q = query(
      collection(db, 'directMessages', convId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snap) => {
      const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(messages);
    }, () => callback([]));
  },

  getOtherUid
};
