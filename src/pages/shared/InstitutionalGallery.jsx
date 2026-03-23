import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CategoryGrid from '../../components/gallery/viewer/CategoryGrid';
import AlbumGrid from '../../components/gallery/viewer/AlbumGrid';
import AlbumMosaic from '../../components/gallery/viewer/AlbumMosaic';
import GalleryBreadcrumbs from '../../components/gallery/shared/GalleryBreadcrumbs';
import { InstitutionalLightbox } from '../../components/gallery/shared/InstitutionalLightbox';
import { ROLES } from '../../config/constants';
import { institutionalGalleryService } from '../../services/institutionalGallery.service';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../../components/ui/Icon';

const InstitutionalGallery = () => {
  const location = useLocation();
  const { role } = useAuth();
  const usesDenseAlbumMosaic = role === ROLES.FAMILY || role === ROLES.DOCENTE;
  const [currentView, setCurrentView] = useState('categories'); // 'categories' | 'albums' | 'mosaic' | 'media'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [mediaItems, setMediaItems] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [loadingDeepLink, setLoadingDeepLink] = useState(false);

  const resetToCategories = () => {
    setCurrentView('categories');
    setSelectedCategory(null);
    setSelectedAlbum(null);
    setMediaItems([]);
    setSelectedMediaIndex(0);
    setLoadingMedia(false);
  };

  useEffect(() => {
    let cancelled = false;

    const loadDeepLink = async () => {
      const params = new URLSearchParams(location.search);
      const categoryId = (params.get('categoryId') || '').trim();
      const albumId = (params.get('albumId') || '').trim();

      if (!categoryId && !albumId) {
        setLoadingDeepLink(false);
        return;
      }

      if (!role) return;

      setLoadingDeepLink(true);

      try {
        const albumResult = albumId
          ? await institutionalGalleryService.getAlbumById(albumId)
          : { success: false };

        if (albumId && !albumResult.success) throw new Error('album-not-found');

        const resolvedCategoryId = categoryId || albumResult.album?.categoryId || '';
        if (!resolvedCategoryId) throw new Error('category-missing');

        const categoryResult = await institutionalGalleryService.getCategoryById(resolvedCategoryId);
        if (!categoryResult.success) throw new Error('category-not-found');

        const allowedRoles = Array.isArray(categoryResult.category?.allowedRoles)
          ? categoryResult.category.allowedRoles
          : [];
        if (categoryResult.category?.isActive === false || !allowedRoles.includes(role)) {
          throw new Error('category-forbidden');
        }

        if (cancelled) return;

        setSelectedCategory(categoryResult.category);

        if (!albumId) {
          setSelectedAlbum(null);
          setMediaItems([]);
          setSelectedMediaIndex(0);
          setCurrentView('albums');
          return;
        }

        setSelectedAlbum(albumResult.album);
        setSelectedMediaIndex(0);
        setLoadingMedia(true);
        setCurrentView('mosaic'); // land on mosaic, not lightbox

        const mediaResult = await institutionalGalleryService.getAlbumMedia(albumResult.album.id);
        if (cancelled) return;

        setMediaItems(mediaResult.success ? (mediaResult.media || []) : []);
      } catch {
        if (!cancelled) resetToCategories();
      } finally {
        if (!cancelled) {
          setLoadingMedia(false);
          setLoadingDeepLink(false);
        }
      }
    };

    loadDeepLink();
    return () => { cancelled = true; };
  }, [location.search, role]);

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setCurrentView('albums');
  };

  const handleSelectAlbum = async (album) => {
    setSelectedAlbum(album);
    setSelectedMediaIndex(0);
    setLoadingMedia(true);
    setCurrentView('mosaic');
    const result = await institutionalGalleryService.getAlbumMedia(album.id);
    setMediaItems(result.success ? (result.media || []) : []);
    setLoadingMedia(false);
  };

  const handleSelectMedia = (index) => {
    setSelectedMediaIndex(index);
    setCurrentView('media');
  };

  const handleNavigate = (view, data = null) => {
    if (view === 'categories') {
      setCurrentView('categories');
      setSelectedCategory(null);
      setSelectedAlbum(null);
      setMediaItems([]);
      setSelectedMediaIndex(0);
    } else if (view === 'albums') {
      setCurrentView('albums');
      setSelectedAlbum(null);
      setMediaItems([]);
      setSelectedMediaIndex(0);
      if (data) setSelectedCategory(data);
    } else if (view === 'mosaic') {
      // Return from lightbox to mosaic — preserve album and media
      setCurrentView('mosaic');
      setSelectedMediaIndex(0);
    }
  };

  const handleCloseMedia = () => {
    // Return to mosaic, keep album and media loaded
    setCurrentView('mosaic');
    setSelectedMediaIndex(0);
  };

  const showPrevMedia = () => {
    if (!mediaItems.length) return;
    setSelectedMediaIndex((i) => (i - 1 + mediaItems.length) % mediaItems.length);
  };

  const showNextMedia = () => {
    if (!mediaItems.length) return;
    setSelectedMediaIndex((i) => (i + 1) % mediaItems.length);
  };

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Galeria Institucional</h1>
          <p className="dashboard-subtitle">Explora fotos, videos y contenido multimedia de la escuela</p>
        </div>
      </div>

      <div className="gallery-nav-row">
        <GalleryBreadcrumbs
          category={selectedCategory}
          album={selectedAlbum}
          currentView={currentView}
          onNavigate={handleNavigate}
        />
        {(currentView === 'mosaic' || currentView === 'albums') && (
          <button type="button" className="btn btn--outline btn--back" onClick={() => handleNavigate('categories')}>
            <Icon name="chevron-left" size={16} />
            Volver
          </button>
        )}
      </div>

      <div className="gallery-content">
        {loadingDeepLink && <div className="loading">Abriendo album...</div>}

        {!loadingDeepLink && currentView === 'categories' && (
          <CategoryGrid onSelectCategory={handleSelectCategory} />
        )}

        {!loadingDeepLink && currentView === 'albums' && selectedCategory && (
          <AlbumGrid
            category={selectedCategory}
            onSelectAlbum={handleSelectAlbum}
          />
        )}

        {!loadingDeepLink && currentView === 'mosaic' && selectedAlbum && (
          <AlbumMosaic
            items={mediaItems}
            loading={loadingMedia}
            onSelectItem={handleSelectMedia}
            dense={usesDenseAlbumMosaic}
            showLoadMore={usesDenseAlbumMosaic}
          />
        )}

        {!loadingDeepLink && currentView === 'media' && selectedAlbum && (
          <InstitutionalLightbox
            isOpen
            items={mediaItems}
            loading={loadingMedia}
            currentIndex={selectedMediaIndex}
            onPrev={showPrevMedia}
            onNext={showNextMedia}
            onClose={handleCloseMedia}
            title={selectedAlbum?.name || 'Galeria'}
          />
        )}
      </div>
    </div>
  );
};

export default InstitutionalGallery;
