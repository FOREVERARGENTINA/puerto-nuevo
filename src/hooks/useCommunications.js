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
import { ADMIN_ROLES, COMMUNICATION_TYPES, ROLES } from '../config/constants';

export function useCommunications(limitCount = 50) {
  const { user, role } = useAuth();
  const [communications, setCommunications] = useState([]);
  const [unreadCommunications, setUnreadCommunications] = useState([]);
  const [unreadRequired, setUnreadRequired] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || !role) {
      return;
    }

    if (role === ROLES.TALLERISTA) {
      setCommunications([]);
      setUnreadCommunications([]);
      setUnreadRequired([]);
      setLoading(false);
      setError(null);
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    const checkUnreadCommunications = async (comms) => {
      const trackableComms = comms.filter((comm) => (
        comm.requiereLecturaObligatoria || comm.type === COMMUNICATION_TYPES.INDIVIDUAL
      ));

      const unreadPromises = trackableComms.map(async (comm) => {
        const result = await readReceiptsService.hasUserRead(comm.id, user.uid);
        return result.success && !result.hasRead ? comm : null;
      });

      const unreadResults = await Promise.all(unreadPromises);
      const unread = unreadResults.filter((comm) => comm !== null);

      setUnreadCommunications(unread);
      setUnreadRequired(unread.filter((comm) => comm.requiereLecturaObligatoria));
    };

    // Docente: ve comunicados globales/ambiente + individuales dirigidos a él.
    // Firestore no soporta OR entre campos distintos → dos listeners mergeados.
    if (role === ROLES.DOCENTE) {
      let broadcastComms = [];
      let individualComms = [];
      let currentComms = [];

      const merge = () => {
        const map = new Map();
        [...broadcastComms, ...individualComms].forEach((c) => map.set(c.id, c));
        currentComms = Array.from(map.values()).sort(
          (a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)
        );
        setCommunications(currentComms);
        setLoading(false);
        checkUnreadCommunications(currentComms).catch(console.error);
      };

      const unsubBroadcast = onSnapshot(
        query(
          collection(db, 'communications'),
          where('type', 'in', [COMMUNICATION_TYPES.GLOBAL, COMMUNICATION_TYPES.AMBIENTE]),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        ),
        (snap) => { broadcastComms = snap.docs.map((d) => ({ id: d.id, ...d.data() })); merge(); },
        (err) => { console.error('Error listener comunicados globales:', err); setError(err.message); setLoading(false); }
      );

      const unsubIndividual = onSnapshot(
        query(
          collection(db, 'communications'),
          where('type', '==', COMMUNICATION_TYPES.INDIVIDUAL),
          where('destinatarios', 'array-contains', user.uid),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        ),
        (snap) => { individualComms = snap.docs.map((d) => ({ id: d.id, ...d.data() })); merge(); },
        (err) => { console.error('Error listener comunicados individuales:', err); }
      );

      const intervalId = setInterval(() => {
        if (currentComms.length > 0) checkUnreadCommunications(currentComms).catch(console.error);
      }, 5000);

      return () => { unsubBroadcast(); unsubIndividual(); clearInterval(intervalId); };
    }

    let q;
    if (ADMIN_ROLES.includes(role)) {
      q = query(collection(db, 'communications'), orderBy('createdAt', 'desc'), limit(limitCount));
    } else {
      q = query(
        collection(db, 'communications'),
        where('destinatarios', 'array-contains', user.uid),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    let currentComms = [];

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const comms = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        currentComms = comms;
        setCommunications(comms);
        setLoading(false);
        checkUnreadCommunications(comms).catch((err) => { console.error('Error verificando lecturas:', err); });
      },
      (err) => {
        console.error('Error en listener de comunicados:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    const intervalId = setInterval(async () => {
      if (currentComms.length > 0) await checkUnreadCommunications(currentComms);
    }, 5000);

    return () => { unsubscribe(); clearInterval(intervalId); };
  }, [user, role, limitCount]);

  const markAsRead = async (commId) => {
    if (!user) return { success: false, error: 'Usuario no autenticado' };

    const result = await readReceiptsService.markAsRead(
      commId,
      user.uid,
      user.displayName || user.email
    );

    if (result.success) {
      setUnreadCommunications((prev) => prev.filter((comm) => comm.id !== commId));
      setUnreadRequired((prev) => prev.filter((comm) => comm.id !== commId));
    }

    return result;
  };

  return {
    communications,
    unreadCommunications,
    unreadRequired,
    loading,
    error,
    markAsRead,
    hasUnreadRequired: unreadRequired.length > 0
  };
}
