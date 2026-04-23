import { useState, useEffect } from 'react';
import { institutionalGalleryService } from '../../services/institutionalGallery.service';
import CategoryManager from '../../components/gallery/admin/CategoryManager';
import AlbumManager from '../../components/gallery/admin/AlbumManager';
import MediaUploader from '../../components/gallery/admin/MediaUploader';
import MediaGrid from '../../components/gallery/admin/MediaGrid';

const InstitutionalGalleryManager = () => {
  const [activeTab, setActiveTab] = useState('media'); // 'categories' | 'media'
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mediaSummary, setMediaSummary] = useState({ totalCount: 0, pendingCount: 0 });
  const [categoryRefreshKey, setCategoryRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      const result = await institutionalGalleryService.getAllCategories();
      if (!cancelled && result.success) {
        setCategories(result.categories);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [categoryRefreshKey]);

  const handleSelectCategory = (category) => {
    setSelectedCategory(category);
    setSelectedAlbum(null);
    setMediaSummary({ totalCount: 0, pendingCount: 0 });
    setActiveTab('media');
  };

  const handleSelectAlbum = (album) => {
    setSelectedAlbum(album);
    setMediaSummary({ totalCount: 0, pendingCount: 0 });
  };

  const handleAlbumStateChange = async () => {
    setRefreshKey(prev => prev + 1);
    // Recargar el álbum seleccionado para reflejar el thumbnail actualizado
    if (selectedAlbum) {
      const result = await institutionalGalleryService.getAlbumById(selectedAlbum.id);
      if (result.success) {
        setSelectedAlbum(result.album);
      }
    }
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
    setMediaSummary({ totalCount: 0, pendingCount: 0 });
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedAlbum(null);
    setMediaSummary({ totalCount: 0, pendingCount: 0 });
    setActiveTab('categories');
  };

  const handleCategoriesChanged = () => {
    setCategoryRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Galería Institucional</h1>
          <p className="dashboard-subtitle">Administrar categorías, álbumes y contenido multimedia</p>
        </div>
      </div>

            <div className="tabs">
        <button
          className={`tab ${activeTab === 'media' ? 'active' : ''}`}
          onClick={() => setActiveTab('media')}
        >
          Álbumes y media
        </button>
        <button
          className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('categories');
            setSelectedCategory(null);
            setSelectedAlbum(null);
            setMediaSummary({ totalCount: 0, pendingCount: 0 });
          }}
        >
          Categorías
        </button>
      </div>
      <div className="tab-content">
        {activeTab === 'categories' && (
          <CategoryManager onCategoriesChanged={handleCategoriesChanged} />
        )}

        {activeTab === 'media' && (
          <div className="media-management">
            {!selectedCategory ? (
              <div className="category-selector">
                <h2>Seleccione una categoría</h2>
                <div className="categories-grid">
                  {categories.map(category => (
                    <div
                      key={category.id}
                      className="category-selector-card"
                      onClick={() => handleSelectCategory(category)}
                    >
                      <div className="category-selector-thumb">
                        {category.coverUrl ? (
                          <img
                            src={category.coverUrl}
                            alt={category.name}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="category-thumb-placeholder">Sin imagen</div>
                        )}
                      </div>
                      <h3>{category.name}</h3>
                      {category.description && (
                        <p className="category-description">{category.description}</p>
                      )}
                    </div>
                  ))}
                </div>
                {categories.length === 0 && (
                  <p className="empty-state">
                    No hay categorías. Cree una en la pestaña "Categorías".
                  </p>
                )}
              </div>
            ) : !selectedAlbum ? (
              <div className="album-section">
                <div className="breadcrumb">
                  <button onClick={handleBackToCategories} className="breadcrumb-link">
                    ← Categorías
                  </button>
                  <span className="breadcrumb-separator">/</span>
                  <span className="breadcrumb-current">{selectedCategory.name}</span>
                </div>
                <AlbumManager
                  category={selectedCategory}
                  onSelectAlbum={handleSelectAlbum}
                  refreshTrigger={refreshKey}
                />
              </div>
            ) : (
              <div className="media-section">
                <div className="breadcrumb">
                  <button onClick={handleBackToCategories} className="breadcrumb-link">
                    ← Categorías
                  </button>
                  <span className="breadcrumb-separator">/</span>
                  <button onClick={handleBackToAlbums} className="breadcrumb-link">
                    {selectedCategory.name}
                  </button>
                  <span className="breadcrumb-separator">/</span>
                  <span className="breadcrumb-current">{selectedAlbum.name}</span>
                </div>

                <div className="media-workspace">
                  <div className="media-uploader-section">
                    <MediaUploader
                      category={selectedCategory}
                      album={selectedAlbum}
                      pendingMediaCount={mediaSummary.pendingCount}
                      onAlbumStateChange={handleAlbumStateChange}
                    />
                  </div>

                  <div className="media-grid-section">
                    <MediaGrid
                      category={selectedCategory}
                      album={selectedAlbum}
                      refreshTrigger={refreshKey}
                      onMediaSummaryChange={setMediaSummary}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstitutionalGalleryManager;



