import { useState, useEffect } from 'react';
import { usersService } from '../../services/users.service';
import { talleresService } from '../../services/talleres.service';

const ChildForm = ({ child = null, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    fechaNacimiento: '',
    ambiente: 'taller1',
    responsables: [],
    talleresEspeciales: [],
    datosMedicos: {
      alergias: '',
      medicamentos: '',
      indicaciones: '',
      contactosEmergencia: ''
    }
  });

  const [familyUsers, setFamilyUsers] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      // Load family users
      const familyResult = await usersService.getUsersByRole('family');
      if (familyResult.success) {
        setFamilyUsers(familyResult.users);
      }

      // Load talleres
      const talleresResult = await talleresService.getAllTalleres();
      if (talleresResult.success) {
        setTalleres(talleresResult.talleres);
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
        talleresEspeciales: child.talleresEspeciales || [],
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

  const handleTalleresEspecialesChange = (e) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setFormData(prev => ({
      ...prev,
      talleresEspeciales: options
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
      <div className="form-section">
        <h3>Datos Personales</h3>
        
        <div className="form-group">
          <label htmlFor="nombreCompleto">Nombre Completo *</label>
          <input
            type="text"
            id="nombreCompleto"
            name="nombreCompleto"
            value={formData.nombreCompleto}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="fechaNacimiento">Fecha de Nacimiento *</label>
          <input
            type="date"
            id="fechaNacimiento"
            name="fechaNacimiento"
            value={formData.fechaNacimiento}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="ambiente">Ambiente *</label>
          <select
            id="ambiente"
            name="ambiente"
            value={formData.ambiente}
            onChange={handleChange}
            required
          >
            <option value="taller1">Taller 1 (6-9 años)</option>
            <option value="taller2">Taller 2 (9-12 años)</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="responsables">Responsables *</label>
          <select
            id="responsables"
            name="responsables"
            multiple
            value={formData.responsables}
            onChange={handleResponsablesChange}
            className="select-multiple"
            required
          >
            {familyUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.displayName || user.email}
              </option>
            ))}
          </select>
          <small>Mantén presionado Ctrl/Cmd para seleccionar múltiples</small>
        </div>

        <div className="form-group">
          <label htmlFor="talleresEspeciales">Talleres Especiales</label>
          <select
            id="talleresEspeciales"
            name="talleresEspeciales"
            multiple
            value={formData.talleresEspeciales}
            onChange={handleTalleresEspecialesChange}
            className="select-multiple"
          >
            {talleres.map(taller => (
              <option key={taller.id} value={taller.id}>
                {taller.nombre}
              </option>
            ))}
          </select>
          <small>Selecciona los talleres especiales en los que participa (opcional)</small>
        </div>
      </div>

      <div className="form-section">
        <h3>Datos Médicos</h3>
        
        <div className="form-group">
          <label htmlFor="alergias">Alergias</label>
          <textarea
            id="alergias"
            name="alergias"
            value={formData.datosMedicos.alergias}
            onChange={handleMedicalDataChange}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="medicamentos">Medicamentos</label>
          <textarea
            id="medicamentos"
            name="medicamentos"
            value={formData.datosMedicos.medicamentos}
            onChange={handleMedicalDataChange}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="indicaciones">Indicaciones Médicas</label>
          <textarea
            id="indicaciones"
            name="indicaciones"
            value={formData.datosMedicos.indicaciones}
            onChange={handleMedicalDataChange}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="contactosEmergencia">Contactos de Emergencia</label>
          <textarea
            id="contactosEmergencia"
            name="contactosEmergencia"
            value={formData.datosMedicos.contactosEmergencia}
            onChange={handleMedicalDataChange}
            rows="3"
            placeholder="Nombre: Tel&#233;fono&#10;Nombre: Tel&#233;fono"
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Guardando...' : child ? 'Actualizar' : 'Crear'}
        </button>
      </div>
    </form>
  );
};

export default ChildForm;
