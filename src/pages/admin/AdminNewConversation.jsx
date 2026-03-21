import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usersService } from '../../services/users.service';
import { childrenService } from '../../services/children.service';
import { conversationsService } from '../../services/conversations.service';
import { CONVERSATION_CATEGORIES, ESCUELA_AREAS, ROLES, ROUTES } from '../../config/constants';
import Icon from '../../components/ui/Icon';
import './AdminNewConversation.css';

/* SVG icons moved to module scope to satisfy eslint (react-hooks/static-components) */
const UploadIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const AreaIcons = {
  coordinacion: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 20v-1a6 6 0 0 1 12 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="4" cy="10" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M1 20v-.5A4.5 4.5 0 0 1 5.5 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="20" cy="10" r="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M23 20v-.5A4.5 4.5 0 0 0 18.5 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  administracion: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 14h4M8 17h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  direccion: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

export function AdminNewConversation() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modo: individual o grupal
  const [modo, setModo] = useState('individual');

  // ── Estado modo individual ──
  const [familyUsers, setFamilyUsers] = useState([]);
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Estado modo grupal ──
  const [childOptions, setChildOptions] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [responsablesInfo, setResponsablesInfo] = useState([]); // [{ uid, displayName, email }]
  const [childSearchTerm, setChildSearchTerm] = useState('');
  const [showChildDropdown, setShowChildDropdown] = useState(false);
  const [loadingResponsables, setLoadingResponsables] = useState(false);

  const [file, setFile] = useState(null);

  const [form, setForm] = useState({
    destinatarioEscuela: role === ROLES.COORDINACION ? ESCUELA_AREAS.COORDINACION : ESCUELA_AREAS.DIRECCION,
    categoria: 'autorizacion',
    asunto: '',
    mensaje: ''
  });

  // Cargar familias para modo individual
  useEffect(() => {
    const loadFamilies = async () => {
      const result = await usersService.getUsersByRole(ROLES.FAMILY);
      if (result.success) {
        setFamilyUsers(result.users.filter(u => !u.disabled));
      }
    };
    loadFamilies();
  }, []);

  // Cargar niños para modo grupal (lazy)
  useEffect(() => {
    if (modo !== 'grupal' || childOptions.length > 0) return;
    const loadChildren = async () => {
      const result = await childrenService.getAllChildren();
      if (result.success) {
        setChildOptions(result.children);
      }
    };
    loadChildren();
  }, [modo, childOptions.length]);

  // ── Helpers modo individual ──
  const filteredFamilies = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return familyUsers
      .filter(f => !selectedFamilies.includes(f.id))
      .filter(f =>
        (f.displayName || '').toLowerCase().includes(term) ||
        (f.email || '').toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [familyUsers, selectedFamilies, searchTerm]);

  const handleFamilySelect = (id) => {
    if (selectedFamilies.includes(id)) return;
    setSelectedFamilies(prev => [...prev, id]);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleRemoveFamily = (id) => {
    setSelectedFamilies(prev => prev.filter(f => f !== id));
  };

  const handleSelectAll = () => {
    setSelectedFamilies(familyUsers.map(f => f.id));
  };

  const handleClearAll = () => {
    setSelectedFamilies([]);
  };

  const getSelectedFamiliesInfo = () =>
    familyUsers.filter(f => selectedFamilies.includes(f.id));

  // ── Helpers modo grupal ──
  const filteredChildren = useMemo(() => {
    const term = childSearchTerm.toLowerCase();
    return childOptions
      .filter(c => (c.nombreCompleto || '').toLowerCase().includes(term))
      .slice(0, 10);
  }, [childOptions, childSearchTerm]);

  const handleChildSelect = async (child) => {
    setSelectedChild(child);
    setChildSearchTerm('');
    setShowChildDropdown(false);
    setResponsablesInfo([]);

    if (!child.responsables || child.responsables.length === 0) return;

    setLoadingResponsables(true);
    const results = await Promise.all(
      child.responsables.map(uid => usersService.getUserById(uid))
    );
    const info = results
      .filter(r => r.success && r.user)
      .map(r => ({
        uid: r.user.id,
        displayName: r.user.displayName || r.user.email || r.user.id,
        email: r.user.email || ''
      }));
    setResponsablesInfo(info);
    setLoadingResponsables(false);
  };

  const handleClearChild = () => {
    setSelectedChild(null);
    setResponsablesInfo([]);
    setChildSearchTerm('');
  };

  // ── Formulario ──
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    if (modo === 'individual') {
      if (selectedFamilies.length === 0) {
        setError('Debes seleccionar al menos una familia');
        setLoading(false);
        return;
      }
      if (selectedFamilies.length > 50) {
        setError('Máximo 50 familias por envío. Dividí el envío en tandas.');
        setLoading(false);
        return;
      }

      const selected = getSelectedFamiliesInfo();
      const results = await Promise.all(selected.map(fam =>
        conversationsService.createConversationWithMessage({
          familiaUid: fam.id,
          familiaDisplayName: fam.displayName,
          familiaEmail: fam.email,
          destinatarioEscuela: form.destinatarioEscuela,
          asunto: form.asunto.trim(),
          categoria: form.categoria,
          iniciadoPor: 'escuela',
          autorUid: user.uid,
          autorDisplayName: user.displayName || user.email,
          autorRol: role,
          texto: form.mensaje.trim(),
          archivos: file ? [file] : []
        })
      ));

      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        setError('Algunas conversaciones no se pudieron crear. Reintentar.');
        setLoading(false);
        return;
      }
    } else {
      // Modo grupal
      if (!selectedChild) {
        setError('Debes seleccionar un niño/a');
        setLoading(false);
        return;
      }
      if (responsablesInfo.length === 0) {
        setError('El niño/a seleccionado no tiene responsables registrados');
        setLoading(false);
        return;
      }

      const participantesUids = responsablesInfo.map(r => r.uid);
      const participantes = {};
      responsablesInfo.forEach(r => {
        participantes[r.uid] = { displayName: r.displayName, email: r.email };
      });

      const result = await conversationsService.createGroupConversation({
        participantesUids,
        participantes,
        childNombre: selectedChild.nombreCompleto || '',
        destinatarioEscuela: form.destinatarioEscuela,
        asunto: form.asunto.trim(),
        categoria: form.categoria,
        autorUid: user.uid,
        autorDisplayName: user.displayName || user.email,
        autorRol: role,
        texto: form.mensaje.trim(),
        archivos: file ? [file] : []
      });

      if (!result.success) {
        setError(result.error || 'No se pudo crear la conversación grupal');
        setLoading(false);
        return;
      }
    }

    navigate(ROUTES.ADMIN_CONVERSATIONS);
  };

  const formatFileSize = (size = 0) => {
    if (!size) return '';
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const submitDisabled = loading || (
    modo === 'individual'
      ? selectedFamilies.length === 0
      : !selectedChild || responsablesInfo.length === 0 || loadingResponsables
  );

  const submitLabel = loading
    ? 'Enviando...'
    : modo === 'individual'
      ? `Enviar a ${selectedFamilies.length || '…'} familia${selectedFamilies.length !== 1 ? 's' : ''}`
      : 'Crear conversación grupal';

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Nuevo mensaje</h1>
          <p className="dashboard-subtitle">
            {modo === 'individual'
              ? 'Se crearán conversaciones separadas por cada familia seleccionada.'
              : 'Se creará un chat grupal con todos los responsables del niño/a.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <Link to={ROUTES.ADMIN_CONVERSATIONS} className="btn btn--outline">
            Volver
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          <form onSubmit={handleSubmit}>

            {/* ── Toggle de modo ── */}
            <div className="sc-section">
              <div className="sc-section__header">
                <span className="sc-section__num">1</span>
                <h3 className="sc-section__title">Tipo de conversación</h3>
              </div>
              <div className="sc-type-grid sc-type-grid--2col">
                <button
                  type="button"
                  className={`sc-type-card${modo === 'individual' ? ' sc-type-card--active' : ''}`}
                  onClick={() => setModo('individual')}
                  disabled={loading}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6 20v-1a6 6 0 0 1 12 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="sc-type-card__label">Individual</span>
                  <span className="sc-type-card__desc">Una familia por conversación</span>
                </button>
                <button
                  type="button"
                  className={`sc-type-card${modo === 'grupal' ? ' sc-type-card--active' : ''}`}
                  onClick={() => setModo('grupal')}
                  disabled={loading}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M3 20v-1a6 6 0 0 1 12 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="17" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M21 20v-.5A4.5 4.5 0 0 0 14.5 15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span className="sc-type-card__label">Familiar (grupal)</span>
                  <span className="sc-type-card__desc">Todos los responsables de un niño/a</span>
                </button>
              </div>
            </div>

            {/* ── SECCIÓN 2: Destinatarios ── */}
            <div className="sc-section">
              <div className="sc-section__header">
                <span className="sc-section__num">2</span>
                <h3 className="sc-section__title">Destinatarios</h3>
              </div>

              {modo === 'individual' ? (
                /* ── Modo individual: selección de familias ── */
                <div className="form-group">
                  <label className="required">Familias</label>
                  <div className="recipient-card">
                    <div className="recipient-content">
                      {selectedFamilies.length > 0 && (
                        <div className="selected-families-chips recipient-chips">
                          <div className="chips-label">
                            Seleccionadas ({selectedFamilies.length}):
                          </div>
                          <div className="chips-container">
                            {getSelectedFamiliesInfo().map(fam => (
                              <div key={fam.id} className="recipient-chip">
                                <span className="chip-text">{fam.displayName || fam.email}</span>
                                <button
                                  type="button"
                                  className="chip-remove"
                                  onClick={() => handleRemoveFamily(fam.id)}
                                  disabled={loading}
                                  aria-label={`Remover ${fam.displayName || fam.email}`}
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
                            {filteredFamilies.map(fam => (
                              <div
                                key={fam.id}
                                className="family-dropdown-item"
                                onClick={() => handleFamilySelect(fam.id)}
                              >
                                <div className="family-info">
                                  <span className="family-name">{fam.displayName || fam.email}</span>
                                  <span className="family-email">{fam.email}</span>
                                </div>
                              </div>
                            ))}
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
                            onClick={handleClearAll}
                            disabled={loading}
                          >
                            Limpiar selección
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ── Modo grupal: búsqueda de niño/a ── */
                <div className="form-group">
                  <label className="required">Niño/a</label>
                  <div className="recipient-card">
                    <div className="recipient-content">
                      {selectedChild ? (
                        <div className="sc-group-selected">
                          <div className="sc-group-selected__header">
                            <strong>{selectedChild.nombreCompleto}</strong>
                            <button
                              type="button"
                              className="chip-remove"
                              onClick={handleClearChild}
                              disabled={loading}
                              aria-label="Cambiar niño/a"
                            >
                              ×
                            </button>
                          </div>
                          {loadingResponsables ? (
                            <p className="sc-group-selected__loading">Cargando responsables...</p>
                          ) : responsablesInfo.length > 0 ? (
                            <div className="sc-group-selected__participants">
                              <span className="sc-group-selected__label">Participantes en el chat:</span>
                              <div className="chips-container" style={{ marginTop: 'var(--spacing-xs)' }}>
                                {responsablesInfo.map(r => (
                                  <div key={r.uid} className="recipient-chip recipient-chip--readonly">
                                    <span className="chip-text">{r.displayName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="sc-group-selected__empty">
                              Este niño/a no tiene responsables registrados.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="family-autocomplete">
                          <div className="recipient-search-input">
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Buscar niño/a por nombre..."
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
                                  onClick={() => handleChildSelect(child)}
                                >
                                  <div className="family-info">
                                    <span className="family-name">{child.nombreCompleto}</span>
                                  </div>
                                </div>
                              ))}
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
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── SECCIÓN 3: Detalles del mensaje ── */}
            <div className="sc-section">
              <div className="sc-section__header">
                <span className="sc-section__num">3</span>
                <h3 className="sc-section__title">Detalles del mensaje</h3>
              </div>

              {/* Área responsable */}
              <div className="form-group">
                <label className="required">Área responsable</label>
                <div className="sc-type-grid">
                  <button
                    type="button"
                    className={`sc-type-card${form.destinatarioEscuela === ESCUELA_AREAS.COORDINACION ? ' sc-type-card--active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, destinatarioEscuela: ESCUELA_AREAS.COORDINACION }))}
                    disabled={loading}
                  >
                    <AreaIcons.coordinacion />
                    <span className="sc-type-card__label">Coordinación</span>
                    <span className="sc-type-card__desc">Pedagógico y organizativo</span>
                  </button>
                  <button
                    type="button"
                    className={`sc-type-card${form.destinatarioEscuela === ESCUELA_AREAS.ADMINISTRACION ? ' sc-type-card--active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, destinatarioEscuela: ESCUELA_AREAS.ADMINISTRACION }))}
                    disabled={loading}
                  >
                    <AreaIcons.administracion />
                    <span className="sc-type-card__label">Administración</span>
                    <span className="sc-type-card__desc">Pagos y documentación</span>
                  </button>
                  <button
                    type="button"
                    className={`sc-type-card${form.destinatarioEscuela === ESCUELA_AREAS.DIRECCION ? ' sc-type-card--active' : ''}`}
                    onClick={() => setForm(prev => ({ ...prev, destinatarioEscuela: ESCUELA_AREAS.DIRECCION }))}
                    disabled={loading}
                  >
                    <AreaIcons.direccion />
                    <span className="sc-type-card__label">Dirección</span>
                    <span className="sc-type-card__desc">Institucional y general</span>
                  </button>
                </div>
              </div>

              {/* Categoría + Asunto en grid */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="required" htmlFor="categoria">Categoría</label>
                  <select
                    id="categoria"
                    name="categoria"
                    className="form-select"
                    value={form.categoria}
                    onChange={handleChange}
                    disabled={loading}
                    required
                  >
                    {CONVERSATION_CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="required" htmlFor="asunto">Asunto</label>
                  <input
                    id="asunto"
                    name="asunto"
                    className="form-input"
                    value={form.asunto}
                    onChange={handleChange}
                    maxLength={100}
                    required
                    disabled={loading}
                    placeholder="Ej: Autorización salida educativa"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="required" htmlFor="mensaje">Mensaje</label>
                  <textarea
                    id="mensaje"
                    name="mensaje"
                    className="form-textarea"
                    value={form.mensaje}
                    onChange={handleChange}
                    maxLength={1000}
                    rows={6}
                    required
                    disabled={loading}
                    placeholder="Escribí el contenido del mensaje..."
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>
                    Adjunto
                    <span className="sc-label-optional">(opcional)</span>
                  </label>
                  <div className="sc-upload">
                    <input
                      id="adjunto"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="sc-upload__input"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      disabled={loading}
                      aria-label="Seleccionar archivo adjunto"
                    />
                    <span className="sc-upload__icon"><UploadIcon /></span>
                    <p className="sc-upload__cta">Arrastrar o <strong>seleccionar archivo</strong></p>
                    <p className="sc-upload__hint">PDF, JPG, PNG, DOC o DOCX · máx. 5 MB</p>
                  </div>

                  {file && (
                    <div className="sc-file-selected">
                      <Icon name="file" size={15} className="sc-file-selected__icon" />
                      <span className="sc-file-selected__name">{file.name}</span>
                      <span className="sc-file-selected__size">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        className="sc-file-selected__remove"
                        onClick={() => setFile(null)}
                        aria-label="Quitar archivo"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && <div className="alert alert--error mb-md">{error}</div>}

            {/* ── Acciones ── */}
            <div className="sc-actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={submitDisabled}
              >
                <Icon name="send" size={16} />
                {submitLabel}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate(ROUTES.ADMIN_CONVERSATIONS)}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
