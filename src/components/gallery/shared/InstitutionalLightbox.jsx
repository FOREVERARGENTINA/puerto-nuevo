import { useEffect } from 'react';
import { parseVideoUrl } from '../../../utils/galleryHelpers';

const resolveMediaType = (item) => {
  if (!item) return 'imagen';
  if (item.tipo) return item.tipo;
  if (item.embedUrl) return 'video-externo';
  const contentType = (item.contentType || '').toLowerCase();
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('image/')) return 'imagen';
  if (contentType === 'application/pdf') return 'pdf';
  const name = (item.fileName || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  return 'imagen';
};

const resolveExternalEmbedUrl = (item) => {
  if (!item) return '';
  const fallbackUrl = item.embedUrl || item.url || '';
  if (!item.url || item.tipo !== 'video-externo') return fallbackUrl;

  const parsed = parseVideoUrl(item.url);
  if (parsed?.valid && parsed.embedUrl) {
    return parsed.embedUrl;
  }

  return fallbackUrl;
};

export const InstitutionalLightbox = ({
  isOpen,
  items,
  loading,
  currentIndex,
  onPrev,
  onNext,
  onClose,
  title
}) => {
  const item = items?.[currentIndex];
  const hasMultipleItems = items.length > 1;

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrev();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen) return null;

  return (
    <div className="institutional-lightbox" onClick={onClose}>
      <div className="institutional-lightbox__header" onClick={(e) => e.stopPropagation()}>
        <div className="institutional-lightbox__title">{title}</div>
        <button
          onClick={onClose}
          className="institutional-lightbox__close"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="institutional-lightbox__stage" onClick={(e) => e.stopPropagation()}>
        <div className="institutional-lightbox__media">
          {hasMultipleItems && (
            <button
              onClick={onPrev}
              className="institutional-lightbox__overlay-nav institutional-lightbox__overlay-nav--prev"
              aria-label="Anterior"
            >
              ‹
            </button>
          )}

          {loading && <div className="institutional-lightbox__state">Cargando...</div>}
          {!loading && !item && <div className="institutional-lightbox__state">No hay archivos en este album</div>}
          {!loading && item && (() => {
            const tipo = resolveMediaType(item);
            if (tipo === 'imagen') {
              return (
                <img
                  src={item.url}
                  alt={item.fileName || 'Imagen'}
                  className="institutional-lightbox__asset institutional-lightbox__asset--image"
                />
              );
            }
            if (tipo === 'video') {
              return (
                <video
                  src={item.url}
                  controls
                  className="institutional-lightbox__asset institutional-lightbox__asset--video"
                />
              );
            }
            if (tipo === 'video-externo') {
              return (
                <iframe
                  src={resolveExternalEmbedUrl(item)}
                  title="Video"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="institutional-lightbox__asset institutional-lightbox__asset--iframe"
                />
              );
            }
            return (
              <iframe
                src={item.url}
                title="PDF"
                className="institutional-lightbox__asset institutional-lightbox__asset--pdf"
              />
            );
          })()}

          {hasMultipleItems && (
            <button
              onClick={onNext}
              className="institutional-lightbox__overlay-nav institutional-lightbox__overlay-nav--next"
              aria-label="Siguiente"
            >
              ›
            </button>
          )}
        </div>
      </div>

      <div className="institutional-lightbox__footer" onClick={(e) => e.stopPropagation()}>
        <span className="institutional-lightbox__counter">
          {items.length ? `${currentIndex + 1} de ${items.length}` : ''}
        </span>
      </div>
    </div>
  );
};
