import { useState, useEffect } from 'react';
import { institutionalGalleryService } from '../../../services/institutionalGallery.service';
import { ROLES } from '../../../config/constants';
import { useAuth } from '../../../hooks/useAuth';
import { ConfirmDialog } from '../../common/ConfirmDialog';
import { AlertDialog } from '../../common/AlertDialog';
import { LoadingModal } from '../../common/LoadingModal';

const CategoryManager = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [alert, setAlert] = useState({ open: false, message: '', type: 'info' });
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    allowedRoles: []
  });

  const allRoles = [
    { value: ROLES.FAMILY, label: 'Familias' },
    { value: ROLES.ASPIRANTE, label: 'Aspirantes' },
    { value: ROLES.DOCENTE, label: 'Docentes' },
    { value: ROLES.TALLERISTA, label: 'Talleristas' },
    { value: ROLES.COORDINACION, label: 'Coordinación' },
    { value: ROLES.SUPERADMIN, label: 'Super Admin' }
  ];

  const getRoleDescription = (roleValue) => {
    const descriptions = {
      [ROLES.FAMILY]: 'Padres y tutores de alumnos',
      [ROLES.ASPIRANTE]: 'Personas interesadas en inscribirse',
      [ROLES.DOCENTE]: 'Maestros y profesores',
      [ROLES.TALLERISTA]: 'Instructores de talleres especiales',
      [ROLES.COORDINACION]: 'Personal de coordinación',
      [ROLES.SUPERADMIN]: 'Administradores del sistema'
    };
    return descriptions[roleValue] || '';
  };

  const applyPreset = (preset) => {
    const presets = {
      'all': allRoles.map(r => r.value),
      'families-aspirants': [ROLES.FAMILY, ROLES.ASPIRANTE, ROLES.DOCENTE, ROLES.COORDINACION, ROLES.SUPERADMIN],
      'families-only': [ROLES.FAMILY, ROLES.DOCENTE, ROLES.COORDINACION, ROLES.SUPERADMIN],
      'staff-only': [ROLES.DOCENTE, ROLES.TALLERISTA, ROLES.COORDINACION, ROLES.SUPERADMIN]
    };

    setFormData(prev => ({
      ...prev,
      allowedRoles: presets[preset] || []
    }));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!coverFile) return;
    const objectUrl = URL.createObjectURL(coverFile);
    setCoverPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [coverFile]);

  const loadCategories = async () => {
    setLoading(true);
    const result = await institutionalGalleryService.getAllCategories();
    if (result.success) {
      setCategories(result.categories);
    } else {
      showAlert('Error al cargar categorías: ' + result.error, 'error');
    }
    setLoading(false);
  };

  const showAlert = (message, type = 'info') => {
    setAlert({ open: true, message, type });
  };

  const handleOpenForm = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        allowedRoles: category.allowedRoles || []
      });
      setCoverFile(null);
      setCoverPreview(category.coverUrl || '');
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        allowedRoles: []
      });
      setCoverFile(null);
      setCoverPreview('');
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setCoverFile(null);
    setCoverPreview('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-generar slug al escribir el nombre
    if (name === 'name' && !editingCategory) {
      const slug = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0] || null;
    setCoverFile(file);
    if (!file && editingCategory?.coverUrl) {
      setCoverPreview(editingCategory.coverUrl);
    }
  };

  const handleRoleToggle = (roleValue) => {
    setFormData(prev => {
      const allowedRoles = prev.allowedRoles.includes(roleValue)
        ? prev.allowedRoles.filter(r => r !== roleValue)
        : [...prev.allowedRoles, roleValue];
      return { ...prev, allowedRoles };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.slug) {
      showAlert('Nombre y slug son obligatorios', 'error');
      return;
    }

    if (formData.allowedRoles.length === 0) {
      showAlert('Debe seleccionar al menos un rol permitido', 'error');
      return;
    }

    if (!coverFile && !editingCategory?.coverUrl) {
      showAlert('Debe subir una imagen de portada', 'error');
      return;
    }

    setSaving(true);
    try {
      let coverPayload = {};
      if (coverFile) {
        const uploadResult = await institutionalGalleryService.uploadCategoryCover(formData.slug, coverFile);
        if (!uploadResult.success) {
          showAlert('Error al subir la portada: ' + uploadResult.error, 'error');
          return;
        }
        coverPayload = {
          coverUrl: uploadResult.coverUrl,
          coverPath: uploadResult.coverPath
        };
      }

      if (editingCategory?.coverPath && coverPayload.coverPath) {
        await institutionalGalleryService.deleteStorageFile(editingCategory.coverPath);
      }

      const payload = { ...formData, ...coverPayload };
      const result = editingCategory
        ? await institutionalGalleryService.updateCategory(editingCategory.id, payload)
        : await institutionalGalleryService.createCategory(payload, user.uid);

      if (result.success) {
        // Recargar la lista ANTES de cerrar el modal
        await loadCategories();
        handleCloseForm();
        showAlert(
          editingCategory ? 'Categoría actualizada' : 'Categoría creada',
          'success'
        );
      } else {
        showAlert('Error: ' + result.error, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (category) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar categoría',
      message: `¿Está seguro de eliminar la categoría "${category.name}"?`,
      onConfirm: async () => {
        setConfirmDialog({ open: false });
        setDeleting(true);
        try {
          const result = await institutionalGalleryService.deleteCategory(category.id);
          if (result.success) {
            await loadCategories();
            showAlert('Categoría eliminada', 'success');
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

  if (loading) {
    return <div className="loading">Cargando categorías...</div>;
  }

  return (
    <div className="category-manager">
      <div className="manager-header">
        <h2>Gestión de Categorías</h2>
        <button onClick={() => handleOpenForm()} className="btn-primary">
          + Nueva Categoría
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="empty-state">No hay categorías creadas</p>
      ) : (
        <div className="categories-list">
          {categories.map(category => (
            <div key={category.id} className="category-card">
              <div className="category-info">
                <h3>{category.name}</h3>
                <p className="category-meta">
                  {category.allowedRoles?.length || 0} rol(es) con acceso
                </p>
              </div>
              <div className="category-actions">
                <button onClick={() => handleOpenForm(category)} className="btn-edit-small">
                  Editar
                </button>
                <button onClick={() => handleDelete(category)} className="btn-delete-small">
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-content category-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}</h2>
              <button onClick={handleCloseForm} className="modal-close">×</button>
            </div>

            <form onSubmit={handleSubmit} className="category-form">
              <div className="form-group">
                <label htmlFor="cover">Imagen de portada *</label>
                <div className="cover-input">
                  <div className="cover-preview">
                    {coverPreview ? (
                      <img src={coverPreview} alt="Portada de categoría" />
                    ) : (
                      <div className="cover-placeholder">Sin imagen</div>
                    )}
                  </div>
                  <input
                    type="file"
                    id="cover"
                    name="cover"
                    accept="image/*"
                    onChange={handleCoverChange}
                  />
                  <small>JPG, PNG o WebP. Recomendado 1200×800.</small>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="name">Nombre *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Ej: Clases"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Descripción</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descripción opcional"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>¿Quién puede ver esta categoría? *</label>
                <small className="form-helper-text">
                  Selecciona qué tipos de usuarios podrán acceder a los álbumes de esta categoría
                </small>

                <div className="roles-selection">
                  <div className="roles-presets">
                    <small className="form-helper-text">
                      Presets comunes:
                    </small>
                    <div className="preset-buttons">
                      <button
                        type="button"
                        onClick={() => applyPreset('families-aspirants')}
                        className="btn-preset"
                        title="Familias, aspirantes y staff"
                      >
                        Familias + Aspirantes
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('families-only')}
                        className="btn-preset"
                        title="Solo familias y staff"
                      >
                        Solo Familias
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('staff-only')}
                        className="btn-preset"
                        title="Solo personal de la escuela"
                      >
                        Solo Staff
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset('all')}
                        className="btn-preset"
                        title="Todos los roles"
                      >
                        Todos
                      </button>
                    </div>
                  </div>

                  <div className="roles-grid">
                    {allRoles.map(role => (
                      <label key={role.value} className={`role-checkbox ${formData.allowedRoles.includes(role.value) ? 'role-checkbox--selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={formData.allowedRoles.includes(role.value)}
                          onChange={() => handleRoleToggle(role.value)}
                        />
                        <div className="role-info">
                          <span className="role-name">{role.label}</span>
                          <span className="role-description">{getRoleDescription(role.value)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {formData.allowedRoles.length === 0 && (
                  <small className="form-helper-text form-helper-text--error">
                    Debes seleccionar al menos un rol
                  </small>
                )}
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCloseForm} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingCategory ? 'Guardar cambios' : 'Crear categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LoadingModal
        isOpen={saving}
        message={editingCategory ? "Actualizando categoría" : "Creando categoría"}
        subMessage={coverFile ? "Subiendo imagen de portada..." : "Por favor espere..."}
        type={coverFile ? "upload" : "default"}
      />

      <LoadingModal
        isOpen={deleting}
        message="Eliminando categoría"
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

export default CategoryManager;



