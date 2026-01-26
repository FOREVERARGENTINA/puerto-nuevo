import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ROLES } from '../config/constants';

const resolveAreaForRole = (role) => {
  if (role === ROLES.COORDINACION) return 'coordinacion';
  if (role === ROLES.SUPERADMIN) return null;
  return null;
};

export function useConversations({ user, role, limitCount = 200 }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      q = query(collectionRef, orderBy('actualizadoAt', 'desc'));
    } else {
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

  return {
    conversations,
    loading,
    error,
    unreadCount
  };
}
