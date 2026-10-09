import { useState, useEffect, useRef } from 'react';
import { usersService } from '../../services/users.service';
import { useAuth } from '../../hooks/useAuth';
import { MAX_TERAPIAS, ROLES } from '../../config/constants';
import { ChildFiles } from './ChildFiles';

const DEFAULT_DATOS_MEDICOS = {
  alergias: '',
  medicamentos: '',
  indicaciones: '',
  aptoFisico: '',
  contactosEmergencia: '',
  obraSocial: '',
  numeroAfiliado: '',
  clinicaCercana: '',
  telefonoClinica: ''
};

const createEmptyTerapia = () => ({
  nombreCompleto: '',
  cargoInstitucion: '',
  email: '',
  telefono: '',
  notas: ''
});

const getTerapias = (terapias = []) => (
  (Array.isArray(terapias) ? terapias : [])
    .slice(0, MAX_TERAPIAS)
    .map(t => ({ ...createEmptyTerapia(), ...t }))
);

// Descarta profesionales sin ningún dato cargado y recorta espacios
const cleanTerapias = (terapias) => terapias
  .map(t => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])))
  .filter(t => t.nombreCompleto || t.cargoInstitucion || t.email || t.telefono || t.notas);

const createEmptyRetiroAutorizado = () => ({
  nombreCompleto: '',
  dni: '',
  telefono: ''
});

const getRetiroAutorizados = (personas = []) => (
  Array.from({ length: 5 }, (_, index) => ({
    ...createEmptyRetiroAutorizado(),
    ...(Array.isArray(personas) ? personas[index] : {})
  }))
);

// ponytail: el campo siempre fue 'si'/'no'; por si alguien lo cargó como booleano desde la consola
const normalizeAptoFisico = (value) => {
  if (value === true) return 'si';
  if (value === false) return 'no';
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
};

const TABS = [
  { id: 'personales', label: 'Datos personales' },
  { id: 'familia', label: 'Familia y retiro' },
  { id: 'salud', label: 'Salud' },
  { id: 'terapias', label: 'Terapias' },
  { id: 'informes', label: 'Informes y documentos' }
];

const ChildForm = ({ child = null, onSubmit, onCancel }) => {
  const { isSuperAdmin, isCoordinacion, role } = useAuth();
  const isEoe = role === ROLES.EOE;
  // Admin edita toda la ficha; EOE solo Terapias (e informes, que van por su propio componente)
  const canEditFicha = isSuperAdmin || isCoordinacion;
  const canEditTerapias = canEditFicha || isEoe;

  const formRef = useRef(null);
  const [activeTab, setActiveTab] = useState(isEoe ? 'terapias' : 'personales');

  const [formData, setFormData] = useState({
    nombreCompleto: '',
    fechaNacimiento: '',
    ambiente: 'taller1',
    responsables: [],
    documentos: [],
    personasAutorizadasRetiro: getRetiroAutorizados(),
    terapias: [],
    datosMedicos: {
      ...DEFAULT_DATOS_MEDICOS
    }
  });

  // En pantallas angostas la barra de pestañas scrollea: mantener visible la activa
  useEffect(() => {
    document.getElementById(`child-tabbtn-${activeTab}`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTab]);

  const [familyUsers, setFamilyUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [responsablesError, setResponsablesError] = useState('');
  const [responsablesSearch, setResponsablesSearch] = useState('');
  const [familyPickerOpen, setFamilyPickerOpen] = useState(false);
  const [retiroVisibleCount, setRetiroVisibleCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
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
        personasAutorizadasRetiro: getRetiroAutorizados(child.personasAutorizadasRetiro),
        terapias: getTerapias(child.terapias),
        datosMedicos: {
          ...DEFAULT_DATOS_MEDICOS,
          ...(child.datosMedicos || {}),
          aptoFisico: normalizeAptoFisico(child.datosMedicos?.aptoFisico)
        }
      });
    }
  }, [child]);

  const selectedFamilies = familyUsers.filter(user => formData.responsables.includes(user.id));

  const filteredFamilyUsers = familyUsers.filter(user => {
    const term = responsablesSearch.trim().toLowerCase();
    if (!term) return true;
    const name = (user.displayName || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  // Filas de autorizados visibles: las que tienen datos (mínimo 1) o las que se agregaron a mano
  const lastFilledRetiro = formData.personasAutorizadasRetiro
    .reduce((last, p, i) => (p.nombreCompleto || p.dni || p.telefono ? i + 1 : last), 0);
  const visibleRetiro = Math.min(5, Math.max(1, lastFilledRetiro, retiroVisibleCount));

  // Indicadores de pestañas con datos obligatorios faltantes
  const dm = formData.datosMedicos;
  const missingByTab = {
    personales: !formData.nombreCompleto || !formData.fechaNacimiento,
    familia: formData.responsables.length === 0,
    salud: !dm.obraSocial || !dm.numeroAfiliado || !dm.clinicaCercana || !dm.telefonoClinica
  };

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

  const handleRetiroAutorizadoChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      personasAutorizadasRetiro: prev.personasAutorizadasRetiro.map((persona, personaIndex) => (
        personaIndex === index
          ? { ...persona, [field]: value }
          : persona
      ))
    }));
  };

  // Quita la fila y sube las siguientes; se mantienen los 5 lugares del modelo de datos
  const handleRemoveRetiro = (index) => {
    setFormData(prev => ({
      ...prev,
      personasAutorizadasRetiro: getRetiroAutorizados(prev.personasAutorizadasRetiro.filter((_, i) => i !== index))
    }));
    setRetiroVisibleCount(count => Math.max(0, count - 1));
  };

  const handleTerapiaChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      terapias: prev.terapias.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    }));
  };

  const handleAddTerapia = () => {
    setFormData(prev => (
      prev.terapias.length >= MAX_TERAPIAS
        ? prev
        : { ...prev, terapias: [...prev.terapias, createEmptyTerapia()] }
    ));
  };

  const handleRemoveTerapia = (index) => {
    setFormData(prev => ({
      ...prev,
      terapias: prev.terapias.filter((_, i) => i !== index)
    }));
  };

  // Los campos obligatorios pueden estar en una pestaña oculta: llevar al usuario a esa pestaña
  const handleSaveClick = (e) => {
    const invalid = formRef.current?.querySelector(':invalid');
    if (!invalid) return;
    const panel = invalid.closest('[data-tab]');
    if (panel && panel.dataset.tab !== activeTab) {
      e.preventDefault();
      setActiveTab(panel.dataset.tab);
      requestAnimationFrame(() => formRef.current?.reportValidity());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (canEditFicha && !formData.responsables.length) {
      setResponsablesError('Selecciona al menos una familia responsable.');
      setActiveTab('familia');
      setFamilyPickerOpen(true);
      return;
    }
    setLoading(true);
    await onSubmit({ ...formData, terapias: cleanTerapias(formData.terapias) });
    setLoading(false);
  };

  const lockNote = !canEditFicha && (
    <p className="child-form__lock">Solo lectura. Esta sección la editan coordinación y administración.</p>
  );

  const panelProps = (id) => ({
    'data-tab': id,
    id: `child-tab-${id}`,
    role: 'tabpanel',
    'aria-labelledby': `child-tabbtn-${id}`,
    hidden: activeTab !== id
  });

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="child-form child-form--tabs">
      <div className="tabs__header child-form__tabs" role="tablist" aria-label="Secciones de la ficha">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`child-tabbtn-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`child-tab-${tab.id}`}
            className={`tabs__tab${activeTab === tab.id ? ' tabs__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {canEditFicha && missingByTab[tab.id] && (
              <span className="child-form__tab-dot" title="Faltan datos obligatorios" aria-label="Faltan datos obligatorios" />
            )}
          </button>
        ))}
      </div>

      {/* Datos personales */}
      <div {...panelProps('personales')}>
        <fieldset disabled={!canEditFicha} className="child-form__fieldset form-section child-form__medical-section">
          {lockNote}
          <div className="form-group child-form__medical-wide-field">
            <label htmlFor="nombreCompleto" className="form-label required">Nombre completo</label>
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

          <div className="form-group child-form__medical-compact-field">
            <label htmlFor="fechaNacimiento" className="form-label required">Fecha de nacimiento</label>
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

          <div className="form-group child-form__medical-compact-field">
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
        </fieldset>
      </div>

      {/* Familia y retiro */}
      <div {...panelProps('familia')}>
        <fieldset disabled={!canEditFicha} className="child-form__fieldset form-section child-form__family">
          {lockNote}
          <h4 className="child-form__subtitle" id="responsables-label">Responsables</h4>
          <div className="child-form__chips">
            {selectedFamilies.map(user => (
              <span key={user.id} className="child-form__person-chip">
                {user.displayName || user.email}
                {canEditFicha && (
                  <button
                    type="button"
                    className="child-form__chip-remove"
                    onClick={() => handleResponsableToggle(user.id)}
                    aria-label={`Quitar ${user.displayName || user.email}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {selectedFamilies.length === 0 && !familyPickerOpen && (
              <span className="form-helper-text">Sin responsables asignados.</span>
            )}
            {canEditFicha && !familyPickerOpen && (
              <button type="button" className="child-form__link-btn" onClick={() => setFamilyPickerOpen(true)}>
                + Agregar
              </button>
            )}
          </div>

          {canEditFicha && familyPickerOpen && (
            <div className="child-form__picker">
              <div className="child-form__picker-head">
                <input
                  type="search"
                  className="form-input form-input--sm"
                  placeholder="Buscar familia por nombre o email..."
                  value={responsablesSearch}
                  onChange={(e) => setResponsablesSearch(e.target.value)}
                  aria-label="Buscar familias responsables"
                  autoFocus
                />
                <button type="button" className="btn btn--sm btn--outline" onClick={() => setFamilyPickerOpen(false)}>
                  Listo
                </button>
              </div>
              <div className="family-selector" role="group" aria-labelledby="responsables-label">
                {filteredFamilyUsers.length === 0 ? (
                  <p className="form-helper-text" style={{ padding: 'var(--spacing-sm)' }}>
                    {familyUsers.length === 0 ? 'No hay familias disponibles para asignar.' : 'No se encontraron familias.'}
                  </p>
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
            </div>
          )}
          {responsablesError && (
            <div className="form-error" role="alert">
              {responsablesError}
            </div>
          )}

          <h4 className="child-form__subtitle">Autorizados para retirar</h4>
          <div className="child-form__pickup-rows">
            <div className="child-form__pickup-row child-form__pickup-row--head" aria-hidden="true">
              <span>Nombre y apellido</span>
              <span>DNI</span>
              <span>Teléfono</span>
              <span />
            </div>
            {formData.personasAutorizadasRetiro.slice(0, visibleRetiro).map((persona, index) => (
              <div key={`retiro-${index}`} className="child-form__pickup-row">
                <input
                  type="text"
                  id={`retiro-nombre-${index}`}
                  value={persona.nombreCompleto}
                  onChange={(e) => handleRetiroAutorizadoChange(index, 'nombreCompleto', e.target.value)}
                  className="form-input"
                  placeholder="Nombre y apellido"
                  aria-label={`Autorizado ${index + 1}: nombre y apellido`}
                />
                <input
                  type="text"
                  id={`retiro-dni-${index}`}
                  value={persona.dni}
                  onChange={(e) => handleRetiroAutorizadoChange(index, 'dni', e.target.value)}
                  className="form-input"
                  placeholder="DNI"
                  aria-label={`Autorizado ${index + 1}: DNI`}
                />
                <input
                  type="text"
                  id={`retiro-telefono-${index}`}
                  value={persona.telefono}
                  onChange={(e) => handleRetiroAutorizadoChange(index, 'telefono', e.target.value)}
                  className="form-input"
                  placeholder="Teléfono"
                  aria-label={`Autorizado ${index + 1}: teléfono`}
                />
                {canEditFicha ? (
                  <button
                    type="button"
                    className="child-form__row-remove"
                    onClick={() => handleRemoveRetiro(index)}
                    aria-label={`Quitar autorizado ${index + 1}`}
                  >
                    ×
                  </button>
                ) : <span />}
              </div>
            ))}
          </div>
          {canEditFicha && visibleRetiro < 5 && (
            <button type="button" className="child-form__link-btn" onClick={() => setRetiroVisibleCount(visibleRetiro + 1)}>
              + Agregar autorizado
            </button>
          )}
        </fieldset>
      </div>

      {/* Salud */}
      <div {...panelProps('salud')}>
        <fieldset disabled={!canEditFicha} className="child-form__fieldset form-section child-form__stack">
          {lockNote}
          <h4 className="child-form__subtitle">Salud</h4>
          <div className="child-form__section-grid">
          <div className="form-group">
            <label htmlFor="alergias" className="form-label">Alergias</label>
            <textarea
              id="alergias"
              name="alergias"
              value={formData.datosMedicos.alergias}
              onChange={handleMedicalDataChange}
              rows="1"
              className="form-textarea child-form__medical-compact-textarea"
            />
          </div>
          <div className="form-group">
            <label htmlFor="medicamentos" className="form-label">Medicamentos</label>
            <textarea
              id="medicamentos"
              name="medicamentos"
              value={formData.datosMedicos.medicamentos}
              onChange={handleMedicalDataChange}
              rows="1"
              className="form-textarea child-form__medical-compact-textarea"
            />
          </div>
          <div className="form-group">
            <span id="aptoFisico-label" className="form-label">Apto físico</span>
            <div className="child-form__yesno" role="radiogroup" aria-labelledby="aptoFisico-label">
              {[{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }].map(opt => (
                <label key={opt.value} className="child-form__yesno-option">
                  <input
                    type="radio"
                    name="aptoFisico"
                    value={opt.value}
                    checked={formData.datosMedicos.aptoFisico === opt.value}
                    onChange={handleMedicalDataChange}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
          <div className="form-group child-form__span-all">
            <label htmlFor="indicaciones" className="form-label">Indicaciones médicas</label>
            <textarea
              id="indicaciones"
              name="indicaciones"
              value={formData.datosMedicos.indicaciones}
              onChange={handleMedicalDataChange}
              rows="1"
              className="form-textarea child-form__medical-compact-textarea"
            />
          </div>
          </div>

          <h4 className="child-form__subtitle">Cobertura médica</h4>
          <div className="child-form__section-grid">
          <div className="form-group">
            <label htmlFor="obraSocial" className="form-label required">Obra social / prepaga</label>
            <input
              type="text"
              id="obraSocial"
              name="obraSocial"
              value={formData.datosMedicos.obraSocial}
              onChange={handleMedicalDataChange}
              className="form-input"
              placeholder="Ej: IOMA, OSDE, Swiss Medical"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="numeroAfiliado" className="form-label required">Número de afiliado</label>
            <input
              type="text"
              id="numeroAfiliado"
              name="numeroAfiliado"
              value={formData.datosMedicos.numeroAfiliado}
              onChange={handleMedicalDataChange}
              className="form-input"
              required
            />
          </div>
          </div>

          <h4 className="child-form__subtitle">Emergencias</h4>
          <div className="child-form__section-grid">
          <div className="form-group">
            <label htmlFor="clinicaCercana" className="form-label required">
              Clínica/hospital cercano (San Martín)
            </label>
            <input
              type="text"
              id="clinicaCercana"
              name="clinicaCercana"
              value={formData.datosMedicos.clinicaCercana}
              onChange={handleMedicalDataChange}
              className="form-input"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="telefonoClinica" className="form-label required">Teléfono/Dirección</label>
            <input
              type="text"
              id="telefonoClinica"
              name="telefonoClinica"
              value={formData.datosMedicos.telefonoClinica}
              onChange={handleMedicalDataChange}
              className="form-input"
              placeholder="Ej: 351 123-4567 o Av. Siempreviva 742"
              required
            />
          </div>
          <div className="form-group child-form__span-all">
            <label htmlFor="contactosEmergencia" className="form-label">Contactos de emergencia</label>
            <textarea
              id="contactosEmergencia"
              name="contactosEmergencia"
              value={formData.datosMedicos.contactosEmergencia}
              onChange={handleMedicalDataChange}
              rows="1"
              className="form-textarea"
              placeholder="Nombre: Teléfono&#10;Nombre: Teléfono"
            />
          </div>
          </div>
        </fieldset>
      </div>

      {/* Terapias */}
      <div {...panelProps('terapias')}>
        <fieldset disabled={!canEditTerapias} className="child-form__fieldset form-section">
          <div className="child-form__therapies-head">
            <p className="form-helper-text">
              Profesionales que atienden al alumno fuera de la escuela. Hasta {MAX_TERAPIAS}.
            </p>
          </div>

          <div className="child-form__pickup-grid child-form__therapies-grid">
            {formData.terapias.map((terapia, index) => (
              <div key={`terapia-${index}`} className="child-form__pickup-card">
                <div className="child-form__therapy-title">
                  <span className="child-form__pickup-card-title">Profesional {index + 1}</span>
                  <button
                    type="button"
                    className="btn btn--sm btn--text btn--danger"
                    onClick={() => handleRemoveTerapia(index)}
                  >
                    Quitar
                  </button>
                </div>

                <div className="form-group">
                  <label htmlFor={`terapia-nombre-${index}`} className="form-label required">Nombre completo</label>
                  <input
                    type="text"
                    id={`terapia-nombre-${index}`}
                    value={terapia.nombreCompleto}
                    onChange={(e) => handleTerapiaChange(index, 'nombreCompleto', e.target.value)}
                    className="form-input"
                    placeholder="Ej: Lic. Mariana Sosa"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`terapia-cargo-${index}`} className="form-label">Cargo o institución</label>
                  <input
                    type="text"
                    id={`terapia-cargo-${index}`}
                    value={terapia.cargoInstitucion}
                    onChange={(e) => handleTerapiaChange(index, 'cargoInstitucion', e.target.value)}
                    className="form-input"
                    placeholder="Ej: Fonoaudióloga · Centro Crecer"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`terapia-email-${index}`} className="form-label">Email</label>
                  <input
                    type="email"
                    id={`terapia-email-${index}`}
                    value={terapia.email}
                    onChange={(e) => handleTerapiaChange(index, 'email', e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`terapia-telefono-${index}`} className="form-label">Teléfono</label>
                  <input
                    type="tel"
                    id={`terapia-telefono-${index}`}
                    value={terapia.telefono}
                    onChange={(e) => handleTerapiaChange(index, 'telefono', e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor={`terapia-notas-${index}`} className="form-label">Notas</label>
                  <textarea
                    id={`terapia-notas-${index}`}
                    value={terapia.notas}
                    onChange={(e) => handleTerapiaChange(index, 'notas', e.target.value)}
                    rows="1"
                    className="form-textarea"
                    placeholder="Días de atención, forma de contacto preferida..."
                  />
                </div>
              </div>
            ))}

            {formData.terapias.length < MAX_TERAPIAS && canEditTerapias && (
              <button type="button" className="child-form__add-card" onClick={handleAddTerapia}>
                + Agregar profesional
              </button>
            )}
          </div>

          {formData.terapias.length === 0 && !canEditTerapias && (
            <p className="form-helper-text">Sin profesionales cargados.</p>
          )}
        </fieldset>
      </div>

      {/* Informes y documentos */}
      <div {...panelProps('informes')}>
        <ChildFiles
          childId={child?.id}
          documentos={formData.documentos}
          onDocumentosChange={(documentos) => setFormData(prev => ({ ...prev, documentos }))}
          canUploadReports={canEditTerapias}
          canManageAll={canEditFicha}
        />
      </div>

      <div className="form-actions child-form__actions">
        <span className="form-helper-text child-form__actions-hint">
          {canEditFicha ? 'Los cambios de todas las pestañas se guardan juntos.' : 'Se guardan solo los cambios en Terapias.'}
        </span>
        <button type="button" onClick={onCancel} className="btn btn--secondary">
          Cancelar
        </button>
        {canEditTerapias && (
          <button type="submit" className="btn btn--primary btn--lg" disabled={loading} onClick={handleSaveClick}>
            {loading ? 'Guardando...' : child ? 'Guardar cambios' : 'Crear alumno'}
          </button>
        )}
      </div>
    </form>
  );
};

export default ChildForm;
