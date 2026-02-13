import { Modal, ModalBody, ModalFooter } from './Modal';
import Icon from '../ui/Icon';
import './EventDetailModal.css';

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

  const getEventTypeBadge = (tipo) => {
    const badges = {
      general: 'badge--info',
      reuniones: 'badge--warning',
      talleres: 'badge--success',
      snacks: 'badge--primary'
    };
    return badges[tipo] || 'badge--neutral';
  };

  const formatDateFull = (timestamp) => {
    if (!timestamp) return '';
    const date = normalizeEventDate(timestamp);
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const formatDateShort = (timestamp) => {
    if (!timestamp) return { day: '', month: '' };
    const date = normalizeEventDate(timestamp);
    return {
      day: date.getDate(),
      month: new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(date).replace('.', '')
    };
  };

  const eventDate = normalizeEventDate(event.fecha);
  const hasDescription = event.descripcion && event.descripcion.trim().length > 0;
  const hasMedia = event.media && event.media.length > 0;
  const hasContent = hasDescription || hasMedia;
  const dateShort = formatDateShort(event.fecha);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      overlayClassName="event-detail-modal-overlay"
      className={`event-detail-modal event-detail-modal--${event.tipo || 'general'}`}
    >
      {/* Header personalizado con título y close */}
      <div className="event-detail-modal-header">
        <div className="event-detail-modal-header-top">
          <span className={`badge badge--sm ${getEventTypeBadge(event.tipo)} event-detail-modal-badge`}>
            {getEventTypeLabel(event.tipo)}
          </span>
          <button
            onClick={onClose}
            className="event-detail-modal-close"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>
        <h2 className="event-detail-modal-title">{event.titulo}</h2>
      </div>

      <ModalBody>
        {/* Banda de fecha / hora */}
        <div className="event-detail-meta-band">
          {eventDate && (
            <div className="event-detail-meta-date">
              <div className="event-detail-meta-date-box">
                <span className="event-detail-meta-date-day">{dateShort.day}</span>
                <span className="event-detail-meta-date-month">{dateShort.month}</span>
              </div>
              <div className="event-detail-meta-date-full">
                <span className="event-detail-meta-label">Fecha</span>
                <span className="event-detail-meta-value">{formatDateFull(event.fecha)}</span>
              </div>
            </div>
          )}
          {event.hora && (
            <div className="event-detail-meta-item">
              <Icon name="clock" size={20} className="event-detail-meta-icon" />
              <div>
                <span className="event-detail-meta-label">Horario</span>
                <span className="event-detail-meta-value event-detail-meta-value--hora">{event.hora}</span>
              </div>
            </div>
          )}
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
              <Icon name="paperclip" size={14} />
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
            <Icon name="calendar" size={32} />
            <p>No hay información adicional para este evento.</p>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        {adminActions ? (
          <div className="modal-footer-actions">
            <button onClick={onClose} className="btn btn--outline btn--sm">
              Cerrar
            </button>
            <div className="modal-footer-actions-right">
              {adminActions}
            </div>
          </div>
        ) : (
          <button onClick={onClose} className="btn btn--outline btn--sm">
            Cerrar
          </button>
        )}
      </ModalFooter>
    </Modal>
  );
}
