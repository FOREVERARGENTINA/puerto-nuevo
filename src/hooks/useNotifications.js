import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';
import { useCommunications } from './useCommunications';
import { useConversations } from './useConversations';
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
  const { conversations } = useConversations({ user, role });
  const [upcomingSnacks, setUpcomingSnacks] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [assignedAppointments, setAssignedAppointments] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    // Solo familias tienen snacks y turnos
    if (role !== ROLES.FAMILY) {
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
    let legacyAppointments = [];
    let arrayAppointments = [];

    const mergeAppointments = () => {
      const map = new Map();
      legacyAppointments.forEach(appt => map.set(appt.id, appt));
      arrayAppointments.forEach(appt => map.set(appt.id, appt));
      setUpcomingAppointments(Array.from(map.values()));
    };

    const appointmentsQuery = query(
      collection(db, 'appointments'),
      where('familiaUid', '==', user.uid),
      where('estado', '==', 'reservado'),
      where('fechaHora', '>=', Timestamp.fromDate(now)),
      where('fechaHora', '<=', Timestamp.fromDate(in48Hours)),
      limit(10)
    );

    const appointmentsArrayQuery = query(
      collection(db, 'appointments'),
      where('familiasUids', 'array-contains', user.uid),
      where('estado', '==', 'reservado'),
      where('fechaHora', '>=', Timestamp.fromDate(now)),
      where('fechaHora', '<=', Timestamp.fromDate(in48Hours)),
      limit(10)
    );

    const unsubAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      legacyAppointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      mergeAppointments();
    });

    const unsubAppointmentsArray = onSnapshot(appointmentsArrayQuery, (snapshot) => {
      arrayAppointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      mergeAppointments();
    });

    // LISTENER 3: Turnos asignados recientemente (7 días)
    const assignedSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    let assignedLegacy = [];
    let assignedArray = [];

    const mergeAssigned = () => {
      const map = new Map();
      assignedLegacy.forEach(appt => map.set(appt.id, appt));
      assignedArray.forEach(appt => map.set(appt.id, appt));
      setAssignedAppointments(Array.from(map.values()));
    };

    const assignedQuery = query(
      collection(db, 'appointments'),
      where('familiaUid', '==', user.uid),
      where('assignedAt', '>=', Timestamp.fromDate(assignedSince)),
      where('assignedAt', '<=', Timestamp.fromDate(now)),
      limit(10)
    );

    const assignedArrayQuery = query(
      collection(db, 'appointments'),
      where('familiasUids', 'array-contains', user.uid),
      where('assignedAt', '>=', Timestamp.fromDate(assignedSince)),
      where('assignedAt', '<=', Timestamp.fromDate(now)),
      limit(10)
    );

    const unsubAssigned = onSnapshot(assignedQuery, (snapshot) => {
      assignedLegacy = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      mergeAssigned();
    });

    const unsubAssignedArray = onSnapshot(assignedArrayQuery, (snapshot) => {
      assignedArray = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      mergeAssigned();
    });

    // LISTENER 4: Documentos pendientes de lectura (solo familias)
    const documentsQuery = query(
      collection(db, 'documentReadReceipts'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending'),
      limit(20)
    );

    const unsubDocuments = onSnapshot(documentsQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingDocuments(docs);
    });

    return () => {
      unsubSnacks();
      unsubAppointments();
      unsubAppointmentsArray();
      unsubAssigned();
      unsubAssignedArray();
      unsubDocuments();
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
  const conversationsUrl = role === ROLES.FAMILY
    ? '/familia/conversaciones'
    : '/admin/conversaciones';

  const conversationNotifications = conversations
    .filter(conv => {
      if (role === ROLES.FAMILY) return (conv.mensajesSinLeerFamilia || 0) > 0;
      if (ADMIN_ROLES.includes(role)) return (conv.mensajesSinLeerEscuela || 0) > 0;
      return false;
    })
    .slice(0, 10)
    .map(conv => ({
      id: `conv-${conv.id}`,
      type: 'conversacion',
      title: role === ROLES.FAMILY ? 'Nuevo mensaje de la escuela' : 'Nueva consulta',
      message: conv.asunto || 'Conversación',
      timestamp: conv.ultimoMensajeAt?.toDate() || conv.actualizadoAt?.toDate() || new Date(),
      urgent: conv.estado === 'pendiente',
      actionUrl: `${conversationsUrl}/${conv.id}`,
      metadata: { conversationId: conv.id }
    }));

  const assignedNotifications = assignedAppointments.map(appt => ({
    id: `assigned-${appt.id}`,
    type: 'turno-asignado',
    title: 'Turno asignado',
    message: `Turno el ${appt.fechaHora?.toDate().toLocaleDateString('es-AR')}`,
    timestamp: appt.assignedAt?.toDate() || appt.updatedAt?.toDate() || appt.createdAt?.toDate() || new Date(),
    urgent: true,
    actionUrl: appointmentsUrl,
    metadata: { appointmentId: appt.id }
  }));

  const assignedIds = new Set(assignedAppointments.map(appt => appt.id));
  const upcomingNotifications = upcomingAppointments
    .filter(appt => !assignedIds.has(appt.id))
    .map(appt => ({
      id: `appt-${appt.id}`,
      type: 'turno',
      title: 'Turno próximo',
      message: `Turno el ${appt.fechaHora?.toDate().toLocaleDateString('es-AR')}`,
      timestamp: appt.createdAt?.toDate() || new Date(),
      urgent: false,
      actionUrl: appointmentsUrl,
      metadata: { appointmentId: appt.id }
    }));

  // Mapear a formato de notificación unificado
  const notifications = [
    ...conversationNotifications,
    // Comunicados (solo donde el usuario ES destinatario)
    ...relevantCommunications.map(comm => ({
      id: `comm-${comm.id}`,
      type: 'comunicado',
      title: 'Comunicado nuevo',
      message: comm.title,
      timestamp: comm.createdAt?.toDate() || new Date(),
      urgent: comm.requiereLecturaObligatoria,
      actionUrl: communicationsUrl,
      metadata: { commId: comm.id }
    })),
    // Documentos pendientes (solo familias)
    ...pendingDocuments.map(doc => ({
      id: `doc-${doc.id}`,
      type: 'documento',
      title: 'Documento para leer',
      message: doc.documentId ? 'Documento de lectura obligatoria' : 'Confirmá tu lectura',
      timestamp: doc.createdAt?.toDate() || new Date(),
      urgent: true,
      actionUrl: role === ROLES.FAMILY ? '/family/documentos' : '/shared/documentos',
      metadata: { documentId: doc.documentId, receiptId: doc.id }
    })),
    // Turnos asignados (solo familias)
    ...assignedNotifications,
    // Snacks (solo familias)
    ...upcomingSnacks.map(snack => ({
      id: `snack-${snack.id}`,
      type: 'snack',
      title: 'Snack pendiente',
      message: `Semana del ${snack.fechaInicio} - Confirmá tu asignación`,
      timestamp: snack.createdAt?.toDate() || new Date(),
      urgent: false,
      actionUrl: snacksUrl,
      metadata: { assignmentId: snack.id }
    })),
    // Turnos (solo familias)
    ...upcomingNotifications
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
      conversaciones: conversationNotifications.length,
      comunicados: relevantCommunications.length,
      documentos: pendingDocuments.length,
      snacks: upcomingSnacks.length,
      turnos: upcomingAppointments.length,
      asignados: assignedAppointments.length
    }
  };
}
