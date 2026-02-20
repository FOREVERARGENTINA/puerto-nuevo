import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { conversationsService } from '../../services/conversations.service';
import { CATEGORIES_BY_AREA, ESCUELA_AREAS, ROUTES } from '../../config/constants';
import Icon from '../../components/ui/Icon';
import './FamilyNewConversation.css';

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
  facturacion: () => (
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

export function FamilyNewConversation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    destinatarioEscuela: ESCUELA_AREAS.COORDINACION,
    categoria: CATEGORIES_BY_AREA[ESCUELA_AREAS.COORDINACION]?.[0]?.value || 'entrevista',
    asunto: '',
    mensaje: ''
  });
  const [file, setFile] = useState(null);

  const availableCategories = useMemo(
    () => CATEGORIES_BY_AREA[form.destinatarioEscuela] || [],
    [form.destinatarioEscuela]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'destinatarioEscuela') {
      const newCategories = CATEGORIES_BY_AREA[value] || [];
      const firstCategory = newCategories[0]?.value || 'otro';
      setForm(prev => ({ ...prev, [name]: value, categoria: firstCategory }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleAreaSelect = (area) => {
    handleChange({ target: { name: 'destinatarioEscuela', value: area } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);

    const result = await conversationsService.createConversationWithMessage({
      familiaUid: user.uid,
      familiaDisplayName: user.displayName,
      familiaEmail: user.email,
      destinatarioEscuela: form.destinatarioEscuela,
      asunto: form.asunto.trim(),
      categoria: form.categoria,
      iniciadoPor: 'familia',
      autorUid: user.uid,
      autorDisplayName: user.displayName || user.email,
      autorRol: 'family',
      texto: form.mensaje.trim(),
      archivos: file ? [file] : []
    });

    if (!result.success) {
      setError(result.error || 'No se pudo enviar la consulta');
      setLoading(false);
      return;
    }

    navigate(`${ROUTES.FAMILY_CONVERSATIONS}/${result.id}`);
  };

  const formatFileSize = (size = 0) => {
    if (!size) return '';
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  /* icons are declared at module scope (UploadIcon / AreaIcons) to satisfy eslint */

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Nueva Consulta</h1>
          <p className="dashboard-subtitle">Escribí tu consulta y la escuela te responderá en este hilo.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <Link to={ROUTES.FAMILY_CONVERSATIONS} className="btn btn--outline">
            Volver
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          <form onSubmit={handleSubmit}>

            {/* ── SECCIÓN 1: Destinatario ── */}
            <div className="sc-section">
              <div className="sc-section__header">
                <span className="sc-section__num">1</span>
                <h3 className="sc-section__title">Destinatario</h3>
              </div>

              <div className="form-group">
                <label className="required">Dirigido a</label>
                <div className="sc-type-grid">
                  <button
                    type="button"
                    className={`sc-type-card${form.destinatarioEscuela === ESCUELA_AREAS.COORDINACION ? ' sc-type-card--active' : ''}`}
                    onClick={() => handleAreaSelect(ESCUELA_AREAS.COORDINACION)}
                    disabled={loading}
                  >
                    <AreaIcons.coordinacion />
                    <span className="sc-type-card__label">Coordinación</span>
                    <span className="sc-type-card__desc">Pedagógico y organizativo</span>
                  </button>
                  <button
                    type="button"
                    className={`sc-type-card${form.destinatarioEscuela === ESCUELA_AREAS.ADMINISTRACION ? ' sc-type-card--active' : ''}`}
                    onClick={() => handleAreaSelect(ESCUELA_AREAS.ADMINISTRACION)}
                    disabled={loading}
                  >
                    <AreaIcons.facturacion />
                    <span className="sc-type-card__label">Facturación</span>
                    <span className="sc-type-card__desc">Pagos y documentación</span>
                  </button>
                  <button
                    type="button"
                    className={`sc-type-card${form.destinatarioEscuela === ESCUELA_AREAS.DIRECCION ? ' sc-type-card--active' : ''}`}
                    onClick={() => handleAreaSelect(ESCUELA_AREAS.DIRECCION)}
                    disabled={loading}
                  >
                    <AreaIcons.direccion />
                    <span className="sc-type-card__label">Dirección</span>
                    <span className="sc-type-card__desc">Institucional y general</span>
                  </button>
                </div>
              </div>

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
                  {availableCategories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── SECCIÓN 2: Tu consulta ── */}
            <div className="sc-section">
              <div className="sc-section__header">
                <span className="sc-section__num">2</span>
                <h3 className="sc-section__title">Tu consulta</h3>
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
                  disabled={loading}
                  required
                  placeholder="Resumí brevemente el motivo de tu consulta"
                />
              </div>

              <div className="form-group">
                <label className="required" htmlFor="mensaje">Mensaje</label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  className="form-textarea"
                  value={form.mensaje}
                  onChange={handleChange}
                  maxLength={1000}
                  rows={6}
                  disabled={loading}
                  required
                  placeholder="Describí con detalle tu consulta..."
                />
              </div>

              <div className="form-group">
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

            {error && <div className="alert alert--error mb-md">{error}</div>}

            {/* ── Acciones ── */}
            <div className="sc-actions">
              <button type="submit" className="btn btn--primary" disabled={loading}>
                <Icon name="send" size={16} />
                {loading ? 'Enviando...' : 'Enviar Consulta'}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate(ROUTES.FAMILY_CONVERSATIONS)}
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
