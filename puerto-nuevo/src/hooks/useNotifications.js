import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';
import { useCommunications } from './useCommunications';
import { ROLES, ADMIN_ROLES, COMMUNICATION_TYPES } from '../config/constants';

/**
 * Hook de notificaciones - FASE 2 COMPLETA + CORRECCIONES
 * Obtiene notificaciones en tiempo real de:
 * - Comunicados sin leer:
 *   · Para FAMILIAS/DOCENTES/TALLERISTAS: todos donde sean destinatarios
 *   · Para ADMIN/COORDINACION: solo tipo INDIVIDUAL (no GLOBAL/AMBIENTE)
 * - Snacks pendientes de confirmar (próximos 48hs) - SOLO FAMILIAS
 * - Turnos próximos (próximos 48hs) - SOLO FAMILIAS
 */
export function useNotifications() {
  const { user, role } = useAuth();
  const { unreadRequired } = useCommunications();
  const [upcomingSnacks, setUpcomingSnacks] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Solo familias tienen snacks y turnos
    if (role !== ROLES.FAMILY) {
      setLoading(false);
      return;
    }

    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // LISTENER 1: Snacks próximos (48hs) sin confirmar
    const snacksQuery = query(
      collection(db, 'snackAssignments'),
      where('familiaUid', '==', user.uid),
      where('confirmadoPorFamilia', '==', false),
      limit(10)
    );

    const unsubSnacks = onSnapshot(snacksQuery, (snapshot) => {
      const snacks = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(s => {
          const startDate = new Date(s.fechaInicio);
          return startDate >= now && startDate <= in48Hours;
        });
      setUpcomingSnacks(snacks);
    });

    // LISTENER 2: Turnos próximos (48hs)
    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('familiaUid', '==', user.uid),
      where('estado', '==', 'reservado'),
      where('fechaHora', '>=', Timestamp.fromDate(now)),
      where('fechaHora', '<=', Timestamp.fromDate(in48Hours)),
      limit(10)
    );

    const unsubAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      setUpcomingAppointments(
        snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      );
    });

    setLoading(false);

    return () => {
      unsubSnacks();
      unsubAppointments();
    };
  }, [user, role]);

  // Filtrar comunicados: solo mostrar donde el usuario ES destinatario
  // (useCommunications para admin devuelve TODOS para gestión, no solo los suyos)
  const relevantCommunications = user ? unreadRequired.filter(comm => {
    // Si no tiene destinatarios, es un error de datos
    if (!comm.destinatarios || !Array.isArray(comm.destinatarios)) return false;

    // Verificar que el usuario está en destinatarios
    const isRecipient = comm.destinatarios.includes(user.uid);
    if (!isRecipient) return false;

    // Filtro especial para admins/coordinación:
    // Solo mostrar comunicados tipo INDIVIDUAL (dirigidos específicamente a ellos)
    // NO mostrar GLOBAL/AMBIENTE/TALLER (esos ya los ven en su dashboard de gestión)
    if (ADMIN_ROLES.includes(role)) {
      return comm.type === COMMUNICATION_TYPES.INDIVIDUAL;
    }

    // Para otros roles (familias, docentes, talleristas): mostrar todos donde sean destinatarios
    return true;
  }) : [];

  // Determinar URL de comunicados según rol
  const communicationsUrl = role === ROLES.FAMILY
    ? '/familia/comunicados'
    : role === ROLES.DOCENTE
    ? '/docente' // Los docentes ven comunicados desde su dashboard
    : '/admin'; // Admin ve desde dashboard

  const snacksUrl = '/familia/snacks';
  const appointmentsUrl = '/familia/turnos';

  // Mapear a formato de notificación unificado
  const notifications = [
    // Comunicados (solo donde el usuario ES destinatario)
    ...relevantCommunications.map(comm => ({
      id: `comm-${comm.id}`,
      type: 'comunicado',
      title: '📢 Comunicado nuevo',
      message: comm.title,
      timestamp: comm.createdAt?.toDate() || new Date(),
      urgent: comm.requiereLecturaObligatoria,
      actionUrl: communicationsUrl,
      metadata: { commId: comm.id }
    })),
    // Snacks (solo familias)
    ...upcomingSnacks.map(snack => ({
      id: `snack-${snack.id}`,
      type: 'snack',
      title: '🍎 Snack pendiente',
      message: `Semana del ${snack.fechaInicio} - Confirmá tu asignación`,
      timestamp: snack.createdAt?.toDate() || new Date(),
      urgent: false,
      actionUrl: snacksUrl,
      metadata: { assignmentId: snack.id }
    })),
    // Turnos (solo familias)
    ...upcomingAppointments.map(appt => ({
      id: `appt-${appt.id}`,
      type: 'turno',
      title: '📅 Turno próximo',
      message: `Turno el ${appt.fechaHora?.toDate().toLocaleDateString('es-AR')}`,
      timestamp: appt.createdAt?.toDate() || new Date(),
      urgent: false,
      actionUrl: appointmentsUrl,
      metadata: { appointmentId: appt.id }
    }))
  ].sort((a, b) => {
    // Ordenar: urgentes primero, luego por fecha
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return b.timestamp - a.timestamp;
  });

  return {
    notifications,
    totalCount: notifications.length,
    byType: {
      comunicados: relevantCommunications.length,
      snacks: upcomingSnacks.length,
      turnos: upcomingAppointments.length
    },
    loading
  };
}
