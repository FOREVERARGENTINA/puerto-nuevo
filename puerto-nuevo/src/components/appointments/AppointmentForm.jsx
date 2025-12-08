import { useState, useEffect } from 'react';

const AppointmentForm = ({ appointment, userChildren, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    hijoId: '',
    nota: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userChildren && userChildren.length === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => ({ ...prev, hijoId: userChildren[0].id }));
    }
  }, [userChildren]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.hijoId) {
      alert('Por favor selecciona un alumno');
      return;
    }
    setLoading(true);
    await onSubmit({
      appointmentId: appointment.id,
      hijoId: formData.hijoId,
      nota: formData.nota
    });
    setLoading(false);
  };

  const formatDateTime = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="appointment-form">
      <div className="form-section">
        <h3>Reservar Turno</h3>
        
        <div className="appointment-details">
          <p>
            <strong>Fecha y Hora:</strong><br />
            {formatDateTime(appointment.fechaHora)}
          </p>
          {appointment.duracionMinutos && (
            <p>
              <strong>Duración:</strong> {appointment.duracionMinutos} minutos
            </p>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="hijoId">Alumno *</label>
          <select
            id="hijoId"
            name="hijoId"
            value={formData.hijoId}
            onChange={handleChange}
            required
          >
            <option value="">Seleccionar alumno...</option>
            {userChildren && userChildren.map(child => (
              <option key={child.id} value={child.id}>
                {child.nombreCompleto}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="nota">Nota (opcional)</label>
          <textarea
            id="nota"
            name="nota"
            value={formData.nota}
            onChange={handleChange}
            rows="3"
            placeholder="Motivo de la consulta, tema a tratar, etc."
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Reservando...' : 'Confirmar Reserva'}
        </button>
      </div>
    </form>
  );
};

export default AppointmentForm;
