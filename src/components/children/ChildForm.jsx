import { useState, useEffect } from 'react';
import { usersService } from '../../services/users.service';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../config/firebase';

const ChildForm = ({ child = null, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    fechaNacimiento: '',
    ambiente: 'taller1',
    responsables: [],
    documentos: [],
    datosMedicos: {
      alergias: '',
      medicamentos: '',
      indicaciones: '',
      contactosEmergencia: ''
    }
  });

  const [familyUsers, setFamilyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [fileDescription, setFileDescription] = useState('');
  const [responsablesError, setResponsablesError] = useState('');
  const [responsablesSearch, setResponsablesSearch] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Load family users
      const familyResult = await usersService.getUsersByRole('family');
      if (familyResult.success) {
        setFamilyUsers(familyResult.users);
      }

    };
    loadData();
  }, []);

  useEffect(() => {
    if (child) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        nombreCompleto: child.nombreCompleto || '',
        fechaNacimiento: child.fechaNacimiento || '',
        ambiente: child.ambiente || 'taller1',
        responsables: child.responsables || [],
        documentos: child.documentos || [],
        datosMedicos: child.datosMedicos || {
          alergias: '',
          medicamentos: '',
          indicaciones: '',
          contactosEmergencia: ''
        }
      });
    }
  }, [child]);

  const filteredFamilyUsers = familyUsers.filter(user => {
    const term = responsablesSearch.trim().toLowerCase();
    if (!term) return true;
    const name = (user.displayName || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMedicalDataChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      datosMedicos: {
        ...prev.datosMedicos,
        [name]: value
      }
    }));
  };

  const handleResponsableToggle = (id) => {
    setFormData(prev => {
      const alreadySelected = prev.responsables.includes(id);
      const nextResponsables = alreadySelected
        ? prev.responsables.filter(responsableId => responsableId !== id)
        : [...prev.responsables, id];
      return {
        ...prev,
        responsables: nextResponsables
      };
    });
    setResponsablesError('');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('El archivo no debe superar los 5MB');
        return;
      }
      setFileToUpload(file);
    }
  };

  const handleUploadDocument = async () => {
    if (!fileToUpload) return;
    if (!fileDescription.trim()) {
      alert('Por favor ingresa una descripción para el documento');
      return;
    }
    
    if (!child?.id) {
      alert('Debes crear el alumno primero antes de adjuntar documentos. Guarda la ficha y luego edítala para agregar documentos.');
      return;
    }
    
    setUploadingFile(true);
    try {
      const timestamp = Date.now();
      const fileName = `${timestamp}_${fileToUpload.name}`;
      const storageRef = ref(storage, `private/children/${child.id}/${fileName}`);
      
      await uploadBytes(storageRef, fileToUpload);
      const url = await getDownloadURL(storageRef);
      
      const newDoc = {
        nombre: fileToUpload.name,
        descripcion: fileDescription,
        url,
        storagePath: `private/children/${child.id}/${fileName}`,
        tipo: fileToUpload.type,
        tamaño: fileToUpload.size,
        fechaSubida: new Date().toISOString()
      };
      
      setFormData(prev => ({
        ...prev,
        documentos: [...prev.documentos, newDoc]
      }));
      
      setFileToUpload(null);
      setFileDescription('');
      document.getElementById('fileInput').value = '';
    } catch (error) {
      console.error('Error al subir archivo:', error);
      alert('Error al subir el archivo: ' + error.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteDocument = async (index, doc) => {
    if (!confirm('¿Eliminar este documento?')) return;
    
    try {
      // Si tiene storagePath, eliminar de Storage
      if (doc.storagePath) {
        const storageRef = ref(storage, doc.storagePath);
        try {
          await deleteObject(storageRef);
        } catch (error) {
          // Si el archivo ya no existe, continuar igual y quitar de la lista
          if (error?.code !== 'storage/object-not-found') {
            throw error;
          }
        }
      }
      
      setFormData(prev => ({
        ...prev,
        documentos: prev.documentos.filter((_, i) => i !== index)
      }));
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      alert('Error al eliminar el documento: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.responsables.length) {
      setResponsablesError('Selecciona al menos una familia responsable.');
      return;
    }
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="child-form">
      <div className="child-form__grid">
        <div className="form-section">
          <h3>Datos Personales</h3>

          <div className="form-group">
            <label htmlFor="nombreCompleto" className="form-label required">Nombre Completo</label>
            <input
              type="text"
              id="nombreCompleto"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaNacimiento" className="form-label required">Fecha de Nacimiento</label>
            <input
              type="date"
              id="fechaNacimiento"
              name="fechaNacimiento"
              value={formData.fechaNacimiento}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="ambiente" className="form-label required">Ambiente</label>
            <select
              id="ambiente"
              name="ambiente"
              value={formData.ambiente}
              onChange={handleChange}
              className="form-select"
              required
            >
            <option value="taller1">Taller 1</option>
            <option value="taller2">Taller 2</option>
            </select>
          </div>

          <div className="form-group">
            <label id="responsables-label" className="form-label required">Responsables</label>
            {familyUsers.length === 0 ? (
              <p className="form-helper-text">No hay familias disponibles para asignar.</p>
            ) : (
              <>
                <input
                  type="search"
                  className="form-input form-input--sm"
                  placeholder="Buscar por nombre o email..."
                  value={responsablesSearch}
                  onChange={(e) => setResponsablesSearch(e.target.value)}
                  aria-label="Buscar familias responsables"
                />
                <div className="family-selector" role="group" aria-labelledby="responsables-label">
                  {filteredFamilyUsers.length === 0 ? (
                    <div className="family-selector-item">
                      <p className="form-helper-text" style={{ padding: 'var(--spacing-sm)' }}>
                        No se encontraron familias.
                      </p>
                    </div>
                  ) : (
                    filteredFamilyUsers.map(user => {
                  const isChecked = formData.responsables.includes(user.id);
                  return (
                    <div key={user.id} className="family-selector-item">
                      <label className="family-checkbox">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleResponsableToggle(user.id)}
                          aria-checked={isChecked}
                        />
                        <div className="family-info">
                          <span className="family-name">{user.displayName || user.email}</span>
                          {user.displayName && user.email && (
                            <span className="family-email">{user.email}</span>
                          )}
                        </div>
                      </label>
                    </div>
                  );
                    })
                  )}
                </div>
              </>
            )}
            <small className="form-helper-text">
              Seleccionadas: {formData.responsables.length}
            </small>
            {responsablesError && (
              <div className="form-error" role="alert">
                {responsablesError}
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h3>Datos Médicos</h3>

          <div className="form-group">
            <label htmlFor="alergias" className="form-label">Alergias</label>
            <textarea
              id="alergias"
              name="alergias"
              value={formData.datosMedicos.alergias}
              onChange={handleMedicalDataChange}
              rows="3"
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label htmlFor="medicamentos" className="form-label">Medicamentos</label>
            <textarea
              id="medicamentos"
              name="medicamentos"
              value={formData.datosMedicos.medicamentos}
              onChange={handleMedicalDataChange}
              rows="3"
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label htmlFor="indicaciones" className="form-label">Indicaciones Médicas</label>
            <textarea
              id="indicaciones"
              name="indicaciones"
              value={formData.datosMedicos.indicaciones}
              onChange={handleMedicalDataChange}
              rows="3"
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label htmlFor="contactosEmergencia" className="form-label">Contactos de Emergencia</label>
            <textarea
              id="contactosEmergencia"
              name="contactosEmergencia"
              value={formData.datosMedicos.contactosEmergencia}
              onChange={handleMedicalDataChange}
              rows="3"
              className="form-textarea"
              placeholder="Nombre: Teléfono&#10;Nombre: Teléfono"
            />
          </div>
        </div>
      </div>

      {/* Sección de documentos adjuntos */}
      <div className="form-section" style={{ gridColumn: '1 / -1', marginTop: 'var(--spacing-md)', borderTop: '2px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
        <h3>Documentos Adjuntos</h3>
        <p className="form-helper-text" style={{ marginBottom: 'var(--spacing-sm)' }}>
          Sube fichas de inscripción, certificados médicos, autorizaciones y otros documentos importantes.
        </p>

        {!child?.id && (
          <div className="alert alert--info" style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>Primero crea la ficha del alumno</strong>
            <span style={{ display: 'block', marginTop: '4px', fontSize: 'var(--font-size-sm)' }}>
              Guarda el alumno y luego edítalo para adjuntar documentos.
            </span>
          </div>
        )}

        {/* Lista de documentos existentes */}
        {formData.documentos.length > 0 && (
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'grid', gap: 'var(--spacing-xs)' }}>
              {formData.documentos.map((doc, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)', 
                  padding: 'var(--spacing-sm)', 
                  backgroundColor: 'var(--color-background-alt)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: '2px' }}>
                        {doc.nombre}
                      </div>
                      <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                        {doc.descripcion}
                      </div>
                      {doc.fechaSubida && (
                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', marginTop: '2px' }}>
                          Subido: {new Date(doc.fechaSubida).toLocaleDateString('es-AR')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn--sm btn--outline"
                      style={{ flex: '1 1 auto', minWidth: '100px' }}
                    >
                      Ver documento
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(index, doc)}
                      className="btn btn--sm btn--danger"
                      style={{ flex: '1 1 auto', minWidth: '100px' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario para subir nuevo documento */}
        {child?.id && (
          <div style={{ 
            padding: 'var(--spacing-md)', 
            backgroundColor: 'var(--color-primary-soft)', 
            borderRadius: 'var(--radius-md)',
            border: '2px dashed var(--color-primary)'
          }}>
            <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
              <label htmlFor="fileInput" className="form-label">Seleccionar archivo</label>
              <input
                type="file"
                id="fileInput"
                onChange={handleFileSelect}
                className="form-input"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                disabled={uploadingFile}
              />
              <small className="form-helper-text">Max 5MB (PDF, imágenes, Word)</small>
            </div>
            <div className="form-group" style={{ marginBottom: 'var(--spacing-sm)' }}>
              <label htmlFor="fileDescription" className="form-label">Descripción</label>
              <input
                type="text"
                id="fileDescription"
                value={fileDescription}
                onChange={(e) => setFileDescription(e.target.value)}
                className="form-input"
                placeholder="Ej: Ficha de inscripción 2026"
                disabled={uploadingFile}
              />
            </div>
            <button
              type="button"
              onClick={handleUploadDocument}
              disabled={!fileToUpload || uploadingFile}
              className="btn btn--primary"
            >
              {uploadingFile ? 'Subiendo...' : 'Subir documento'}
            </button>
          </div>
        )}
      </div>

      <div className="form-actions child-form__actions">
        <button type="button" onClick={onCancel} className="btn btn--secondary">
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary btn--lg" disabled={loading}>
          {loading ? 'Guardando...' : child ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

export default ChildForm;
