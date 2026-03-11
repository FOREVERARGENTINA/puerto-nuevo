import { useState, useEffect } from 'react';
import { institutionalGalleryService } from '../../../services/institutionalGallery.service';

// 4 slots per row; only slot 0 shows a real image (one thumbUrl per album).
// Slots 1-3 are decorative grey placeholders by design.
const THUMB_SLOTS = 4;

const AlbumGrid = ({ category, onSelectAlbum }) => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brokenThumbs, setBrokenThumbs] = useState(() => new Set());

  useEffect(() => {
    if (!category) return;
    const load = async () => {
      setLoading(true);
      const result = await institutionalGalleryService.getAlbumsByCategory(category.id);
      if (result.success) setAlbums(result.albums);
      setLoading(false);
    };
    load();
  }, [category]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) return <div className="loading">Cargando álbumes...</div>;

  if (albums.length === 0) {
    return <div className="empty-state"><p>No hay álbumes en esta categoría</p></div>;
  }

  return (
    <div className="album-grid-viewer">
      <h2>Álbumes de {category.name}</h2>
      <div className="album-feed">
        {albums.map(album => {
          const showThumb = album.thumbUrl && !brokenThumbs.has(album.id);
          return (
            <button
              key={album.id}
              className="album-feed-row"
              onClick={() => onSelectAlbum(album)}
            >
              <div className="album-feed-thumbs">
                {Array.from({ length: THUMB_SLOTS }).map((_, i) => (
                  i === 0 && showThumb
                    ? <img
                        key={i}
                        src={album.thumbUrl}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={() => {
                          console.warn('Thumbnail fallido para álbum:', album.thumbUrl);
                          setBrokenThumbs(prev => {
                            const next = new Set(prev);
                            next.add(album.id);
                            return next;
                          });
                        }}
                      />
                    : <div key={i} className="album-feed-thumb-placeholder" />
                ))}
              </div>
              <div className="album-feed-meta">
                {/* album.description intentionally omitted — compact list design */}
                <span className="album-feed-name">{album.name}</span>
                <span className="album-feed-date">{formatDate(album.createdAt)}</span>
              </div>
              <span className="album-feed-arrow">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AlbumGrid;
