import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  getCountFromServer,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { CONVERSATION_STATUS } from '../config/constants';
import { fixMojibakeDeep } from '../utils/textEncoding';
import { sortConversationsByLatestMessage } from '../utils/conversationHelpers';

const conversationsCollection = collection(db, 'conversations');

const buildPreview = (text, attachments = []) => {
  if (text && text.trim().length > 0) {
    return text.trim().slice(0, 160);
  }
  if (attachments.length > 0) return 'Adjunto';
  return '';
};

const uploadAttachments = async (conversationId, messageId, files = []) => {
  if (!files || files.length === 0) return [];
  const uploads = [];
  for (const file of files) {
    const safeName = file.name.replace(/\s+/g, '_');
    const fileName = `${Date.now()}_${safeName}`;
    const storageRef = ref(storage, `conversations/${conversationId}/${messageId}/${fileName}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    uploads.push({
      name: file.name,
      url,
      path: `conversations/${conversationId}/${messageId}/${fileName}`,
      type: file.type || null,
      size: file.size || null
    });
  }
  return uploads;
};

export const conversationsService = {
  async createConversationWithMessage({
    familiaUid,
    familiaDisplayName,
    familiaEmail,
    destinatarioEscuela,
    asunto,
    categoria,
    iniciadoPor,
    autorUid,
    autorDisplayName,
    autorRol,
    texto,
    archivos
  }) {
    try {
      const convRef = doc(conversationsCollection);
      const isFamily = autorRol === 'family';
      const hasFamilyReply = isFamily;
      const hasSchoolReply = !isFamily;
      const estado = isFamily ? CONVERSATION_STATUS.PENDIENTE : CONVERSATION_STATUS.RESPONDIDA;

      await setDoc(convRef, {
        familiaUid,
        familiaDisplayName: familiaDisplayName || null,
        familiaEmail: familiaEmail || null,
        participantesUids: [familiaUid],
        destinatarioEscuela,
        asunto,
        categoria,
        iniciadoPor,
        estado,
        hasFamilyReply,
        hasSchoolReply,
        mensajesSinLeerFamilia: isFamily ? 0 : 1,
        mensajesSinLeerEscuela: isFamily ? 1 : 0,
        creadoAt: serverTimestamp(),
        actualizadoAt: serverTimestamp()
      });

      const messageRef = doc(collection(db, 'conversations', convRef.id, 'messages'));
      const attachments = await uploadAttachments(convRef.id, messageRef.id, archivos);
      const preview = buildPreview(texto, attachments);

      await setDoc(messageRef, {
        autorUid,
        autorDisplayName: autorDisplayName || null,
        autorRol,
        texto: texto || '',
        adjuntos: attachments,
        creadoAt: serverTimestamp(),
        tipoMensaje: 'normal'
      });

      await updateDoc(convRef, {
        ultimoMensajeUid: messageRef.id,
        ultimoMensajeAutor: autorRol,
        ultimoMensajeTexto: preview,
        ultimoMensajeAt: serverTimestamp(),
        actualizadoAt: serverTimestamp()
      });

      return { success: true, id: convRef.id };
    } catch (error) {
      console.error('Error creando conversación:', error);
      return { success: false, error: error.message };
    }
  },

  async createGroupConversation({
    participantesUids,
    participantes,
    childNombre,
    destinatarioEscuela,
    asunto,
    categoria,
    autorUid,
    autorDisplayName,
    autorRol,
    texto,
    archivos
  }) {
    try {
      const convRef = doc(conversationsCollection);
      const primaryUid = participantesUids[0];

      // mensajesSinLeer: 1 para cada participante familiar (escuela inició)
      const mensajesSinLeer = {};
      participantesUids.forEach(uid => { mensajesSinLeer[uid] = 1; });

      // ultimoMensajeVisto: null para cada participante
      const ultimoMensajeVisto = {};
      participantesUids.forEach(uid => { ultimoMensajeVisto[uid] = null; });

      // participanteMap: { uid: true } — permite query por campo anidado
      // que Firestore puede validar estáticamente en security rules
      const participanteMap = {};
      participantesUids.forEach(uid => { participanteMap[uid] = true; });

      await setDoc(convRef, {
        esGrupal: true,
        familiaUid: primaryUid,
        familiaDisplayName: childNombre || null,
        familiaEmail: participantes[primaryUid]?.email || null,
        participantesUids,
        participanteMap,
        participantes,
        destinatarioEscuela,
        asunto,
        categoria,
        iniciadoPor: 'escuela',
        estado: CONVERSATION_STATUS.RESPONDIDA,
        hasFamilyReply: false,
        hasSchoolReply: true,
        mensajesSinLeer,
        ultimoMensajeVisto,
        mensajesSinLeerEscuela: 0,
        creadoAt: serverTimestamp(),
        actualizadoAt: serverTimestamp()
      });

      const messageRef = doc(collection(db, 'conversations', convRef.id, 'messages'));
      const attachments = await uploadAttachments(convRef.id, messageRef.id, archivos);
      const preview = buildPreview(texto, attachments);

      await setDoc(messageRef, {
        autorUid,
        autorDisplayName: autorDisplayName || null,
        autorRol,
        texto: texto || '',
        adjuntos: attachments,
        creadoAt: serverTimestamp(),
        tipoMensaje: 'normal'
      });

      await updateDoc(convRef, {
        ultimoMensajeUid: messageRef.id,
        ultimoMensajeAutor: autorRol,
        ultimoMensajeTexto: preview,
        ultimoMensajeAt: serverTimestamp(),
        actualizadoAt: serverTimestamp()
      });

      return { success: true, id: convRef.id };
    } catch (error) {
      console.error('Error creando conversación grupal:', error);
      return { success: false, error: error.message };
    }
  },

  async sendMessage(conversationId, { autorUid, autorDisplayName, autorRol, texto, archivos }) {
    try {
      const convRef = doc(conversationsCollection, conversationId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        return { success: false, error: 'Conversación no encontrada' };
      }

      const convData = convSnap.data();
      if (convData.estado === CONVERSATION_STATUS.CERRADA) {
        return { success: false, error: 'La conversación está cerrada' };
      }

      const isFamily = autorRol === 'family';
      const hasFamilyReply = convData.hasFamilyReply || isFamily;
      const hasSchoolReply = convData.hasSchoolReply || !isFamily;
      const estado = isFamily
        ? (hasSchoolReply ? CONVERSATION_STATUS.ACTIVA : CONVERSATION_STATUS.PENDIENTE)
        : CONVERSATION_STATUS.RESPONDIDA;

      const messageRef = doc(collection(db, 'conversations', conversationId, 'messages'));
      const attachments = await uploadAttachments(conversationId, messageRef.id, archivos);
      const preview = buildPreview(texto, attachments);

      await setDoc(messageRef, {
        autorUid,
        autorDisplayName: autorDisplayName || null,
        autorRol,
        texto: texto || '',
        adjuntos: attachments,
        creadoAt: serverTimestamp(),
        tipoMensaje: 'normal'
      });

      const updates = {
        estado,
        hasFamilyReply,
        hasSchoolReply,
        ultimoMensajeUid: messageRef.id,
        ultimoMensajeAutor: autorRol,
        ultimoMensajeTexto: preview,
        ultimoMensajeAt: serverTimestamp(),
        actualizadoAt: serverTimestamp()
      };

      if (convData.esGrupal) {
        const participants = convData.participantesUids || [];
        if (isFamily) {
          updates[`mensajesSinLeer.${autorUid}`] = 0;
          participants.forEach(uid => {
            if (uid !== autorUid) {
              updates[`mensajesSinLeer.${uid}`] = increment(1);
            }
          });
          updates.mensajesSinLeerEscuela = increment(1);
        } else {
          participants.forEach(uid => {
            updates[`mensajesSinLeer.${uid}`] = increment(1);
          });
          updates.mensajesSinLeerEscuela = 0;
        }
      } else {
        updates.mensajesSinLeerFamilia = isFamily ? 0 : increment(1);
        updates.mensajesSinLeerEscuela = isFamily ? increment(1) : 0;
      }

      await updateDoc(convRef, updates);

      return { success: true, id: messageRef.id };
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      return { success: false, error: error.message };
    }
  },

  async getConversationById(conversationId) {
    try {
      const convSnap = await getDoc(doc(conversationsCollection, conversationId));
      if (!convSnap.exists()) {
        return { success: false, error: 'Conversación no encontrada' };
      }
      return { success: true, conversation: { id: convSnap.id, ...fixMojibakeDeep(convSnap.data()) } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getConversationsByFamily(familiaUid, limitCount = 50) {
    try {
      const q = query(
        conversationsCollection,
        where('familiaUid', '==', familiaUid)
      );
      const snap = await getDocs(q);
      const conversations = sortConversationsByLatestMessage(
        snap.docs.map((docSnap) => ({ id: docSnap.id, ...fixMojibakeDeep(docSnap.data()) }))
      ).slice(0, limitCount);
      return {
        success: true,
        conversations
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getConversationsByArea(destinatarioEscuela, limitCount = 50) {
    try {
      const q = query(
        conversationsCollection,
        where('destinatarioEscuela', '==', destinatarioEscuela)
      );
      const snap = await getDocs(q);
      const conversations = sortConversationsByLatestMessage(
        snap.docs.map((docSnap) => ({ id: docSnap.id, ...fixMojibakeDeep(docSnap.data()) }))
      ).slice(0, limitCount);
      return {
        success: true,
        conversations
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAllConversations(limitCount = 50) {
    try {
      const q = query(conversationsCollection);
      const snap = await getDocs(q);
      const conversations = sortConversationsByLatestMessage(
        snap.docs.map((docSnap) => ({ id: docSnap.id, ...fixMojibakeDeep(docSnap.data()) }))
      ).slice(0, limitCount);
      return {
        success: true,
        conversations
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getUnreadCountForSchool() {
    try {
      const q = query(
        conversationsCollection,
        where('mensajesSinLeerEscuela', '>', 0)
      );
      const snapshot = await getCountFromServer(q);
      return { success: true, count: snapshot.data().count || 0 };
    } catch {
      try {
        const q = query(
          conversationsCollection,
          where('mensajesSinLeerEscuela', '>', 0)
        );
        const snap = await getDocs(q);
        return { success: true, count: snap.size };
      } catch (fallbackError) {
        return { success: false, error: fallbackError.message };
      }
    }
  },

  async closeConversation(conversationId, closedByUid) {
    try {
      const convRef = doc(conversationsCollection, conversationId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) {
        return { success: false, error: 'Conversación no encontrada' };
      }
      const convData = convSnap.data();

      const updates = {
        estado: CONVERSATION_STATUS.CERRADA,
        cerradoAt: serverTimestamp(),
        cerradoPor: closedByUid || null,
        mensajesSinLeerEscuela: 0,
        ultimoMensajeVistoPorEscuela: serverTimestamp(),
        actualizadoAt: serverTimestamp()
      };

      if (convData.esGrupal && Array.isArray(convData.participantesUids)) {
        convData.participantesUids.forEach(uid => {
          updates[`mensajesSinLeer.${uid}`] = 0;
        });
      } else {
        updates.mensajesSinLeerFamilia = 0;
        updates.ultimoMensajeVistoPorFamilia = serverTimestamp();
      }

      await updateDoc(convRef, updates);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async reassignConversation(conversationId, nuevoDestinatario) {
    try {
      await updateDoc(doc(conversationsCollection, conversationId), {
        destinatarioEscuela: nuevoDestinatario,
        reasignadoAt: serverTimestamp(),
        actualizadoAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async markConversationRead(conversationId, forRole, { familiaUid, esGrupal } = {}) {
    try {
      const payload = {
        actualizadoAt: serverTimestamp()
      };
      if (forRole === 'family') {
        if (esGrupal && familiaUid) {
          payload[`mensajesSinLeer.${familiaUid}`] = 0;
          payload[`ultimoMensajeVisto.${familiaUid}`] = serverTimestamp();
        } else {
          payload.mensajesSinLeerFamilia = 0;
          payload.ultimoMensajeVistoPorFamilia = serverTimestamp();
        }
      } else {
        payload.mensajesSinLeerEscuela = 0;
        payload.ultimoMensajeVistoPorEscuela = serverTimestamp();
      }
      await updateDoc(doc(conversationsCollection, conversationId), payload);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
