import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communicationsService } from '../../services/communications.service';
import { useAuth } from '../../hooks/useAuth';
import { COMMUNICATION_TYPES, AMBIENTES, ROUTES } from '../../config/constants';

export function SendCommunication() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: COMMUNICATION_TYPES.GLOBAL,
    ambiente: AMBIENTES.TALLER_1,
    taller: '',
    destinatarios: [],
    requiereLecturaObligatoria: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
      } else if (formData.type === COMMUNICATION_TYPES.TALLER) {
        communicationData.tallerEspecial = formData.taller;
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
    <div style={{ padding: 'var(--spacing-lg)', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Enviar Comunicado</h1>
      
      {error && (
        <div className="alert alert--error">
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
            <option value={COMMUNICATION_TYPES.TALLER}>
              Taller Especial
            </option>
            <option value={COMMUNICATION_TYPES.INDIVIDUAL}>
              Individual (Familia específica)
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

        {formData.type === COMMUNICATION_TYPES.TALLER && (
          <div className="form-group">
            <label htmlFor="taller" className="required">
              Taller Especial
            </label>
            <input
              type="text"
              id="taller"
              name="taller"
              className="form-input"
              value={formData.taller}
              onChange={handleChange}
              placeholder="Ej: Robótica, Yoga, Música"
              required
              disabled={loading}
            />
            <p className="form-help">
              En Fase 4 se agregará un selector de talleres desde la base de datos
            </p>
          </div>
        )}

        {formData.type === COMMUNICATION_TYPES.INDIVIDUAL && (
          <div className="form-group">
            <label htmlFor="destinatarios" className="required">
              Destinatarios (UIDs separados por coma)
            </label>
            <input
              type="text"
              id="destinatarios"
              name="destinatarios"
              className="form-input"
              value={formData.destinatarios}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                destinatarios: e.target.value.split(',').map(uid => uid.trim())
              }))}
              placeholder="uid1, uid2, uid3"
              required
              disabled={loading}
            />
            <p className="form-help">
              En una mejora futura se agregará un selector visual de familias
            </p>
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

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-xl)' }}>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading}
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
  );
}
