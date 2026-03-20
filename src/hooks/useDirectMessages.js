import { useEffect, useMemo, useRef, useState } from 'react';
import { directMessagesService } from '../services/directMessages.service';

/**
 * Hook principal para DMs. Expone la lista de hilos en tiempo real
 * y el total de mensajes sin leer (para el badge del sidebar).
 */
export function useDirectMessages(uid) {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!uid) {
      setThreads([]);
      setLoading(false);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    unsubRef.current = directMessagesService.subscribeThreadsForFamily(
      uid,
      (next) => {
        setThreads(next);
        setLoading(false);
        setError('');
      },
      (nextError) => {
        setThreads([]);
        setLoading(false);
        setError(nextError?.message || 'No se pudieron cargar las conversaciones.');
      }
    );

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [uid]);

  const totalUnread = useMemo(() => {
    return threads.reduce((sum, t) => {
      const count = typeof t.unreadCount === 'number'
        ? t.unreadCount
        : t.unreadCount?.[uid];
      return sum + (typeof count === 'number' ? count : 0);
    }, 0);
  }, [threads, uid]);

  return { threads, loading, totalUnread, error };
}

/**
 * Hook liviano solo para el badge del sidebar.
 * Reutiliza useDirectMessages internamente.
 */
export function useDirectMessagesUnreadCount(uid) {
  const { totalUnread } = useDirectMessages(uid);
  return totalUnread;
}

/**
 * Hook para el hilo abierto: mensajes en tiempo real.
 */
export function useDirectMessageThread(convId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (!convId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    unsubRef.current = directMessagesService.subscribeThreadMessages(convId, (next) => {
      setMessages(next);
      setLoading(false);
    });

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [convId]);

  return { messages, loading };
}
