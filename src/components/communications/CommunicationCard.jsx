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

  return (
    <div className="card card--list" style={{ cursor: 'default', padding: 'var(--spacing-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <h3 className="card__title" style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{communication.title}</h3>
            <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-xs)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <Icon name="calendar" size={16} className="icon icon--muted" />
                <span style={{ marginLeft: '0.25rem' }}>{communication.createdAt ? new Date(communication.createdAt.toDate()).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : ''}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: '0.75rem' }}>
                <Icon name="user" size={16} className="icon icon--muted" />
                <span style={{ marginLeft: '0.25rem' }}>{communication.sentByDisplayName || communication.sentBy || '—'}</span>
              </span>
            </span>
          </div>
          <div style={{ marginTop: '0.25rem', color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
            <span className={getTypeBadgeClass(communication.type)} style={{ marginRight: '0.5rem' }}>{getTypeLabel(communication.type)}</span>
            {communication.requiereLecturaObligatoria && !hasRead && (
              <span className="badge badge--error">No leído</span>
            )}
            {communication.requiereLecturaObligatoria && hasRead && (
              <span className="badge badge--success">Leído</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          <button className="btn btn--link" onClick={() => onView && onView(communication)} title="Ver comunicado">Ver</button>
          {communication.requiereLecturaObligatoria && !hasRead && onMarkAsRead && (
            <button className="btn btn--primary" onClick={() => onMarkAsRead(communication.id)} title="Marcar como leído">
              <Icon name="check-circle" size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
