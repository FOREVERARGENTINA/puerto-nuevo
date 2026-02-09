import Icon from '../ui/Icon';

export function CommunicationCard({ communication, hasRead, onMarkAsRead, onView }) {
  const getTypeLabel = (type) => {
    const labels = {
      global: 'Comunicado General',
      ambiente: 'Ambiente',
      taller: 'Taller Especial',
      individual: 'Individual'
    };
    return labels[type] || type;
  };

  const getTypeBadgeClass = (type) => {
    const classes = {
      global: 'badge--primary',
      ambiente: 'badge--info',
      taller: 'badge--warning',
      individual: 'badge--success'
    };
    return `badge ${classes[type] || 'badge--primary'}`;
  };

  const createdLabel = communication.createdAt
    ? new Date(communication.createdAt.toDate()).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    : '';

  const senderLabel = communication.sentByDisplayName || communication.sentBy || '—';
  const preview = (communication.body || '').slice(0, 140).trim();

  return (
    <div
      className={`card communication-card ${hasRead ? 'communication-card--read' : 'communication-card--unread'}`}
      role="button"
      tabIndex={0}
      onClick={() => onView && onView(communication)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView && onView(communication);
        }
      }}
    >
      <div className="communication-card__main">
        <div className="communication-card__badges">
          <div className="communication-card__status">
            {communication.requiereLecturaObligatoria && !hasRead && (
              <span className="badge badge--error">No leído</span>
            )}
            {communication.requiereLecturaObligatoria && hasRead && (
              <span className="badge badge--success">Leído</span>
            )}
          </div>
          <span className={`${getTypeBadgeClass(communication.type)} communication-card__type`}>
            {getTypeLabel(communication.type)}
          </span>
        </div>

        <div className="communication-card__header">
          <div className="communication-card__title-row">
            <h3>{communication.title}</h3>
          </div>
          <div className="communication-card__meta">
            <span>
              <Icon name="calendar" size={14} className="icon icon--muted" />
              {createdLabel}
            </span>
            <span>
              <Icon name="user" size={14} className="icon icon--muted" />
              {senderLabel}
            </span>
          </div>
        </div>

        {preview && (
          <p className="communication-card__preview">
            {preview}{communication.body && communication.body.length > 140 ? '…' : ''}
          </p>
        )}
      </div>

      <div className="communication-card__actions">
        {communication.requiereLecturaObligatoria && !hasRead && onMarkAsRead && (
          <button
            className="btn btn--primary btn--sm"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(communication.id);
            }}
            title="Marcar como leído"
          >
            <Icon name="check-circle" size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
