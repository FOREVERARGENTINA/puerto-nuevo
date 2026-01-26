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

export function AdminConversations() {
  const { user, role } = useAuth();
  const { conversations, loading, error, unreadCount } = useConversations({ user, role });
  const [statusFilter, setStatusFilter] = useState('todas');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [initiatedFilter, setInitiatedFilter] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');

  const counts = useMemo(() => {
    return {
      pendientes: conversations.filter(c => c.estado === CONVERSATION_STATUS.PENDIENTE).length,
      activas: conversations.filter(c => c.estado === CONVERSATION_STATUS.ACTIVA).length,
      cerradas: conversations.filter(c => c.estado === CONVERSATION_STATUS.CERRADA).length
    };
  }, [conversations]);

  const filtered = useMemo(() => {
    return conversations.filter(conv => {
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
  }, [conversations, statusFilter, categoryFilter, initiatedFilter, searchTerm]);

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
      <div className="flex-between mb-md">
        <div>
          <h1>Conversaciones con Familias</h1>
          <p className="text-muted">Mensajes privados y consultas individuales</p>
        </div>
        <div className="flex gap-sm">
          {unreadCount > 0 && (
            <span className="badge badge--warning">{unreadCount} sin leer</span>
          )}
          <Link to={ROUTES.ADMIN_CONVERSATION_NEW} className="btn btn--primary">
            + Nuevo Mensaje a Familia/s
          </Link>
        </div>
      </div>

      <div className="flex gap-sm mb-md">
        <span className="badge badge--error">{counts.pendientes} sin responder</span>
        <span className="badge badge--success">{counts.activas} activas</span>
        <span className="badge badge--info">{counts.cerradas} cerradas</span>
      </div>

      <div className="card filters-card mb-md">
        <div className="filters-grid">
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="todas">Todas</option>
              <option value={CONVERSATION_STATUS.PENDIENTE}>Sin responder</option>
              <option value={CONVERSATION_STATUS.RESPONDIDA}>Respondida</option>
              <option value={CONVERSATION_STATUS.ACTIVA}>Activa</option>
              <option value={CONVERSATION_STATUS.CERRADA}>Cerrada</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <select className="form-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="todas">Todas</option>
              {CONVERSATION_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Iniciada por</label>
            <select className="form-select" value={initiatedFilter} onChange={(e) => setInitiatedFilter(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="familia">Familia</option>
              <option value="escuela">Escuela</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Buscar familia</label>
            <input
              className="form-input"
              placeholder="Nombre o email"
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
        <div className="conversation-list">
          {filtered.map(conv => (
            <Link
              key={conv.id}
              to={`${ROUTES.ADMIN_CONVERSATIONS}/${conv.id}`}
              className="card card--list conversation-item link-unstyled"
            >
              <div className="conversation-item__main">
                <div className="conversation-item__header">
                  <span className={getConversationStatusBadge(conv.estado)}>
                    {getConversationStatusLabel(conv.estado, ROLES.SUPERADMIN)}
                  </span>
                  {conv.mensajesSinLeerEscuela > 0 && (
                    <span className="badge badge--error">{conv.mensajesSinLeerEscuela} nuevos</span>
                  )}
                </div>
                <h3 className="conversation-item__title">{conv.familiaDisplayName || conv.familiaEmail || 'Familia'}</h3>
                <div className="conversation-item__meta">
                  <span>{conv.asunto || 'Sin asunto'}</span>
                  <span>• {getCategoryLabel(conv.categoria)}</span>
                  <span>• {getAreaLabel(conv.destinatarioEscuela)}</span>
                </div>
                <p className="conversation-item__preview">
                  {conv.ultimoMensajeTexto || 'Sin mensajes'}
                </p>
              </div>
              <div className="conversation-item__time">
                {conv.ultimoMensajeAt ? formatRelativeTime(conv.ultimoMensajeAt) : ''}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
