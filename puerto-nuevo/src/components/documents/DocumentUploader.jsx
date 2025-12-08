import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { documentsService } from '../../services/documents.service';

export function DocumentUploader({ onUploadSuccess }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'institucional',
    roles: []
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const categorias = [
    { value: 'institucional', label: 'Institucional' },
    { value: 'pedagogico', label: 'Pedagógico' },
    { value: 'administrativo', label: 'Administrativo' },
    { value: 'taller', label: 'Taller Especial' }
  ];

  const rolesOptions = [
    { value: 'direccion', label: 'Dirección' },
    { value: 'coordinacion', label: 'Coordinación' },
    { value: 'admin', label: 'Admin' },
    { value: 'teacher', label: 'Guías' },
    { value: 'tallerista', label: 'Talleristas' },
    { value: 'family', label: 'Familias' },
    { value: 'aspirante', label: 'Aspirantes' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleToggle = (role) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png'
    ];

    if (!validTypes.includes(file.type)) {
      alert('Formato no válido. Solo se permiten PDF, Word, Excel e imágenes');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('El archivo es muy grande. Máximo 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Debes seleccionar un archivo');
      return;
    }

    if (!formData.titulo.trim()) {
      alert('Debes ingresar un título');
      return;
    }

    if (formData.roles.length === 0) {
      alert('Debes seleccionar al menos un rol que pueda ver el documento');
      return;
    }

    setUploading(true);
    try {
      const metadata = {
        ...formData,
        uploadedBy: user.uid,
        uploadedByEmail: user.email
      };

      const result = await documentsService.uploadDocument(selectedFile, metadata);

      if (result.success) {
        alert('Documento subido correctamente');
        setFormData({
          titulo: '',
          descripcion: '',
          categoria: 'institucional',
          roles: []
        });
        setSelectedFile(null);
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        alert('Error al subir documento: ' + result.error);
      }
    } catch (error) {
      console.error('Error al subir documento:', error);
      alert('Error al subir documento: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
        <label htmlFor="titulo">Título *</label>
        <input
          type="text"
          id="titulo"
          name="titulo"
          value={formData.titulo}
          onChange={handleInputChange}
          className="form-control"
          required
        />
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
        <label htmlFor="descripcion">Descripción</label>
        <textarea
          id="descripcion"
          name="descripcion"
          value={formData.descripcion}
          onChange={handleInputChange}
          rows={3}
          className="form-control"
        />
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
        <label htmlFor="categoria">Categoría *</label>
        <select
          id="categoria"
          name="categoria"
          value={formData.categoria}
          onChange={handleInputChange}
          className="form-control"
          required
        >
          {categorias.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
        <label>Roles que pueden ver este documento *</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
          {rolesOptions.map(role => (
            <label key={role.value} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <input
                type="checkbox"
                checked={formData.roles.includes(role.value)}
                onChange={() => handleRoleToggle(role.value)}
              />
              {role.label}
            </label>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
        <label htmlFor="file">Archivo *</label>
        <input
          type="file"
          id="file"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          className="form-control"
          required
        />
        {selectedFile && (
          <p style={{ marginTop: 'var(--spacing-xs)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Archivo seleccionado: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        <p style={{ marginTop: 'var(--spacing-xs)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Formatos: PDF, Word, Excel, Imágenes • Máximo 10MB
        </p>
      </div>

      <button
        type="submit"
        className="btn btn--primary"
        disabled={uploading}
        style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
      >
        {uploading ? 'Subiendo...' : 'Subir documento'}
      </button>
    </form>
  );
}
