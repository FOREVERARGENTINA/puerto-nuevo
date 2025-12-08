import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { talleresService } from '../../services/talleres.service';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { useNavigate } from 'react-router-dom';

export function TallerGallery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [talleres, setTalleres] = useState([]);
  const [selectedTaller, setSelectedTaller] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadGallery = async (tallerId) => {
    const result = await talleresService.getGallery(tallerId);
    if (result.success) {
      setGallery(result.items);
    }
  };

  const selectTaller = async (taller) => {
    setSelectedTaller(taller);
    await loadGallery(taller.id);
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedTaller?.id) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      alert('Formato no válido. Solo se permiten imágenes (JPG, PNG, GIF) y videos (MP4, MOV)');
      return;
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('El archivo es muy grande. Máximo 50MB');
      return;
    }

    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `talleres/${selectedTaller.id}/gallery/${fileName}`);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const metadata = {
        fileName,
        tipo: file.type.startsWith('image/') ? 'imagen' : 'video',
        url: downloadURL,
        uploadedBy: user.uid,
        uploadedByEmail: user.email
      };

      await talleresService.addGalleryItem(selectedTaller.id, metadata);
      loadGallery(selectedTaller.id);
      alert('Archivo subido correctamente');
    } catch (error) {
      console.error('Error al subir archivo:', error);
      alert('Error al subir el archivo: ' + error.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('¿Estás seguro de eliminar este elemento?')) return;

    try {
      const storageRef = ref(storage, `talleres/${selectedTaller.id}/gallery/${item.fileName}`);
      await deleteObject(storageRef);
      await talleresService.deleteGalleryItem(selectedTaller.id, item.id);
      loadGallery(selectedTaller.id);
      alert('Elemento eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
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
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card__header">
            <h1 className="card__title">Galería de Talleres</h1>
          </div>
          <div className="card__body">
            <div className="alert alert--warning">
              <strong>No tienes talleres asignados</strong>
              <p>Contacta con la dirección para que te asignen uno o más talleres especiales.</p>
            </div>
            <button onClick={() => navigate(-1)} className="btn btn--outline" style={{ marginTop: 'var(--spacing-md)' }}>
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Galería de Talleres</h1>
          <button onClick={() => navigate(-1)} className="btn btn--sm btn--outline">
            Volver
          </button>
        </div>

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
                className="form-control"
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
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label htmlFor="file-upload" className="btn btn--primary" style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? 'Subiendo...' : 'Subir foto/video'}
            </label>
            <input
              id="file-upload"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
            <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Formatos: JPG, PNG, GIF, MP4, MOV • Máximo 50MB
            </p>
          </div>

          {gallery.length === 0 ? (
            <div className="alert alert--info">
              <p>No hay elementos en la galería. ¡Sube tu primera foto o video!</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
              {gallery.map(item => (
                <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {item.tipo === 'imagen' ? (
                    <img
                      src={item.url}
                      alt="Galería"
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
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-xs)' }}>
                      Subido por: {item.uploadedByEmail}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                      {item.createdAt?.toDate?.().toLocaleDateString?.('es-AR') || 'Fecha desconocida'}
                    </p>
                    <button
                      onClick={() => handleDelete(item)}
                      className="btn btn--sm btn--danger"
                      style={{ width: '100%' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
