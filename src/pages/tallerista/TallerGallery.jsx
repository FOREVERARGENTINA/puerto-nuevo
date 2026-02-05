import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { talleresService } from '../../services/talleres.service';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = '50MB';
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
  'mp4', 'mov', 'webm', 'ogv'
]);
const BLOCKED_EXTENSIONS = new Set(['zip', 'exe', 'bat']);
const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];

export function TallerGallery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [talleres, setTalleres] = useState([]);
  const [selectedTaller, setSelectedTaller] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [albumName, setAlbumName] = useState('');
  const [albumSaving, setAlbumSaving] = useState(false);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const confirmDialog = useDialog();
  const alertDialog = useDialog();

  const loadAlbums = async (tallerId) => {
    setAlbumsLoading(true);
    const result = await talleresService.getAlbums(tallerId);
    if (result.success) {
      setAlbums(result.albums || []);
    } else {
      setAlbums([]);
    }
    setAlbumsLoading(false);
  };

  const loadAlbumMedia = async (tallerId, albumId) => {
    setGalleryLoading(true);
    const result = await talleresService.getAlbumMedia(tallerId, albumId);
    if (result.success) {
      setGallery(result.items || []);
    } else {
      setGallery([]);
    }
    setGalleryLoading(false);
  };

  const selectTaller = async (taller) => {
    setSelectedTaller(taller);
    setSelectedAlbum(null);
    setGallery([]);
    await loadAlbums(taller.id);
  };

  const loadTalleres = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    const result = await talleresService.getTalleresByTallerista(user.uid);

    if (result.success) {
      setTalleres(result.talleres);
      if (result.talleres.length > 0 && !selectedTaller) {
        await selectTaller(result.talleres[0]);
      }
    }
    setLoading(false);
  }, [user, selectedTaller]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTalleres();
  }, [loadTalleres]);

  const header = (
    <div className="dashboard-header dashboard-header--compact">
      <div>
        <h1 className="dashboard-title">Galeria de talleres</h1>
        <p className="dashboard-subtitle">Administra los albums y sus archivos.</p>
      </div>
      <button onClick={() => navigate(-1)} className="btn btn--outline">
        Volver
      </button>
    </div>
  );

  const validateFiles = (selectedFiles) => {
    const validFiles = [];
    let hasInvalidType = false;
    let hasBlockedType = false;
    let hasOversize = false;

    selectedFiles.forEach((file) => {
      const name = (file.name || '').toLowerCase();
      const ext = name.includes('.') ? name.split('.').pop() : '';
      const type = (file.type || '').toLowerCase();
      const isBlocked = ext && BLOCKED_EXTENSIONS.has(ext);
      const isAllowedExt = ext && ALLOWED_EXTENSIONS.has(ext);
      const isAllowedMime = type
        ? ALLOWED_MIME_PREFIXES.some(prefix => type.startsWith(prefix))
        : false;

      if (isBlocked) {
        hasBlockedType = true;
        return;
      }
      if (!isAllowedExt && !isAllowedMime) {
        hasInvalidType = true;
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        hasOversize = true;
        return;
      }
      validFiles.push(file);
    });

    return { validFiles, hasInvalidType, hasBlockedType, hasOversize };
  };

  const handleFilesChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const { validFiles, hasInvalidType, hasBlockedType, hasOversize } = validateFiles(selectedFiles);

    if (hasInvalidType || hasBlockedType || hasOversize) {
      let message = '';
      if (hasInvalidType || hasBlockedType) {
        message = 'Solo se permiten imagenes o videos. Bloqueados: .zip, .exe, .bat.';
      }
      if (hasOversize) {
        message = `${message ? `${message} ` : ''}Algunos archivos superan el limite de ${MAX_FILE_SIZE_LABEL}.`;
      }
      alertDialog.openDialog({
        title: 'Archivo no valido',
        message,
        type: 'warning'
      });
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
    }

    e.target.value = null;
  };

  const handleCreateAlbum = async () => {
    if (!selectedTaller?.id) return;
    if (!albumName.trim()) {
      alertDialog.openDialog({
        title: 'Nombre requerido',
        message: 'El nombre del album es obligatorio.',
        type: 'warning'
      });
      return;
    }

    setAlbumSaving(true);
    const result = await talleresService.createAlbum(selectedTaller.id, albumName, user?.uid);
    if (result.success) {
      setAlbumName('');
      await loadAlbums(selectedTaller.id);
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error || 'No se pudo crear el album.',
        type: 'error'
      });
    }
    setAlbumSaving(false);
  };

  const handleSelectAlbum = async (album) => {
    if (!selectedTaller?.id || !album?.id) return;
    setSelectedAlbum(album);
    setFiles([]);
    await loadAlbumMedia(selectedTaller.id, album.id);
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
    setGallery([]);
    setFiles([]);
  };

  const handleUpload = async () => {
    if (!selectedTaller?.id || !selectedAlbum?.id) return;
    if (files.length === 0) {
      alertDialog.openDialog({
        title: 'Archivos requeridos',
        message: 'Selecciona al menos un archivo para subir.',
        type: 'warning'
      });
      return;
    }

    setUploading(true);
    const result = await talleresService.uploadAlbumMedia(selectedTaller.id, selectedAlbum.id, files, user?.uid);
    if (result.success) {
      setFiles([]);
      await loadAlbumMedia(selectedTaller.id, selectedAlbum.id);
      await loadAlbums(selectedTaller.id);
      alertDialog.openDialog({
        title: 'Exito',
        message: 'Archivos subidos correctamente',
        type: 'success'
      });
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error || 'No se pudo subir el archivo.',
        type: 'error'
      });
    }
    setUploading(false);
  };

  const handleDelete = (item) => {
    if (!selectedTaller?.id || !selectedAlbum?.id) return;
    confirmDialog.openDialog({
      title: 'Eliminar elemento',
      message: '¿Estas seguro de eliminar este elemento?',
      type: 'danger',
      onConfirm: async () => {
        setDeletingId(item.id || item.fileName || 'deleting');
        const result = await talleresService.deleteAlbumMedia(selectedTaller.id, selectedAlbum.id, item);
        if (!result.success) {
          alertDialog.openDialog({
            title: 'Error',
            message: result.error || 'No se pudo eliminar el elemento.',
            type: 'error'
          });
        } else {
          await loadAlbumMedia(selectedTaller.id, selectedAlbum.id);
        }
        setDeletingId(null);
      }
    });
  };

  if (loading) {
    return (
      <div className="container page-container">
        {header}
        <div className="card">
          <div className="card__body">
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (talleres.length === 0) {
    return (
      <div className="container page-container">
        {header}
        <div className="card">
          <div className="card__body">
            <div className="alert alert--warning">
              <strong>No tienes talleres asignados</strong>
              <p>Contacta con la direccion para que te asignen uno o mas talleres.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-container">
      {header}
      <div className="card">
        <div className="card__body">
          {talleres.length > 1 && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label htmlFor="taller-select" style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 'bold' }}>
                Selecciona un taller:
              </label>
              <select
                id="taller-select"
                value={selectedTaller?.id || ''}
                onChange={(e) => {
                  const taller = talleres.find(t => t.id === e.target.value);
                  if (taller) selectTaller(taller);
                }}
                className="form-select"
                style={{ maxWidth: '400px' }}
              >
                {talleres.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedTaller && (
            <div>
              <h2 style={{ marginBottom: 'var(--spacing-md)' }}>{selectedTaller.nombre}</h2>

              <div className="card card--warm" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div className="card__body">
                  <div className="form-group">
                    <label>Nuevo album *</label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={albumName}
                        onChange={(e) => setAlbumName(e.target.value)}
                        placeholder="Nombre del album"
                      />
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={handleCreateAlbum}
                        disabled={albumSaving || !albumName.trim()}
                      >
                        {albumSaving ? 'Creando...' : 'Crear album'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {selectedAlbum ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                    <div>
                      <strong>{selectedAlbum.name}</strong>
                      <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
                        Archivos del album seleccionado.
                      </p>
                    </div>
                    <button type="button" className="btn btn--outline btn--sm" onClick={handleBackToAlbums}>
                      Volver a albumes
                    </button>
                  </div>

                  <div className="card card--warm" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card__body">
                      <div className="form-group">
                        <label>Subir archivos</label>
                        <input
                          type="file"
                          multiple
                          className="form-input"
                          accept="image/*,video/*,.heic,.heif,.webp,.webm,.mov"
                          onChange={handleFilesChange}
                          disabled={uploading}
                        />
                      </div>
                      {files.length > 0 && (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {files.map((file, index) => (
                            <li key={`${file.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{file.name}</span>
                              <button type="button" className="btn btn--link" onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}>
                                Quitar
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={handleUpload}
                        disabled={uploading || files.length === 0}
                      >
                        {uploading ? 'Subiendo...' : 'Subir al album'}
                      </button>
                    </div>
                  </div>

                  {galleryLoading ? (
                    <p>Cargando album...</p>
                  ) : gallery.length === 0 ? (
                    <div className="alert alert--info">
                      <p>No hay elementos en este album.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--spacing-md)' }}>
                      {gallery.map(item => (
                        <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                          {item.tipo === 'imagen' ? (
                            <img
                              src={item.url}
                              alt="Galeria"
                              style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                            />
                          ) : (
                            <video
                              src={item.url}
                              controls
                              style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                            />
                          )}
                          <div style={{ padding: 'var(--spacing-sm)' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-xs)' }}>
                              {item.createdAt?.toDate?.().toLocaleDateString?.('es-AR') || 'Fecha desconocida'}
                            </p>
                            <button
                              onClick={() => handleDelete(item)}
                              className="btn btn--sm btn--danger"
                              style={{ width: '100%' }}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {albumsLoading ? (
                    <p>Cargando albums...</p>
                  ) : albums.length === 0 ? (
                    <div className="alert alert--info">
                      <p>No hay albums creados todavia.</p>
                    </div>
                  ) : (
                    <div className="talleres-albums-grid">
                      {albums.map(album => {
                        const createdAt = album.createdAt?.toDate ? album.createdAt.toDate() : new Date(album.createdAt);
                        const createdLabel = Number.isNaN(createdAt.getTime()) ? '' : createdAt.toLocaleDateString('es-AR');
                        return (
                        <button
                          key={album.id}
                          type="button"
                          className="talleres-album-card"
                          onClick={() => handleSelectAlbum(album)}
                        >
                          <div
                            className="talleres-album-card__thumb"
                            style={album.thumbUrl ? { backgroundImage: `url(${album.thumbUrl})` } : undefined}
                          />
                          <div className="talleres-album-card__title">{album.name}</div>
                          {createdLabel && (
                            <div className="talleres-album-card__meta">{createdLabel}</div>
                          )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.closeDialog}
        onConfirm={confirmDialog.dialogData.onConfirm}
        title={confirmDialog.dialogData.title}
        message={confirmDialog.dialogData.message}
        type={confirmDialog.dialogData.type}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={alertDialog.closeDialog}
        title={alertDialog.dialogData.title}
        message={alertDialog.dialogData.message}
        type={alertDialog.dialogData.type}
      />
    </div>
  );
}
