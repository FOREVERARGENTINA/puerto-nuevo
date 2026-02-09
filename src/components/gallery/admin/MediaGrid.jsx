import { useState, useEffect } from 'react';
import { institutionalGalleryService } from '../../../services/institutionalGallery.service';
import { useAuth } from '../../../hooks/useAuth';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { AlertDialog } from '../../common/AlertDialog';
import { LoadingModal } from '../../common/LoadingModal';

const MediaGrid = ({ category, album, refreshTrigger }) => {
  const { user, isAdmin } = useAuth();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [alert, setAlert] = useState({ open: false, message: '', type: 'info' });
  const [brokenThumbs, setBrokenThumbs] = useState(() => new Set());

  useEffect(() => {
    if (album) {
      loadMedia();
    }
  }, [album, refreshTrigger]);

  const loadMedia = async () => {
    setLoading(true);
    const result = await institutionalGalleryService.getAlbumMedia(album.id);
    if (result.success) {
      setMedia(result.media);
    } else {
      showAlert('Error al cargar archivos: ' + result.error, 'error');
    }
    setLoading(false);
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ open: true, message, type });
  };

  const handleViewMedia = (mediaItem) => {
    setSelectedMedia(mediaItem);
  };

  const handleCloseViewer = () => {
    setSelectedMedia(null);
  };

  const handleDelete = (mediaItem) => {
    // Verificar permisos: admin o quien lo subió
    const canDelete = isAdmin || mediaItem.uploadedBy === user.uid;

    if (!canDelete) {
      showAlert('No tiene permisos para eliminar este archivo', 'error');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Eliminar archivo',
      message: `¿Está seguro de eliminar "${mediaItem.fileName}"?`,
      onConfirm: async () => {
        setConfirmDialog({ open: false });
        setDeleting(true);
        try {
          const result = await institutionalGalleryService.deleteAlbumMedia(mediaItem);
          if (result.success) {
            await loadMedia();
            showAlert('Archivo eliminado', 'success');
          } else {
            showAlert('Error: ' + result.error, 'error');
          }
        } finally {
          setDeleting(false);
        }
      },
      onCancel: () => setConfirmDialog({ open: false })
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!album) {
    return (
      <div className="media-grid-placeholder">
        <p>Seleccione un álbum para ver sus archivos</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Cargando archivos...</div>;
  }

  return (
    <div className="media-grid-container">
      <div className="media-grid-header">
        <h3>Archivos de "{album.name}"</h3>
        <p className="media-count">{media.length} archivo(s)</p>
      </div>

      {media.length === 0 ? (
        <p className="empty-state">No hay archivos en este álbum</p>
      ) : (
        <div className="media-grid">
          {media.map(item => (
            <div key={item.id} className="media-card">
              <div className="media-preview" onClick={() => handleViewMedia(item)}>
                {item.tipo === 'imagen' && (
                  <img src={item.thumbUrl || item.url} alt={item.fileName} />
                )}
                {item.tipo === 'video' && (
                  <div className="video-preview">
                    <video src={item.url} />
                    <span className="play-icon">▶</span>
                  </div>
                )}
                {item.tipo === 'video-externo' && (
                  <div className="video-preview external">
                    {item.thumbUrl && !brokenThumbs.has(item.id) ? (
                      <>
                        <img
                          src={item.thumbUrl}
                          alt={item.fileName}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            console.warn(`Thumbnail fallido para ${item.provider} video:`, item.thumbUrl);
                            console.warn('Error:', e);
                            setBrokenThumbs(prev => {
                              const next = new Set(prev);
                              next.add(item.id);
                              return next;
                            });
                          }}
                        />
                        <span className="play-icon">▶</span>
                      </>
                    ) : (
                      <div className="external-video-placeholder">
                        <span className="play-icon">▶</span>
                        <small>{item.provider === 'youtube' ? 'YouTube' : 'Vimeo'}</small>
                      </div>
                    )}
                    <span className="external-badge">{item.provider === 'youtube' ? 'YT' : 'VM'}</span>
                  </div>
                )}
                {item.tipo === 'pdf' && (
                  <div className="pdf-preview">
                    <span className="pdf-icon">PDF</span>
                  </div>
                )}
              </div>

              <div className="media-info">
                <p className="media-filename" title={item.fileName}>
                  {item.fileName.length > 30
                    ? item.fileName.substring(0, 27) + '...'
                    : item.fileName}
                </p>
                <small className="media-size">
                  {item.tipo === 'video-externo'
                    ? `Video externo (${item.provider === 'youtube' ? 'YouTube' : 'Vimeo'})`
                    : formatFileSize(item.size)}
                </small>
                <small className="media-date">{formatDate(item.createdAt)}</small>
              </div>

              <div className="media-actions">
                <button
                  onClick={() => window.open(item.url, '_blank')}
                  className="btn-view"
                  title="Ver/Descargar"
                >
                  Ver
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="btn-delete-small"
                  title="Eliminar"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMedia && (
        <div className="media-viewer-overlay" onClick={handleCloseViewer}>
          <div className="media-viewer-content" onClick={e => e.stopPropagation()}>
            <button onClick={handleCloseViewer} className="viewer-close">×</button>

            <div className="viewer-media">
              {selectedMedia.tipo === 'imagen' && (
                <img src={selectedMedia.url} alt={selectedMedia.fileName} />
              )}
              {selectedMedia.tipo === 'video' && (
                <video src={selectedMedia.url} controls autoPlay />
              )}
              {selectedMedia.tipo === 'video-externo' && (
                <iframe
                  src={selectedMedia.embedUrl}
                  title={selectedMedia.fileName}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: '100%', height: '100%', minHeight: '400px' }}
                />
              )}
              {selectedMedia.tipo === 'pdf' && (
                <iframe src={selectedMedia.url} title={selectedMedia.fileName} />
              )}
            </div>

            <div className="viewer-info">
              <h4>{selectedMedia.fileName}</h4>
              <p>
                {selectedMedia.tipo === 'video-externo'
                  ? `Video externo (${selectedMedia.provider === 'youtube' ? 'YouTube' : 'Vimeo'})`
                  : formatFileSize(selectedMedia.size)}
                {' • '}
                {formatDate(selectedMedia.createdAt)}
              </p>
              <a
                href={selectedMedia.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-download"
              >
                {selectedMedia.tipo === 'video-externo' ? 'Ver en ' + (selectedMedia.provider === 'youtube' ? 'YouTube' : 'Vimeo') : 'Descargar'}
              </a>
            </div>
          </div>
        </div>
      )}

      <LoadingModal
        isOpen={deleting}
        message="Eliminando archivo"
        subMessage="Por favor espere..."
      />

      <ConfirmDialog
        isOpen={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={confirmDialog.onCancel}
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

export default MediaGrid;
