import { useState } from 'react';
import { institutionalGalleryService } from '../../../services/institutionalGallery.service';
import {
  validateGalleryFiles,
  compressImage,
  validateVideoFile,
  parseVideoUrlWithThumbnail,
  isHeicFile,
  convertHeicToJpeg
} from '../../../utils/galleryHelpers';
import { useAuth } from '../../../hooks/useAuth';
import { AlertDialog } from '../../common/AlertDialog';
import { LoadingModal } from '../../common/LoadingModal';

const MediaUploader = ({ category, album, onUploadComplete }) => {
  const { user } = useAuth();
  const [uploadMode, setUploadMode] = useState('file'); // 'file' | 'url'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [externalVideos, setExternalVideos] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionStatus, setConversionStatus] = useState('');
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [alert, setAlert] = useState({ open: false, message: '', type: 'info' });
  const [dragActive, setDragActive] = useState(false);

  const showAlert = (message, type = 'info') => {
    setAlert({ open: true, message, type });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    await validateAndSetFiles(files);
  };

  const validateAndSetFiles = async (files) => {
    const { valid, errors } = validateGalleryFiles(files);

    if (errors.length > 0) {
      showAlert(errors.join('\n'), 'error');
    }

    if (valid.length === 0) return;

    // Separar imágenes y videos para procesamiento
    const images = valid.filter(f => f.type.startsWith('image/') || isHeicFile(f));
    const videos = valid.filter(f => f.type.startsWith('video/'));
    const others = valid.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));

    // Validar videos por duración
    const validatedVideos = [];
    for (const video of videos) {
      const validation = await validateVideoFile(video);

      if (!validation.valid) {
        if (validation.error === 'duration') {
          const minutes = Math.floor(validation.duration / 60);
          const seconds = validation.duration % 60;
          showAlert(
            `Video "${video.name}" dura ${minutes}:${seconds.toString().padStart(2, '0')} min.\n\n` +
            `Para mantener la plataforma rápida y accesible, videos largos deben compartirse vía YouTube (no listado).\n\n` +
            `Máximo: 2 minutos`,
            'warning'
          );
        } else if (validation.error === 'size') {
          const sizeMB = (validation.size / (1024 * 1024)).toFixed(1);
          showAlert(
            `Video "${video.name}" pesa ${sizeMB}MB.\n\n` +
            `Para mantener la plataforma rápida, el tamaño máximo es 20MB.\n\n` +
            `Considera usar YouTube para videos grandes.`,
            'warning'
          );
        }
      } else {
        validatedVideos.push(video);
      }
    }

    // Convertir HEIC/HEIF a JPEG para compatibilidad
    let normalizedImages = images;
    const heicImages = images.filter(isHeicFile);
    if (heicImages.length > 0) {
      setConverting(true);
      setConversionProgress(0);
      setConversionStatus('Preparando archivos HEIC...');
      try {
        normalizedImages = [];
        let convertedCount = 0;
        const totalToConvert = heicImages.length;

        for (const img of images) {
          if (isHeicFile(img)) {
            setConversionStatus(`Convirtiendo ${img.name}`);
            const converted = await convertHeicToJpeg(img);
            normalizedImages.push(converted);
            convertedCount++;
            setConversionProgress(Math.round((convertedCount / totalToConvert) * 100));
          } else {
            normalizedImages.push(img);
          }
        }

        showAlert(`${convertedCount} imagen(es) HEIC convertidas a JPG`, 'success');
      } catch (error) {
        console.error('Error converting HEIC images:', error);
        showAlert('No se pudieron convertir algunas imagenes HEIC. Intenta exportarlas a JPG.', 'warning');
      } finally {
        setConverting(false);
        setConversionProgress(0);
        setConversionStatus('');
      }
    }

    // Comprimir imagenes
    let processedImages = normalizedImages;
    if (normalizedImages.length > 0) {
      setCompressing(true);
      setCompressionProgress(0);
      try {
        processedImages = [];
        let completed = 0;

        for (const img of normalizedImages) {
          const originalSize = img.size;
          const compressed = await compressImage(img);
          const savedPercent = Math.round(((originalSize - compressed.size) / originalSize) * 100);

          if (savedPercent > 10) {
            console.log(`Imagen optimizada: ${(originalSize / (1024 * 1024)).toFixed(2)}MB -> ${(compressed.size / (1024 * 1024)).toFixed(2)}MB (-${savedPercent}%)`);
          }

          processedImages.push(compressed);
          completed++;
          setCompressionProgress(Math.round((completed / normalizedImages.length) * 100));
        }

        if (normalizedImages.length > 0) {
          showAlert('Imágenes optimizadas automáticamente', 'success');
        }
      } catch (error) {
        console.error('Error compressing images:', error);
        processedImages = normalizedImages; // Fallback a originales
      } finally {
        setCompressing(false);
        setCompressionProgress(0);
      }
    }

    setSelectedFiles(prev => [...prev, ...processedImages, ...validatedVideos, ...others]);
  };

  const handleAddVideoUrl = async () => {
    if (!videoUrl.trim()) {
      showAlert('Ingrese una URL de video', 'warning');
      return;
    }

    const parsed = await parseVideoUrlWithThumbnail(videoUrl);

    if (!parsed.valid) {
      showAlert(parsed.error || 'URL de video no válida', 'error');
      return;
    }

    setExternalVideos(prev => [...prev, {
      ...parsed,
      originalUrl: videoUrl.trim()
    }]);

    setVideoUrl('');
    showAlert(`Video de ${parsed.provider === 'youtube' ? 'YouTube' : 'Vimeo'} agregado`, 'success');
  };

  const handleRemoveExternalVideo = (index) => {
    setExternalVideos(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files || []);
    await validateAndSetFiles(files);
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleVideoUrlKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddVideoUrl();
    }
  };

  const handleUpload = async () => {
    const hasFiles = selectedFiles.length > 0;
    const hasUrls = externalVideos.length > 0;

    if (!hasFiles && !hasUrls) {
      showAlert('Seleccione archivos o agregue URLs de video', 'error');
      return;
    }

    if (!album) {
      showAlert('Debe seleccionar un álbum', 'error');
      return;
    }

    setUploading(true);
    const totalItems = selectedFiles.length + externalVideos.length;
    setUploadProgress({ current: 0, total: totalItems });

    try {
      let uploadResults = [];
      let uploadErrors = [];

      // Subir archivos
      if (hasFiles) {
        const result = await institutionalGalleryService.uploadAlbumMedia(
          category.id,
          category.slug,
          album.id,
          selectedFiles,
          user.uid
        );

        if (result.success) {
          uploadResults = [...uploadResults, ...result.results];
          if (result.errors) {
            uploadErrors = [...uploadErrors, ...result.errors];
          }
        } else {
          uploadErrors.push({ error: result.error });
        }
      }

      // Guardar URLs externas
      if (hasUrls) {
        for (const video of externalVideos) {
          const result = await institutionalGalleryService.saveExternalVideo(
            category.id,
            album.id,
            video,
            user.uid
          );

          if (result.success) {
            uploadResults.push({ id: result.id, type: 'external-video' });
          } else {
            uploadErrors.push({ error: result.error, url: video.originalUrl });
          }
        }
      }

      if (uploadResults.length > 0) {
        // Recargar primero para obtener el thumbnail actualizado
        if (onUploadComplete) {
          await onUploadComplete();
        }

        showAlert(
          `${uploadResults.length} elemento(s) agregados correctamente`,
          'success'
        );
        setSelectedFiles([]);
        setExternalVideos([]);
        setUploadProgress({ current: 0, total: 0 });

        if (uploadErrors.length > 0) {
          const errorMsg = uploadErrors.map(e => e.fileName || e.url || 'Error: ' + e.error).join('\n');
          showAlert('Algunos elementos fallaron:\n' + errorMsg, 'warning');
        }
      } else {
        showAlert('Error al subir contenido: ' + (uploadErrors[0]?.error || 'Error desconocido'), 'error');
      }
    } catch (error) {
      showAlert('Error inesperado: ' + error.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return 'IMG';
    if (file.type.startsWith('video/')) return 'VID';
    if (file.type === 'application/pdf') return 'PDF';
    return 'DOC';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!category || !album) {
    return (
      <div className="media-uploader-placeholder">
        <p>Seleccione una categoría y un álbum para subir archivos</p>
      </div>
    );
  }

  const totalItems = selectedFiles.length + externalVideos.length;
  const normalizedVideoUrl = videoUrl.trim().toLowerCase();
  const hasVideoUrlInput = normalizedVideoUrl.length > 0;
  const isSupportedProviderUrl = (
    normalizedVideoUrl.includes('youtube.com')
    || normalizedVideoUrl.includes('youtu.be')
    || normalizedVideoUrl.includes('vimeo.com')
  );
  const urlFieldStateClass = !hasVideoUrlInput
    ? ''
    : isSupportedProviderUrl
      ? 'url-input-field--valid'
      : 'url-input-field--pending';

  return (
    <div className="media-uploader">
      <div className="uploader-header">
        <h3>Agregar contenido a "{album.name}"</h3>
        <p className="uploader-subtitle">Categoría: {category.name}</p>
        {!album.thumbUrl && (
          <p className="uploader-hint">
            Nota: el primer archivo que agregues será la portada del álbum automáticamente.
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs">
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
        <div className="upload-mode-content">
          <div
            className={`drop-zone ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={compressing || converting}
            />
            <div className="drop-zone-content">
              <span className="drop-zone-icon">↑</span>
              <p>Arrastra archivos aquí o haz click para seleccionar</p>
              <small>Imágenes (se optimizan auto), videos cortos (&lt;2 min), PDFs • Máx 20MB</small>
            </div>
          </div>

        </div>
      )}

      {/* URL Upload Mode */}
      {uploadMode === 'url' && (
        <div className="upload-mode-content">
          <div className="url-input-section">
            <div className="url-input-header">
              <h4>Agregar video externo</h4>
              <p className="url-help-text">
                Para videos largos, súbelos a YouTube o Vimeo como "No listado" y pegá la URL acá.
              </p>
            </div>

            <div className="url-provider-chips" aria-label="Plataformas compatibles">
              <span className="url-provider-chip">YouTube</span>
              <span className="url-provider-chip">Vimeo</span>
            </div>

            <label htmlFor="external-video-url" className="url-input-label">
              URL del video
            </label>

            <div className={`url-input-group ${urlFieldStateClass}`.trim()}>
              <input
                id="external-video-url"
                type="url"
                className="url-input"
                placeholder="https://youtube.com/watch?v=... o https://vimeo.com/..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                onKeyDown={handleVideoUrlKeyDown}
                aria-describedby="external-video-help"
              />
              <button
                onClick={handleAddVideoUrl}
                className="btn-secondary url-add-button"
                disabled={!videoUrl.trim()}
              >
                Agregar video
              </button>
            </div>

            <p id="external-video-help" className="url-input-footnote">
              Formatos aceptados: enlaces de YouTube y Vimeo.
            </p>
          </div>

          {externalVideos.length > 0 && (
            <div className="external-videos-list">
              <h4 className="external-videos-list__title">
                Videos externos agregados ({externalVideos.length})
              </h4>
              <div className="files-list">
                {externalVideos.map((video, index) => (
                  <div key={index} className="file-item">
                    <span className={`file-icon file-icon--provider ${video.provider === 'youtube' ? 'file-icon--youtube' : 'file-icon--vimeo'}`}>
                      {video.provider === 'youtube' ? 'YT' : 'VM'}
                    </span>
                    <div className="file-info">
                      <p className="file-name">
                        {video.provider === 'youtube' ? 'YouTube' : 'Vimeo'}: {video.videoId}
                      </p>
                      <small className="file-size external-video-url">{video.originalUrl}</small>
                    </div>
                    <button
                      onClick={() => handleRemoveExternalVideo(index)}
                      className="btn-remove"
                      disabled={uploading}
                      aria-label="Quitar video externo"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <div className="selected-files-header">
            <h4>Archivos seleccionados ({selectedFiles.length})</h4>
            <button
              onClick={() => setSelectedFiles([])}
              className="btn-clear"
              disabled={uploading}
            >
              Limpiar todos
            </button>
          </div>

          <div className="files-list">
            {selectedFiles.map((file, index) => (
              <div key={index} className="file-item">
                <span className="file-icon">{getFileIcon(file)}</span>
                <div className="file-info">
                  <p className="file-name">{file.name}</p>
                  <small className="file-size">{formatFileSize(file.size)}</small>
                </div>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="btn-remove"
                  disabled={uploading}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Actions */}
      {totalItems > 0 && (
        <div className="upload-actions">
          <button
            onClick={handleUpload}
            className="btn-primary btn-upload"
            disabled={uploading || compressing || converting || totalItems === 0}
          >
            {uploading ? 'Subiendo...' : `Subir ${totalItems} elemento(s)`}
          </button>
        </div>
      )}

      <LoadingModal
        isOpen={converting}
        message="Convirtiendo imagenes HEIC"
        progress={conversionProgress}
        subMessage={conversionStatus || 'Adaptando archivos para compatibilidad total'}
        type="convert"
      />

      <LoadingModal
        isOpen={compressing}
        message="Optimizando imágenes"
        progress={compressionProgress}
        subMessage={`Reduciendo tamaño para carga más rápida`}
        type="optimize"
      />

      <LoadingModal
        isOpen={uploading}
        message="Subiendo contenido"
        progress={uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0}
        subMessage={`${uploadProgress.current} de ${uploadProgress.total} elementos`}
        type="upload"
      />

      <AlertDialog
        isOpen={alert.open}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert({ open: false, message: '', type: 'info' })}
      />
    </div>
  );
};

export default MediaUploader;
