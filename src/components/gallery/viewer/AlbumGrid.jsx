import { useState, useEffect } from 'react';
import { institutionalGalleryService } from '../../../services/institutionalGallery.service';

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
      <div className="album-cards-grid">
        {albums.map(album => {
          const showThumb = album.thumbUrl && !brokenThumbs.has(album.id);
          return (
            <button
              key={album.id}
              type="button"
              className="album-card-tile"
              onClick={() => onSelectAlbum(album)}
            >
              <div className="album-card-tile__cover">
                {showThumb ? (
                  <img
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
                ) : (
                  <div className="album-card-tile__cover-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="36" height="36">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                  </div>
                )}
                <div className="album-card-tile__gradient" />
              </div>
              <div className="album-card-tile__info">
                <span className="album-card-tile__name">{album.name}</span>
                <span className="album-card-tile__date">{formatDate(album.createdAt)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AlbumGrid;
