import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { childrenService } from '../../services/children.service';
import { communicationsService } from '../../services/communications.service';
import { usersService } from '../../services/users.service';
import { eventsService } from '../../services/events.service';
import { useAuth } from '../../hooks/useAuth';
import { COMMUNICATION_TYPES, AMBIENTES, ROUTES, ROLES } from '../../config/constants';
import { Modal, ModalBody } from '../../components/common/Modal';
import Icon from '../../components/ui/Icon';
import './SendCommunication.css';

export function SendCommunication({ embedded = false, onSuccess, onCancel }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const maxEventMediaSizeBytes = 50 * 1024 * 1024;
  const maxEventMediaSizeLabel = '50MB';
  const allowedEventMediaExtensions = new Set([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
    'mp4', 'mov', 'webm', 'ogv',
    'mp3', 'wav', 'm4a', 'ogg',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'csv'
  ]);
  const blockedEventMediaExtensions = new Set(['zip', 'exe', 'bat']);
  const allowedEventMediaMimePrefixes = ['image/', 'video/', 'audio/'];
  const allowedEventMediaMimeTypes = new Set([
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence'
  ]);
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
    sendByEmail: true,
    createEvent: false,
    eventoTitulo: '',
    eventoFecha: '',
    eventoHora: '',
    eventoDescripcion: ''
  });

  useEffect(() => {
    const loadFamilies = async () => {
      if (formData.type !== COMMUNICATION_TYPES.INDIVIDUAL) return;
      setLoadingFamilies(true);
      try {
        const result = await usersService.getUsersByRole(ROLES.FAMILY);
        if (result.success) setFamilyUsers(result.users);
      } catch (err) {
        console.error('Error loading families:', err);
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
        if (result.success) setChildOptions(result.children);
      } catch (err) {
        console.error('Error loading children:', err);
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
        child.responsables.forEach(uid => { if (uid) recipients.add(uid); });
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
      setFormData(prev => ({ ...prev, destinatarios: selectedFamilies }));
      return;
    }
    setFormData(prev => ({ ...prev, destinatarios: getChildRecipients(selectedChildren) }));
  };

  const handleFamilySelect = (familyId) => {
    if (!selectedFamilies.includes(familyId)) {
      const newSelected = [...selectedFamilies, familyId];
      setSelectedFamilies(newSelected);
      if (recipientScope === 'families') setFormData(prev => ({ ...prev, destinatarios: newSelected }));
    }
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSelectAll = () => {
    const allFamilyIds = sortedFamilyUsers.map(f => f.id);
    setSelectedFamilies(allFamilyIds);
    if (recipientScope === 'families') setFormData(prev => ({ ...prev, destinatarios: allFamilyIds }));
  };

  const handleDeselectAll = () => {
    setSelectedFamilies([]);
    if (recipientScope === 'families') setFormData(prev => ({ ...prev, destinatarios: [] }));
  };

  const handleRemoveFamily = (familyId) => {
    const newSelected = selectedFamilies.filter(id => id !== familyId);
    setSelectedFamilies(newSelected);
    if (recipientScope === 'families') setFormData(prev => ({ ...prev, destinatarios: newSelected }));
  };

  const sortedFamilyUsers = useMemo(() => (
    [...familyUsers].sort((a, b) => {
      const aLabel = (a.displayName || a.email || '').trim().toLowerCase();
      const bLabel = (b.displayName || b.email || '').trim().toLowerCase();
      return aLabel.localeCompare(bLabel, 'es', { sensitivity: 'base' });
    })
  ), [familyUsers]);

  const availableFamilies = useMemo(() => (
    sortedFamilyUsers.filter(family => !selectedFamilies.includes(family.id))
  ), [sortedFamilyUsers, selectedFamilies]);

  const matchingAvailableFamilies = useMemo(() => {
    if (searchTerm.length < 2) return [];
    const searchLower = searchTerm.toLowerCase();
    return availableFamilies.filter((family) => {
      const name = (family.displayName || '').toLowerCase();
      const email = (family.email || '').toLowerCase();
      return name.includes(searchLower) || email.includes(searchLower);
    });
  }, [availableFamilies, searchTerm]);

  const filteredFamilies = searchTerm.length >= 2
    ? matchingAvailableFamilies.slice(0, 10)
    : [];

  const getSelectedFamiliesInfo = () =>
    selectedFamilies.map(id => familyUsers.find(f => f.id === id)).filter(Boolean);

  const nonSelectedChildren = childOptions.filter(child => !selectedChildren.includes(child.id));
  const childMatches = childSearchTerm.length >= 2
    ? nonSelectedChildren.filter(child =>
        (child.nombreCompleto || '').toLowerCase().includes(childSearchTerm.toLowerCase())
      )
    : [];
  const filteredChildren = childMatches.slice(0, 10);

  const getSelectedChildrenInfo = () =>
    selectedChildren.map(id => childOptions.find(child => child.id === id)).filter(Boolean);

  const getAmbienteLabel = (ambiente) => {
    if (ambiente === AMBIENTES.TALLER_1) return 'Taller 1';
    if (ambiente === AMBIENTES.TALLER_2) return 'Taller 2';
    return 'Sin taller';
  };

  const handleChildSelect = (childId) => {
    if (!selectedChildren.includes(childId)) {
      const newSelected = [...selectedChildren, childId];
      setSelectedChildren(newSelected);
      if (recipientScope === 'children') setFormData(prev => ({ ...prev, destinatarios: getChildRecipients(newSelected) }));
    }
    setChildSearchTerm('');
    setShowChildDropdown(false);
  };

  const handleRemoveChild = (childId) => {
    const newSelected = selectedChildren.filter(id => id !== childId);
    setSelectedChildren(newSelected);
    if (recipientScope === 'children') setFormData(prev => ({ ...prev, destinatarios: getChildRecipients(newSelected) }));
  };

  const hasRecipients = recipientScope === 'families'
    ? selectedFamilies.length > 0
    : formData.destinatarios.length > 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalStatus, setModalStatus] = useState('idle');
  const [modalMessage, setModalMessage] = useState('');

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedEventMediaFiles, setSelectedEventMediaFiles] = useState([]);
  const [eventMediaError, setEventMediaError] = useState('');

  const handleFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSelectedFiles(prev => [...prev, ...files]);
    e.target.value = null;
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEventMediaFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const validFiles = [];
    let hasInvalidType = false;
    let hasBlockedType = false;
    let hasOversize = false;
    files.forEach((file) => {
      const name = (file.name || '').toLowerCase();
      const ext = name.includes('.') ? name.split('.').pop() : '';
      const type = (file.type || '').toLowerCase();
      const isBlocked = ext && blockedEventMediaExtensions.has(ext);
      const isAllowedExt = ext && allowedEventMediaExtensions.has(ext);
      const isAllowedMime = type
        ? (allowedEventMediaMimePrefixes.some(prefix => type.startsWith(prefix)) || allowedEventMediaMimeTypes.has(type))
        : false;
      if (isBlocked) { hasBlockedType = true; return; }
      if (!isAllowedExt && !isAllowedMime) { hasInvalidType = true; return; }
      if (file.size > maxEventMediaSizeBytes) { hasOversize = true; return; }
      validFiles.push(file);
    });
    if (hasInvalidType || hasOversize || hasBlockedType) {
      let message = '';
      if (hasInvalidType || hasBlockedType) message = 'Solo se permiten imágenes, videos, audio, documentos o texto. Bloqueados: .zip, .exe, .bat.';
      if (hasOversize) message = `${message ? `${message} ` : ''}Algunos archivos superan el límite de ${maxEventMediaSizeLabel}.`;
      setEventMediaError(message);
    } else {
      setEventMediaError('');
    }
    if (validFiles.length > 0) setSelectedEventMediaFiles(prev => [...prev, ...validFiles]);
    e.target.value = null;
  };

  const removeSelectedEventMediaFile = (index) => {
    setSelectedEventMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (size = 0) => {
    if (!size) return '';
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  useEffect(() => {
    if (!formData.createEvent) {
      setSelectedEventMediaFiles([]);
      setEventMediaError('');
    }
  }, [formData.createEvent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setModalOpen(true);
    setModalStatus('sending');
    setModalMessage('Enviando...');
    try {
      let eventMediaUploadFailed = false;
      const communicationData = {
        title: formData.title,
        body: formData.body,
        type: formData.type,
        requiereLecturaObligatoria: formData.requiereLecturaObligatoria,
        sendByEmail: formData.sendByEmail,
        sentBy: user.uid,
        sentByDisplayName: user.displayName || user.email,
        destinatarios: [],
        hasPendingAttachments: !!(selectedFiles && selectedFiles.length > 0)
      };
      if (formData.type === COMMUNICATION_TYPES.AMBIENTE) {
        communicationData.ambiente = formData.ambiente;
      } else if (formData.type === COMMUNICATION_TYPES.INDIVIDUAL) {
        communicationData.destinatarios = formData.destinatarios;
      }
      const result = await communicationsService.createCommunication(communicationData);
      if (result.success) {
        if (selectedFiles && selectedFiles.length > 0) {
          setModalStatus('sending');
          setModalMessage('Subiendo archivos...');
          const uploadRes = await communicationsService.uploadAttachments(result.id, selectedFiles);
          if (!uploadRes.success) {
            setError(uploadRes.error);
            setModalStatus('error');
            setModalMessage(uploadRes.error || 'Error al subir archivos');
            return;
          }
        }
        if (formData.createEvent && formData.eventoTitulo && formData.eventoFecha) {
          setModalStatus('sending');
          setModalMessage('Creando evento en el calendario...');
          const eventData = {
            titulo: formData.eventoTitulo,
            fecha: formData.eventoFecha,
            hora: formData.eventoHora,
            descripcion: formData.eventoDescripcion || '',
            tipo: 'general',
            communicationId: result.id
          };
          const eventResult = await eventsService.createEvent(eventData);
          if (eventResult?.success && selectedEventMediaFiles.length > 0) {
            setModalStatus('sending');
            setModalMessage('Subiendo archivos del evento...');
            const mediaResult = await eventsService.uploadEventMedia(eventResult.id, selectedEventMediaFiles, []);
            if (!mediaResult.success) eventMediaUploadFailed = true;
          }
        }
        setModalStatus('success');
        setModalMessage(
          eventMediaUploadFailed
            ? 'Enviado correctamente, pero no se pudieron subir los archivos del evento.'
            : 'Enviado correctamente'
        );
        setSelectedFiles([]);
        setSelectedEventMediaFiles([]);
        setTimeout(() => {
          setModalOpen(false);
          if (embedded) {
            if (onSuccess) onSuccess();
          } else {
            navigate(ROUTES.ADMIN_DASHBOARD);
          }
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

  /* ── SVG inline para ícono de carga ── */
  const UploadIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  /* ── SVG inline para ícono de globo ── */
  const GlobeIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  /* ── Bloque reutilizable: lista de archivos ── */
  const FileList = ({ files, onRemove }) => (
    <ul className="sc-files">
      {files.map((file, i) => (
        <li key={i} className="sc-file">
          <Icon name="file" size={15} className="sc-file__icon" />
          <span className="sc-file__name">{file.name}</span>
          <span className="sc-file__size">{formatFileSize(file.size)}</span>
          <button
            type="button"
            className="sc-file__remove"
            onClick={() => onRemove(i)}
            aria-label={`Eliminar ${file.name}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );

  /* ── Zona de carga de archivos ── */
  const UploadZone = ({ id, onChange, hint }) => (
    <div className="sc-upload">
      <input
        type="file"
        id={id}
        multiple
        onChange={onChange}
        disabled={loading}
        className="sc-upload__input"
        aria-label="Seleccionar archivos"
      />
      <span className="sc-upload__icon"><UploadIcon /></span>
      <p className="sc-upload__cta">Arrastrar o <strong>seleccionar archivos</strong></p>
      {hint && <p className="sc-upload__hint">{hint}</p>}
    </div>
  );

  /* ─────────────────────────────────────────────
     JSX del formulario (compartido entre standalone
     y embedded para evitar duplicación)
  ───────────────────────────────────────────── */
  const formContent = (
    <form onSubmit={handleSubmit}>

      {/* ── SECCIÓN 1: Mensaje ── */}
      <div className="sc-section">
        <div className="sc-section__header">
          <span className="sc-section__num">1</span>
          <h3 className="sc-section__title">Mensaje</h3>
        </div>

        <div className="form-group">
          <label htmlFor="title" className="required">Título</label>
          <input
            type="text"
            id="title"
            name="title"
            className="form-input"
            value={formData.title}
            onChange={handleChange}
            required
            disabled={loading}
            placeholder="Ej: Reunión de padres – junio"
          />
        </div>

        <div className="form-group">
          <label htmlFor="body" className="required">Contenido</label>
          <textarea
            id="body"
            name="body"
            className="form-textarea"
            value={formData.body}
            onChange={handleChange}
            required
            disabled={loading}
            rows="8"
            placeholder="Escribí el cuerpo del comunicado..."
          />
        </div>

        <div className="form-group">
          <label>
            Archivos adjuntos
            <span className="sc-label-optional">(opcional)</span>
          </label>
          <UploadZone
            id="attachments"
            onChange={handleFilesChange}
            hint="PDF, imágenes, documentos · máx. 50 MB por archivo"
          />
          {selectedFiles.length > 0 && (
            <FileList files={selectedFiles} onRemove={removeSelectedFile} />
          )}
        </div>
      </div>

      {/* ── SECCIÓN 2: Destinatarios ── */}
      <div className="sc-section">
        <div className="sc-section__header">
          <span className="sc-section__num">2</span>
          <h3 className="sc-section__title">Destinatarios</h3>
        </div>

        <div className="form-group">
          <label className="required">Tipo de comunicado</label>
          <div className="sc-type-grid">
            <button
              type="button"
              className={`sc-type-card${formData.type === COMMUNICATION_TYPES.GLOBAL ? ' sc-type-card--active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, type: COMMUNICATION_TYPES.GLOBAL }))}
              disabled={loading}
            >
              <GlobeIcon />
              <span className="sc-type-card__label">Global</span>
              <span className="sc-type-card__desc">Toda la comunidad</span>
            </button>
            <button
              type="button"
              className={`sc-type-card${formData.type === COMMUNICATION_TYPES.AMBIENTE ? ' sc-type-card--active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, type: COMMUNICATION_TYPES.AMBIENTE }))}
              disabled={loading}
            >
              <Icon name="book" size={22} />
              <span className="sc-type-card__label">Ambiente</span>
              <span className="sc-type-card__desc">Taller 1 o 2</span>
            </button>
            <button
              type="button"
              className={`sc-type-card${formData.type === COMMUNICATION_TYPES.INDIVIDUAL ? ' sc-type-card--active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, type: COMMUNICATION_TYPES.INDIVIDUAL }))}
              disabled={loading}
            >
              <Icon name="user" size={22} />
              <span className="sc-type-card__label">Individual</span>
              <span className="sc-type-card__desc">Familias específicas</span>
            </button>
          </div>
        </div>

        {formData.type === COMMUNICATION_TYPES.AMBIENTE && (
          <div className="form-group">
            <label className="required">Ambiente</label>
            <div className="sc-ambiente-grid">
              <button
                type="button"
                className={`sc-ambiente-btn${formData.ambiente === AMBIENTES.TALLER_1 ? ' sc-ambiente-btn--active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, ambiente: AMBIENTES.TALLER_1 }))}
                disabled={loading}
              >
                Taller 1
              </button>
              <button
                type="button"
                className={`sc-ambiente-btn${formData.ambiente === AMBIENTES.TALLER_2 ? ' sc-ambiente-btn--active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, ambiente: AMBIENTES.TALLER_2 }))}
                disabled={loading}
              >
                Taller 2
              </button>
            </div>
          </div>
        )}

        {formData.type === COMMUNICATION_TYPES.INDIVIDUAL && (
          <div className="form-group">
            <label className="required">Seleccionar destinatarios</label>

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
                            <div className="chips-label">Seleccionadas ({selectedFamilies.length}):</div>
                            <div className="chips-container">
                              {getSelectedFamiliesInfo().map(family => (
                                <div key={family.id} className="recipient-chip">
                                  <span className="chip-text">{family.displayName || family.email}</span>
                                  <button
                                    type="button"
                                    className="chip-remove"
                                    onClick={() => handleRemoveFamily(family.id)}
                                    disabled={loading}
                                    aria-label={`Remover ${family.displayName || family.email}`}
                                  >
                                    ×
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
                                    <span className="family-name">{family.displayName || family.email}</span>
                                    <span className="family-email">{family.email}</span>
                                  </div>
                                </div>
                              ))}
                              {matchingAvailableFamilies.length > 10 && (
                                <div className="family-dropdown-footer">
                                  Mostrando 10 de {matchingAvailableFamilies.length} resultados. Escribi mas para filtrar.
                                </div>
                              )}
                            </div>
                          )}

                          {showDropdown && searchTerm.length >= 2 && filteredFamilies.length === 0 && (
                            <div className="family-dropdown">
                              <div className="family-dropdown-empty">
                                No se encontraron familias con &ldquo;{searchTerm}&rdquo;
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
                              Limpiar selección
                            </button>
                          )}
                        </div>

                        {!hasRecipients && (
                          <p className="form-error mt-sm">Debes seleccionar al menos una familia</p>
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
                            <div className="chips-label">Seleccionados ({selectedChildren.length}):</div>
                            <div className="chips-container">
                              {getSelectedChildrenInfo().map(child => (
                                <div key={child.id} className="recipient-chip">
                                  <span className="chip-text">{child.nombreCompleto || 'Sin nombre'}</span>
                                  <button
                                    type="button"
                                    className="chip-remove"
                                    onClick={() => handleRemoveChild(child.id)}
                                    disabled={loading}
                                    aria-label={`Remover ${child.nombreCompleto || 'alumno'}`}
                                  >
                                    ×
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
                                    <span className="family-name">{child.nombreCompleto || 'Sin nombre'}</span>
                                    <span className="family-email">{getAmbienteLabel(child.ambiente)}</span>
                                  </div>
                                </div>
                              ))}
                              {childMatches.length > 10 && (
                                <div className="family-dropdown-footer">
                                  Mostrando 10 de {childMatches.length} resultados. Escribí más para filtrar.
                                </div>
                              )}
                            </div>
                          )}
                          {showChildDropdown && childSearchTerm.length >= 2 && filteredChildren.length === 0 && (
                            <div className="family-dropdown">
                              <div className="family-dropdown-empty">
                                No se encontraron alumnos con &ldquo;{childSearchTerm}&rdquo;
                              </div>
                            </div>
                          )}
                        </div>

                        {!hasRecipients && (
                          <p className="form-error mt-sm">Debes seleccionar al menos un alumno con responsables</p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SECCIÓN 3: Opciones de envío ── */}
      <div className="sc-section">
        <div className="sc-section__header">
          <span className="sc-section__num">3</span>
          <h3 className="sc-section__title">Opciones de envío</h3>
        </div>

        <div className="sc-options">
          <label className="sc-toggle-field" htmlFor="requiereLecturaObligatoria">
            <div className="sc-toggle-switch">
              <input
                type="checkbox"
                id="requiereLecturaObligatoria"
                name="requiereLecturaObligatoria"
                checked={formData.requiereLecturaObligatoria}
                onChange={handleChange}
                disabled={loading}
              />
              <span className="sc-toggle-track"><span className="sc-toggle-thumb" /></span>
            </div>
            <div className="sc-toggle-content">
              <span className="sc-toggle-label">Requiere confirmación de lectura</span>
              <span className="sc-toggle-desc">Los destinatarios deben confirmar que lo leyeron</span>
            </div>
          </label>

          <label className="sc-toggle-field" htmlFor="sendByEmail">
            <div className="sc-toggle-switch">
              <input
                type="checkbox"
                id="sendByEmail"
                name="sendByEmail"
                checked={formData.sendByEmail}
                onChange={handleChange}
                disabled={loading}
              />
              <span className="sc-toggle-track"><span className="sc-toggle-thumb" /></span>
            </div>
            <div className="sc-toggle-content">
              <span className="sc-toggle-label">Enviar también por email</span>
              <span className="sc-toggle-desc">Se enviará una copia al correo de cada destinatario</span>
            </div>
          </label>
        </div>
      </div>

      {/* ── SECCIÓN 4: Evento opcional ── */}
      <div className="sc-section">
        <div className="sc-section__header">
          <span className="sc-section__num">4</span>
          <h3 className="sc-section__title">Evento en el calendario</h3>
        </div>

        <div
          className={`sc-event-header${formData.createEvent ? ' sc-event-header--active' : ''}`}
          role="button"
          tabIndex={0}
          aria-expanded={formData.createEvent}
          onClick={() => !loading && setFormData(prev => ({ ...prev, createEvent: !prev.createEvent }))}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !loading) {
              e.preventDefault();
              setFormData(prev => ({ ...prev, createEvent: !prev.createEvent }));
            }
          }}
        >
          {/* Toggle visual sin input para evitar doble disparo */}
          <div className="sc-toggle-switch" aria-hidden="true">
            <span className={`sc-toggle-track${formData.createEvent ? ' sc-toggle-track--on' : ''}`}>
              <span className="sc-toggle-thumb" />
            </span>
          </div>
          <Icon name="calendar" size={18} />
          <div className="sc-event-header__text">
            <span className="sc-event-header__title">Agregar al calendario de eventos</span>
            <span className="sc-event-header__desc">Crea un evento vinculado a este comunicado</span>
          </div>
          <span className="sc-event-header__chevron">{formData.createEvent ? '▲' : '▼'}</span>
        </div>

        {formData.createEvent && (
          <div className="sc-event-body">
            <div className="form-group">
              <label htmlFor="eventoTitulo" className="required">Título del evento</label>
              <input
                type="text"
                id="eventoTitulo"
                name="eventoTitulo"
                className="form-input"
                value={formData.eventoTitulo}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Ej: Reunión de padres"
              />
            </div>

            <div className="events-form-row">
              <div className="form-group">
                <label htmlFor="eventoFecha" className="required">Fecha</label>
                <input
                  type="date"
                  id="eventoFecha"
                  name="eventoFecha"
                  className="form-input"
                  value={formData.eventoFecha}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label htmlFor="eventoHora">
                  Hora
                  <span className="sc-label-optional">(opcional)</span>
                </label>
                <input
                  type="time"
                  id="eventoHora"
                  name="eventoHora"
                  className="form-input"
                  value={formData.eventoHora}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="eventoDescripcion">
                Descripción
                <span className="sc-label-optional">(opcional)</span>
              </label>
              <textarea
                id="eventoDescripcion"
                name="eventoDescripcion"
                className="form-textarea"
                value={formData.eventoDescripcion}
                onChange={handleChange}
                disabled={loading}
                rows="3"
                placeholder="Descripción adicional del evento..."
              />
            </div>

            <div className="form-group">
              <label>
                Archivos del evento
                <span className="sc-label-optional">(opcional)</span>
              </label>
              <UploadZone
                id="eventMedia"
                onChange={handleEventMediaFilesChange}
                hint="Imágenes, videos, audio, documentos o texto · máx. 50 MB · Bloqueados: .zip, .exe, .bat"
              />
              {eventMediaError && <p className="form-error mt-sm">{eventMediaError}</p>}
              {selectedEventMediaFiles.length > 0 && (
                <FileList files={selectedEventMediaFiles} onRemove={removeSelectedEventMediaFile} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Acciones ── */}
      <div className="sc-actions">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={loading || (formData.type === COMMUNICATION_TYPES.INDIVIDUAL && !hasRecipients)}
        >
          <Icon name="send" size={16} />
          {loading ? 'Enviando...' : 'Enviar Comunicado'}
        </button>
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => (onCancel ? onCancel() : navigate(ROUTES.ADMIN_DASHBOARD))}
          disabled={loading}
        >
          Cancelar
        </button>
      </div>
    </form>
  );

  /* ── Modal de estado ── */
  const statusModal = (
    <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="sm" closeOnOverlay={false}>
      <ModalBody>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexDirection: 'column', textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
          {modalStatus === 'sending' && (
            <div className="spinner" aria-hidden="true" style={{ width: 48, height: 48 }} />
          )}
          {modalStatus === 'success' && (
            <div style={{ color: 'var(--color-success)' }}>
              <Icon name="check-circle" size={48} />
            </div>
          )}
          {modalStatus === 'error' && (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          <div style={{ marginTop: 8, fontWeight: 600 }}>{modalMessage}</div>
        </div>
      </ModalBody>
    </Modal>
  );

  /* ── Modo embebido (dentro de un panel/modal) ── */
  if (embedded) {
    return (
      <>
        {error && <div className="alert alert--error mb-md">Error: {error}</div>}
        {formContent}
        {statusModal}
      </>
    );
  }

  /* ── Modo página completa ── */
  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Enviar comunicado</h1>
          <p className="dashboard-subtitle">Redactá y enviá comunicados a las familias.</p>
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          {error && <div className="alert alert--error mb-md">Error: {error}</div>}
          {formContent}
        </div>
      </div>

      {statusModal}
    </div>
  );
}

