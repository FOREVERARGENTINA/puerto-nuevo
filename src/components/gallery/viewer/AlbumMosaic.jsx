// src/components/gallery/viewer/AlbumMosaic.jsx
//
// Mosaic grid view for album content.
// First tile spans 2×2, rest are 1×1.
// Shows up to 5 tiles + 1 overflow tile when items.length > 6.
// Videos show a ▶ play overlay. External videos show provider badge.

const VISIBLE_TILES = 5;

const resolveThumb = (item) => {
  if (item.tipo === 'imagen') return item.thumbUrl || item.url;
  if (item.tipo === 'video-externo') return item.thumbUrl || null;
  return null; // 'video' and 'pdf' have no thumbnail
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

const MosaicTile = ({ item, index, isFirst, onClick }) => {
  const thumb = resolveThumb(item);
  const isVideo = item.tipo === 'video' || item.tipo === 'video-externo';
  const isPdf = item.tipo === 'pdf';

  return (
    <button
      className={`mosaic-tile${isFirst ? ' mosaic-tile--first' : ''}`}
      onClick={() => onClick(index)}
    >
      {thumb
        ? <img src={thumb} alt="" referrerPolicy="no-referrer" />
        : <div className="mosaic-tile-placeholder" />
      }
      {isVideo && <VideoOverlay item={item} />}
      {isPdf && <PdfOverlay />}
    </button>
  );
};

// onBack omitted — back navigation is handled by GalleryBreadcrumbs, not the mosaic itself
const AlbumMosaic = ({ items, loading, onSelectItem }) => {
  if (loading) return <div className="loading">Cargando fotos...</div>;

  if (!items.length) {
    return <div className="empty-state"><p>No hay archivos en este álbum</p></div>;
  }

  const showOverflow = items.length > VISIBLE_TILES + 1;
  const visibleItems = showOverflow ? items.slice(0, VISIBLE_TILES) : items;
  const overflowCount = items.length - VISIBLE_TILES;

  return (
    <div className="album-mosaic">
      <div className="mosaic-grid">
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
            className="mosaic-tile mosaic-tile--overflow"
            onClick={() => onSelectItem(VISIBLE_TILES)}
          >
            <span>+{overflowCount}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default AlbumMosaic;
