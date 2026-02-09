import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, Timestamp, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './useAuth';
import { useCommunications } from './useCommunications';
import { useConversations } from './useConversations';
import { ROLES, ADMIN_ROLES, COMMUNICATION_TYPES } from '../config/constants';

const SNACK_TERMINAL_STATES = new Set(['cancelado', 'completado', 'suspendido']);

const toDateSafe = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date?.getTime?.()) ? null : date;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

const mergeById = (...collections) => {
  const map = new Map();
  collections.forEach((items) => {
    (items || []).forEach((item) => {
      if (item?.id) map.set(item.id, item);
    });
  });
  return Array.from(map.values());
};

const getSnackWeekStartDate = (snack) => {
  if (!snack?.fechaInicio) return null;
  const date = new Date(`${snack.fechaInicio}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatSnackDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit'
  });
};

const getSnackAssignedDate = (snack) => (
  toDateSafe(snack?.assignedAt)
  || toDateSafe(snack?.updatedAt)
  || toDateSafe(snack?.createdAt)
);

const isSnackActiveForNotification = (snack) => {
  if (!snack) return false;
  if (snack.suspendido) return false;
  if (SNACK_TERMINAL_STATES.has(snack.estado)) return false;
  return true;
};

const isWithinRange = (date, start, end) => {
  if (!date) return false;
  return date >= start && date <= end;
};

export function useNotifications() {
  const { user, role } = useAuth();
  const { unreadRequired } = useCommunications();
  const { conversations } = useConversations({ user, role });
  const [dismissedSnackAssignedKeys, setDismissedSnackAssignedKeys] = useState([]);
  const [upcomingSnacks, setUpcomingSnacks] = useState([]);
  const [assignedSnacks, setAssignedSnacks] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [assignedAppointments, setAssignedAppointments] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);

  useEffect(() => {
    if (!user?.uid) {
      setDismissedSnackAssignedKeys([]);
      return;
    }

    try {
      const raw = localStorage.getItem(`pn:dismissedSnackAssigned:${user.uid}`);
      const parsed = raw ? JSON.parse(raw) : [];
      setDismissedSnackAssignedKeys(Array.isArray(parsed) ? parsed : []);
    } catch {
      setDismissedSnackAssignedKeys([]);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (role !== ROLES.FAMILY) {
      return;
    }

    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const assignedSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let legacySnacks = [];
    let arraySnacks = [];

    const recomputeSnacks = () => {
      const mergedSnacks = mergeById(legacySnacks, arraySnacks);
      const activeSnacks = mergedSnacks.filter(isSnackActiveForNotification);

      const nextSnacks = activeSnacks.filter((snack) => {
        const startDate = getSnackWeekStartDate(snack);
        return !snack.confirmadoPorFamilia && isWithinRange(startDate, now, in48Hours);
      });

      const recentlyAssigned = activeSnacks.filter((snack) => {
        const assignedDate = getSnackAssignedDate(snack);
        return isWithinRange(assignedDate, assignedSince, now);
      });

      setUpcomingSnacks(nextSnacks);
      setAssignedSnacks(recentlyAssigned);
    };

    const snacksLegacyQuery = query(
      collection(db, 'snackAssignments'),
      where('familiaUid', '==', user.uid),
      limit(40)
    );

    const snacksArrayQuery = query(
      collection(db, 'snackAssignments'),
      where('familiasUids', 'array-contains', user.uid),
      limit(40)
    );

    const unsubSnacksLegacy = onSnapshot(snacksLegacyQuery, (snapshot) => {
      legacySnacks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      recomputeSnacks();
    });

    const unsubSnacksArray = onSnapshot(snacksArrayQuery, (snapshot) => {
      arraySnacks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      recomputeSnacks();
    });

    let legacyAppointments = [];
    let arrayAppointments = [];

    const mergeAppointments = () => {
      const map = new Map();
      legacyAppointments.forEach((appt) => map.set(appt.id, appt));
      arrayAppointments.forEach((appt) => map.set(appt.id, appt));
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
      legacyAppointments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      mergeAppointments();
    });

    const unsubAppointmentsArray = onSnapshot(appointmentsArrayQuery, (snapshot) => {
      arrayAppointments = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      mergeAppointments();
    });

    let assignedLegacy = [];
    let assignedArray = [];

    const mergeAssigned = () => {
      const map = new Map();
      assignedLegacy.forEach((appt) => map.set(appt.id, appt));
      assignedArray.forEach((appt) => map.set(appt.id, appt));
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
      assignedLegacy = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      mergeAssigned();
    });

    const unsubAssignedArray = onSnapshot(assignedArrayQuery, (snapshot) => {
      assignedArray = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      mergeAssigned();
    });

    const documentsQuery = query(
      collection(db, 'documentReadReceipts'),
      where('userId', '==', user.uid),
      where('status', '==', 'pending'),
      limit(20)
    );

    const unsubDocuments = onSnapshot(documentsQuery, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPendingDocuments(docs);
    });

    return () => {
      unsubSnacksLegacy();
      unsubSnacksArray();
      unsubAppointments();
      unsubAppointmentsArray();
      unsubAssigned();
      unsubAssignedArray();
      unsubDocuments();
    };
  }, [user, role]);

  const relevantCommunications = user
    ? unreadRequired.filter((comm) => {
        if (!comm.destinatarios || !Array.isArray(comm.destinatarios)) return false;

        const isRecipient = comm.destinatarios.includes(user.uid);
        if (!isRecipient) return false;

        if (ADMIN_ROLES.includes(role)) {
          return comm.type === COMMUNICATION_TYPES.INDIVIDUAL;
        }

        return true;
      })
    : [];

  const communicationsUrl =
    role === ROLES.FAMILY
      ? '/familia/comunicados'
      : role === ROLES.DOCENTE
        ? '/docente'
        : '/admin';

  const snacksUrl = '/familia/snacks';
  const appointmentsUrl = '/familia/turnos';
  const conversationsUrl = role === ROLES.FAMILY
    ? '/familia/conversaciones'
    : '/admin/conversaciones';

  const conversationNotifications = conversations
    .filter((conv) => {
      if (role === ROLES.FAMILY) return (conv.mensajesSinLeerFamilia || 0) > 0;
      if (ADMIN_ROLES.includes(role)) return (conv.mensajesSinLeerEscuela || 0) > 0;
      return false;
    })
    .slice(0, 10)
    .map((conv) => {
      const senderName = conv.familiaDisplayName || conv.familiaEmail || 'Familia';

      return {
        id: `conv-${conv.id}`,
        type: 'conversacion',
        title: role === ROLES.FAMILY ? 'Nuevo mensaje de la escuela' : `Nueva consulta de ${senderName}`,
        message: conv.asunto || 'Conversacion',
        timestamp: conv.ultimoMensajeAt?.toDate() || conv.actualizadoAt?.toDate() || new Date(),
        urgent: conv.estado === 'pendiente',
        actionUrl: `${conversationsUrl}/${conv.id}`,
        metadata: { conversationId: conv.id, senderName }
      };
    });

  const assignedNotifications = assignedAppointments.map((appt) => ({
    id: `assigned-${appt.id}`,
    type: 'turno-asignado',
    title: 'Turno asignado',
    message: `Turno el ${appt.fechaHora?.toDate().toLocaleDateString('es-AR')}`,
    timestamp: appt.assignedAt?.toDate() || appt.updatedAt?.toDate() || appt.createdAt?.toDate() || new Date(),
    urgent: true,
    actionUrl: appointmentsUrl,
    metadata: { appointmentId: appt.id }
  }));

  const assignedSnackNotifications = assignedSnacks.map((snack) => ({
    id: `snack-assigned-${snack.id}`,
    type: 'snack-asignado',
    title: 'Semana de snacks asignada',
    message: snack.fechaInicio && snack.fechaFin
      ? `Semana del ${formatSnackDate(snack.fechaInicio)} al ${formatSnackDate(snack.fechaFin)}`
      : 'Tenes una nueva semana de snacks asignada',
    timestamp: getSnackAssignedDate(snack) || new Date(),
    urgent: true,
    actionUrl: snacksUrl,
    metadata: { assignmentId: snack.id }
  }));

  const getSnackAssignedDismissKey = (notification) => {
    const assignmentId = notification?.metadata?.assignmentId || notification?.id;
    const timestampMs = toDateSafe(notification?.timestamp)?.getTime() || 0;
    return `${assignmentId}:${timestampMs}`;
  };

  const assignedIds = new Set(assignedAppointments.map((appt) => appt.id));
  const assignedSnackIds = new Set(assignedSnacks.map((snack) => snack.id));

  const upcomingNotifications = upcomingAppointments
    .filter((appt) => !assignedIds.has(appt.id))
    .map((appt) => ({
      id: `appt-${appt.id}`,
      type: 'turno',
      title: 'Turno proximo',
      message: `Turno el ${appt.fechaHora?.toDate().toLocaleDateString('es-AR')}`,
      timestamp: appt.createdAt?.toDate() || new Date(),
      urgent: false,
      actionUrl: appointmentsUrl,
      metadata: { appointmentId: appt.id }
    }));

  const notifications = [
    ...conversationNotifications,
    ...relevantCommunications.map((comm) => ({
      id: `comm-${comm.id}`,
      type: 'comunicado',
      title: 'Comunicado nuevo',
      message: comm.title,
      timestamp: comm.createdAt?.toDate() || new Date(),
      urgent: comm.requiereLecturaObligatoria,
      actionUrl: communicationsUrl,
      metadata: { commId: comm.id }
    })),
    ...pendingDocuments.map((doc) => ({
      id: `doc-${doc.id}`,
      type: 'documento',
      title: 'Documento para leer',
      message: doc.documentId ? 'Documento de lectura obligatoria' : 'Confirma tu lectura',
      timestamp: doc.createdAt?.toDate() || new Date(),
      urgent: true,
      actionUrl: role === ROLES.FAMILY ? '/familia/documentos' : '/shared/documentos',
      metadata: { documentId: doc.documentId, receiptId: doc.id }
    })),
    ...assignedNotifications,
    ...assignedSnackNotifications.filter((notif) => (
      !dismissedSnackAssignedKeys.includes(getSnackAssignedDismissKey(notif))
    )),
    ...upcomingSnacks
      .filter((snack) => !assignedSnackIds.has(snack.id))
      .map((snack) => ({
        id: `snack-${snack.id}`,
        type: 'snack',
        title: 'Snack pendiente',
        message: `Semana del ${formatSnackDate(snack.fechaInicio)} - Confirma tu asignacion`,
        timestamp: toDateSafe(snack.createdAt) || new Date(),
        urgent: false,
        actionUrl: snacksUrl,
        metadata: { assignmentId: snack.id }
      })),
    ...upcomingNotifications
  ].sort((a, b) => {
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return b.timestamp - a.timestamp;
  });

  return {
    notifications,
    totalCount: notifications.length,
    dismissNotification: (notification) => {
      if (!user?.uid || notification?.type !== 'snack-asignado') {
        return;
      }

      const key = getSnackAssignedDismissKey(notification);
      setDismissedSnackAssignedKeys((prev) => {
        if (prev.includes(key)) return prev;
        const next = [...prev, key].slice(-80);
        try {
          localStorage.setItem(`pn:dismissedSnackAssigned:${user.uid}`, JSON.stringify(next));
        } catch {
          // no-op
        }
        return next;
      });
    },
    byType: {
      conversaciones: conversationNotifications.length,
      comunicados: relevantCommunications.length,
      documentos: pendingDocuments.length,
      snacks: upcomingSnacks.length,
      snacksAsignados: assignedSnacks.length,
      turnos: upcomingAppointments.length,
      asignados: assignedAppointments.length
    }
  };
}
