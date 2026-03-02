import { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { documentsService } from '../../services/documents.service';
import { AlertDialog } from '../common/AlertDialog';
import { FileSelectionList, FileUploadSelector } from '../common/FileUploadSelector';
import { useDialog } from '../../hooks/useDialog';
import {
  DOCUMENT_CATEGORY_OPTIONS,
  DOCUMENT_SCOPE_OPTIONS_FOR_UPLOAD
} from '../../config/documentCategories';

const RECIPIENT_ROLE_OPTIONS = [
  { value: 'superadmin', label: 'SuperAdmin' },
  { value: 'coordinacion', label: 'Coordinacion' },
  { value: 'docente', label: 'Docentes' },
  { value: 'facturacion', label: 'Facturacion' },
  { value: 'tallerista', label: 'Talleristas' },
  { value: 'family', label: 'Familias' },
  { value: 'aspirante', label: 'Aspirantes' }
];

export function DocumentUploader({ onUploadSuccess }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'institucional',
    roles: [],
    requiereLectura: false,
    ambiente: 'global'
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const alertDialog = useDialog();

  const categoryOptions = useMemo(
    () => DOCUMENT_CATEGORY_OPTIONS.filter((option) => option.value !== 'all'),
    []
  );

  const isFamilyAudienceSelected = formData.roles.includes('family');

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoleToggle = (role) => {
    setFormData((prev) => {
      const nextRoles = prev.roles.includes(role)
        ? prev.roles.filter((item) => item !== role)
        : [...prev.roles, role];

      const hasFamily = nextRoles.includes('family');

      return {
        ...prev,
        roles: nextRoles,
        ambiente: hasFamily ? prev.ambiente : 'global',
        requiereLectura: hasFamily ? prev.requiereLectura : false
      };
    });
  };

  const handleFileSelect = (selectedFiles) => {
    const file = Array.isArray(selectedFiles) ? selectedFiles[0] : null;
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
        title: 'Formato no valido',
        message: 'Solo se permiten PDF, Word, Excel e imagenes',
        type: 'error'
      });
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alertDialog.openDialog({
        title: 'Archivo muy grande',
        message: 'El archivo es muy grande. Maximo 10MB',
        type: 'error'
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFile) {
      alertDialog.openDialog({
        title: 'Archivo requerido',
        message: 'Debes seleccionar un archivo',
        type: 'warning'
      });
      return;
    }

    if (!formData.titulo.trim()) {
      alertDialog.openDialog({
        title: 'Titulo requerido',
        message: 'Debes ingresar un titulo',
        type: 'warning'
      });
      return;
    }

    if (formData.roles.length === 0) {
      alertDialog.openDialog({
        title: 'Destinatarios requeridos',
        message: 'Debes seleccionar al menos un rol destinatario',
        type: 'warning'
      });
      return;
    }

    setUploading(true);

    try {
      const metadata = {
        ...formData,
        ambiente: isFamilyAudienceSelected ? formData.ambiente : null,
        uploadedBy: user.uid,
        uploadedByEmail: user.email
      };

      const result = await documentsService.uploadDocument(selectedFile, metadata);

      if (result.success) {
        alertDialog.openDialog({
          title: 'Exito',
          message: 'Documento subido correctamente',
          type: 'success'
        });

        setFormData({
          titulo: '',
          descripcion: '',
          categoria: 'institucional',
          roles: [],
          requiereLectura: false,
          ambiente: 'global'
        });
        setSelectedFile(null);

        if (typeof onUploadSuccess === 'function') {
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
        <label htmlFor="titulo">Titulo *</label>
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
        <label htmlFor="descripcion">Descripcion</label>
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
        <label htmlFor="categoria">Categoria *</label>
        <select
          id="categoria"
          name="categoria"
          value={formData.categoria}
          onChange={handleInputChange}
          className="form-control"
          required
        >
          {categoryOptions.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Roles que pueden ver este documento *</label>
        <div className="document-uploader__roles">
          {RECIPIENT_ROLE_OPTIONS.map((roleOption) => (
            <label key={roleOption.value} className="document-uploader__roles-item">
              <input
                type="checkbox"
                checked={formData.roles.includes(roleOption.value)}
                onChange={() => handleRoleToggle(roleOption.value)}
              />
              <span className="document-uploader__checkbox-text">{roleOption.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="document-uploader__family-section">
        <div className="form-group">
          <label htmlFor="ambiente">Ambiente destinatario {isFamilyAudienceSelected ? '*' : '(solo Familias)'}</label>
          <select
            id="ambiente"
            name="ambiente"
            value={formData.ambiente}
            onChange={handleInputChange}
            className="form-control"
            required={isFamilyAudienceSelected}
            disabled={!isFamilyAudienceSelected}
          >
            {DOCUMENT_SCOPE_OPTIONS_FOR_UPLOAD.map((scope) => (
              <option key={scope.value} value={scope.value}>
                {scope.label}
              </option>
            ))}
          </select>
          <p className="document-uploader__help">
            Global llega a todas las familias. Taller 1 o Taller 2 limita el documento a ese ambiente.
          </p>
          {!isFamilyAudienceSelected && (
            <p className="document-uploader__help document-uploader__help--muted">
              Marca el rol Familias para habilitar el filtro por ambiente.
            </p>
          )}
        </div>

        {isFamilyAudienceSelected && (
          <div className="form-group">
            <label className="document-uploader__family-section-header">
              <input
                type="checkbox"
                checked={formData.requiereLectura}
                onChange={(event) => setFormData((prev) => ({ ...prev, requiereLectura: event.target.checked }))}
              />
              <span className="document-uploader__checkbox-text">Requiere confirmacion de lectura</span>
            </label>
            <p className="document-uploader__help">
              Si esta activo, la familia debe confirmar lectura manualmente.
            </p>
          </div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="file">Archivo *</label>
        <FileUploadSelector
          id="file"
          multiple={false}
          onFilesSelected={handleFileSelect}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          disabled={uploading}
          hint="Formatos: PDF, Word, Excel e imagenes. Maximo 10MB"
        />
        {selectedFile && (
          <FileSelectionList files={[selectedFile]} onRemove={() => setSelectedFile(null)} />
        )}
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
