# Gallery Album Views — Design Spec
Date: 2026-03-11

## Summary

Improve the gallery experience for families with two focused changes:
1. Replace the album card grid with a feed-style list showing 3–4 thumbnails per row.
2. Insert a mosaic grid view between the album list and the carousel (lightbox).

---

## Change 1: AlbumGrid → Feed List

**Current:** `AlbumGrid` renders albums as large cards (one image + title + date).

**New:** Each album is a horizontal row with:
- 4 fixed small square thumbnail slots. Only `album.thumbUrl` is available per album; slots 2–4 are neutral grey placeholders.
- Album name (bold)
- Date (small, secondary)
- Right arrow `›`
- `album.description` is intentionally omitted to keep rows compact.

**Interaction:** clicking anywhere on the row calls `onSelectAlbum(album)`.

---

## Change 2: New `'mosaic'` view state in `InstitutionalGallery`

A new view `'mosaic'` is inserted between `'albums'` and `'media'`:

```
categories → albums → [mosaic] → media (lightbox)
```

### State transitions

| Action | From | To | State changes |
|---|---|---|---|
| Click album in list | `albums` | `mosaic` | loads `mediaItems`, sets `selectedAlbum` |
| Click tile in mosaic | `mosaic` | `media` | sets `selectedMediaIndex` |
| Close lightbox (`onClose`) | `media` | `mosaic` | clears `selectedMediaIndex` to 0; **preserves** `selectedAlbum` and `mediaItems` |
| Click album name in breadcrumb | `media` | `mosaic` | same as above; `selectedAlbum` and `mediaItems` preserved |
| Click category in breadcrumb | any | `albums` | clears `selectedAlbum`, `mediaItems`, `selectedMediaIndex` |

### Deep link update

`handleSelectAlbum` called from the deep link handler must set `currentView = 'mosaic'` (not `'media'`). The deep link lands on the mosaic, not the lightbox.

### `handleNavigate('mosaic')` behavior

When called, only set `currentView = 'mosaic'`. Do NOT clear `selectedAlbum` or `mediaItems`.

### `handleCloseMedia` updated behavior

```
setCurrentView('mosaic')
setSelectedMediaIndex(0)
// Do NOT clear selectedAlbum or mediaItems
```

---

## Change 3: `AlbumMosaic` component

**File:** `src/components/gallery/viewer/AlbumMosaic.jsx`

**Props:** `{ items, loading, onSelectItem }` — back navigation is handled by `GalleryBreadcrumbs`, not the mosaic itself.

### Layout

CSS grid, 3-column. First tile spans 2 columns and 2 rows. Remaining tiles are 1×1.

Show up to 5 tiles + 1 overflow tile if `items.length > 6`.
- Overflow tile displays `+(items.length - 5)` and clicking it opens the lightbox at index 5.
- If `items.length <= 6`, show all tiles with no overflow.

### Tile rendering by `item.tipo`

| `tipo` | Thumbnail source | Overlay |
|---|---|---|
| `'imagen'` | `item.thumbUrl \|\| item.url` | none |
| `'video'` | none (dark grey `#1a1a1a` background) | ▶ white play icon centered |
| `'video-externo'` | `item.thumbUrl` (stored at upload time); fallback: dark bg | ▶ play icon + badge with `item.provider === 'youtube' ? 'YT' : 'Vimeo'` |
| `'pdf'` | none (neutral background) | document icon |

### Empty state

If `items` is empty and `loading` is false, render a centered message: "No hay archivos en este álbum".

---

## Change 4: `GalleryBreadcrumbs` — `currentView` prop

Add a `currentView` prop. Use it to decide whether the album name crumb is a link or the current page:

- `currentView === 'mosaic'`: album name is **current** (not clickable)
- `currentView === 'media'`: album name is a **link** that calls `onNavigate('mosaic')`

No change for the category crumb behavior.

---

## Files to modify

| File | Change |
|---|---|
| `src/pages/shared/InstitutionalGallery.jsx` | Add `'mosaic'` view state; update `handleSelectAlbum`, `handleCloseMedia`, `handleNavigate`, deep link handler, breadcrumbs call, and render |
| `src/components/gallery/viewer/AlbumGrid.jsx` | Redesign to feed-list style |
| `src/components/gallery/shared/GalleryBreadcrumbs.jsx` | Accept `currentView` prop; make album crumb a link when `currentView === 'media'` |

## New file

| File | Purpose |
|---|---|
| `src/components/gallery/viewer/AlbumMosaic.jsx` | Photo/video mosaic grid for album content |
