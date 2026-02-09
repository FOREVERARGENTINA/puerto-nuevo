import { useState, useEffect, useCallback } from 'react';
import { institutionalGalleryService } from '../../../services/institutionalGallery.service';
import { useAuth } from '../../../hooks/useAuth';

const CategoryGrid = ({ onSelectCategory }) => {
  const { role } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedCovers, setLoadedCovers] = useState(() => new Set());

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const result = await institutionalGalleryService.getCategoriesByRole(role);
    if (result.success) {
      setCategories(result.categories);
      setLoadedCovers(new Set());
    }
    setLoading(false);
  }, [role]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const selector = 'link[data-gallery-preconnect="firebasestorage"]';
    if (document.querySelector(selector)) return;

    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://firebasestorage.googleapis.com';
    link.crossOrigin = 'anonymous';
    link.setAttribute('data-gallery-preconnect', 'firebasestorage');
    document.head.appendChild(link);
  }, []);

  if (loading) {
    return <div className="loading">Cargando categorías...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="empty-state">
        <p>No hay categorías disponibles para visualizar</p>
      </div>
    );
  }

  return (
    <div className="category-grid-viewer">
      <div className="categories-grid">
        {categories.map((category, index) => {
          const coverLoaded = loadedCovers.has(category.id);
          const showLoadingState = Boolean(category.coverUrl) && !coverLoaded;
          return (
            <div
              key={category.id}
              className="category-card-viewer"
              onClick={() => onSelectCategory(category)}
            >
              <div className={`category-card-thumb${showLoadingState ? ' category-card-thumb--loading' : ''}`}>
                {category.coverUrl ? (
                  <img
                    src={category.coverUrl}
                    alt={category.name}
                    width="640"
                    height="360"
                    loading={index < 4 ? 'eager' : 'lazy'}
                    fetchPriority={index < 2 ? 'high' : 'auto'}
                    decoding="async"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    onLoad={() => {
                      setLoadedCovers((prev) => {
                        if (prev.has(category.id)) return prev;
                        const next = new Set(prev);
                        next.add(category.id);
                        return next;
                      });
                    }}
                    onError={() => {
                      setLoadedCovers((prev) => {
                        if (prev.has(category.id)) return prev;
                        const next = new Set(prev);
                        next.add(category.id);
                        return next;
                      });
                    }}
                  />
                ) : (
                  <div className="category-thumb-placeholder">Sin imagen</div>
                )}
              </div>
              <div className="category-card-body">
                <h3>{category.name}</h3>
                {category.description && (
                  <p className="category-description">{category.description}</p>
                )}
                <span className="category-link">Ver álbumes</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryGrid;
