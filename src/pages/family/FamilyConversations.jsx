import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useConversations } from '../../hooks/useConversations';
import { ROUTES, CONVERSATION_STATUS, ROLES } from '../../config/constants';
import { formatRelativeTime } from '../../utils/dateHelpers';
import {
  getAreaLabel,
  getCategoryLabel,
  getConversationStatusBadge,
  getConversationStatusLabel
} from '../../utils/conversationHelpers';

export function FamilyConversations() {
  const { user, role } = useAuth();
  const { conversations, loading, error, unreadCount } = useConversations({ user, role });
  const [tab, setTab] = useState('activas');

  const filtered = useMemo(() => {
    if (tab === 'activas') {
      return conversations.filter(c => c.estado !== CONVERSATION_STATUS.CERRADA);
    }
    if (tab === 'cerradas') {
      return conversations.filter(c => c.estado === CONVERSATION_STATUS.CERRADA);
    }
    return conversations;
  }, [conversations, tab]);

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
          <h1>Mis Conversaciones</h1>
          <p className="text-muted">Mensajes privados con la escuela</p>
        </div>
        <div className="flex gap-sm">
          {unreadCount > 0 && (
            <span className="badge badge--warning">{unreadCount} sin leer</span>
          )}
          <Link to={ROUTES.FAMILY_CONVERSATION_NEW} className="btn btn--primary">
            + Nueva Consulta
          </Link>
        </div>
      </div>

      <div className="tabs mb-md">
        <button
          className={`tabs__tab ${tab === 'activas' ? 'tabs__tab--active' : ''}`}
          onClick={() => setTab('activas')}
        >
          Activas
        </button>
        <button
          className={`tabs__tab ${tab === 'cerradas' ? 'tabs__tab--active' : ''}`}
          onClick={() => setTab('cerradas')}
        >
          Cerradas
        </button>
        <button
          className={`tabs__tab ${tab === 'todas' ? 'tabs__tab--active' : ''}`}
          onClick={() => setTab('todas')}
        >
          Todas
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state--card">
          <p>No tenés conversaciones en esta sección.</p>
        </div>
      ) : (
        <div className="conversation-list">
          {filtered.map(conv => (
            <Link
              key={conv.id}
              to={`${ROUTES.FAMILY_CONVERSATIONS}/${conv.id}`}
              className="card card--list conversation-item link-unstyled"
            >
              <div className="conversation-item__main">
                <div className="conversation-item__header">
                  <span className={getConversationStatusBadge(conv.estado)}>
                    {getConversationStatusLabel(conv.estado, ROLES.FAMILY)}
                  </span>
                  {conv.mensajesSinLeerFamilia > 0 && (
                    <span className="badge badge--error">{conv.mensajesSinLeerFamilia} nuevos</span>
                  )}
                </div>
                <h3 className="conversation-item__title">{conv.asunto || 'Sin asunto'}</h3>
                <div className="conversation-item__meta">
                  <span>Con: {getAreaLabel(conv.destinatarioEscuela)}</span>
                  <span>• {getCategoryLabel(conv.categoria)}</span>
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
