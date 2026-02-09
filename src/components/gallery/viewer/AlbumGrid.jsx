import { useState, useEffect } from 'react';
import { institutionalGalleryService } from '../../../services/institutionalGallery.service';

const AlbumGrid = ({ category, onSelectAlbum }) => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brokenThumbs, setBrokenThumbs] = useState(() => new Set());

  useEffect(() => {
    if (!category) return;

    const loadAlbums = async () => {
      setLoading(true);
      const result = await institutionalGalleryService.getAlbumsByCategory(category.id);
      if (result.success) {
        setAlbums(result.albums);
      }
      setLoading(false);
    };

    loadAlbums();
  }, [category]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return <div className="loading">Cargando álbumes...</div>;
  }

  if (albums.length === 0) {
    return (
      <div className="empty-state">
        <p>No hay álbumes en esta categoría</p>
      </div>
    );
  }

  return (
    <div className="album-grid-viewer">
      <h2>Álbumes de {category.name}</h2>
      <div className="albums-grid">
        {albums.map(album => {
          const showPlaceholder = !album.thumbUrl || brokenThumbs.has(album.id);
          return (
          <div
            key={album.id}
            className="album-card-viewer"
            onClick={() => onSelectAlbum(album)}
          >
            <div className="album-thumbnail">
              {!showPlaceholder ? (
                <img
                  src={album.thumbUrl}
                  alt={album.name}
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
                <div className="album-placeholder">
                  <span>Sin portada</span>
                </div>
              )}
            </div>
            <div className="album-info">
              <h3>{album.name}</h3>
              {album.description && (
                <p className="album-description">{album.description}</p>
              )}
              <small className="album-date">{formatDate(album.createdAt)}</small>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlbumGrid;

