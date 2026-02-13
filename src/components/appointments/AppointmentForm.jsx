import { useState, useEffect } from 'react';
import { AlertDialog } from '../common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import Icon from '../ui/Icon';
import './AppointmentForm.css';

const normalizeAppointmentMode = (value) => (
  value === 'virtual' || value === 'presencial' ? value : ''
);

const AppointmentForm = ({ appointment, userChildren, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    hijoId: '',
    nota: '',
    modalidad: normalizeAppointmentMode(appointment?.modalidad)
  });
  const [loading, setLoading] = useState(false);
  const alertDialog = useDialog();

  useEffect(() => {
    if (userChildren && userChildren.length === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => ({ ...prev, hijoId: userChildren[0].id }));
    }
  }, [userChildren]);

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      modalidad: normalizeAppointmentMode(appointment?.modalidad)
    }));
  }, [appointment?.id, appointment?.modalidad]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.modalidad) {
      alertDialog.openDialog({
        title: 'Campo Requerido',
        message: 'Por favor seleccioná la modalidad',
        type: 'warning'
      });
      return;
    }
    if (!formData.hijoId) {
      alertDialog.openDialog({
        title: 'Campo Requerido',
        message: 'Por favor seleccioná un alumno',
        type: 'warning'
      });
      return;
    }
    setLoading(true);
    await onSubmit({
      appointmentId: appointment.id,
      hijoId: formData.hijoId,
      nota: formData.nota,
      modalidad: formData.modalidad
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

  /* ── Íconos de modalidad ── */
  const PresencialIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const VirtualIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 8l5 3-5 3V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

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
          {/* Resumen del turno */}
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
            </div>
          </div>

          <form onSubmit={handleSubmit} className="appointment-form">

            {/* ── SECCIÓN 1: Modalidad ── */}
            <div className="sc-section">
              <div className="sc-section__header">
                <span className="sc-section__num">1</span>
                <h3 className="sc-section__title">Modalidad</h3>
              </div>

              <div className="sc-mode-grid">
                <button
                  type="button"
                  className={`sc-mode-card${formData.modalidad === 'presencial' ? ' sc-mode-card--active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, modalidad: 'presencial' }))}
                  disabled={loading}
                >
                  <PresencialIcon />
                  <span className="sc-mode-card__label">Presencial</span>
                  <span className="sc-mode-card__desc">En la escuela</span>
                </button>
                <button
                  type="button"
                  className={`sc-mode-card${formData.modalidad === 'virtual' ? ' sc-mode-card--active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, modalidad: 'virtual' }))}
                  disabled={loading}
                >
                  <VirtualIcon />
                  <span className="sc-mode-card__label">Virtual</span>
                  <span className="sc-mode-card__desc">Por videollamada</span>
                </button>
              </div>
            </div>

            {/* ── SECCIÓN 2: Alumno y nota ── */}
            <div className="sc-section">
              <div className="sc-section__header">
                <span className="sc-section__num">2</span>
                <h3 className="sc-section__title">Detalles</h3>
              </div>

              <div className="form-group">
                <label htmlFor="hijoId" className="required">Alumno</label>
                <select
                  id="hijoId"
                  name="hijoId"
                  value={formData.hijoId}
                  onChange={handleChange}
                  required
                  disabled={loading}
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
                <label htmlFor="nota">
                  Nota
                  <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', fontWeight: 'var(--font-weight-normal)', marginLeft: 4 }}>(opcional)</span>
                </label>
                <textarea
                  id="nota"
                  name="nota"
                  value={formData.nota}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Motivo de la consulta, tema a tratar, etc."
                  className="form-textarea"
                  disabled={loading}
                />
                <p className="form-help">Agregá contexto opcional para preparar mejor la reunión.</p>
              </div>
            </div>

            {/* ── Acciones ── */}
            <div className="sc-actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={loading}
              >
                <Icon name="check-circle" size={16} />
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Reservando...
                  </>
                ) : 'Confirmar reserva'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="btn btn--outline"
                disabled={loading}
              >
                Cancelar
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
