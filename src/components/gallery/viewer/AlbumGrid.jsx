import { useEffect, useState } from 'react';
import { institutionalGalleryService } from '../../../services/institutionalGallery.service';

const AlbumCardCover = ({ album, collageImages, onThumbError, onCollageImageError }) => {
  if (collageImages.length >= 2) {
    return (
      <div className={`album-card-tile__collage album-card-tile__collage--${Math.min(collageImages.length, 4)}`} aria-hidden="true">
        {collageImages.slice(0, 4).map((imageUrl, index) => (
          <div
            key={`${album.id}-collage-${index}`}
            className={`album-card-tile__collage-item album-card-tile__collage-item--${index + 1}`}
          >
            <img
              src={imageUrl}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => onCollageImageError(imageUrl)}
            />
          </div>
        ))}
      </div>
    );
  }

  if (album.thumbUrl) {
    return (
      <img
        src={album.thumbUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={onThumbError}
      />
    );
  }

  return (
    <div className="album-card-tile__cover-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" width="36" height="36">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  );
};

const AlbumGrid = ({ category, onSelectAlbum }) => {
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brokenThumbs, setBrokenThumbs] = useState(() => new Set());
  const [albumCollages, setAlbumCollages] = useState({});
  const [brokenCollageImages, setBrokenCollageImages] = useState(() => new Set());

  useEffect(() => {
    if (!category) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setAlbumCollages({});
      setBrokenThumbs(new Set());
      setBrokenCollageImages(new Set());

      const result = await institutionalGalleryService.getAlbumsByCategory(category.id);
      if (!cancelled) {
        setAlbums(result.success ? (result.albums || []) : []);
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [category]);

  useEffect(() => {
    if (!albums.length) {
      setAlbumCollages({});
      return undefined;
    }

    let cancelled = false;

    const loadCollages = async () => {
      const entries = await Promise.all(
        albums.map(async (album) => {
          const result = await institutionalGalleryService.getAlbumCoverPreview(album.id);
          const imageUrls = result.success ? (result.images || []).map((item) => item.url) : [];
          return [album.id, imageUrls];
        })
      );

      if (!cancelled) {
        setAlbumCollages(Object.fromEntries(entries));
      }
    };

    loadCollages();

    return () => {
      cancelled = true;
    };
  }, [albums]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) return <div className="loading">Cargando albumes...</div>;

  if (albums.length === 0) {
    return <div className="empty-state"><p>No hay albumes en esta categoria</p></div>;
  }

  return (
    <div className="album-grid-viewer">
      <h2>Albumes de {category.name}</h2>
      <div className="album-cards-grid">
        {albums.map((album) => {
          const showThumb = album.thumbUrl && !brokenThumbs.has(album.id);
          const collageImages = (albumCollages[album.id] || []).filter(
            (imageUrl) => !brokenCollageImages.has(`${album.id}:${imageUrl}`)
          );

          return (
            <button
              key={album.id}
              type="button"
              className="album-card-tile"
              onClick={() => onSelectAlbum(album)}
            >
              <div className="album-card-tile__cover">
                <AlbumCardCover
                  album={showThumb ? album : { ...album, thumbUrl: null }}
                  collageImages={collageImages}
                  onThumbError={() => {
                    setBrokenThumbs((prev) => {
                      const next = new Set(prev);
                      next.add(album.id);
                      return next;
                    });
                  }}
                  onCollageImageError={(imageUrl) => {
                    setBrokenCollageImages((prev) => {
                      const next = new Set(prev);
                      next.add(`${album.id}:${imageUrl}`);
                      return next;
                    });
                  }}
                />
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
