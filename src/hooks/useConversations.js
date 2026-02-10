import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ROLES } from '../config/constants';
import { conversationsService } from '../services/conversations.service';
import { CONVERSATION_READ_EVENT, emitConversationRead } from '../utils/conversationEvents';

const resolveAreaForRole = (role) => {
  if (role === ROLES.COORDINACION) return 'coordinacion';
  if (role === ROLES.FACTURACION) return 'administracion';
  if (role === ROLES.SUPERADMIN) return null;
  return null;
};

const patchConversationAsRead = (items, conversationId, forRole) => (
  items.map((conv) => {
    if (conv.id !== conversationId) return conv;
    if (forRole === 'family') {
      return { ...conv, mensajesSinLeerFamilia: 0 };
    }
    return { ...conv, mensajesSinLeerEscuela: 0 };
  })
);

export function useConversations({ user, role, limitCount = 200 }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleConversationRead = (event) => {
      const conversationId = event?.detail?.conversationId;
      const forRole = event?.detail?.forRole;
      if (!conversationId || !forRole) return;
      setConversations((prev) => patchConversationAsRead(prev, conversationId, forRole));
    };

    window.addEventListener(CONVERSATION_READ_EVENT, handleConversationRead);
    return () => window.removeEventListener(CONVERSATION_READ_EVENT, handleConversationRead);
  }, []);

  useEffect(() => {
    if (!user || !role) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const collectionRef = collection(db, 'conversations');
    let q;

    if (role === ROLES.FAMILY) {
      q = query(collectionRef, where('familiaUid', '==', user.uid), orderBy('actualizadoAt', 'desc'));
    } else if (role === ROLES.SUPERADMIN) {
      // SUPERADMIN ve TODO (nivel 6)
      q = query(collectionRef, orderBy('actualizadoAt', 'desc'));
    } else if (role === ROLES.COORDINACION) {
      // Reglas Firestore: coordinación solo puede leer conversaciones del área "coordinacion".
      q = query(
        collectionRef,
        where('destinatarioEscuela', '==', 'coordinacion'),
        orderBy('actualizadoAt', 'desc')
      );
    } else {
      // FACTURACION y otros roles con área específica
      const area = resolveAreaForRole(role);
      if (!area) {
        setConversations([]);
        setLoading(false);
        return;
      }
      q = query(collectionRef, where('destinatarioEscuela', '==', area), orderBy('actualizadoAt', 'desc'));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setConversations(data.slice(0, limitCount));
        setLoading(false);
      },
      (err) => {
        console.error('Error en listener de conversaciones:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, role, limitCount]);

  const unreadCount = useMemo(() => {
    if (!role) return 0;
    const key = role === ROLES.FAMILY ? 'mensajesSinLeerFamilia' : 'mensajesSinLeerEscuela';
    return conversations.reduce((sum, c) => sum + (c[key] || 0), 0);
  }, [conversations, role]);

  const markAsRead = useCallback(async (conversationId) => {
    if (!conversationId || !role) return { success: false, error: 'Datos incompletos' };

    const forRole = role === ROLES.FAMILY ? 'family' : 'school';
    setConversations((prev) => patchConversationAsRead(prev, conversationId, forRole));
    emitConversationRead(conversationId, forRole);

    const result = await conversationsService.markConversationRead(conversationId, forRole);
    if (!result.success) {
      setError(result.error || 'No se pudo marcar como leído');
    }
    return result;
  }, [role]);

  return {
    conversations,
    loading,
    error,
    unreadCount,
    markAsRead
  };
}
