import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useConversations } from '../../hooks/useConversations';
import { CONVERSATION_CATEGORIES, CONVERSATION_STATUS, ROUTES, ROLES } from '../../config/constants';
import { formatRelativeTime } from '../../utils/dateHelpers';
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

  const counts = useMemo(() => {
    return {
      pendientes: conversations.filter(c => c.estado === CONVERSATION_STATUS.PENDIENTE).length,
      activas: conversations.filter(c => c.estado === CONVERSATION_STATUS.ACTIVA).length,
      cerradas: conversations.filter(c => c.estado === CONVERSATION_STATUS.CERRADA).length
    };
  }, [conversations]);

  const filtered = useMemo(() => {
    const result = conversations.filter(conv => {
      if (statusFilter !== 'todas' && conv.estado !== statusFilter) return false;
      if (categoryFilter !== 'todas' && conv.categoria !== categoryFilter) return false;
      if (initiatedFilter !== 'todas' && conv.iniciadoPor !== initiatedFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const name = (conv.familiaDisplayName || conv.familiaEmail || '').toLowerCase();
        if (!name.includes(term)) return false;
      }
      return true;
    });
    // Reset visible count when filters change
    setVisibleCount(ITEMS_PER_PAGE);
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
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          {unreadCount > 0 && (
            <span className="badge badge--warning">{unreadCount} sin leer</span>
          )}
          <Link to={ROUTES.ADMIN_CONVERSATION_NEW} className="btn btn--primary">
            + Nuevo Mensaje a Familia/s
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        <span className="badge badge--error">{counts.pendientes} sin responder</span>
        <span className="badge badge--success">{counts.activas} activas</span>
        <span className="badge badge--info">{counts.cerradas} cerradas</span>
      </div>

      <div className="card mb-md" style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 'var(--spacing-sm)',
          alignItems: 'end'
        }}>
          <div style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>Estado</label>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todas">Todas</option>
              <option value={CONVERSATION_STATUS.PENDIENTE}>Sin responder</option>
              <option value={CONVERSATION_STATUS.RESPONDIDA}>Respondida</option>
              <option value={CONVERSATION_STATUS.ACTIVA}>Activa</option>
              <option value={CONVERSATION_STATUS.CERRADA}>Cerrada</option>
            </select>
          </div>
          <div style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>Categoría</label>
            <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="todas">Todas</option>
              {CONVERSATION_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>Iniciada por</label>
            <select className="form-select" value={initiatedFilter} onChange={(e) => setInitiatedFilter(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="familia">Familia</option>
              <option value="escuela">Escuela</option>
            </select>
          </div>
          <div style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ marginBottom: '4px', fontSize: 'var(--font-size-sm)' }}>Buscar</label>
            <input
              className="form-input"
              placeholder="Nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state--card">
          <p>No hay conversaciones que coincidan con los filtros.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
            Mostrando {visible.length} de {filtered.length} conversaciones
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
                    <span className={getConversationStatusBadge(conv.estado)} style={{ fontSize: 'var(--font-size-xs)' }}>
                      {getConversationStatusLabel(conv.estado, ROLES.SUPERADMIN)}
                    </span>
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
