import { useEffect, useRef, useState } from 'react';
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
  if (parsed?.valid && parsed.embedUrl) return parsed.embedUrl;
  return fallbackUrl;
};

// Progressive image: shows thumbUrl blurred while full-res loads, then crossfades
const ProgressiveImage = ({ src, thumbUrl, alt, className }) => {
  const [fullLoaded, setFullLoaded] = useState(false);

  // Reset when src changes (navigating carousel)
  useEffect(() => { setFullLoaded(false); }, [src]);

  return (
    <div className="lightbox-progressive">
      {thumbUrl && !fullLoaded && (
        <img
          src={thumbUrl}
          alt=""
          className={`${className} lightbox-progressive__thumb`}
          referrerPolicy="no-referrer"
        />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} lightbox-progressive__full${fullLoaded ? ' lightbox-progressive__full--loaded' : ''}`}
        referrerPolicy="no-referrer"
        onLoad={() => setFullLoaded(true)}
      />
    </div>
  );
};

// SVG arrows — centered perfectly in their container
const IconPrev = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const IconNext = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
    <polyline points="9 6 15 12 9 18" />
  </svg>
);

// Video player with centered play overlay
const VideoPlayer = ({ src }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleOverlayClick = () => {
    videoRef.current?.play();
  };

  return (
    <div className="lightbox-video-wrapper">
      <video
        ref={videoRef}
        src={src}
        controls
        className="institutional-lightbox__asset institutional-lightbox__asset--video"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      {!isPlaying && (
        <div className="lightbox-video-play-overlay" onClick={handleOverlayClick}>
          <div className="lightbox-video-play-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
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

  // Preload adjacent images so next/prev navigation is instant
  useEffect(() => {
    const preload = (index) => {
      const adjacent = items[index];
      if (adjacent && resolveMediaType(adjacent) === 'imagen' && adjacent.url) {
        const img = new Image();
        img.src = adjacent.url;
      }
    };
    preload(currentIndex + 1);
    preload(currentIndex - 1);
  }, [currentIndex, items]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
      if (event.key === 'ArrowLeft') { event.preventDefault(); onPrev(); return; }
      if (event.key === 'ArrowRight') { event.preventDefault(); onNext(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!isOpen) return null;

  return (
    <div className="institutional-lightbox" onClick={onClose}>
      <div className="institutional-lightbox__header" onClick={(e) => e.stopPropagation()}>
        <div className="institutional-lightbox__title">{title}</div>
        <button onClick={onClose} className="institutional-lightbox__close" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="institutional-lightbox__stage" onClick={(e) => e.stopPropagation()}>
        <div className="institutional-lightbox__media">
          {hasMultipleItems && (
            <button onClick={onPrev} className="institutional-lightbox__overlay-nav institutional-lightbox__overlay-nav--prev" aria-label="Anterior">
              <IconPrev />
            </button>
          )}

          {loading && <div className="institutional-lightbox__state">Cargando...</div>}
          {!loading && !item && <div className="institutional-lightbox__state">No hay archivos en este album</div>}
          {!loading && item && (() => {
            const tipo = resolveMediaType(item);
            if (tipo === 'imagen') {
              return (
                <ProgressiveImage
                  key={item.url}
                  src={item.url}
                  thumbUrl={item.thumbUrl}
                  alt={item.fileName || 'Imagen'}
                  className="institutional-lightbox__asset institutional-lightbox__asset--image"
                />
              );
            }
            if (tipo === 'video') {
              return <VideoPlayer key={item.url} src={item.url} />;
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
            <button onClick={onNext} className="institutional-lightbox__overlay-nav institutional-lightbox__overlay-nav--next" aria-label="Siguiente">
              <IconNext />
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
