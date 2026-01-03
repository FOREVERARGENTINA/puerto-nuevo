import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { communicationsService } from '../../services/communications.service';
import { usersService } from '../../services/users.service';
import { useAuth } from '../../hooks/useAuth';
import { COMMUNICATION_TYPES, AMBIENTES, ROUTES, ROLES } from '../../config/constants';

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

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: COMMUNICATION_TYPES.GLOBAL,
    ambiente: AMBIENTES.TALLER_1,
    destinatarios: [],
    requiereLecturaObligatoria: false
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFamilySelect = (familyId) => {
    // Solo agregar si no está ya seleccionada
    if (!selectedFamilies.includes(familyId)) {
      const newSelected = [...selectedFamilies, familyId];
      setSelectedFamilies(newSelected);
      setFormData(prev => ({
        ...prev,
        destinatarios: newSelected
      }));
    }
    // Limpiar búsqueda y cerrar dropdown
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleSelectAll = () => {
    const allFamilyIds = familyUsers.map(f => f.id);
    setSelectedFamilies(allFamilyIds);
    setFormData(prev => ({
      ...prev,
      destinatarios: allFamilyIds
    }));
  };

  const handleDeselectAll = () => {
    setSelectedFamilies([]);
    setFormData(prev => ({
      ...prev,
      destinatarios: []
    }));
  };

  const handleRemoveFamily = (familyId) => {
    const newSelected = selectedFamilies.filter(id => id !== familyId);
    setSelectedFamilies(newSelected);
    setFormData(prev => ({
      ...prev,
      destinatarios: newSelected
    }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const communicationData = {
        title: formData.title,
        body: formData.body,
        type: formData.type,
        requiereLecturaObligatoria: formData.requiereLecturaObligatoria,
        sentBy: user.uid,
        sentByDisplayName: user.displayName || user.email,
        destinatarios: []
      };

      if (formData.type === COMMUNICATION_TYPES.AMBIENTE) {
        communicationData.ambiente = formData.ambiente;
      } else if (formData.type === COMMUNICATION_TYPES.INDIVIDUAL) {
        communicationData.destinatarios = formData.destinatarios;
      }

      const result = await communicationsService.createCommunication(communicationData);

      if (result.success) {
        navigate(ROUTES.ADMIN_DASHBOARD);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
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
                  Seleccionar Familias Destinatarias
                </label>

                {loadingFamilies ? (
                  <p className="form-help">Cargando familias...</p>
                ) : (
                  <>
                    {/* Chips de familias seleccionadas */}
                    {selectedFamilies.length > 0 && (
                      <div className="selected-families-chips mb-md">
                        <div className="chips-label">
                          Seleccionadas ({selectedFamilies.length}):
                        </div>
                        <div className="chips-container">
                          {getSelectedFamiliesInfo().map(family => (
                            <div key={family.id} className="family-chip">
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
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Autocomplete Dropdown */}
                    <div className="family-autocomplete">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="🔍 Escribí nombre o email para buscar familias... (mínimo 2 letras)"
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setShowDropdown(e.target.value.length >= 2);
                        }}
                        onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
                        disabled={loading}
                      />

                      {/* Dropdown de resultados */}
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
                              }).length} resultados. Escribí más para filtrar.
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

                    {/* Botones de acción rápida */}
                    <div className="family-quick-actions mt-sm">
                      <button
                        type="button"
                        className="btn btn--sm btn--outline"
                        onClick={handleSelectAll}
                        disabled={loading}
                        title="Seleccionar todas las familias"
                      >
                        ✓ Seleccionar Todas ({familyUsers.length})
                      </button>
                      {selectedFamilies.length > 0 && (
                        <button
                          type="button"
                          className="btn btn--sm btn--outline"
                          onClick={handleDeselectAll}
                          disabled={loading}
                        >
                          ✗ Limpiar Selección
                        </button>
                      )}
                    </div>

                    {selectedFamilies.length === 0 && (
                      <p className="form-error mt-sm">
                        Debes seleccionar al menos una familia
                      </p>
                    )}
                  </>
                )}
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

            <div className="flex-row mt-xl">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={loading || (formData.type === COMMUNICATION_TYPES.INDIVIDUAL && selectedFamilies.length === 0)}
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
    </div>
  );
}
