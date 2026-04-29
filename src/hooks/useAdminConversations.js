import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { CONVERSATION_STATUS, ROLES } from '../config/constants';
import { emitConversationRead } from '../utils/conversationEvents';
import { conversationsService } from '../services/conversations.service';
import { fixMojibakeDeep } from '../utils/textEncoding';

const PAGE_SIZE = 50;

const resolveAreasForRole = (role) => {
  if (role === ROLES.COORDINACION) return ['coordinacion'];
  if (role === ROLES.FACTURACION) return ['administracion'];
  return null;
};

const buildBaseConstraints = (role) => {
  if (role === ROLES.SUPERADMIN) return [];
  const areas = resolveAreasForRole(role);
  if (areas?.length === 1) return [where('destinatarioEscuela', '==', areas[0])];
  if (areas?.length > 1) return [where('destinatarioEscuela', 'in', areas)];
  return null; // rol no soportado
};

const buildFilterConstraints = (statusFilter, categoryFilter, initiatedFilter) => {
  const constraints = [];

  if (statusFilter === 'sin_responder') {
    constraints.push(where('ultimoMensajeAutor', '==', 'family'));
    constraints.push(where('estado', 'in', [
      CONVERSATION_STATUS.PENDIENTE,
      CONVERSATION_STATUS.ACTIVA,
    ]));
  } else if (statusFilter === 'no_leidas') {
    constraints.push(where('mensajesSinLeerEscuela', '>', 0));
  } else if (statusFilter === 'cerradas') {
    constraints.push(where('estado', '==', CONVERSATION_STATUS.CERRADA));
  }

  if (categoryFilter !== 'todas') {
    constraints.push(where('categoria', '==', categoryFilter));
  }

  if (initiatedFilter !== 'todas') {
    constraints.push(where('iniciadoPor', '==', initiatedFilter));
  }

  return constraints;
};

const docToConv = (d) => ({ id: d.id, ...fixMojibakeDeep(d.data()) });

export function useAdminConversations({ role, searchActive = false }) {
  const [conversations, setConversations] = useState([]);
  const [counts, setCounts] = useState({ total: 0, sinResponder: 0, noLeidas: 0, cerradas: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('todas');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [initiatedFilter, setInitiatedFilter] = useState('todas');

  const lastDocRef = useRef(null);
  const unsubRef = useRef(null);
  const hasLoadedRef = useRef(false);
  const collectionRef = collection(db, 'conversations');

  // Fetch counts via getCountFromServer (barato, no descarga docs)
  const refreshCounts = useCallback(async (baseConstraints) => {
    const run = async (extra) => {
      const q = query(collectionRef, ...baseConstraints, ...extra);
      const snap = await getCountFromServer(q);
      return snap.data().count;
    };

    const [total, sinResponder, noLeidas, cerradas] = await Promise.all([
      run([]),
      run([
        where('ultimoMensajeAutor', '==', 'family'),
        where('estado', 'in', [
          CONVERSATION_STATUS.PENDIENTE,
          CONVERSATION_STATUS.ACTIVA,
        ]),
      ]),
      run([where('mensajesSinLeerEscuela', '>', 0)]),
      run([where('estado', '==', CONVERSATION_STATUS.CERRADA)]),
    ]);

    setCounts({ total, sinResponder, noLeidas, cerradas });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Suscribir a la primera página con onSnapshot
  const subscribe = useCallback((baseConstraints, filterConstraints) => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    lastDocRef.current = null;
    setError(null);
    setHasMore(false);
    if (!hasLoadedRef.current) {
      setConversations([]);
      setLoading(true);
    }

    const orderConstraint = orderBy('ultimoMensajeAt', 'desc');
    const q = searchActive
      ? query(
          collectionRef,
          ...baseConstraints,
          ...filterConstraints,
          orderConstraint
        )
      : query(
          collectionRef,
          ...baseConstraints,
          ...filterConstraints,
          orderConstraint,
          limit(PAGE_SIZE)
        );

    unsubRef.current = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map(docToConv);
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? null;
        setConversations(docs);
        setHasMore(!searchActive && docs.length === PAGE_SIZE);
        hasLoadedRef.current = true;
        setLoading(false);
      },
      (err) => {
        console.error('useAdminConversations onSnapshot error:', err);
        hasLoadedRef.current = true;
        setError(err.message);
        setLoading(false);
      }
    );
  }, [searchActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-suscribir cuando cambian rol o filtros
  useEffect(() => {
    if (!role) return;

    const base = buildBaseConstraints(role);
    if (base === null) return;

    const filters = buildFilterConstraints(statusFilter, categoryFilter, initiatedFilter);

    subscribe(base, filters);
    refreshCounts(base);

    return () => {
      if (unsubRef.current) unsubRef.current();
    };
  }, [role, statusFilter, categoryFilter, initiatedFilter, searchActive, subscribe, refreshCounts]);

  const loadMore = useCallback(async () => {
    if (searchActive || !hasMore || loadingMore || !lastDocRef.current || !role) return;

    const base = buildBaseConstraints(role);
    if (base === null) return;
    const filters = buildFilterConstraints(statusFilter, categoryFilter, initiatedFilter);

    setLoadingMore(true);
    try {
      const q = query(
        collectionRef,
        ...base,
        ...filters,
        orderBy('ultimoMensajeAt', 'desc'),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(q);
      const newDocs = snapshot.docs.map(docToConv);
      lastDocRef.current = snapshot.docs[snapshot.docs.length - 1] ?? lastDocRef.current;
      setConversations((prev) => [...prev, ...newDocs]);
      setHasMore(newDocs.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [searchActive, hasMore, loadingMore, role, statusFilter, categoryFilter, initiatedFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = useCallback(async (conversationId, esGrupal = false) => {
    setConversations((prev) =>
      prev.map((c) => c.id !== conversationId ? c : { ...c, mensajesSinLeerEscuela: 0 })
    );
    emitConversationRead(conversationId, 'school', null);
    return conversationsService.markConversationRead(conversationId, 'school', { esGrupal });
  }, []);

  const clearFilters = useCallback(() => {
    setStatusFilter('todas');
    setCategoryFilter('todas');
    setInitiatedFilter('todas');
  }, []);

  return {
    conversations,
    counts,
    loading,
    loadingMore,
    hasMore,
    error,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    initiatedFilter,
    setInitiatedFilter,
    clearFilters,
    loadMore,
    markAsRead,
  };
}
