import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useConversations } from '../../hooks/useConversations';
import { CONVERSATION_CATEGORIES, CONVERSATION_STATUS, ROUTES, ROLES } from '../../config/constants';
import { formatRelativeTime } from '../../utils/dateHelpers';
import Icon from '../../components/ui/Icon';
import {
  getAreaLabel,
  getCategoryLabel,
  getConversationStatusBadge,
  getConversationStatusLabel
} from '../../utils/conversationHelpers';

const ITEMS_PER_PAGE = 20;

export function AdminConversations() {
  const { user, role } = useAuth();
  const { conversations, loading, error, unreadCount } = useConversations({ user, role });
  const [statusFilter, setStatusFilter] = useState('todas');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [initiatedFilter, setInitiatedFilter] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const hasFilters = statusFilter !== 'todas' || categoryFilter !== 'todas' || initiatedFilter !== 'todas' || searchTerm.trim() !== '';

  const clearFilters = () => {
    setStatusFilter('todas');
    setCategoryFilter('todas');
    setInitiatedFilter('todas');
    setSearchTerm('');
  };

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [statusFilter, categoryFilter, initiatedFilter, searchTerm]);

  const counts = useMemo(() => {
    return {
      pendientes: conversations.filter(c => c.estado === CONVERSATION_STATUS.PENDIENTE).length,
      activas: conversations.filter(c => [CONVERSATION_STATUS.ACTIVA, CONVERSATION_STATUS.RESPONDIDA].includes(c.estado)).length,
      cerradas: conversations.filter(c => c.estado === CONVERSATION_STATUS.CERRADA).length
    };
  }, [conversations]);

  const filtered = useMemo(() => {
    const result = conversations.filter(conv => {
      // Logic mod: Activa includes Respondida for filtering
      if (statusFilter !== 'todas') {
        if (statusFilter === CONVERSATION_STATUS.ACTIVA) {
          if (![CONVERSATION_STATUS.ACTIVA, CONVERSATION_STATUS.RESPONDIDA].includes(conv.estado)) return false;
        } else {
          if (conv.estado !== statusFilter) return false;
        }
      }
      
      if (categoryFilter !== 'todas' && conv.categoria !== categoryFilter) return false;
      if (initiatedFilter !== 'todas' && conv.iniciadoPor !== initiatedFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const name = (conv.familiaDisplayName || conv.familiaEmail || '').toLowerCase();
        if (!name.includes(term)) return false;
      }
      return true;
    });
    return result;
  }, [conversations, statusFilter, categoryFilter, initiatedFilter, searchTerm]);

  const visible = useMemo(() => {
    return filtered.slice(0, visibleCount);
  }, [filtered, visibleCount]);

  const hasMore = filtered.length > visibleCount;

  const loadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
        <div className="spinner spinner--lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <div className="alert alert--error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Conversaciones</h1>
          <p className="dashboard-subtitle">Mensajes privados y consultas individuales</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <span className="badge badge--warning">{unreadCount} sin leer</span>
          )}
          <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline btn--back">
            <Icon name="chevron-left" size={16} />
            Volver
          </Link>
          <Link to={ROUTES.ADMIN_CONVERSATION_NEW} className="btn btn--primary">
            + Nuevo Mensaje
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          <div className="user-toolbar">
            <div className="user-toolbar__left">
              <div className="user-toolbar__summary">
                <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', flexWrap: 'wrap' }}>
                  <strong>Total:</strong> {conversations.length}
                  <span style={{ color: 'var(--color-text-light)' }}>·</span>
                  <span style={{ 
                    color: counts.pendientes > 0 ? 'var(--color-error)' : 'var(--color-text)', 
                    fontWeight: counts.pendientes > 0 ? 600 : 400 
                  }}>
                    {counts.pendientes} sin responder
                  </span>
                  <span style={{ color: 'var(--color-text-light)' }}>·</span>
                  <span style={{ color: 'var(--color-success)' }}>{counts.activas} en curso</span>
                </p>
                <input
                  type="text"
                  className="form-input form-input--sm"
                  placeholder="Buscar por nombre o email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  aria-label="Buscar conversaciones"
                  style={{ width: 240 }}
                />
              </div>

              <div className="user-filter">
                <label htmlFor="filterStatus">Estado</label>
                <select
                  id="filterStatus"
                  className="form-input form-input--sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="todas">Todas</option>
                  <option value={CONVERSATION_STATUS.PENDIENTE}>Sin responder</option>
                  <option value={CONVERSATION_STATUS.ACTIVA}>En curso</option>
                  <option value={CONVERSATION_STATUS.CERRADA}>Cerrada</option>
                </select>
              </div>

              <div className="user-filter">
                <label htmlFor="filterCategory">Categoría</label>
                <select
                  id="filterCategory"
                  className="form-input form-input--sm"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="todas">Todas</option>
                  {CONVERSATION_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="user-filter">
                <label htmlFor="filterInitiated">Iniciada por</label>
                <select
                  id="filterInitiated"
                  className="form-input form-input--sm"
                  value={initiatedFilter}
                  onChange={(e) => setInitiatedFilter(e.target.value)}
                >
                  <option value="todas">Todas</option>
                  <option value="familia">Familia</option>
                  <option value="escuela">Escuela</option>
                </select>
              </div>

              {hasFilters && (
                <button type="button" className="btn btn--sm btn--outline" onClick={clearFilters}>
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="card__body">
            <div className="empty-state">
              <p>No hay conversaciones que coincidan con los filtros.</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ 
            marginBottom: 'var(--spacing-md)', 
            fontSize: 'var(--font-size-sm)', 
            color: 'var(--color-text-light)',
            paddingLeft: 'var(--spacing-sm)'
          }}>
            Mostrando {visible.length} de {filtered.length}
          </div>
          <div className="conversation-list">
            {visible.map(conv => (
              <Link
                key={conv.id}
                to={`${ROUTES.ADMIN_CONVERSATIONS}/${conv.id}`}
                className="card card--list conversation-item conversation-item--compact link-unstyled"
              >
                <div className="conversation-item__main">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 600 }}>
                      {conv.familiaDisplayName || conv.familiaEmail || 'Familia'}
                    </h3>
                    {[CONVERSATION_STATUS.PENDIENTE, CONVERSATION_STATUS.CERRADA].includes(conv.estado) && (
                      <span className={getConversationStatusBadge(conv.estado)} style={{ fontSize: 'var(--font-size-xs)' }}>
                        {getConversationStatusLabel(conv.estado, ROLES.SUPERADMIN)}
                      </span>
                    )}
                    {conv.mensajesSinLeerEscuela > 0 && (
                      <span className="badge badge--error" style={{ fontSize: 'var(--font-size-xs)' }}>{conv.mensajesSinLeerEscuela} nuevos</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                      {conv.ultimoMensajeAt ? formatRelativeTime(conv.ultimoMensajeAt) : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-xs)' }}>
                    <span>{conv.asunto || 'Sin asunto'}</span>
                    <span> • {getCategoryLabel(conv.categoria)}</span>
                    <span> • {getAreaLabel(conv.destinatarioEscuela)}</span>
                  </div>
                  <p style={{ 
                    margin: 0, 
                    fontSize: 'var(--font-size-sm)', 
                    color: 'var(--color-text-light)', 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {conv.ultimoMensajeTexto || 'Sin mensajes'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 'var(--spacing-md)' }}>
              <button onClick={loadMore} className="btn btn--outline">
                Cargar más ({filtered.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
