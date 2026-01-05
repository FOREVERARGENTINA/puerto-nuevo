import { useState, useEffect } from 'react';
import { usersService } from '../../services/users.service';

export function ViewCommunicationModal({ communication, onClose, onMarkAsRead, hasRead }) {
  const [senderName, setSenderName] = useState(communication.sentByDisplayName || null);
  const [loadingSender, setLoadingSender] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadSender = async () => {
      if (senderName || !communication.sentBy) return;
      setLoadingSender(true);
      try {
        const res = await usersService.getUserById(communication.sentBy);
        if (mounted && res.success) {
          setSenderName(res.user.displayName || res.user.email || '—');
        }
      } catch (err) {
        console.error('Error cargando remitente:', err);
      } finally {
        if (mounted) setLoadingSender(false);
      }
    };

    loadSender();
    return () => { mounted = false; };
  }, [communication, senderName]);

  if (!communication) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <h2>{communication.title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            {communication.createdAt && (
              <span>
                {new Date(communication.createdAt.toDate()).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <span style={{ color: 'var(--color-text-light)' }}>•</span>
            <span>{loadingSender ? 'Cargando remitente...' : `Enviado por ${senderName || '—'}`}</span>
          </div>

          <div style={{ backgroundColor: 'var(--color-background-warm)', padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-md)' }}>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{communication.body}</p>
          </div>

          {communication.attachments && communication.attachments.length > 0 && (
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              <strong>Archivos adjuntos:</strong>
              <ul>
                {communication.attachments.map((attachment, i) => (
                  <li key={i}><a href={attachment.url} target="_blank" rel="noopener noreferrer">{attachment.name}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
          {communication.requiereLecturaObligatoria && !hasRead && onMarkAsRead && (
            <button className="btn btn--primary" onClick={() => onMarkAsRead(communication.id)}>
              Marcar como leído
            </button>
          )}
          <button className="btn btn--outline" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
