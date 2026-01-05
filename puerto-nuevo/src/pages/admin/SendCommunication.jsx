import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { childrenService } from '../../services/children.service';
import { communicationsService } from '../../services/communications.service';
import { usersService } from '../../services/users.service';
import { useAuth } from '../../hooks/useAuth';
import { COMMUNICATION_TYPES, AMBIENTES, ROUTES, ROLES } from '../../config/constants';
import { Modal, ModalBody } from '../../components/common/Modal';
import Icon from '../../components/ui/Icon';

export function SendCommunication() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [familyUsers, setFamilyUsers] = useState([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [recipientScope, setRecipientScope] = useState('families');
  const [childOptions, setChildOptions] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState([]);
  const [childSearchTerm, setChildSearchTerm] = useState('');
  const [showChildDropdown, setShowChildDropdown] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: COMMUNICATION_TYPES.GLOBAL,
    ambiente: AMBIENTES.TALLER_1,
    destinatarios: [],
    requiereLecturaObligatoria: false,
    sendByEmail: true
  });

  // Load family users when type is INDIVIDUAL
  useEffect(() => {
    const loadFamilies = async () => {
      if (formData.type !== COMMUNICATION_TYPES.INDIVIDUAL) return;

      setLoadingFamilies(true);
      try {
        const result = await usersService.getUsersByRole(ROLES.FAMILY);
        if (result.success) {
          setFamilyUsers(result.users);
        }
      } catch (error) {
        console.error('Error loading families:', error);
      } finally {
        setLoadingFamilies(false);
      }
    };

    loadFamilies();
  }, [formData.type]);

  useEffect(() => {
    if (formData.type !== COMMUNICATION_TYPES.INDIVIDUAL || recipientScope !== 'children') return;
    if (childOptions.length > 0) return;

    const loadChildren = async () => {
      setLoadingChildren(true);
      try {
        const result = await childrenService.getAllChildren();
        if (result.success) {
          setChildOptions(result.children);
        }
      } catch (error) {
        console.error('Error loading children:', error);
      } finally {
        setLoadingChildren(false);
      }
    };

    loadChildren();
  }, [formData.type, recipientScope, childOptions.length]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const getChildRecipients = (childIds) => {
    const recipients = new Set();
    childIds.forEach(childId => {
      const child = childOptions.find(item => item.id === childId);
      if (child && Array.isArray(child.responsables)) {
        child.responsables.forEach(uid => {
          if (uid) recipients.add(uid);
        });
      }
    });
    return Array.from(recipients);
  };

  const handleRecipientScopeChange = (scope) => {
    setRecipientScope(scope);
    setSearchTerm('');
    setShowDropdown(false);
    setChildSearchTerm('');
    setShowChildDropdown(false);
    if (scope === 'families') {
      setFormData(prev => ({
        ...prev,
        destinatarios: selectedFamilies
      }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      destinatarios: getChildRecipients(selectedChildren)
    }));
  };

  const handleFamilySelect = (familyId) => {
    // Solo agregar si no está ya seleccionada
    if (!selectedFamilies.includes(familyId)) {
      const newSelected = [...selectedFamilies, familyId];
      setSelectedFamilies(newSelected);
      if (recipientScope === 'families') {
        setFormData(prev => ({
          ...prev,
          destinatarios: newSelected
        }));
      }
    }
    // Limpiar búsqueda y cerrar dropdown
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSelectAll = () => {
    const allFamilyIds = familyUsers.map(f => f.id);
    setSelectedFamilies(allFamilyIds);
    if (recipientScope === 'families') {
      setFormData(prev => ({
        ...prev,
        destinatarios: allFamilyIds
      }));
    }
  };

  const handleDeselectAll = () => {
    setSelectedFamilies([]);
    if (recipientScope === 'families') {
      setFormData(prev => ({
        ...prev,
        destinatarios: []
      }));
    }
  };

  const handleRemoveFamily = (familyId) => {
    const newSelected = selectedFamilies.filter(id => id !== familyId);
    setSelectedFamilies(newSelected);
    if (recipientScope === 'families') {
      setFormData(prev => ({
        ...prev,
        destinatarios: newSelected
      }));
    }
  };

  // Filtrar familias según búsqueda (excluir ya seleccionadas, máximo 10)
  const filteredFamilies = searchTerm.length >= 2
    ? familyUsers
        .filter(family => !selectedFamilies.includes(family.id)) // Excluir seleccionadas
        .filter(family => {
          const searchLower = searchTerm.toLowerCase();
          const name = (family.displayName || '').toLowerCase();
          const email = (family.email || '').toLowerCase();
          return name.includes(searchLower) || email.includes(searchLower);
        })
        .slice(0, 10) // Máximo 10 resultados
    : [];

  // Obtener info completa de familias seleccionadas
  const getSelectedFamiliesInfo = () => {
    return selectedFamilies.map(id =>
      familyUsers.find(f => f.id === id)
    ).filter(Boolean);
  };

  const nonSelectedChildren = childOptions.filter(child => !selectedChildren.includes(child.id));
  const childMatches = childSearchTerm.length >= 2
    ? nonSelectedChildren.filter(child => {
        const name = (child.nombreCompleto || '').toLowerCase();
        return name.includes(childSearchTerm.toLowerCase());
      })
    : [];
  const filteredChildren = childMatches.slice(0, 10);

  const getSelectedChildrenInfo = () => {
    return selectedChildren.map(id =>
      childOptions.find(child => child.id === id)
    ).filter(Boolean);
  };

  const getAmbienteLabel = (ambiente) => {
    if (ambiente === AMBIENTES.TALLER_1) return 'Taller 1';
    if (ambiente === AMBIENTES.TALLER_2) return 'Taller 2';
    return 'Sin taller';
  };

  const handleChildSelect = (childId) => {
    if (!selectedChildren.includes(childId)) {
      const newSelected = [...selectedChildren, childId];
      setSelectedChildren(newSelected);
      if (recipientScope === 'children') {
        setFormData(prev => ({
          ...prev,
          destinatarios: getChildRecipients(newSelected)
        }));
      }
    }
    setChildSearchTerm('');
    setShowChildDropdown(false);
  };

  const handleRemoveChild = (childId) => {
    const newSelected = selectedChildren.filter(id => id !== childId);
    setSelectedChildren(newSelected);
    if (recipientScope === 'children') {
      setFormData(prev => ({
        ...prev,
        destinatarios: getChildRecipients(newSelected)
      }));
    }
  };

  const hasRecipients = recipientScope === 'families'
    ? selectedFamilies.length > 0
    : formData.destinatarios.length > 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'
  const [modalMessage, setModalMessage] = useState('');

  // Adjuntos antes del envío
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles(prev => [...prev, ...files]);
    // reset input
    e.target.value = null;
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Abrir modal en estado 'sending'
    setModalOpen(true);
    setModalStatus('sending');
    setModalMessage('Enviando...');

    try {
      const communicationData = {
        title: formData.title,
        body: formData.body,
        type: formData.type,
        requiereLecturaObligatoria: formData.requiereLecturaObligatoria,
        sendByEmail: formData.sendByEmail,
        sentBy: user.uid,
        sentByDisplayName: user.displayName || user.email,
        destinatarios: [],
        // Flag para indicar si hay adjuntos pendientes (debe ser boolean explícito)
        hasPendingAttachments: !!(selectedFiles && selectedFiles.length > 0)
      };

      if (formData.type === COMMUNICATION_TYPES.AMBIENTE) {
        communicationData.ambiente = formData.ambiente;
      } else if (formData.type === COMMUNICATION_TYPES.INDIVIDUAL) {
        communicationData.destinatarios = formData.destinatarios;
      }

      const result = await communicationsService.createCommunication(communicationData);

      if (result.success) {
        // Si hay adjuntos, subimos los archivos y actualizamos el documento
        if (selectedFiles && selectedFiles.length > 0) {
          setModalStatus('sending');
          setModalMessage('Subiendo archivos...');
          const uploadRes = await communicationsService.uploadAttachments(result.id, selectedFiles);
          if (!uploadRes.success) {
            setError(uploadRes.error);
            setModalStatus('error');
            setModalMessage(uploadRes.error || 'Error al subir archivos');
            // No navegar hasta que se resuelva
            return;
          }
        }

        setModalStatus('success');
        setModalMessage('Enviado correctamente');
        // Limpiar adjuntos
        setSelectedFiles([]);
        // Mantener el modal visible 1s y luego redirigir
        setTimeout(() => {
          setModalOpen(false);
          navigate(ROUTES.ADMIN_DASHBOARD);
        }, 1000);
      } else {
        setError(result.error);
        setModalStatus('error');
        setModalMessage(result.error || 'Error al enviar');
      }
    } catch (err) {
      setError(err.message);
      setModalStatus('error');
      setModalMessage(err.message || 'Error al enviar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-container">
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Enviar Comunicado</h1>
        </div>

        <div className="card__body">
          {error && (
            <div className="alert alert--error mb-md">
              Error: {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title" className="required">
                Título
              </label>
              <input
                type="text"
                id="title"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="body" className="required">
                Contenido
              </label>
              <textarea
                id="body"
                name="body"
                className="form-textarea"
                value={formData.body}
                onChange={handleChange}
                required
                disabled={loading}
                rows="8"
              />

              <div className="form-group">
                <label>Adjuntos (opcional)</label>
                <input
                  type="file"
                  multiple
                  onChange={handleFilesChange}
                  disabled={loading}
                  className="form-input"
                />

                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: 'var(--spacing-sm)' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {selectedFiles.map((file, i) => (
                        <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                            <strong style={{ display: 'inline-block', maxWidth: '60ch', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</strong>
                            <span style={{ color: 'var(--color-text-light)', marginLeft: '0.5rem' }}>({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <div>
                            <button type="button" className="btn btn--link" onClick={() => removeSelectedFile(i)}>Eliminar</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="type" className="required">
                Tipo de Comunicado
              </label>
              <select
                id="type"
                name="type"
                className="form-select"
                value={formData.type}
                onChange={handleChange}
                required
                disabled={loading}
              >
                <option value={COMMUNICATION_TYPES.GLOBAL}>
                  Global (Toda la comunidad)
                </option>
                <option value={COMMUNICATION_TYPES.AMBIENTE}>
                  Ambiente (Taller 1 o 2)
                </option>
                <option value={COMMUNICATION_TYPES.INDIVIDUAL}>
                  Individual (Familias específicas)
                </option>
              </select>
            </div>

            {formData.type === COMMUNICATION_TYPES.AMBIENTE && (
              <div className="form-group">
                <label htmlFor="ambiente" className="required">
                  Seleccionar Ambiente
                </label>
                <select
                  id="ambiente"
                  name="ambiente"
                  className="form-select"
                  value={formData.ambiente}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value={AMBIENTES.TALLER_1}>Taller 1</option>
                  <option value={AMBIENTES.TALLER_2}>Taller 2</option>
                </select>
              </div>
            )}

            {formData.type === COMMUNICATION_TYPES.INDIVIDUAL && (
              <div className="form-group">
                <label className="required">
                  Seleccionar destinatarios
                </label>

                <div className="recipient-card">
                  <div className="recipient-mode">
                    <label className={recipientScope === 'families' ? 'recipient-mode-option is-active' : 'recipient-mode-option'}>
                      <input
                        type="radio"
                        name="recipientScope"
                        value="families"
                        checked={recipientScope === 'families'}
                        onChange={() => handleRecipientScopeChange('families')}
                        disabled={loading}
                      />
                      <span>
                        <span className="recipient-mode-title">Familias</span>
                        <span className="recipient-mode-subtitle">Enviar a responsables</span>
                      </span>
                    </label>
                    <label className={recipientScope === 'children' ? 'recipient-mode-option is-active' : 'recipient-mode-option'}>
                      <input
                        type="radio"
                        name="recipientScope"
                        value="children"
                        checked={recipientScope === 'children'}
                        onChange={() => handleRecipientScopeChange('children')}
                        disabled={loading}
                      />
                      <span>
                        <span className="recipient-mode-title">Alumnos</span>
                        <span className="recipient-mode-subtitle">Se avisa a sus responsables</span>
                      </span>
                    </label>
                  </div>
                  <div className="recipient-content">
                    {recipientScope === 'families' && (
                      <>
                        {loadingFamilies ? (
                          <p className="form-help">Cargando familias...</p>
                        ) : (
                          <>
                            {selectedFamilies.length > 0 && (
                              <div className="selected-families-chips recipient-chips">
                                <div className="chips-label">
                                  Seleccionadas ({selectedFamilies.length}):
                                </div>
                                <div className="chips-container">
                                  {getSelectedFamiliesInfo().map(family => (
                                    <div key={family.id} className="recipient-chip">
                                      <span className="chip-text">
                                        {family.displayName || family.email}
                                      </span>
                                      <button
                                        type="button"
                                        className="chip-remove"
                                        onClick={() => handleRemoveFamily(family.id)}
                                        disabled={loading}
                                        aria-label={`Remover ${family.displayName || family.email}`}
                                      >
                                        x
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="family-autocomplete">
                              <div className="recipient-search-input">
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Buscar familias por nombre o email..."
                                  value={searchTerm}
                                  onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowDropdown(e.target.value.length >= 2);
                                  }}
                                  onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
                                  disabled={loading}
                                />
                              </div>

                              {showDropdown && filteredFamilies.length > 0 && (
                                <div className="family-dropdown">
                                  {filteredFamilies.map(family => (
                                    <div
                                      key={family.id}
                                      className="family-dropdown-item"
                                      onClick={() => handleFamilySelect(family.id)}
                                    >
                                      <div className="family-info">
                                        <span className="family-name">
                                          {family.displayName || family.email}
                                        </span>
                                        <span className="family-email">
                                          {family.email}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {familyUsers.filter(f => !selectedFamilies.includes(f.id)).length > 10 && (
                                    <div className="family-dropdown-footer">
                                      Mostrando 10 de {familyUsers.filter(f => !selectedFamilies.includes(f.id)).filter(f => {
                                        const searchLower = searchTerm.toLowerCase();
                                        return (f.displayName || '').toLowerCase().includes(searchLower) ||
                                               (f.email || '').toLowerCase().includes(searchLower);
                                      }).length} resultados. Escribi mas para filtrar.
                                    </div>
                                  )}
                                </div>
                              )}

                              {showDropdown && searchTerm.length >= 2 && filteredFamilies.length === 0 && (
                                <div className="family-dropdown">
                                  <div className="family-dropdown-empty">
                                    No se encontraron familias con "{searchTerm}"
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="recipient-quick-actions">
                              <button
                                type="button"
                                className="btn btn--sm btn--outline"
                                onClick={handleSelectAll}
                                disabled={loading}
                                title="Seleccionar todas las familias"
                              >
                                Seleccionar todas ({familyUsers.length})
                              </button>
                              {selectedFamilies.length > 0 && (
                                <button
                                  type="button"
                                  className="btn btn--sm btn--outline"
                                  onClick={handleDeselectAll}
                                  disabled={loading}
                                >
                                  Limpiar seleccion
                                </button>
                              )}
                            </div>

                            {!hasRecipients && (
                              <p className="form-error mt-sm">
                                Debes seleccionar al menos una familia
                              </p>
                            )}
                          </>
                        )}
                      </>
                    )}
                    {recipientScope === 'children' && (
                      <>
                        {loadingChildren ? (
                          <p className="form-help">Cargando alumnos...</p>
                        ) : (
                          <>
                            {selectedChildren.length > 0 && (
                              <div className="selected-families-chips recipient-chips">
                                <div className="chips-label">
                                  Seleccionados ({selectedChildren.length}):
                                </div>
                                <div className="chips-container">
                                  {getSelectedChildrenInfo().map(child => (
                                    <div key={child.id} className="recipient-chip">
                                      <span className="chip-text">
                                        {child.nombreCompleto || "Sin nombre"}
                                      </span>
                                      <button
                                        type="button"
                                        className="chip-remove"
                                        onClick={() => handleRemoveChild(child.id)}
                                        disabled={loading}
                                        aria-label={`Remover ${child.nombreCompleto || "alumno"}`}
                                      >
                                        x
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="family-autocomplete">
                              <div className="recipient-search-input">
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="Buscar alumno por nombre..."
                                  value={childSearchTerm}
                                  onChange={(e) => {
                                    setChildSearchTerm(e.target.value);
                                    setShowChildDropdown(e.target.value.length >= 2);
                                  }}
                                  onFocus={() => childSearchTerm.length >= 2 && setShowChildDropdown(true)}
                                  disabled={loading}
                                />
                              </div>
                              {showChildDropdown && filteredChildren.length > 0 && (
                                <div className="family-dropdown">
                                  {filteredChildren.map(child => (
                                    <div
                                      key={child.id}
                                      className="family-dropdown-item"
                                      onClick={() => handleChildSelect(child.id)}
                                    >
                                      <div className="family-info">
                                        <span className="family-name">
                                          {child.nombreCompleto || "Sin nombre"}
                                        </span>
                                        <span className="family-email">
                                          {getAmbienteLabel(child.ambiente)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {childMatches.length > 10 && (
                                    <div className="family-dropdown-footer">
                                      Mostrando 10 de {childMatches.length} resultados. Escribi mas para filtrar.
                                    </div>
                                  )}
                                </div>
                              )}
                              {showChildDropdown && childSearchTerm.length >= 2 && filteredChildren.length === 0 && (
                                <div className="family-dropdown">
                                  <div className="family-dropdown-empty">
                                    No se encontraron alumnos con "{childSearchTerm}"
                                  </div>
                                </div>
                              )}
                            </div>

                            {!hasRecipients && (
                              <p className="form-error mt-sm">
                                Debes seleccionar al menos un alumno con responsables
                              </p>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="form-checkbox">
              <input
                type="checkbox"
                id="requiereLecturaObligatoria"
                name="requiereLecturaObligatoria"
                checked={formData.requiereLecturaObligatoria}
                onChange={handleChange}
                disabled={loading}
              />
              <label htmlFor="requiereLecturaObligatoria">
                Requiere confirmación de lectura obligatoria
              </label>
            </div>

            <div className="form-checkbox">
              <input
                type="checkbox"
                id="sendByEmail"
                name="sendByEmail"
                checked={formData.sendByEmail}
                onChange={handleChange}
                disabled={loading}
              />
              <label htmlFor="sendByEmail">
                Enviar tambien por email a los destinatarios
              </label>
            </div>

            <div className="flex-row mt-xl">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={loading || (formData.type === COMMUNICATION_TYPES.INDIVIDUAL && !hasRecipients)}
              >
                {loading ? 'Enviando...' : 'Enviar Comunicado'}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate(ROUTES.ADMIN_DASHBOARD)}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Status Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="sm">
        <ModalBody>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexDirection: 'column', textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
            {modalStatus === 'sending' && (
              <div className="spinner" aria-hidden="true" style={{ width: 48, height: 48 }} />
            )}

            {modalStatus === 'success' && (
              <div>
                <Icon name="check-circle" size={48} />
              </div>
            )}

            {modalStatus === 'error' && (
              <div>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            )}

            <div style={{ marginTop: 8, fontWeight: 600 }}>{modalMessage}</div>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}
