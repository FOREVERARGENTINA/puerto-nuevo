import { useState, useEffect } from 'react';
import { collection, collectionGroup, query, where, orderBy, onSnapshot, Timestamp, limit, doc, updateDoc } from 'firebase/firestore';
import { useLocation } from 'react-router-dom';
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

const normalizeDismissedIds = (entries) => {
  if (!Array.isArray(entries)) return [];
  const ids = entries
    .map((entry) => {
      if (typeof entry !== 'string') return '';
      const trimmed = entry.trim();
      if (!trimmed) return '';
      // Backward compatibility: previous format used "id:timestamp".
      return /:\d+$/.test(trimmed) ? trimmed.replace(/:\d+$/, '') : trimmed;
    })
    .filter(Boolean);
  return Array.from(new Set(ids));
};

const readDismissedIds = (storageKey) => {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    const normalized = normalizeDismissedIds(parsed);
    localStorage.setItem(storageKey, JSON.stringify(normalized));
    return normalized;
  } catch {
    return [];
  }
};

const mergeDismissedIds = (...entries) => {
  const merged = entries.flatMap((entry) => normalizeDismissedIds(entry));
  return Array.from(new Set(merged)).slice(-120);
};

const writeDismissedIds = (storageKey, ids) => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(normalizeDismissedIds(ids)));
  } catch {
    // no-op
  }
};

export function useNotifications() {
  const { user, role } = useAuth();
  const location = useLocation();
  const { unreadCommunications } = useCommunications();
  const { conversations } = useConversations({ user, role });
  const [dismissedSnackAssignedKeys, setDismissedSnackAssignedKeys] = useState([]);
  const [dismissedAppointmentAssignedKeys, setDismissedAppointmentAssignedKeys] = useState([]);
  const [dismissedHydrated, setDismissedHydrated] = useState(false);
  const [upcomingSnacks, setUpcomingSnacks] = useState([]);
  const [assignedSnacks, setAssignedSnacks] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [assignedAppointments, setAssignedAppointments] = useState([]);
  const [pendingDocuments, setPendingDocuments] = useState([]);
  const [recentEventNotifications, setRecentEventNotifications] = useState([]);
  const [recentResourceNotifications, setRecentResourceNotifications] = useState([]);

  useEffect(() => {
    if (!user?.uid) {
      setDismissedSnackAssignedKeys([]);
      setDismissedAppointmentAssignedKeys([]);
      setDismissedHydrated(true);
      return;
    }

    const snackKey = `pn:dismissedSnackAssigned:${user.uid}`;
    const appointmentKey = `pn:dismissedAppointmentAssigned:${user.uid}`;

    const localSnackIds = readDismissedIds(snackKey);
    const localAppointmentIds = readDismissedIds(appointmentKey);

    setDismissedSnackAssignedKeys(localSnackIds);
    setDismissedAppointmentAssignedKeys(localAppointmentIds);
    setDismissedHydrated(true);

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        const currentLocalSnackIds = readDismissedIds(snackKey);
        const currentLocalAppointmentIds = readDismissedIds(appointmentKey);
        const remoteData = snapshot.exists() ? snapshot.data() : {};
        const mergedSnackIds = mergeDismissedIds(
          currentLocalSnackIds,
          remoteData.dismissedSnackAssignedKeys
        );
        const mergedAppointmentIds = mergeDismissedIds(
          currentLocalAppointmentIds,
          remoteData.dismissedAppointmentAssignedKeys
        );

        setDismissedSnackAssignedKeys(mergedSnackIds);
        setDismissedAppointmentAssignedKeys(mergedAppointmentIds);
        writeDismissedIds(snackKey, mergedSnackIds);
        writeDismissedIds(appointmentKey, mergedAppointmentIds);
        setDismissedHydrated(true);
      },
      () => {
        setDismissedHydrated(true);
      }
    );

    return unsubscribe;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;

    const snackKey = `pn:dismissedSnackAssigned:${user.uid}`;
    const appointmentKey = `pn:dismissedAppointmentAssigned:${user.uid}`;

    const handleStorage = (event) => {
      if (!event.key) return;
      if (event.key === snackKey) {
        setDismissedSnackAssignedKeys(readDismissedIds(snackKey));
        return;
      }
      if (event.key === appointmentKey) {
        setDismissedAppointmentAssignedKeys(readDismissedIds(appointmentKey));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user?.uid]);

  useEffect(() => {
    if (!user) {
      setRecentEventNotifications([]);
      setRecentResourceNotifications([]);
      return;
    }

    if (role !== ROLES.FAMILY) {
      setRecentEventNotifications([]);
      setRecentResourceNotifications([]);
      return;
    }

    const now = new Date();
    const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const assignedSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const eventsSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const resourcesSince = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

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

    let familyAmbientes = [];
    let recentEvents = [];
    let recentResourcePosts = [];

    const recomputeFamilyScopedNotifications = () => {
      const visibleEvents = recentEvents.filter((evt) => {
        if (evt.communicationId) return false;
        if (evt.scope !== 'taller') return true;
        if (!familyAmbientes.length) return false;
        if (evt.ambiente && familyAmbientes.includes(evt.ambiente)) return true;
        return false;
      });
      setRecentEventNotifications(visibleEvents);

      const visibleResources = recentResourcePosts.filter((post) => {
        if (!familyAmbientes.length) return false;
        if (!post?.ambiente) return false;
        return familyAmbientes.includes(post.ambiente);
      });
      setRecentResourceNotifications(visibleResources);
    };

    const familyChildrenQuery = query(
      collection(db, 'children'),
      where('responsables', 'array-contains', user.uid),
      limit(80)
    );

    const unsubFamilyChildren = onSnapshot(familyChildrenQuery, (snapshot) => {
      familyAmbientes = Array.from(new Set(
        snapshot.docs
          .map((doc) => doc.data()?.ambiente)
          .filter(Boolean)
      ));
      recomputeFamilyScopedNotifications();
    });

    const eventsQuery = query(
      collection(db, 'events'),
      where('createdAt', '>=', Timestamp.fromDate(eventsSince)),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      recentEvents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      recomputeFamilyScopedNotifications();
    });

    const resourcesQuery = query(
      collectionGroup(db, 'resourcePosts'),
      where('createdAt', '>=', Timestamp.fromDate(resourcesSince)),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsubResources = onSnapshot(resourcesQuery, (snapshot) => {
      recentResourcePosts = snapshot.docs.map((resourceDoc) => ({
        id: resourceDoc.id,
        ...resourceDoc.data()
      }));
      recomputeFamilyScopedNotifications();
    });

    return () => {
      unsubSnacksLegacy();
      unsubSnacksArray();
      unsubAppointments();
      unsubAppointmentsArray();
      unsubAssigned();
      unsubAssignedArray();
      unsubDocuments();
      unsubFamilyChildren();
      unsubEvents();
      unsubResources();
    };
  }, [user, role]);

  const relevantCommunications = user
    ? unreadCommunications.filter((comm) => {
        if (role === ROLES.TALLERISTA) return false;

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
      ? '/portal/familia/comunicados'
      : role === ROLES.DOCENTE
        ? '/portal/docente'
        : role === ROLES.TALLERISTA
          ? '/portal/tallerista'
        : '/portal/admin';

  const snacksUrl = '/portal/familia/snacks';
  const appointmentsUrl = '/portal/familia/turnos';
  const eventsUrl = '/portal/familia/eventos';
  const conversationsUrl = role === ROLES.FAMILY
    ? '/portal/familia/conversaciones'
    : '/portal/admin/conversaciones';

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

  const assignedNotifications = assignedAppointments.map((appt) => {
    const assignedDate = toDateSafe(appt.assignedAt)
      || toDateSafe(appt.updatedAt)
      || toDateSafe(appt.createdAt);

    return {
      id: `assigned-${appt.id}`,
      type: 'turno-asignado',
      title: 'Turno asignado',
      message: `Turno el ${appt.fechaHora?.toDate().toLocaleDateString('es-AR')}`,
      timestamp: assignedDate || new Date(),
      urgent: true,
      actionUrl: appointmentsUrl,
      metadata: {
        appointmentId: appt.id,
        assignedAtMs: assignedDate?.getTime() || 0
      }
    };
  });

  const assignedSnackNotifications = assignedSnacks.map((snack) => {
    const assignedDate = getSnackAssignedDate(snack);

    return {
      id: `snack-assigned-${snack.id}`,
      type: 'snack-asignado',
      title: 'Semana de snacks asignada',
      message: snack.fechaInicio && snack.fechaFin
        ? `Semana del ${formatSnackDate(snack.fechaInicio)} al ${formatSnackDate(snack.fechaFin)}`
        : 'Tenes una nueva semana de snacks asignada',
      timestamp: assignedDate || new Date(),
      urgent: true,
      actionUrl: snacksUrl,
      metadata: {
        assignmentId: snack.id,
        assignedAtMs: assignedDate?.getTime() || 0
      }
    };
  });

  const getSnackAssignedDismissKey = (notification) => {
    if (notification?.metadata?.assignmentId) {
      return String(notification.metadata.assignmentId);
    }

    const fallbackId = typeof notification?.id === 'string' ? notification.id : '';
    if (!fallbackId) return '';
    return fallbackId.startsWith('snack-assigned-')
      ? fallbackId.replace('snack-assigned-', '')
      : fallbackId;
  };

  const getAppointmentAssignedDismissKey = (notification) => {
    if (notification?.metadata?.appointmentId) {
      return String(notification.metadata.appointmentId);
    }

    const fallbackId = typeof notification?.id === 'string' ? notification.id : '';
    if (!fallbackId) return '';
    return fallbackId.startsWith('assigned-')
      ? fallbackId.replace('assigned-', '')
      : fallbackId;
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

  const recentEventItems = recentEventNotifications.map((event) => ({
    id: `event-${event.id}`,
    type: 'evento',
    title: 'Nuevo evento',
    message: event.titulo || 'Hay un nuevo evento en el calendario',
    timestamp: toDateSafe(event.createdAt)
      || toDateSafe(event.updatedAt)
      || toDateSafe(event.fecha)
      || new Date(),
    urgent: false,
    actionUrl: eventsUrl,
    metadata: { eventId: event.id }
  }));

  const recentResourceItems = recentResourceNotifications.map((post) => {
    const tallerId = typeof post?.tallerId === 'string' ? post.tallerId : '';
    const actionUrl = tallerId
      ? `/portal/familia/talleres?tallerId=${encodeURIComponent(tallerId)}&tab=recursos`
      : '/portal/familia/talleres?tab=recursos';
    const itemCount = Number.isFinite(post?.itemCount) ? post.itemCount : 0;
    const postTitle = post?.title || 'Nuevo recurso disponible';

    return {
      id: `resource-${tallerId || 'sin-taller'}-${post.id}`,
      type: 'taller-recurso',
      title: 'Nuevo recurso del taller',
      message: itemCount > 1
        ? `${postTitle} (${itemCount} recursos)`
        : postTitle,
      timestamp: toDateSafe(post?.createdAt)
        || toDateSafe(post?.updatedAt)
        || new Date(),
      urgent: false,
      actionUrl,
      metadata: {
        postId: post.id,
        tallerId
      }
    };
  });

  const baseNotifications = [
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
    ...recentEventItems,
    ...recentResourceItems,
    ...pendingDocuments.map((doc) => ({
      id: `doc-${doc.id}`,
      type: 'documento',
      title: 'Documento para leer',
      message: doc.documentId ? 'Documento de lectura obligatoria' : 'Confirma tu lectura',
      timestamp: doc.createdAt?.toDate() || new Date(),
      urgent: true,
      actionUrl: role === ROLES.FAMILY
        ? '/portal/familia/documentos'
        : role === ROLES.DOCENTE
          ? '/portal/docente/documentos'
          : role === ROLES.TALLERISTA
            ? '/portal/tallerista/documentos'
            : role === ROLES.ASPIRANTE
              ? '/portal/aspirante/documentos'
              : '/portal/admin/documentos',
      metadata: { documentId: doc.documentId, receiptId: doc.id }
    })),
    ...(
      dismissedHydrated
        ? assignedNotifications.filter((notif) => (
            !dismissedAppointmentAssignedKeys.includes(getAppointmentAssignedDismissKey(notif))
          ))
        : []
    ),
    ...(
      dismissedHydrated
        ? assignedSnackNotifications.filter((notif) => (
            !dismissedSnackAssignedKeys.includes(getSnackAssignedDismissKey(notif))
          ))
        : []
    ),
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
  ];

  const dedupedNotifications = Array.from(
    baseNotifications.reduce((map, notification) => {
      if (!notification?.id) return map;
      const previous = map.get(notification.id);
      if (!previous) {
        map.set(notification.id, notification);
        return map;
      }

      const prevTime = previous.timestamp?.getTime?.() || 0;
      const nextTime = notification.timestamp?.getTime?.() || 0;
      if (nextTime >= prevTime) {
        map.set(notification.id, notification);
      }
      return map;
    }, new Map()).values()
  );

  const notifications = dedupedNotifications.sort((a, b) => {
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return b.timestamp - a.timestamp;
  });

  const persistDismissedIds = async (updates) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), updates);
    } catch {
      // Si el perfil no existe o no hay permisos de update, mantenemos fallback local.
    }
  };

  // Si la familia entra a Turnos/Snacks por menú (sin click en campana),
  // marcamos como leídas las notificaciones "asignado" correspondientes.
  useEffect(() => {
    if (!user?.uid || role !== ROLES.FAMILY) return;
    if (!location.pathname.startsWith('/portal/familia/snacks')) return;

    const keysToDismiss = assignedSnackNotifications
      .map(getSnackAssignedDismissKey)
      .filter(Boolean);

    if (keysToDismiss.length === 0) return;

    const snackStorageKey = `pn:dismissedSnackAssigned:${user.uid}`;
    setDismissedSnackAssignedKeys((current) => {
      const hasNew = keysToDismiss.some((key) => !current.includes(key));
      if (!hasNew) return current;
      const next = mergeDismissedIds(current, keysToDismiss);
      writeDismissedIds(snackStorageKey, next);
      void persistDismissedIds({ dismissedSnackAssignedKeys: next });
      return next;
    });
  }, [location.pathname, role, user?.uid, assignedSnackNotifications]);

  useEffect(() => {
    if (!user?.uid || role !== ROLES.FAMILY) return;
    if (!location.pathname.startsWith('/portal/familia/turnos')) return;

    const keysToDismiss = assignedNotifications
      .map(getAppointmentAssignedDismissKey)
      .filter(Boolean);

    if (keysToDismiss.length === 0) return;

    const appointmentStorageKey = `pn:dismissedAppointmentAssigned:${user.uid}`;
    setDismissedAppointmentAssignedKeys((current) => {
      const hasNew = keysToDismiss.some((key) => !current.includes(key));
      if (!hasNew) return current;
      const next = mergeDismissedIds(current, keysToDismiss);
      writeDismissedIds(appointmentStorageKey, next);
      void persistDismissedIds({ dismissedAppointmentAssignedKeys: next });
      return next;
    });
  }, [location.pathname, role, user?.uid, assignedNotifications]);

  return {
    notifications,
    totalCount: notifications.length,
    dismissNotification: (notification) => {
      if (!user?.uid || !notification?.type) {
        return;
      }

      if (notification.type === 'snack-asignado') {
        const key = getSnackAssignedDismissKey(notification);
        if (!key) return;
        const snackStorageKey = `pn:dismissedSnackAssigned:${user.uid}`;
        setDismissedSnackAssignedKeys((current) => {
          if (current.includes(key)) return current;
          const next = mergeDismissedIds(current, [key]);
          writeDismissedIds(snackStorageKey, next);
          void persistDismissedIds({ dismissedSnackAssignedKeys: next });
          return next;
        });
        return;
      }

      if (notification.type === 'turno-asignado') {
        const key = getAppointmentAssignedDismissKey(notification);
        if (!key) return;
        const appointmentStorageKey = `pn:dismissedAppointmentAssigned:${user.uid}`;
        setDismissedAppointmentAssignedKeys((current) => {
          if (current.includes(key)) return current;
          const next = mergeDismissedIds(current, [key]);
          writeDismissedIds(appointmentStorageKey, next);
          void persistDismissedIds({ dismissedAppointmentAssignedKeys: next });
          return next;
        });
        return;
      }
    },
    byType: {
      conversaciones: conversationNotifications.length,
      comunicados: relevantCommunications.length,
      eventos: recentEventItems.length,
      recursos: recentResourceItems.length,
      documentos: pendingDocuments.length,
      snacks: upcomingSnacks.length,
      snacksAsignados: assignedSnacks.length,
      turnos: upcomingAppointments.length,
      asignados: assignedAppointments.length
    }
  };
}
