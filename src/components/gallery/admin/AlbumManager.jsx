import { useState, useEffect } from 'react';
import { institutionalGalleryService } from '../../../services/institutionalGallery.service';
import { useAuth } from '../../../hooks/useAuth';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { AlertDialog } from '../../common/AlertDialog';
import { LoadingModal } from '../../common/LoadingModal';

const AlbumManager = ({ category, onSelectAlbum, refreshTrigger }) => {
  const { user } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [alert, setAlert] = useState({ open: false, message: '', type: 'info' });
  const [brokenThumbs, setBrokenThumbs] = useState(() => new Set());

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (category) {
      loadAlbums();
    }
  }, [category, refreshTrigger]);

  const loadAlbums = async () => {
    setLoading(true);
    const result = await institutionalGalleryService.getAlbumsByCategory(category.id);
    if (result.success) {
      setAlbums(result.albums);
    } else {
      showAlert('Error al cargar álbumes: ' + result.error, 'error');
    }
    setLoading(false);
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ open: true, message, type });
  };

  const handleOpenForm = (album = null) => {
    if (album) {
      setEditingAlbum(album);
      setFormData({
        name: album.name,
        description: album.description || ''
      });
    } else {
      setEditingAlbum(null);
      setFormData({
        name: '',
        description: ''
      });
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAlbum(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      showAlert('El nombre es obligatorio', 'error');
      return;
    }

    setSaving(true);
    try {
      const result = editingAlbum
        ? await institutionalGalleryService.updateAlbum(editingAlbum.id, formData)
        : await institutionalGalleryService.createAlbum(category.id, formData, user.uid);

      if (result.success) {
        await loadAlbums();
        handleCloseForm();
        showAlert(
          editingAlbum ? 'Álbum actualizado' : 'Álbum creado',
          'success'
        );
      } else {
        showAlert('Error: ' + result.error, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (album) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar álbum',
      message: `¿Está seguro de eliminar el álbum "${album.name}"? Se eliminarán todos los archivos del álbum.`,
      onConfirm: async () => {
        setConfirmDialog({ open: false });
        setDeleting(true);
        try {
          const result = await institutionalGalleryService.deleteAlbum(album.id);
          if (result.success) {
            await loadAlbums();
            showAlert('Álbum eliminado', 'success');
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

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (!category) {
    return (
      <div className="album-manager-placeholder">
        <p>Seleccione una categoría para gestionar sus álbumes</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Cargando álbumes...</div>;
  }

  return (
    <div className="album-manager">
      <div className="manager-header">
        <div>
          <h2>Álbumes de "{category.name}"</h2>
          <p className="category-subtitle">{albums.length} álbum(es)</p>
        </div>
        <button onClick={() => handleOpenForm()} className="btn-primary">
          + Nuevo Álbum
        </button>
      </div>

      {albums.length === 0 ? (
        <p className="empty-state">No hay álbumes en esta categoría</p>
      ) : (
        <div className="albums-grid">
          {albums.map(album => {
            const showPlaceholder = !album.thumbUrl || brokenThumbs.has(album.id);
            return (
            <div key={album.id} className="album-card" onClick={() => onSelectAlbum(album)}>
              <div className="album-thumbnail">
                {!showPlaceholder ? (
                  <img
                    src={album.thumbUrl}
                    alt={album.name}
                    referrerPolicy="no-referrer"
                    onError={() => {
                      console.warn('Thumbnail fallido para álbum:', album.thumbUrl);
                      setBrokenThumbs(prev => {
                        const next = new Set(prev);
                        next.add(album.id);
                        return next;
                      });
                    }}
                  />
                ) : (
                  <div className="album-placeholder">
                    <span>ALB</span>
                  </div>
                )}
              </div>
              <div className="album-info">
                <h3>{album.name}</h3>
                {album.description && <p className="album-description">{album.description}</p>}
                <small className="album-date">Creado: {formatDate(album.createdAt)}</small>
              </div>
              <div className="album-actions" onClick={e => e.stopPropagation()}>
                <button onClick={() => handleOpenForm(album)} className="btn-edit-small">
                  Editar
                </button>
                <button onClick={() => handleDelete(album)} className="btn-delete-small">
                  Eliminar
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAlbum ? 'Editar Álbum' : 'Nuevo Álbum'}</h2>
              <button onClick={handleCloseForm} className="modal-close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="album-form">
              <div className="form-group">
                <label htmlFor="name">Nombre del álbum *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Actividades de marzo 2024"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Descripción</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descripción opcional del álbum"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCloseForm} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingAlbum ? 'Guardar cambios' : 'Crear álbum'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LoadingModal
        isOpen={saving}
        message={editingAlbum ? "Actualizando álbum" : "Creando álbum"}
        subMessage="Por favor espere..."
      />

      <LoadingModal
        isOpen={deleting}
        message="Eliminando álbum"
        subMessage="Eliminando todos los archivos..."
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

export default AlbumManager;
