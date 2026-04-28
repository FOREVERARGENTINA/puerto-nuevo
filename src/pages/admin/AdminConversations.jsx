import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAdminConversations } from '../../hooks/useAdminConversations';
import { CONVERSATION_CATEGORIES, CONVERSATION_STATUS, ROUTES, ROLES } from '../../config/constants';
import { formatRelativeTime } from '../../utils/dateHelpers';
import Icon from '../../components/ui/Icon';
import {
  getAreaLabel,
  getConversationActivityDate,
  getCategoryLabel,
  getConversationStatusBadge,
  getConversationStatusLabel,
} from '../../utils/conversationHelpers';

const isClosedConversation = (conv) => conv?.estado === CONVERSATION_STATUS.CERRADA;
const hasUnreadForSchool = (conv) => !isClosedConversation(conv) && (conv?.mensajesSinLeerEscuela || 0) > 0;
const isPendingSchoolReply = (conv) => {
  if (isClosedConversation(conv)) return false;
  if (conv?.ultimoMensajeAutor === 'family') return true;
  if (hasUnreadForSchool(conv)) return true;
  return conv?.estado === CONVERSATION_STATUS.PENDIENTE;
};

export function AdminConversations() {
  const { role } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const {
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
  } = useAdminConversations({ role });

  const hasFilters =
    statusFilter !== 'todas' ||
    categoryFilter !== 'todas' ||
    initiatedFilter !== 'todas' ||
    searchTerm.trim() !== '';

  // Búsqueda por nombre/email en cliente (no indexable eficientemente en Firestore)
  const visible = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const term = searchTerm.toLowerCase();
    return conversations.filter((conv) => {
      const name = (conv.familiaDisplayName || conv.familiaEmail || '').toLowerCase();
      return name.includes(term);
    });
  }, [conversations, searchTerm]);

  const handleClearFilters = () => {
    clearFilters();
    setSearchTerm('');
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
                  <strong>Total:</strong> {counts.total}
                  <span style={{ color: 'var(--color-text-light)' }}>|</span>
                  <span style={{
                    color: counts.sinResponder > 0 ? 'var(--color-error)' : 'var(--color-text)',
                    fontWeight: counts.sinResponder > 0 ? 600 : 400
                  }}>
                    {counts.sinResponder} sin responder
                  </span>
                  <span style={{ color: 'var(--color-text-light)' }}>|</span>
                  <span style={{ color: 'var(--color-warning)' }}>{counts.noLeidas} no leidas</span>
                  <span style={{ color: 'var(--color-text-light)' }}>|</span>
                  <span style={{ color: 'var(--color-text-light)' }}>{counts.cerradas} cerradas</span>
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
                  <option value="sin_responder">Sin responder</option>
                  <option value="no_leidas">No leidas</option>
                  <option value="cerradas">Cerradas</option>
                </select>
              </div>

              <div className="user-filter">
                <label htmlFor="filterCategory">Categoria</label>
                <select
                  id="filterCategory"
                  className="form-input form-input--sm"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="todas">Todas</option>
                  {CONVERSATION_CATEGORIES.map((cat) => (
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
                <button type="button" className="btn btn--sm btn--outline" onClick={handleClearFilters}>
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
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
            Mostrando {visible.length}{hasMore ? '+' : ''} de {counts.total}
          </div>
          <div className="conversation-list">
            {visible.map((conv) => {
              const pendingSchoolReply = isPendingSchoolReply(conv);
              const isClosed = isClosedConversation(conv);
              const hasUnread = hasUnreadForSchool(conv);
              const unreadCountForSchool = conv.mensajesSinLeerEscuela || 0;

              return (
                <Link
                  key={conv.id}
                  to={`${ROUTES.ADMIN_CONVERSATIONS}/${conv.id}`}
                  className="card card--list conversation-item conversation-item--compact link-unstyled"
                >
                  <div className="conversation-item__main">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                      {(isClosed || (!isClosed && pendingSchoolReply)) && (
                        <span
                          className={getConversationStatusBadge(
                            isClosed ? CONVERSATION_STATUS.CERRADA : CONVERSATION_STATUS.PENDIENTE
                          )}
                          style={{ fontSize: 'var(--font-size-xs)', flexShrink: 0 }}
                        >
                          {getConversationStatusLabel(
                            isClosed ? CONVERSATION_STATUS.CERRADA : CONVERSATION_STATUS.PENDIENTE,
                            ROLES.SUPERADMIN
                          )}
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0, flex: '1 1 340px' }}>
                        {conv.esGrupal && (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-label="Conversación grupal" style={{ color: 'var(--color-text-light)', flexShrink: 0, marginTop: '1px' }}>
                            <circle cx="9" cy="7" r="3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                            <path d="M3 20v-1a6 6 0 0 1 12 0v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                            <circle cx="18" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                            <path d="M22 20v-.5A4.5 4.5 0 0 0 15 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        )}
                        <h3 style={{ margin: 0, minWidth: 0, fontSize: 'var(--font-size-md)', fontWeight: 600, display: 'flex', alignItems: 'baseline', gap: '5px', flex: 1 }}>
                          <span style={{ flexShrink: 0 }}>
                            {conv.familiaDisplayName || conv.familiaEmail || 'Familia'}
                          </span>
                          <span aria-hidden="true" style={{ color: 'var(--color-text-light)' }}>-</span>
                          <span
                            title={conv.asunto || 'Sin asunto'}
                            style={{
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {conv.asunto || 'Sin asunto'}
                          </span>
                        </h3>
                      </div>
                      {hasUnread && (
                        <span className="badge badge--error" style={{ fontSize: 'var(--font-size-xs)' }}>
                          {unreadCountForSchool} {unreadCountForSchool === 1 ? 'nuevo' : 'nuevos'}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                        {getConversationActivityDate(conv) ? formatRelativeTime(getConversationActivityDate(conv)) : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-xs)' }}>
                      <span>{getCategoryLabel(conv.categoria)}</span>
                      <span> | {getAreaLabel(conv.destinatarioEscuela)}</span>
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
              );
            })}
          </div>
          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: 'var(--spacing-md)' }}>
              <button
                onClick={loadMore}
                className="btn btn--outline"
                disabled={loadingMore}
              >
                {loadingMore ? 'Cargando...' : `Cargar más conversaciones`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
