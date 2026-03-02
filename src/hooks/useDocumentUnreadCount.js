import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export function useDocumentUnreadCount(userId) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      setLoading(false);
      return undefined;
    }

    const receiptsQuery = query(
      collection(db, 'documentReadReceipts'),
      where('userId', '==', userId),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      receiptsQuery,
      (snapshot) => {
        setCount(snapshot.size || 0);
        setLoading(false);
      },
      (error) => {
        console.error('[useDocumentUnreadCount] Error cargando pendientes:', error);
        setCount(0);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  return { count, loading };
}
