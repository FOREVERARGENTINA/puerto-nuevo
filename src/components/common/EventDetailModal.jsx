import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';
import Icon from '../ui/Icon';

export function EventDetailModal({ event, isOpen, onClose, adminActions }) {
  if (!event) return null;

  const normalizeEventDate = (timestamp) => {
    if (!timestamp) return null;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (
      date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0
    ) {
      return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }
    return date;
  };

  const getEventTypeLabel = (tipo) => {
    const labels = {
      general: 'General',
      reuniones: 'Reuniones',
      talleres: 'Talleres',
      snacks: 'Snacks'
    };
    return labels[tipo] || tipo;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = normalizeEventDate(timestamp);
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const eventDate = normalizeEventDate(event.fecha);
  const hasDescription = event.descripcion && event.descripcion.trim().length > 0;
  const hasMedia = event.media && event.media.length > 0;
  const hasContent = hasDescription || hasMedia;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <div className="event-detail-header">
          <h2>{event.titulo}</h2>
        </div>
      </ModalHeader>

      <ModalBody>
        {/* Mini cabecera con fecha, hora y tipo */}
        <div className="event-detail-banner">
          <div className="event-detail-banner-content">
            {eventDate && (
              <div className="event-detail-banner-item">
                <Icon name="calendar" size={18} />
                <div className="event-detail-banner-text">
                  <span className="event-detail-banner-label">Fecha</span>
                  <span className="event-detail-banner-value">{formatDate(event.fecha)}</span>
                </div>
              </div>
            )}
            {event.hora && (
              <div className="event-detail-banner-item">
                <Icon name="clock" size={18} />
                <div className="event-detail-banner-text">
                  <span className="event-detail-banner-label">Horario</span>
                  <span className="event-detail-banner-value">{event.hora}</span>
                </div>
              </div>
            )}
            <div className="event-detail-banner-item">
              <Icon name="event" size={18} />
              <div className="event-detail-banner-text">
                <span className="event-detail-banner-label">Tipo</span>
                <span className="event-detail-banner-value">{getEventTypeLabel(event.tipo)}</span>
              </div>
            </div>
          </div>
        </div>

        {hasDescription && (
          <div className="event-detail-section">
            <h3 className="event-detail-section-title">Descripción</h3>
            <p className="event-detail-description">{event.descripcion}</p>
          </div>
        )}

        {hasMedia && (
          <div className="event-detail-section">
            <h3 className="event-detail-section-title">
              <Icon name="paperclip" size={16} />
              {event.media.length === 1 ? 'Archivo adjunto' : `${event.media.length} archivos adjuntos`}
            </h3>
            <div className="event-detail-attachments">
              {event.media.map((file, index) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="event-detail-attachment"
                >
                  <Icon name="file" size={16} />
                  <span>{event.media.length === 1 ? 'Ver archivo' : `Archivo ${index + 1}`}</span>
                  <Icon name="external-link" size={14} className="event-detail-attachment-icon" />
                </a>
              ))}
            </div>
          </div>
        )}

        {!hasContent && (
          <div className="event-detail-empty">
            <Icon name="info" size={24} />
            <p>Este evento no tiene información adicional.</p>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {adminActions ? (
          <div className="modal-footer-actions">
            <button onClick={onClose} className="btn btn--outline">
              Cerrar
            </button>
            <div className="modal-footer-actions-right">
              {adminActions}
            </div>
          </div>
        ) : (
          <button onClick={onClose} className="btn btn--outline">
            Cerrar
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}
