# Gallery Album Views Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the album card grid with a feed-style list and insert a photo/video mosaic view between the album list and the lightbox carousel.

**Architecture:** Four focused changes across three existing files plus one new component. The new `AlbumMosaic` component is purely presentational. State management stays in `InstitutionalGallery` with a new `'mosaic'` view state inserted between `'albums'` and `'media'`.

**Tech Stack:** React (JSX), plain CSS (class-based, co-located in `gallery.css`), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-03-11-gallery-album-views-design.md`

---

## Chunk 1: AlbumGrid feed-list redesign

### Task 1: Redesign `AlbumGrid` to feed-list style

**Files:**
- Modify: `src/components/gallery/viewer/AlbumGrid.jsx`
- Modify: `src/styles/sections/gallery.css` (replace `.album-card-viewer` block, keep `.album-grid-viewer`)

- [ ] **Step 1: Replace `AlbumGrid` JSX**

Replace the entire content of `src/components/gallery/viewer/AlbumGrid.jsx` with:

```jsx
import { useState, useEffect } from 'react';
import { institutionalGalleryService } from '../../../services/institutionalGallery.service';

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
                        onError={() => setBrokenThumbs(prev => {
                          const next = new Set(prev);
                          next.add(album.id);
                          return next;
                        })}
                      />
                    : <div key={i} className="album-feed-thumb-placeholder" />
                ))}
              </div>
              <div className="album-feed-meta">
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
```

- [ ] **Step 2: Add feed-list CSS to `gallery.css`**

Find the `.album-card-viewer` block in `src/styles/sections/gallery.css` and **replace** all `.album-card-viewer` rules (lines ~1659–1700) with the following. Keep `.album-grid-viewer` untouched.

```css
/* ==================== ALBUM FEED LIST (viewer) ==================== */
.album-feed {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.album-feed-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: 10px 12px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: box-shadow 0.18s ease, border-color 0.18s ease;
  width: 100%;
  text-align: left;
  font: inherit;
}

.album-feed-row:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 10px rgba(44, 107, 111, 0.1);
}

.album-feed-thumbs {
  display: flex;
  gap: 3px;
  flex-shrink: 0;
}

.album-feed-thumbs img,
.album-feed-thumb-placeholder {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  display: block;
}

.album-feed-thumb-placeholder {
  background: var(--color-border);
}

.album-feed-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.album-feed-name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.album-feed-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.album-feed-arrow {
  font-size: 1.3rem;
  color: var(--color-text-light);
  flex-shrink: 0;
  line-height: 1;
}

@media (max-width: 480px) {
  .album-feed-thumbs img,
  .album-feed-thumb-placeholder {
    width: 36px;
    height: 36px;
  }
}
```

- [ ] **Step 3: Verify visually**

Run `npm run dev`, navigate to Galería → a category. Confirm:
- Each album renders as a horizontal row with 4 thumbnail slots
- First slot shows the real thumb (or placeholder if missing)
- Name, date, and `›` arrow appear
- Hover shows border highlight
- Clicking a row still works (opens lightbox as before — will change in Task 3)

- [ ] **Step 4: Commit**

```bash
git add src/components/gallery/viewer/AlbumGrid.jsx src/styles/sections/gallery.css
git commit -m "feat(gallery): replace album cards with feed-list rows"
```

---

## Chunk 2: AlbumMosaic new component

### Task 2: Create `AlbumMosaic` component

**Files:**
- Create: `src/components/gallery/viewer/AlbumMosaic.jsx`
- Modify: `src/styles/sections/gallery.css` (append mosaic CSS)

- [ ] **Step 1: Create `AlbumMosaic.jsx`**

```jsx
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

// album prop not used internally; onBack omitted — back navigation via GalleryBreadcrumbs
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
```

- [ ] **Step 2: Append mosaic CSS to `gallery.css`**

Add at the end of `src/styles/sections/gallery.css`:

```css
/* ==================== ALBUM MOSAIC ==================== */
.album-mosaic {
  animation: fadeIn 0.25s ease;
}

.mosaic-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-border);
}

.mosaic-tile {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
  background: var(--color-border);
  border: none;
  padding: 0;
}

.mosaic-tile--first {
  grid-column: span 2;
  grid-row: span 2;
  aspect-ratio: auto;
}

.mosaic-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.2s ease;
}

.mosaic-tile:hover img {
  transform: scale(1.04);
}

.mosaic-tile-placeholder {
  width: 100%;
  height: 100%;
  background: #1a1a1a;
}

/* Video overlay */
.mosaic-play-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.28);
  transition: background 0.2s;
}

.mosaic-tile:hover .mosaic-play-overlay {
  background: rgba(0, 0, 0, 0.4);
}

.mosaic-play-btn {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1a1a1a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.mosaic-tile--first .mosaic-play-btn {
  width: 48px;
  height: 48px;
}

.mosaic-tile--first .mosaic-play-btn svg {
  width: 22px;
  height: 22px;
}

.mosaic-video-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.03em;
  backdrop-filter: blur(4px);
}

.mosaic-video-badge--yt {
  background: rgba(220, 0, 0, 0.8);
}

/* Overflow tile */
.mosaic-tile--overflow {
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mosaic-tile--overflow span {
  color: white;
  font-size: 1.1rem;
  font-weight: 700;
}

@media (max-width: 480px) {
  .mosaic-play-btn {
    width: 28px;
    height: 28px;
  }
  .mosaic-tile--first .mosaic-play-btn {
    width: 38px;
    height: 38px;
  }
}
```

- [ ] **Step 3: Quick visual check**

Temporarily import and render `AlbumMosaic` in any page with mock data to verify layout:
- Grid renders with first tile spanning 2×2
- Video tile shows ▶ overlay
- PDF tile shows document icon overlay
- Overflow tile shows `+N` when more than 6 items
Then remove the temporary render before committing.

- [ ] **Step 4: Commit**

```bash
git add src/components/gallery/viewer/AlbumMosaic.jsx src/styles/sections/gallery.css
git commit -m "feat(gallery): add AlbumMosaic grid component"
```

---

## Chunk 3: Wire up mosaic in InstitutionalGallery + Breadcrumbs

### Task 3: Update `GalleryBreadcrumbs` for mosaic level

**Files:**
- Modify: `src/components/gallery/shared/GalleryBreadcrumbs.jsx`

- [ ] **Step 1: Add `currentView` prop**

Replace the entire content of `GalleryBreadcrumbs.jsx` with:

```jsx
const GalleryBreadcrumbs = ({ category, album, currentView, onNavigate }) => {
  return (
    <div className="gallery-breadcrumbs">
      <button
        onClick={() => onNavigate('categories')}
        className="breadcrumb-link"
      >
        Galería
      </button>

      {category && (
        <>
          <span className="breadcrumb-separator">/</span>
          {!album ? (
            <span className="breadcrumb-current">{category.name}</span>
          ) : (
            <button
              onClick={() => onNavigate('albums', category)}
              className="breadcrumb-link"
            >
              {category.name}
            </button>
          )}
        </>
      )}

      {album && (
        <>
          <span className="breadcrumb-separator">/</span>
          {currentView === 'media' ? (
            <button
              onClick={() => onNavigate('mosaic')}
              className="breadcrumb-link"
            >
              {album.name}
            </button>
          ) : (
            <span className="breadcrumb-current">{album.name}</span>
          )}
        </>
      )}
    </div>
  );
};

export default GalleryBreadcrumbs;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gallery/shared/GalleryBreadcrumbs.jsx
git commit -m "feat(gallery): breadcrumbs support mosaic view level"
```

---

### Task 4: Update `InstitutionalGallery` — add `'mosaic'` view state

**Files:**
- Modify: `src/pages/shared/InstitutionalGallery.jsx`

- [ ] **Step 1: Replace `InstitutionalGallery.jsx`**

Replace the entire file with the following. Key changes from current:
- Import `AlbumMosaic`
- `handleSelectAlbum` → sets `currentView = 'mosaic'` (not `'media'`)
- `handleCloseMedia` → returns to `'mosaic'`, preserves `selectedAlbum` + `mediaItems`
- `handleNavigate('mosaic')` → only sets view, preserves album/media state
- Deep link handler → sets `currentView = 'mosaic'`
- `GalleryBreadcrumbs` receives `currentView` prop
- New `'mosaic'` render block

```jsx
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import CategoryGrid from '../../components/gallery/viewer/CategoryGrid';
import AlbumGrid from '../../components/gallery/viewer/AlbumGrid';
import AlbumMosaic from '../../components/gallery/viewer/AlbumMosaic';
import GalleryBreadcrumbs from '../../components/gallery/shared/GalleryBreadcrumbs';
import { InstitutionalLightbox } from '../../components/gallery/shared/InstitutionalLightbox';
import { institutionalGalleryService } from '../../services/institutionalGallery.service';
import { useAuth } from '../../hooks/useAuth';

const InstitutionalGallery = () => {
  const location = useLocation();
  const { role } = useAuth();
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

      <GalleryBreadcrumbs
        category={selectedCategory}
        album={selectedAlbum}
        currentView={currentView}
        onNavigate={handleNavigate}
      />

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
            album={selectedAlbum}
            items={mediaItems}
            loading={loadingMedia}
            onSelectItem={handleSelectMedia}
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
```

- [ ] **Step 2: Verify the full flow**

Run `npm run dev` and test:
1. Galería → click category → see feed-list of albums ✓
2. Click an album → see mosaic grid (not lightbox directly) ✓
3. Breadcrumb shows: `Galería / Ambiente / Marzo` (Marzo not clickable in mosaic) ✓
4. Click a photo tile → opens lightbox at correct position ✓
5. Breadcrumb in lightbox: `Galería / Ambiente / Marzo` (Marzo IS clickable) ✓
6. Click "Marzo" in lightbox breadcrumb → returns to mosaic (album + photos preserved) ✓
7. Close lightbox (×) → returns to mosaic ✓
8. Videos show ▶ overlay; YT videos show red "YT" badge ✓
9. Overflow tile shows `+N` when album has more than 6 items ✓
10. Deep link with `?albumId=...` → lands on mosaic, not lightbox ✓

- [ ] **Step 3: Commit**

```bash
git add src/pages/shared/InstitutionalGallery.jsx
git commit -m "feat(gallery): insert mosaic view between album list and lightbox"
```
