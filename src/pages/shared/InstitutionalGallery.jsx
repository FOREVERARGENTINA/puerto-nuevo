import { useState } from 'react';
import CategoryGrid from '../../components/gallery/viewer/CategoryGrid';
import AlbumGrid from '../../components/gallery/viewer/AlbumGrid';
import GalleryBreadcrumbs from '../../components/gallery/shared/GalleryBreadcrumbs';
import { InstitutionalLightbox } from '../../components/gallery/shared/InstitutionalLightbox';
import { institutionalGalleryService } from '../../services/institutionalGallery.service';

const InstitutionalGallery = () => {
  const [currentView, setCurrentView] = useState('categories'); // 'categories' | 'albums' | 'media'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [mediaItems, setMediaItems] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setCurrentView('albums');
  };

  const handleSelectAlbum = async (album) => {
    setSelectedAlbum(album);
    setCurrentView('media');
    setSelectedMediaIndex(0);
    setLoadingMedia(true);
    const result = await institutionalGalleryService.getAlbumMedia(album.id);
    if (result.success) {
      setMediaItems(result.media || []);
    } else {
      setMediaItems([]);
    }
    setLoadingMedia(false);
  };

  const handleNavigate = (view, data = null) => {
    setCurrentView(view);

    if (view === 'categories') {
      setSelectedCategory(null);
      setSelectedAlbum(null);
      setMediaItems([]);
      setSelectedMediaIndex(0);
    } else if (view === 'albums') {
      setSelectedAlbum(null);
      setMediaItems([]);
      setSelectedMediaIndex(0);
      if (data) setSelectedCategory(data);
    }
  };

  const handleCloseMedia = () => {
    setCurrentView('albums');
    setSelectedAlbum(null);
    setMediaItems([]);
    setSelectedMediaIndex(0);
  };

  const showPrevMedia = () => {
    if (!mediaItems.length) return;
    setSelectedMediaIndex((current) => (current - 1 + mediaItems.length) % mediaItems.length);
  };

  const showNextMedia = () => {
    if (!mediaItems.length) return;
    setSelectedMediaIndex((current) => (current + 1) % mediaItems.length);
  };

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Galería Institucional</h1>
          <p className="dashboard-subtitle">Explora fotos, videos y contenido multimedia de la escuela</p>
        </div>
      </div>

      <GalleryBreadcrumbs
        category={selectedCategory}
        album={selectedAlbum}
        onNavigate={handleNavigate}
      />

      <div className="gallery-content">
        {currentView === 'categories' && (
          <CategoryGrid onSelectCategory={handleSelectCategory} />
        )}

        {currentView === 'albums' && selectedCategory && (
          <AlbumGrid
            category={selectedCategory}
            onSelectAlbum={handleSelectAlbum}
          />
        )}

        {currentView === 'media' && selectedAlbum && (
          <InstitutionalLightbox
            isOpen
            items={mediaItems}
            loading={loadingMedia}
            currentIndex={selectedMediaIndex}
            onPrev={showPrevMedia}
            onNext={showNextMedia}
            onClose={handleCloseMedia}
            title={selectedAlbum?.name || 'Galería'}
          />
        )}
      </div>
    </div>
  );
};

export default InstitutionalGallery;
