import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ROLES } from '../config/constants';
import { conversationsService } from '../services/conversations.service';
import { CONVERSATION_READ_EVENT, emitConversationRead } from '../utils/conversationEvents';
import { sortConversationsByLatestMessage } from '../utils/conversationHelpers';

const resolveAreasForRole = (role) => {
  if (role === ROLES.COORDINACION) return ['coordinacion'];
  if (role === ROLES.FACTURACION) return ['administracion'];
  if (role === ROLES.SUPERADMIN) return null;
  return null;
};

const patchConversationAsRead = (items, conversationId, forRole, uid) => (
  items.map((conv) => {
    if (conv.id !== conversationId) return conv;
    if (forRole === 'family') {
      if (conv.esGrupal && uid) {
        return { ...conv, mensajesSinLeer: { ...(conv.mensajesSinLeer || {}), [uid]: 0 } };
      }
      return { ...conv, mensajesSinLeerFamilia: 0 };
    }
    return { ...conv, mensajesSinLeerEscuela: 0 };
  })
);

export function useConversations({ user, role }) {
  // rawLegacy: familiaUid == uid (individual legacy + new individual)
  // rawGroup: participantesUids array-contains uid (grupales + secundarios)
  const [rawLegacy, setRawLegacy] = useState([]);
  const [rawGroup, setRawGroup] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Merged, deduped, sorted conversations
  const conversations = useMemo(() => {
    const map = new Map();
    rawLegacy.forEach(c => map.set(c.id, c));
    rawGroup.forEach(c => map.set(c.id, c));
    return sortConversationsByLatestMessage(Array.from(map.values()));
  }, [rawLegacy, rawGroup]);

  useEffect(() => {
    const handleConversationRead = (event) => {
      const { conversationId, forRole, uid } = event?.detail || {};
      if (!conversationId || !forRole) return;
      setRawLegacy((prev) => patchConversationAsRead(prev, conversationId, forRole, uid));
      setRawGroup((prev) => patchConversationAsRead(prev, conversationId, forRole, uid));
    };

    window.addEventListener(CONVERSATION_READ_EVENT, handleConversationRead);
    return () => window.removeEventListener(CONVERSATION_READ_EVENT, handleConversationRead);
  }, []);

  useEffect(() => {
    if (!user || !role) {
      setRawLegacy([]);
      setRawGroup([]);
      setLoading(false);
      return;
    }

    const collectionRef = collection(db, 'conversations');

    if (role === ROLES.FAMILY) {
      // Q1: conversaciones individuales (legacy + nuevas con familiaUid == uid)
      const q1 = query(collectionRef, where('familiaUid', '==', user.uid));
      const unsubQ1 = onSnapshot(
        q1,
        (snapshot) => {
          setRawLegacy(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
          setLoading(false);
        },
        (err) => {
          console.error('Error en listener Q1 de conversaciones:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Q2: conversaciones grupales donde el uid es participante secundario
      // Usamos participanteMap.uid == true (campo anidado) en vez de array-contains
      // porque Firestore puede validar este patrón estáticamente en security rules.
      const q2 = query(collectionRef, where(`participanteMap.${user.uid}`, '==', true));
      const unsubQ2 = onSnapshot(
        q2,
        (snapshot) => {
          setRawGroup(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
          console.error('Error listener Q2 (participantesUids):', err.code, err.message);
        }
      );

      return () => {
        unsubQ1();
        unsubQ2();
      };
    }

    // Roles no-family: un solo listener (comportamiento existente)
    let q;
    if (role === ROLES.SUPERADMIN) {
      q = query(collectionRef);
    } else if (role === ROLES.COORDINACION) {
      q = query(collectionRef, where('destinatarioEscuela', '==', 'coordinacion'));
    } else {
      const areas = resolveAreasForRole(role);
      if (!areas) {
        setRawLegacy([]);
        setLoading(false);
        return;
      }
      q = areas.length === 1
        ? query(collectionRef, where('destinatarioEscuela', '==', areas[0]))
        : query(collectionRef, where('destinatarioEscuela', 'in', areas));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRawLegacy(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Error en listener de conversaciones:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, role]);

  const unreadCount = useMemo(() => {
    if (!role) return 0;
    if (role === ROLES.FAMILY) {
      return conversations.reduce((sum, c) => {
        const unread = c.esGrupal
          ? (c.mensajesSinLeer?.[user?.uid] || 0)
          : (c.mensajesSinLeerFamilia || 0);
        return sum + unread;
      }, 0);
    }
    return conversations.reduce((sum, c) => sum + (c.mensajesSinLeerEscuela || 0), 0);
  }, [conversations, role, user]);

  const markAsRead = useCallback(async (conversationId, esGrupal = false) => {
    if (!conversationId || !role) return { success: false, error: 'Datos incompletos' };

    const forRole = role === ROLES.FAMILY ? 'family' : 'school';
    const familiaUid = role === ROLES.FAMILY ? user?.uid : null;

    setRawLegacy((prev) => patchConversationAsRead(prev, conversationId, forRole, familiaUid));
    setRawGroup((prev) => patchConversationAsRead(prev, conversationId, forRole, familiaUid));
    emitConversationRead(conversationId, forRole, familiaUid);

    const result = await conversationsService.markConversationRead(
      conversationId,
      forRole,
      { familiaUid, esGrupal }
    );
    if (!result.success) {
      setError(result.error || 'No se pudo marcar como leído');
    }
    return result;
  }, [role, user]);

  return {
    conversations,
    loading,
    error,
    unreadCount,
    markAsRead
  };
}
