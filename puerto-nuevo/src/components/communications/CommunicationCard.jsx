export function CommunicationCard({ communication, hasRead, onMarkAsRead }) {
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
    <div className="card">
      <div className="card__header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 className="card__title">{communication.title}</h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
            <span className={getTypeBadgeClass(communication.type)}>
              {getTypeLabel(communication.type)}
            </span>
            {communication.requiereLecturaObligatoria && !hasRead && (
              <span className="badge badge--error">No leído</span>
            )}
            {communication.requiereLecturaObligatoria && hasRead && (
              <span className="badge badge--success">Leído</span>
            )}
          </div>
        </div>
        {communication.createdAt && (
          <p className="card__subtitle">
            {new Date(communication.createdAt.toDate()).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}
      </div>

      <div className="card__body">
        <p style={{ whiteSpace: 'pre-wrap' }}>{communication.body}</p>
        
        {communication.attachments && communication.attachments.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <strong>Archivos adjuntos:</strong>
            <ul>
              {communication.attachments.map((attachment, index) => (
                <li key={index}>
                  <a 
                    href={attachment.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    {attachment.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {communication.requiereLecturaObligatoria && !hasRead && onMarkAsRead && (
        <div className="card__footer">
          <button
            className="btn btn--primary"
            onClick={() => onMarkAsRead(communication.id)}
          >
            Marcar como leído
          </button>
        </div>
      )}
    </div>
  );
}
