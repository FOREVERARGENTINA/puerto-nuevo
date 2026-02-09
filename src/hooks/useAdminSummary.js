import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AMBIENTES } from '../config/constants';

/**
 * Hook optimizado para el resumen del navbar en tiempo real
 * Usa listeners de Firestore con queries limitadas para no quemar recursos
 */
export function useAdminSummary(enabled = false) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    todayEvents: 0,
    nextWeekUnassigned: 0,
    unreadConversations: 0
  });

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribeEvents = null;
    let unsubscribeSnacks = null;
    let unsubscribeConversations = null;

    // Helper: inicio de hoy
    const getTodayStart = () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return start;
    };

    // Helper: fin del rango de próximos 7 días (incluye hoy)
    const getNextSevenDaysEnd = (todayStart) => {
      const end = new Date(todayStart);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return end;
    };

    // Helper: inicio de próxima semana
    const getNextWeekStart = () => {
      const now = new Date();
      const dayIndex = (now.getDay() + 6) % 7; // Lunes = 0
      const currentWeekStart = new Date(now);
      currentWeekStart.setDate(now.getDate() - dayIndex);
      currentWeekStart.setHours(0, 0, 0, 0);
      
      const nextWeekStart = new Date(currentWeekStart);
      nextWeekStart.setDate(currentWeekStart.getDate() + 7);
      return nextWeekStart;
    };

    // Helper: convertir Date a string ISO (YYYY-MM-DD)
    const toISODate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    try {
      // 1. LISTENER DE EVENTOS DE LOS PRÓXIMOS 7 DÍAS (incluye hoy)
      // Query: eventos donde fecha >= inicio de hoy y <= fin de 7 días
      const todayStart = getTodayStart();
      const nextSevenEnd = getNextSevenDaysEnd(todayStart);
      const eventsQuery = query(
        collection(db, 'events'),
        where('fecha', '>=', Timestamp.fromDate(todayStart)),
        where('fecha', '<=', Timestamp.fromDate(nextSevenEnd)),
        orderBy('fecha', 'asc')
      );

      unsubscribeEvents = onSnapshot(
        eventsQuery,
        (snapshot) => {
          const todayEvents = snapshot.size;
          setSummary(prev => ({ ...prev, todayEvents }));
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to events:', error);
          setLoading(false);
        }
      );

      // 2. LISTENER DE SNACKS NO ASIGNADOS (próxima semana)
      // Query: snackAssignments donde fechaInicio = próxima semana Y (sin familias O suspendido)
      const nextWeekStart = getNextWeekStart();
      const nextWeekStr = toISODate(nextWeekStart);

      // Listener para Taller 1
      const snacksT1Query = query(
        collection(db, 'snackAssignments'),
        where('ambiente', '==', AMBIENTES.TALLER_1),
        where('fechaInicio', '==', nextWeekStr)
      );

      // Listener para Taller 2
      const snacksT2Query = query(
        collection(db, 'snackAssignments'),
        where('ambiente', '==', AMBIENTES.TALLER_2),
        where('fechaInicio', '==', nextWeekStr)
      );

      let t1Unassigned = 0;
      let t2Unassigned = 0;

      const isSnapshotUnassigned = (snapshot) => {
        if (snapshot.empty) return 1;

        const hasAssignedActive = snapshot.docs.some((docSnap) => {
          const data = docSnap.data();
          if (data.suspendido || data.estado === 'suspendido') return false;
          if (data.estado === 'cancelado' || data.estado === 'completado') return false;
          if (data.solicitudCambio || data.estado === 'cambio_solicitado') return false;

          const hasFamilias = Array.isArray(data.familias) && data.familias.length > 0;
          const hasLegacyFamilia = Boolean(data.familiaUid);
          return hasFamilias || hasLegacyFamilia;
        });

        return hasAssignedActive ? 0 : 1;
      };

      unsubscribeSnacks = () => {
        if (unsubT1) unsubT1();
        if (unsubT2) unsubT2();
      };

      const unsubT1 = onSnapshot(
        snacksT1Query,
        (snapshot) => {
          t1Unassigned = isSnapshotUnassigned(snapshot);
          updateSnacksCount();
        },
        (error) => {
          console.error('Error listening to snacks T1:', error);
        }
      );

      const unsubT2 = onSnapshot(
        snacksT2Query,
        (snapshot) => {
          t2Unassigned = isSnapshotUnassigned(snapshot);
          updateSnacksCount();
        },
        (error) => {
          console.error('Error listening to snacks T2:', error);
        }
      );

      const updateSnacksCount = () => {
        const nextWeekUnassigned = t1Unassigned + t2Unassigned;
        setSummary(prev => ({ ...prev, nextWeekUnassigned }));
      };

      // 3. LISTENER DE CONVERSACIONES SIN LEER
      // Query: conversaciones donde lastMessageIsFromFamily = true Y schoolHasRead = false
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('lastMessageIsFromFamily', '==', true),
        where('schoolHasRead', '==', false)
      );

      unsubscribeConversations = onSnapshot(
        conversationsQuery,
        (snapshot) => {
          const unreadConversations = snapshot.size;
          setSummary(prev => ({ ...prev, unreadConversations }));
        },
        (error) => {
          console.error('Error listening to conversations:', error);
        }
      );

    } catch (error) {
      console.error('Error setting up listeners:', error);
      setLoading(false);
    }

    // Cleanup: desuscribir todos los listeners
    return () => {
      if (unsubscribeEvents) unsubscribeEvents();
      if (unsubscribeSnacks) unsubscribeSnacks();
      if (unsubscribeConversations) unsubscribeConversations();
    };
  }, [enabled]);

  return { summary, loading };
}
