import { useState, useEffect } from 'react';
import { usersService } from '../../services/users.service';

const ChildForm = ({ child = null, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    fechaNacimiento: '',
    ambiente: 'taller1',
    responsables: [],
    datosMedicos: {
      alergias: '',
      medicamentos: '',
      indicaciones: '',
      contactosEmergencia: ''
    }
  });

  const [familyUsers, setFamilyUsers] = useState([]);
  const [loading, setLoading] = useState(false);

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
        datosMedicos: child.datosMedicos || {
          alergias: '',
          medicamentos: '',
          indicaciones: '',
          contactosEmergencia: ''
        }
      });
    }
  }, [child]);

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

  const handleResponsablesChange = (e) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      responsables: options
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🔍 DEBUG: Datos del formulario a guardar:', formData);
    console.log('🔍 DEBUG: Responsables seleccionados:', formData.responsables);
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
            <label htmlFor="responsables" className="form-label required">Responsables</label>
            <select
              id="responsables"
              name="responsables"
              multiple
              value={formData.responsables}
              onChange={handleResponsablesChange}
              className="form-select select-multiple"
              required
            >
              {familyUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.displayName || user.email}
                </option>
              ))}
            </select>
            <small className="form-helper-text">Mantén presionado Ctrl/Cmd para seleccionar múltiples</small>
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
