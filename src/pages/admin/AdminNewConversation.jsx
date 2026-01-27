import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usersService } from '../../services/users.service';
import { conversationsService } from '../../services/conversations.service';
import { CONVERSATION_CATEGORIES, ESCUELA_AREAS, ROLES, ROUTES } from '../../config/constants';

export function AdminNewConversation() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [familyUsers, setFamilyUsers] = useState([]);
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [file, setFile] = useState(null);

  const [form, setForm] = useState({
    destinatarioEscuela: role === ROLES.COORDINACION ? ESCUELA_AREAS.COORDINACION : ESCUELA_AREAS.DIRECCION,
    categoria: 'autorizacion',
    asunto: '',
    mensaje: ''
  });

  useEffect(() => {
    const loadFamilies = async () => {
      const result = await usersService.getUsersByRole(ROLES.FAMILY);
      if (result.success) {
        const list = result.users.filter(u => !u.disabled);
        setFamilyUsers(list);
      }
    };
    loadFamilies();
  }, []);

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

  const getSelectedFamiliesInfo = () => {
    return familyUsers.filter(f => selectedFamilies.includes(f.id));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    if (selectedFamilies.length === 0) {
      setError('Debes seleccionar al menos una familia');
      return;
    }
    if (selectedFamilies.length > 50) {
      setError('Máximo 50 familias por envío. Dividí el envío en tandas.');
      return;
    }

    setLoading(true);
    setError(null);

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

    navigate(ROUTES.ADMIN_CONVERSATIONS);
  };

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Nuevo mensaje</h1>
          <p className="dashboard-subtitle">Se crearán conversaciones separadas por cada familia seleccionada.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <Link to={ROUTES.ADMIN_CONVERSATIONS} className="btn btn--outline">
            Volver
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card create-form-card">
        <div className="form-group">
          <label className="required">Seleccionar familias</label>
          <div className="recipient-card">
            <div className="recipient-content">
              {selectedFamilies.length > 0 && (
                <div className="selected-families-chips recipient-chips">
                  <div className="chips-label">Seleccionadas ({selectedFamilies.length}):</div>
                  <div className="chips-container">
                    {getSelectedFamiliesInfo().map(fam => (
                      <div key={fam.id} className="recipient-chip">
                        <span className="chip-text">{fam.displayName || fam.email}</span>
                        <button
                          type="button"
                          className="chip-remove"
                          onClick={() => handleRemoveFamily(fam.id)}
                          disabled={loading}
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
                    <div className="family-dropdown-empty">No se encontraron familias</div>
                  </div>
                )}
              </div>

              <div className="recipient-quick-actions">
                <button type="button" className="btn btn--sm btn--outline" onClick={handleSelectAll} disabled={loading}>
                  Seleccionar todas ({familyUsers.length})
                </button>
                {selectedFamilies.length > 0 && (
                  <button type="button" className="btn btn--sm btn--outline" onClick={handleClearAll} disabled={loading}>
                    Limpiar selección
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="required" htmlFor="destinatarioEscuela">Área responsable</label>
            <select
              id="destinatarioEscuela"
              name="destinatarioEscuela"
              className="form-select"
              value={form.destinatarioEscuela}
              onChange={handleChange}
              disabled={loading}
              required
            >
              <option value={ESCUELA_AREAS.COORDINACION}>Coordinación</option>
              <option value={ESCUELA_AREAS.ADMINISTRACION}>Administración</option>
              <option value={ESCUELA_AREAS.DIRECCION}>Dirección</option>
            </select>
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
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="adjunto">Adjuntar archivo (opcional)</label>
            <input
              id="adjunto"
              type="file"
              className="form-input"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={loading}
            />
            <p className="form-help">PDF, JPG, PNG, DOC o DOCX (máx. 5MB)</p>
          </div>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        <div className="form-actions" style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--outline" onClick={() => navigate(ROUTES.ADMIN_CONVERSATIONS)} disabled={loading}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={loading}>
            {loading ? 'Enviando...' : `Enviar a ${selectedFamilies.length} familia/s`}
          </button>
        </div>
      </form>
    </div>
  );
}
