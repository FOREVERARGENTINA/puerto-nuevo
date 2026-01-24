import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';
import { readReceiptsService } from '../services/readReceipts.service';
import { ADMIN_ROLES } from '../config/constants';

export function useCommunications(limitCount = 50) {
  const { user, role } = useAuth();
  const [communications, setCommunications] = useState([]);
  const [unreadRequired, setUnreadRequired] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !role) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    let q;
    
    if (ADMIN_ROLES.includes(role)) {
      q = query(
        collection(db, 'communications'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    } else {
      q = query(
        collection(db, 'communications'),
        where('destinatarios', 'array-contains', user.uid),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const comms = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          setCommunications(comms);

          const unreadPromises = comms
            .filter(comm => comm.requiereLecturaObligatoria)
            .map(async (comm) => {
              const result = await readReceiptsService.hasUserRead(comm.id, user.uid);
              return result.success && !result.hasRead ? comm : null;
            });

          const unreadResults = await Promise.all(unreadPromises);
          const unread = unreadResults.filter(comm => comm !== null);
          
          setUnreadRequired(unread);
          setLoading(false);
        } catch (err) {
          console.error('Error procesando comunicados:', err);
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error en listener de comunicados:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, role, limitCount]);

  const markAsRead = async (commId) => {
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    const result = await readReceiptsService.markAsRead(
      commId,
      user.uid,
      user.displayName || user.email
    );

    if (result.success) {
      setUnreadRequired(prev => prev.filter(comm => comm.id !== commId));
    }

    return result;
  };

  return {
    communications,
    unreadRequired,
    loading,
    error,
    markAsRead,
    hasUnreadRequired: unreadRequired.length > 0
  };
}
