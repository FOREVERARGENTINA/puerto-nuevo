import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useConversations } from '../../hooks/useConversations';
import { ROUTES, CONVERSATION_STATUS, ROLES } from '../../config/constants';
import { formatRelativeTime } from '../../utils/dateHelpers';
import {
  getAreaLabel,
  getCategoryLabel,
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
    <div className="page-container family-conversations-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Conversaciones</h1>
          <p className="dashboard-subtitle">Mensajes con la escuela</p>
        </div>
        <Link to={ROUTES.FAMILY_CONVERSATION_NEW} className="btn btn--primary">
          + Nueva Consulta
        </Link>
      </div>

      <div className="conversations-toolbar">
        <div className="conversations-filters">
          <button
            className={`filter-tab ${tab === 'activas' ? 'filter-tab--active' : ''}`}
            onClick={() => setTab('activas')}
          >
            Activas
            {tab !== 'activas' && conversations.filter(c => c.estado !== CONVERSATION_STATUS.CERRADA).length > 0 && (
              <span className="filter-tab__count">
                {conversations.filter(c => c.estado !== CONVERSATION_STATUS.CERRADA).length}
              </span>
            )}
          </button>
          <button
            className={`filter-tab ${tab === 'cerradas' ? 'filter-tab--active' : ''}`}
            onClick={() => setTab('cerradas')}
          >
            Cerradas
          </button>
          <button
            className={`filter-tab ${tab === 'todas' ? 'filter-tab--active' : ''}`}
            onClick={() => setTab('todas')}
          >
            Todas
          </button>
        </div>
        {unreadCount > 0 && (
          <span className="conversations-unread-pill">
            {unreadCount} sin leer
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="conversations-empty">
          <p className="conversations-empty__text">
            {tab === 'cerradas' 
              ? 'No tenés conversaciones cerradas'
              : tab === 'activas'
              ? 'No tenés conversaciones activas'
              : 'Aún no tenés conversaciones'}
          </p>
          <Link to={ROUTES.FAMILY_CONVERSATION_NEW} className="btn btn--primary btn--sm">
            Iniciar consulta
          </Link>
        </div>
      ) : (
        <div className="conversations-list">
          {filtered.map(conv => {
            const hasUnread = conv.mensajesSinLeerFamilia > 0;
            const initial = getAreaLabel(conv.destinatarioEscuela)?.charAt(0)?.toUpperCase() || '?';
            
            return (
              <Link
                key={conv.id}
                to={`${ROUTES.FAMILY_CONVERSATIONS}/${conv.id}`}
                className={`conversation-row ${hasUnread ? 'conversation-row--unread' : ''}`}
              >
                <div className="conversation-row__avatar">
                  {initial}
                </div>
                
                <div className="conversation-row__content">
                  <div className="conversation-row__top">
                    <span className="conversation-row__subject">
                      {conv.asunto || 'Sin asunto'}
                    </span>
                    <span className="conversation-row__time">
                      {conv.ultimoMensajeAt ? formatRelativeTime(conv.ultimoMensajeAt) : ''}
                    </span>
                  </div>
                  
                  <div className="conversation-row__middle">
                    <span className="conversation-row__area">
                      {getAreaLabel(conv.destinatarioEscuela)}
                    </span>
                    <span className="conversation-row__separator">·</span>
                    <span className="conversation-row__category">
                      {getCategoryLabel(conv.categoria)}
                    </span>
                  </div>
                  
                  <div className="conversation-row__bottom">
                    <p className="conversation-row__preview">
                      {conv.ultimoMensajeTexto || 'Sin mensajes'}
                    </p>
                    <div className="conversation-row__indicators">
                      {hasUnread && (
                        <span className="conversation-row__badge">
                          {conv.mensajesSinLeerFamilia}
                        </span>
                      )}
                      <span className={`conversation-row__status conversation-row__status--${conv.estado}`}>
                        {getConversationStatusLabel(conv.estado, ROLES.FAMILY)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
