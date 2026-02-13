import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { documentsService } from '../../services/documents.service';
import { AlertDialog } from '../common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';

export function DocumentUploader({ onUploadSuccess }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'institucional',
    roles: [],
    requiereLectura: false,
    ambiente: 'todos',
    fechaLimite: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const alertDialog = useDialog();

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

  const ambienteOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'taller1', label: 'Solo Taller 1' },
    { value: 'taller2', label: 'Solo Taller 2' }
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
      alertDialog.openDialog({
        title: 'Formato No Válido',
        message: 'Solo se permiten PDF, Word, Excel e imágenes',
        type: 'error'
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alertDialog.openDialog({
        title: 'Archivo Muy Grande',
        message: 'El archivo es muy grande. Máximo 10MB',
        type: 'error'
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alertDialog.openDialog({
        title: 'Archivo Requerido',
        message: 'Debes seleccionar un archivo',
        type: 'warning'
      });
      return;
    }

    if (!formData.titulo.trim()) {
      alertDialog.openDialog({
        title: 'Título Requerido',
        message: 'Debes ingresar un título',
        type: 'warning'
      });
      return;
    }

    if (formData.roles.length === 0) {
      alertDialog.openDialog({
        title: 'Roles Requeridos',
        message: 'Debes seleccionar al menos un rol que pueda ver el documento',
        type: 'warning'
      });
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
        alertDialog.openDialog({
          title: 'Éxito',
          message: 'Documento subido correctamente',
          type: 'success'
        });
        setFormData({
          titulo: '',
          descripcion: '',
          categoria: 'institucional',
          roles: [],
          requiereLectura: false,
          ambiente: 'todos',
          fechaLimite: ''
        });
        setSelectedFile(null);
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } else {
        alertDialog.openDialog({
          title: 'Error',
          message: 'Error al subir documento: ' + result.error,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error al subir documento:', error);
      alertDialog.openDialog({
        title: 'Error',
        message: 'Error al subir documento: ' + error.message,
        type: 'error'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="document-uploader">
      <div className="form-group">
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

      <div className="form-group">
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

      <div className="form-group">
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

      <div className="form-group">
        <label>Roles que pueden ver este documento *</label>
        <div className="document-uploader__roles">
          {rolesOptions.map(role => (
            <label key={role.value} className="document-uploader__roles-item">
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

      {/* Lectura obligatoria para familias */}
      {formData.roles.includes('family') && (
        <div className="document-uploader__family-section">
          <div className="form-group">
            <label className="document-uploader__family-section-header">
              <input
                type="checkbox"
                checked={formData.requiereLectura}
                onChange={(e) => setFormData(prev => ({ ...prev, requiereLectura: e.target.checked }))}
              />
              Requiere confirmación de lectura por familias
            </label>
            <p className="document-uploader__help">
              Las familias deberán confirmar que leyeron este documento
            </p>
          </div>

          {formData.requiereLectura && (
            <>
              <div className="form-group">
                <label htmlFor="ambiente">Destinatarios *</label>
                <select
                  id="ambiente"
                  name="ambiente"
                  value={formData.ambiente}
                  onChange={handleInputChange}
                  className="form-control"
                  required
                >
                  {ambienteOptions.map(amb => (
                    <option key={amb.value} value={amb.value}>
                      {amb.label}
                    </option>
                  ))}
                </select>
                <p className="document-uploader__help">
                  Selecciona qué familias deben leer este documento
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="fechaLimite">Fecha límite de lectura (opcional)</label>
                <input
                  type="date"
                  id="fechaLimite"
                  name="fechaLimite"
                  value={formData.fechaLimite}
                  onChange={handleInputChange}
                  className="form-control"
                  min={new Date().toISOString().split('T')[0]}
                />
                <p className="document-uploader__help">
                  Si se especifica, se enviará recordatorio a quienes no hayan leído
                </p>
              </div>
            </>
          )}
        </div>
      )}

      <div className="form-group">
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
          <p className="document-uploader__file-info">
            {selectedFile.name} — {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
        <p className="document-uploader__help">
          Formatos: PDF, Word, Excel, Imágenes • Máximo 10MB
        </p>
      </div>

      <button
        type="submit"
        className="btn btn--primary"
        disabled={uploading}
      >
        {uploading ? 'Subiendo...' : 'Subir documento'}
      </button>

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={alertDialog.closeDialog}
        title={alertDialog.dialogData.title}
        message={alertDialog.dialogData.message}
        type={alertDialog.dialogData.type}
      />
    </form>
  );
}
