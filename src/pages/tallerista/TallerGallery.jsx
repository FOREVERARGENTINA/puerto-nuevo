import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { talleresService } from '../../services/talleres.service';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AlertDialog } from '../../components/common/AlertDialog';
import { LoadingModal } from '../../components/common/LoadingModal';
import { useDialog } from '../../hooks/useDialog';
import {
  compressImage,
  validateVideoFile,
  parseVideoUrl
} from '../../utils/galleryHelpers';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = '20MB';
const ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
  'mp4', 'mov', 'webm', 'ogv'
]);
const BLOCKED_EXTENSIONS = new Set(['zip', 'exe', 'bat']);
const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
const RESOURCE_ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'rtf', 'odt', 'ods', 'odp'
]);
const RESOURCE_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation'
]);

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
  const [compressing, setCompressing] = useState(false);
  const [files, setFiles] = useState([]);
  const [externalVideos, setExternalVideos] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
  const [deletingId, setDeletingId] = useState(null);
  const [workspaceTab, setWorkspaceTab] = useState('gallery');
  const [resourcePosts, setResourcePosts] = useState([]);
  const [resourcePostsLoading, setResourcePostsLoading] = useState(false);
  const [resourcePublishing, setResourcePublishing] = useState(false);
  const [resourceDeletingId, setResourceDeletingId] = useState(null);
  const [resourceForm, setResourceForm] = useState({ title: '', description: '' });
  const [resourceFiles, setResourceFiles] = useState([]);
  const [resourceLinkInput, setResourceLinkInput] = useState('');
  const [resourceLinks, setResourceLinks] = useState([]);

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

  const loadResourcePosts = async (tallerId) => {
    setResourcePostsLoading(true);
    const result = await talleresService.getResourcePosts(tallerId);
    if (result.success) {
      setResourcePosts(result.posts || []);
    } else {
      setResourcePosts([]);
    }
    setResourcePostsLoading(false);
  };

  const selectTaller = async (taller) => {
    setSelectedTaller(taller);
    setSelectedAlbum(null);
    setGallery([]);
    setResourceForm({ title: '', description: '' });
    setResourceFiles([]);
    setResourceLinks([]);
    setResourceLinkInput('');
    await Promise.all([
      loadAlbums(taller.id),
      loadResourcePosts(taller.id)
    ]);
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

  const handleFilesChange = async (e) => {
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

    if (validFiles.length === 0) {
      e.target.value = null;
      return;
    }

    // Separar imágenes y videos
    const images = validFiles.filter(f => f.type.startsWith('image/'));
    const videos = validFiles.filter(f => f.type.startsWith('video/'));

    // Validar videos por duración
    const validatedVideos = [];
    for (const video of videos) {
      const validation = await validateVideoFile(video);

      if (!validation.valid) {
        if (validation.error === 'duration') {
          const minutes = Math.floor(validation.duration / 60);
          const seconds = validation.duration % 60;
          alertDialog.openDialog({
            title: 'Video muy largo',
            message: `El video "${video.name}" dura ${minutes}:${seconds.toString().padStart(2, '0')} min.\n\nPara mantener la plataforma rápida, videos largos deben compartirse vía YouTube (no listado).\n\nMáximo: 2 minutos`,
            type: 'warning'
          });
        } else if (validation.error === 'size') {
          const sizeMB = (validation.size / (1024 * 1024)).toFixed(1);
          alertDialog.openDialog({
            title: 'Video muy pesado',
            message: `El video "${video.name}" pesa ${sizeMB}MB.\n\nPara mantener la plataforma rápida, el tamaño máximo es ${MAX_FILE_SIZE_LABEL}.\n\nConsidera usar YouTube para videos grandes.`,
            type: 'warning'
          });
        }
      } else {
        validatedVideos.push(video);
      }
    }

    // Comprimir imágenes
    let processedImages = images;
    if (images.length > 0) {
      setCompressing(true);
      try {
        const compressionPromises = images.map(async (img) => {
          const compressed = await compressImage(img);
          return compressed;
        });

        processedImages = await Promise.all(compressionPromises);

        if (images.length > 0) {
          alertDialog.openDialog({
            title: 'Imágenes optimizadas',
            message: `${images.length} imagen(es) optimizada(s) automáticamente`,
            type: 'success'
          });
        }
      } catch (error) {
        console.error('Error compressing images:', error);
        processedImages = images;
      } finally {
        setCompressing(false);
      }
    }

    if (processedImages.length > 0 || validatedVideos.length > 0) {
      setFiles(prev => [...prev, ...processedImages, ...validatedVideos]);
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
    setExternalVideos([]);
    setVideoUrl('');
    await loadAlbumMedia(selectedTaller.id, album.id);
  };

  const handleBackToAlbums = () => {
    setSelectedAlbum(null);
    setGallery([]);
    setFiles([]);
    setExternalVideos([]);
    setVideoUrl('');
  };

  const handleAddVideoUrl = () => {
    if (!videoUrl.trim()) {
      alertDialog.openDialog({
        title: 'URL requerida',
        message: 'Ingrese una URL de video',
        type: 'warning'
      });
      return;
    }

    const parsed = parseVideoUrl(videoUrl);

    if (!parsed.valid) {
      alertDialog.openDialog({
        title: 'URL no válida',
        message: parsed.error || 'URL de video no válida. Solo se aceptan YouTube y Vimeo.',
        type: 'error'
      });
      return;
    }

    setExternalVideos(prev => [...prev, {
      ...parsed,
      originalUrl: videoUrl.trim()
    }]);

    setVideoUrl('');
    alertDialog.openDialog({
      title: 'Video agregado',
      message: `Video de ${parsed.provider === 'youtube' ? 'YouTube' : 'Vimeo'} agregado correctamente`,
      type: 'success'
    });
  };

  const handleRemoveExternalVideo = (index) => {
    setExternalVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleResourceFilesChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const validFiles = [];
    const rejectedMessages = [];

    selectedFiles.forEach((file) => {
      const lowerName = (file.name || '').toLowerCase();
      const extension = lowerName.includes('.') ? lowerName.split('.').pop() : '';
      const mimeType = (file.type || '').toLowerCase();

      if (extension && BLOCKED_EXTENSIONS.has(extension)) {
        rejectedMessages.push(`${file.name}: extension no permitida`);
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        rejectedMessages.push(`${file.name}: supera ${MAX_FILE_SIZE_LABEL}`);
        return;
      }

      const validByExtension = extension && RESOURCE_ALLOWED_EXTENSIONS.has(extension);
      const validByMimeType = mimeType && RESOURCE_ALLOWED_MIME_TYPES.has(mimeType);
      if (!validByExtension && !validByMimeType) {
        rejectedMessages.push(`${file.name}: tipo no permitido`);
        return;
      }

      validFiles.push(file);
    });

    if (rejectedMessages.length > 0) {
      alertDialog.openDialog({
        title: 'Algunos archivos no son validos',
        message: rejectedMessages.slice(0, 4).join('\n'),
        type: 'warning'
      });
    }

    if (validFiles.length > 0) {
      setResourceFiles((prev) => [...prev, ...validFiles]);
    }

    e.target.value = null;
  };

  const handleAddResourceLink = () => {
    const raw = resourceLinkInput.trim();
    if (!raw) return;

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      alertDialog.openDialog({
        title: 'Link no valido',
        message: 'Ingrese una URL valida con http o https.',
        type: 'warning'
      });
      return;
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      alertDialog.openDialog({
        title: 'Link no valido',
        message: 'Solo se permiten links con protocolo http o https.',
        type: 'warning'
      });
      return;
    }

    const normalizedUrl = parsed.toString();
    const exists = resourceLinks.some((link) => link.url === normalizedUrl);
    if (exists) {
      setResourceLinkInput('');
      return;
    }

    setResourceLinks((prev) => [
      ...prev,
      {
        url: normalizedUrl,
        label: parsed.hostname
      }
    ]);
    setResourceLinkInput('');
  };

  const handleRemoveResourceFile = (index) => {
    setResourceFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveResourceLink = (index) => {
    setResourceLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublishResourcePost = async () => {
    if (!selectedTaller?.id || !user?.uid) return;

    const title = resourceForm.title.trim();
    if (!title) {
      alertDialog.openDialog({
        title: 'Titulo requerido',
        message: 'Ingrese un titulo para la publicacion.',
        type: 'warning'
      });
      return;
    }

    if (resourceFiles.length === 0 && resourceLinks.length === 0) {
      alertDialog.openDialog({
        title: 'Contenido requerido',
        message: 'Agrega al menos un archivo o un link.',
        type: 'warning'
      });
      return;
    }

    setResourcePublishing(true);
    const result = await talleresService.createResourcePost(selectedTaller.id, {
      title,
      description: resourceForm.description,
      files: resourceFiles,
      links: resourceLinks,
      createdBy: user.uid,
      createdByName: user.displayName || user.email || ''
    });

    if (!result.success) {
      setResourcePublishing(false);
      alertDialog.openDialog({
        title: 'Error al publicar',
        message: result.error || 'No se pudo publicar el recurso.',
        type: 'error'
      });
      return;
    }

    setResourceForm({ title: '', description: '' });
    setResourceFiles([]);
    setResourceLinks([]);
    setResourceLinkInput('');
    await loadResourcePosts(selectedTaller.id);
    setResourcePublishing(false);
    alertDialog.openDialog({
      title: 'Publicado',
      message: 'El recurso se publico correctamente.',
      type: 'success'
    });
  };

  const handleDeleteResourcePost = (post) => {
    if (!selectedTaller?.id || !post?.id) return;

    confirmDialog.openDialog({
      title: 'Eliminar publicacion',
      message: 'Se eliminara esta publicacion y sus archivos adjuntos. Esta accion no se puede deshacer.',
      type: 'danger',
      onConfirm: async () => {
        setResourceDeletingId(post.id);
        const result = await talleresService.deleteResourcePost(selectedTaller.id, post.id, post.items || []);
        setResourceDeletingId(null);

        if (!result.success) {
          alertDialog.openDialog({
            title: 'No se pudo eliminar',
            message: result.error || 'Error eliminando la publicacion.',
            type: 'error'
          });
          return;
        }

        if (Array.isArray(result.warnings) && result.warnings.length > 0) {
          alertDialog.openDialog({
            title: 'Publicacion eliminada con avisos',
            message: result.warnings.slice(0, 3).join('\n'),
            type: 'warning'
          });
        }

        await loadResourcePosts(selectedTaller.id);
      }
    });
  };

  const handleUpload = async () => {
    if (!selectedTaller?.id || !selectedAlbum?.id) return;

    const hasFiles = files.length > 0;
    const hasUrls = externalVideos.length > 0;

    if (!hasFiles && !hasUrls) {
      alertDialog.openDialog({
        title: 'Contenido requerido',
        message: 'Selecciona archivos o agrega URLs de video.',
        type: 'warning'
      });
      return;
    }

    setUploading(true);

    try {
      let uploadResults = [];
      let hasError = false;

      // Subir archivos
      if (hasFiles) {
        const result = await talleresService.uploadAlbumMedia(selectedTaller.id, selectedAlbum.id, files, user?.uid);
        if (result.success) {
          uploadResults = [...uploadResults, ...(result.items || [])];
        } else {
          hasError = true;
          alertDialog.openDialog({
            title: 'Error',
            message: result.error || 'No se pudieron subir los archivos.',
            type: 'error'
          });
        }
      }

      // Guardar URLs externas
      if (hasUrls && !hasError) {
        for (const video of externalVideos) {
          const result = await talleresService.saveExternalVideo(selectedTaller.id, selectedAlbum.id, video, user?.uid);
          if (result.success) {
            uploadResults.push({ id: result.id, type: 'external-video' });
          } else {
            hasError = true;
            alertDialog.openDialog({
              title: 'Error',
              message: `No se pudo guardar el video: ${result.error}`,
              type: 'error'
            });
          }
        }
      }

      if (uploadResults.length > 0) {
        setFiles([]);
        setExternalVideos([]);
        await loadAlbumMedia(selectedTaller.id, selectedAlbum.id);
        await loadAlbums(selectedTaller.id);
        alertDialog.openDialog({
          title: 'Éxito',
          message: `${uploadResults.length} elemento(s) subido(s) correctamente`,
          type: 'success'
        });
      }
    } catch (error) {
      alertDialog.openDialog({
        title: 'Error',
        message: 'Error inesperado: ' + error.message,
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
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

              <div className="tabs" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <button
                  className={`tab ${workspaceTab === 'gallery' ? 'active' : ''}`}
                  onClick={() => setWorkspaceTab('gallery')}
                >
                  Galeria
                </button>
                <button
                  className={`tab ${workspaceTab === 'resources' ? 'active' : ''}`}
                  onClick={() => {
                    setWorkspaceTab('resources');
                    setSelectedAlbum(null);
                  }}
                >
                  Recursos
                </button>
              </div>

              {workspaceTab === 'gallery' && (
                <>
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
                      {/* Tabs */}
                      <div className="tabs" style={{ marginBottom: 'var(--spacing-md)' }}>
                        <button
                          className={`tab ${uploadMode === 'file' ? 'active' : ''}`}
                          onClick={() => setUploadMode('file')}
                        >
                          Subir Archivos
                        </button>
                        <button
                          className={`tab ${uploadMode === 'url' ? 'active' : ''}`}
                          onClick={() => setUploadMode('url')}
                        >
                          Video Externo
                        </button>
                      </div>

                      {/* File Upload Mode */}
                      {uploadMode === 'file' && (
                        <div className="form-group">
                          <label>Subir archivos</label>
                          <input
                            type="file"
                            multiple
                            className="form-input"
                            accept="image/*,video/*,.heic,.heif,.webp,.webm,.mov"
                            onChange={handleFilesChange}
                            disabled={uploading || compressing}
                          />
                          <small style={{ display: 'block', marginTop: 'var(--spacing-xs)', color: 'var(--color-text-light)' }}>
                            Imágenes (se optimizan auto), videos cortos (&lt;2 min) • Máx {MAX_FILE_SIZE_LABEL}
                          </small>
                          {compressing && (
                            <p style={{ marginTop: 'var(--spacing-xs)', color: 'var(--color-primary)' }}>
                              ⏳ Optimizando imágenes...
                            </p>
                          )}
                        </div>
                      )}

                      {/* URL Upload Mode */}
                      {uploadMode === 'url' && (
                        <div className="form-group">
                          <label>URL de video (YouTube o Vimeo)</label>
                          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-xs)' }}>
                            Para videos largos, subilo a YouTube o Vimeo como 'No listado' y pegá la URL acá.
                          </p>
                          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <input
                              type="url"
                              className="form-input"
                              placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
                              value={videoUrl}
                              onChange={(e) => setVideoUrl(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddVideoUrl()}
                            />
                            <button
                              type="button"
                              className="btn btn--secondary"
                              onClick={handleAddVideoUrl}
                              disabled={!videoUrl.trim()}
                            >
                              Agregar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Files List */}
                      {files.length > 0 && (
                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                          <strong>Archivos seleccionados ({files.length})</strong>
                          <ul style={{ listStyle: 'none', padding: 0, marginTop: 'var(--spacing-xs)' }}>
                            {files.map((file, index) => (
                              <li key={`${file.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-xs) 0' }}>
                                <span>{file.name}</span>
                                <button
                                  type="button"
                                  className="btn btn--link"
                                  onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                                  disabled={uploading}
                                >
                                  Quitar
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* External Videos List */}
                      {externalVideos.length > 0 && (
                        <div style={{ marginTop: 'var(--spacing-md)' }}>
                          <strong>Videos externos agregados ({externalVideos.length})</strong>
                          <ul style={{ listStyle: 'none', padding: 0, marginTop: 'var(--spacing-xs)' }}>
                            {externalVideos.map((video, index) => (
                              <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--spacing-xs) 0' }}>
                                <span>
                                  {video.provider === 'youtube' ? 'YouTube' : 'Vimeo'}: {video.videoId}
                                </span>
                                <button
                                  type="button"
                                  className="btn btn--link"
                                  onClick={() => handleRemoveExternalVideo(index)}
                                  disabled={uploading}
                                >
                                  Quitar
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Upload Button */}
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={handleUpload}
                        disabled={uploading || (files.length === 0 && externalVideos.length === 0)}
                        style={{ marginTop: 'var(--spacing-md)' }}
                      >
                        {uploading ? 'Subiendo...' : `Subir ${files.length + externalVideos.length} elemento(s)`}
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
                        <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                          {item.tipo === 'imagen' ? (
                            <img
                              src={item.url}
                              alt="Galeria"
                              style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                            />
                          ) : item.tipo === 'video-externo' ? (
                            <div style={{ position: 'relative', width: '100%', height: '200px', backgroundColor: '#000' }}>
                              {item.thumbUrl ? (
                                <img
                                  src={item.thumbUrl}
                                  alt="Video thumbnail"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff' }}>
                                  <span style={{ fontSize: '2rem' }}>▶</span>
                                </div>
                              )}
                              <span style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: item.provider === 'youtube' ? '#ff0000' : '#1ab7ea',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold'
                              }}>
                                {item.provider === 'youtube' ? 'YT' : 'VIMEO'}
                              </span>
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#fff',
                                  textDecoration: 'none',
                                  fontSize: '3rem',
                                  opacity: 0.8,
                                  transition: 'opacity 0.2s'
                                }}
                              >
                                ▶
                              </a>
                            </div>
                          ) : (
                            <video
                              src={item.url}
                              controls
                              style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                            />
                          )}
                          <div style={{ padding: 'var(--spacing-sm)' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-xs)' }}>
                              {item.tipo === 'video-externo'
                                ? `Video externo (${item.provider === 'youtube' ? 'YouTube' : 'Vimeo'})`
                                : ''}
                            </p>
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
                </>
              )}

              {workspaceTab === 'resources' && (
                <div>
                  <div className="card card--warm" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    <div className="card__body">
                      <div className="form-group">
                        <label>Titulo *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={resourceForm.title}
                          onChange={(e) => setResourceForm((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Ej: Recursos para casa"
                          maxLength={120}
                        />
                      </div>

                      <div className="form-group">
                        <label>Descripcion</label>
                        <textarea
                          className="form-input"
                          rows={3}
                          value={resourceForm.description}
                          onChange={(e) => setResourceForm((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="Contexto breve para las familias"
                        />
                      </div>

                      <div className="form-group">
                        <label>Archivos (documentos)</label>
                        <input
                          type="file"
                          multiple
                          className="form-input"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp"
                          onChange={handleResourceFilesChange}
                          disabled={resourcePublishing}
                        />
                        <small style={{ color: 'var(--color-text-light)' }}>
                          Formatos permitidos: PDF, Office, OpenDocument, TXT y CSV. Maximo {MAX_FILE_SIZE_LABEL}.
                        </small>
                      </div>

                      {resourceFiles.length > 0 && (
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                          <strong>Archivos agregados ({resourceFiles.length})</strong>
                          <ul style={{ listStyle: 'none', padding: 0, marginTop: 'var(--spacing-xs)' }}>
                            {resourceFiles.map((file, index) => (
                              <li key={`${file.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0' }}>
                                <span>{file.name}</span>
                                <button type="button" className="btn btn--link" onClick={() => handleRemoveResourceFile(index)}>
                                  Quitar
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="form-group">
                        <label>Links</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                          <input
                            type="url"
                            className="form-input"
                            placeholder="https://..."
                            value={resourceLinkInput}
                            onChange={(e) => setResourceLinkInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddResourceLink();
                              }
                            }}
                          />
                          <button type="button" className="btn btn--secondary" onClick={handleAddResourceLink}>
                            Agregar
                          </button>
                        </div>
                      </div>

                      {resourceLinks.length > 0 && (
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                          <strong>Links agregados ({resourceLinks.length})</strong>
                          <ul style={{ listStyle: 'none', padding: 0, marginTop: 'var(--spacing-xs)' }}>
                            {resourceLinks.map((link, index) => (
                              <li key={`${link.url}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)', padding: 'var(--spacing-xs) 0' }}>
                                <a href={link.url} target="_blank" rel="noopener noreferrer">
                                  {link.label || link.url}
                                </a>
                                <button type="button" className="btn btn--link" onClick={() => handleRemoveResourceLink(index)}>
                                  Quitar
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={handlePublishResourcePost}
                        disabled={resourcePublishing}
                      >
                        {resourcePublishing ? 'Publicando...' : 'Publicar recurso'}
                      </button>
                    </div>
                  </div>

                  {resourcePostsLoading ? (
                    <p>Cargando recursos...</p>
                  ) : resourcePosts.length === 0 ? (
                    <div className="alert alert--info">
                      <p>Aun no hay recursos publicados.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                      {resourcePosts.map((post) => {
                        const createdAt = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
                        const createdLabel = Number.isNaN(createdAt?.getTime?.()) ? '' : createdAt.toLocaleDateString('es-AR');
                        const items = Array.isArray(post.items) ? post.items : [];

                        return (
                          <div key={post.id} className="card">
                            <div className="card__body">
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-sm)', alignItems: 'flex-start', marginBottom: 'var(--spacing-sm)' }}>
                                <div>
                                  <h3 className="card__title" style={{ marginBottom: 'var(--spacing-xs)' }}>{post.title}</h3>
                                  {createdLabel && (
                                    <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-xs)' }}>
                                      Publicado el {createdLabel}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  className="btn btn--danger btn--sm"
                                  onClick={() => handleDeleteResourcePost(post)}
                                  disabled={resourceDeletingId === post.id}
                                >
                                  {resourceDeletingId === post.id ? 'Eliminando...' : 'Eliminar'}
                                </button>
                              </div>

                              {post.description && (
                                <p style={{ marginTop: 0, marginBottom: 'var(--spacing-sm)' }}>{post.description}</p>
                              )}

                              {items.length > 0 ? (
                                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--spacing-xs)' }}>
                                  {items.map((item, index) => (
                                    <li key={`${item.url || item.path || index}`}>
                                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                                        {item.kind === 'link' ? 'Link' : 'Archivo'}: {item.label || item.url}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p style={{ margin: 0, color: 'var(--color-text-light)' }}>Sin elementos.</p>
                              )}
                            </div>
                          </div>
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

      <LoadingModal
        isOpen={compressing}
        message="Optimizando imágenes"
        subMessage="Reduciendo tamaño para carga más rápida"
        type="optimize"
      />

      <LoadingModal
        isOpen={uploading}
        message="Subiendo contenido"
        subMessage="Por favor espere..."
        type="upload"
      />

      <LoadingModal
        isOpen={!!deletingId}
        message="Eliminando archivo"
        subMessage="Por favor espere..."
      />

      <LoadingModal
        isOpen={albumSaving}
        message="Creando álbum"
        subMessage="Por favor espere..."
      />

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
