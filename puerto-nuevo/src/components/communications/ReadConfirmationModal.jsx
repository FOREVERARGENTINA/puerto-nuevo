import { useState } from 'react';

export function ReadConfirmationModal({ communication, onConfirm, blocking = true }) {
  const [hasRead, setHasRead] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!communication) return null;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await onConfirm(communication.id);
    } catch (error) {
      console.error('Error al confirmar lectura:', error);
    } finally {
      setConfirming(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (!blocking && e.target === e.currentTarget) {
      return;
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Lectura Obligatoria</h2>
        </div>

        <div className="modal-body">
          <div className="alert alert--warning">
            <strong>Atención:</strong> Este comunicado requiere confirmación de lectura.
            Debe leer el contenido completo y confirmar para continuar.
          </div>

          <div className="card">
            <div className="card__header">
              <h3 className="card__title">{communication.title}</h3>
              {communication.createdAt && (
                <p className="card__subtitle">
                  {new Date(communication.createdAt.toDate()).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
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
          </div>

          <div className="form-checkbox" style={{ marginTop: 'var(--spacing-lg)' }}>
            <input
              type="checkbox"
              id="confirm-read"
              checked={hasRead}
              onChange={(e) => setHasRead(e.target.checked)}
              disabled={confirming}
            />
            <label htmlFor="confirm-read">
              He leído y comprendido completamente el contenido de este comunicado
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn btn--primary btn--lg btn--full"
            onClick={handleConfirm}
            disabled={!hasRead || confirming}
          >
            {confirming ? 'Confirmando...' : 'Confirmar Lectura'}
          </button>
        </div>
      </div>
    </div>
  );
}
