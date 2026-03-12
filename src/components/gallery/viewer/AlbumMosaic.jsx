// src/components/gallery/viewer/AlbumMosaic.jsx
//
// Mosaic grid view for album content.
// First tile spans 2×2, rest are 1×1.
// Shows up to 5 tiles + 1 overflow tile when items.length > 6.
// Videos show a ▶ play overlay. External videos show provider badge.

import { useEffect, useRef, useState } from 'react';

const DEFAULT_VISIBLE_TILES = 5;
const DENSE_VISIBLE_TILES = 11;

// For uploaded videos: loads only metadata, seeks to 1s to show a real frame
const VideoThumbnail = ({ src }) => {
  const ref = useRef(null);
  const handleLoadedMetadata = () => {
    if (ref.current) ref.current.currentTime = 1;
  };
  return (
    <video
      ref={ref}
      src={src}
      preload="metadata"
      muted
      playsInline
      onLoadedMetadata={handleLoadedMetadata}
    />
  );
};

const resolveThumb = (item) => {
  if (item.tipo === 'imagen') return item.thumbUrl || item.url;
  if (item.tipo === 'video-externo') return item.thumbUrl || null;
  return null;
};

const VideoOverlay = ({ item }) => {
  const badge = item.tipo === 'video-externo'
    ? (item.provider === 'youtube' ? 'YT' : 'Vimeo')
    : 'VIDEO';
  return (
    <div className="mosaic-play-overlay">
      <div className="mosaic-play-btn">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
      <span className={`mosaic-video-badge${item.tipo === 'video-externo' && item.provider === 'youtube' ? ' mosaic-video-badge--yt' : ''}`}>
        {badge}
      </span>
    </div>
  );
};

const PdfOverlay = () => (
  <div className="mosaic-play-overlay">
    <div className="mosaic-play-btn">
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
      </svg>
    </div>
    <span className="mosaic-video-badge">PDF</span>
  </div>
);

const EmptyAlbumState = () => (
  <section className="album-mosaic-empty" aria-live="polite">
    <div className="album-mosaic-empty__visual" aria-hidden="true">
      <div className="album-mosaic-empty__orb album-mosaic-empty__orb--primary" />
      <div className="album-mosaic-empty__orb album-mosaic-empty__orb--accent" />
      <div className="album-mosaic-empty__frame">
        <div className="album-mosaic-empty__shine" />
        <div className="album-mosaic-empty__preview album-mosaic-empty__preview--hero">
          <span />
        </div>
        <div className="album-mosaic-empty__preview-grid">
          <div className="album-mosaic-empty__preview">
            <span />
          </div>
          <div className="album-mosaic-empty__preview album-mosaic-empty__preview--video">
            <span />
          </div>
          <div className="album-mosaic-empty__preview album-mosaic-empty__preview--document">
            <span />
          </div>
        </div>
      </div>
    </div>

    <div className="album-mosaic-empty__content">
      <span className="album-mosaic-empty__eyebrow">Album en preparacion</span>
      <h3>Este espacio todavia no tiene contenido publicado</h3>
      <p>
        Cuando la escuela suba fotos, videos o material del album, van a aparecer aca con una presentacion
        mucho mas rica.
      </p>
    </div>
  </section>
);

const MosaicTile = ({ item, index, isFirst, onClick }) => {
  const thumb = resolveThumb(item);
  const isUploadedVideo = item.tipo === 'video';
  const isVideo = isUploadedVideo || item.tipo === 'video-externo';
  const isPdf = item.tipo === 'pdf';
  const label = item.title || item.fileName || item.tipo || 'Archivo';

  return (
    <button
      type="button"
      aria-label={label}
      className={`mosaic-tile${isFirst ? ' mosaic-tile--first' : ''}`}
      onClick={() => onClick(index)}
    >
      {isUploadedVideo
        ? <VideoThumbnail src={item.url} />
        : thumb
          ? <img src={thumb} alt="" referrerPolicy="no-referrer" />
          : <div className="mosaic-tile-placeholder" />
      }
      {isVideo && <VideoOverlay item={item} />}
      {isPdf && <PdfOverlay />}
    </button>
  );
};

// onBack omitted — back navigation is handled by GalleryBreadcrumbs
const AlbumMosaic = ({ items, loading, onSelectItem, dense = false, showLoadMore = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [items, dense, showLoadMore]);

  if (loading) return <div className="loading">Cargando fotos...</div>;

  if (!items.length) {
    return <EmptyAlbumState />;
  }

  const visibleTiles = dense ? DENSE_VISIBLE_TILES : DEFAULT_VISIBLE_TILES;
  const hasMoreItems = items.length > visibleTiles;
  const showOverflow = !showLoadMore && items.length > visibleTiles + 1;
  const visibleItems = showLoadMore
    ? (isExpanded ? items : items.slice(0, visibleTiles))
    : (showOverflow ? items.slice(0, visibleTiles) : items);
  const overflowCount = items.length - visibleTiles;
  const gridColumns = dense ? 4 : 3;
  const renderedTileCount = visibleItems.length + (showOverflow ? 1 : 0);
  const fillerCount = renderedTileCount > 0
    ? (gridColumns - (renderedTileCount % gridColumns || gridColumns)) % gridColumns
    : 0;

  return (
    <div className={`album-mosaic${dense ? ' album-mosaic--dense' : ''}`}>
      <div className={`mosaic-grid${dense ? ' mosaic-grid--dense' : ''}`}>
        {visibleItems.map((item, i) => (
          <MosaicTile
            key={item.id || i}
            item={item}
            index={i}
            isFirst={i === 0}
            onClick={onSelectItem}
          />
        ))}
        {showOverflow && (
          <button
            type="button"
            aria-label={`Ver ${overflowCount} archivos más`}
            className="mosaic-tile mosaic-tile--overflow"
            onClick={() => onSelectItem(visibleTiles)}
          >
            <span>+{overflowCount}</span>
          </button>
        )}
        {Array.from({ length: fillerCount }).map((_, index) => (
          <div
            key={`filler-${index}`}
            className="mosaic-tile mosaic-tile--filler"
            aria-hidden="true"
          >
            <div className="mosaic-tile-filler__glow" />
          </div>
        ))}
      </div>
      {showLoadMore && hasMoreItems && !isExpanded && (
        <div className="album-mosaic__actions">
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={() => setIsExpanded(true)}
          >
            Ver más ({overflowCount})
          </button>
        </div>
      )}
    </div>
  );
};

export default AlbumMosaic;
