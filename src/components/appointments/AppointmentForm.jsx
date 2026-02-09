import { useState, useEffect } from 'react';
import { AlertDialog } from '../common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';

const AppointmentForm = ({ appointment, userChildren, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    hijoId: '',
    nota: ''
  });
  const [loading, setLoading] = useState(false);
  const alertDialog = useDialog();

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
      alertDialog.openDialog({
        title: 'Campo Requerido',
        message: 'Por favor selecciona un alumno',
        type: 'warning'
      });
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

  const appointmentModeLabel = appointment?.modalidad === 'virtual'
    ? 'Virtual'
    : appointment?.modalidad === 'presencial'
      ? 'Presencial'
      : 'Sin definir';

  return (
    <div className="appointment-form-container">
      <div className="card appointment-form-card">
        <div className="card__header appointment-form-header">
          <div>
            <h2 className="card__title">Confirmar turno</h2>
            <p className="appointment-form-subtitle">Revisá los datos antes de reservar.</p>
          </div>
        </div>

        <div className="card__body">
          {/* Appointment Details Section */}
          <div className="appointment-booking-summary">
            <div className="booking-summary-inline">
              <span className="booking-summary-chip">
                <span className="booking-summary-label">Fecha y Hora</span>
                <span className="booking-summary-value">{formatDateTime(appointment.fechaHora)}</span>
              </span>
              {appointment.duracionMinutos && (
                <>
                  <span className="booking-summary-separator" aria-hidden="true">•</span>
                  <span className="booking-summary-chip">
                    <span className="booking-summary-label">Duración</span>
                    <span className="booking-summary-value">{appointment.duracionMinutos} minutos</span>
                  </span>
                </>
              )}
              <>
                <span className="booking-summary-separator" aria-hidden="true">•</span>
                <span className="booking-summary-chip">
                  <span className="booking-summary-label">Modalidad</span>
                  <span className="booking-summary-value">{appointmentModeLabel}</span>
                </span>
              </>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="appointment-form">
            <div className="form-group">
              <label htmlFor="hijoId" className="form-label">
                <span>Alumno *</span>
              </label>
              <select
                id="hijoId"
                name="hijoId"
                value={formData.hijoId}
                onChange={handleChange}
                required
                className="form-select"
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
              <label htmlFor="nota" className="form-label">
                <span>Nota (opcional)</span>
              </label>
              <textarea
                id="nota"
                name="nota"
                value={formData.nota}
                onChange={handleChange}
                rows="4"
                placeholder="Motivo de la consulta, tema a tratar, etc."
                className="form-textarea"
              />
              <div className="form-helper-text">
                Agregá contexto opcional para preparar mejor la reunión.
              </div>
            </div>

            <div className="form-actions appointment-form-actions">
              <button
                type="button"
                onClick={onCancel}
                className="btn btn--outline"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Reservando...
                  </>
                ) : 'Confirmar reserva'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={alertDialog.closeDialog}
        title={alertDialog.dialogData.title}
        message={alertDialog.dialogData.message}
        type={alertDialog.dialogData.type}
      />
    </div>
  );
};

export default AppointmentForm;


