import { useState, useEffect } from 'react';
import { appointmentsService } from '../../services/appointments.service';
import { usersService } from '../../services/users.service';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';
import { Timestamp } from 'firebase/firestore';

const AppointmentsManager = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateSlots, setShowCreateSlots] = useState(false);
  const [slotsForm, setSlotsForm] = useState({
    diaSemana: '1',
    fechaDesde: '',
    fechaHasta: '',
    horaInicio: '09:00',
    horaFin: '17:00',
    duracionMinutos: 30,
    intervaloMinutos: 0
  });

  const enrichWithUserEmails = async (appointments) => {
    const enriched = [];
    for (const app of appointments) {
      if (app.familiaUid) {
        const userResult = await usersService.getUserById(app.familiaUid);
        if (userResult.success) {
          enriched.push({
            ...app,
            familiaEmail: userResult.user.email
          });
        } else {
          enriched.push(app);
        }
      } else {
        enriched.push(app);
      }
    }
    return enriched;
  };

  const loadAppointments = async () => {
    setLoading(true);
    const result = await appointmentsService.getAllAppointments();
    if (result.success) {
      const appointmentsWithEmails = await enrichWithUserEmails(result.appointments);
      setAppointments(appointmentsWithEmails);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    loadAppointments();
  }, []);

  const handleSlotFormChange = (e) => {
    const { name, value } = e.target;
    setSlotsForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateTimeSlots = () => {
    const { diaSemana, fechaDesde, fechaHasta, horaInicio, horaFin, duracionMinutos, intervaloMinutos } = slotsForm;
    
    if (!diaSemana || !fechaDesde || !fechaHasta || !horaInicio || !horaFin) {
      alert('Por favor completa todos los campos');
      return;
    }

    const slots = [];
    const targetDayOfWeek = parseInt(diaSemana);
    const startDate = new Date(fechaDesde);
    const endDate = new Date(fechaHasta);

    let currentDate = new Date(startDate);
    while (currentDate.getDay() !== targetDayOfWeek) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    while (currentDate <= endDate) {
      const [startHour, startMin] = horaInicio.split(':').map(Number);
      const [endHour, endMin] = horaFin.split(':').map(Number);
      
      let currentTime = new Date(currentDate);
      currentTime.setHours(startHour, startMin, 0, 0);
      
      const endTime = new Date(currentDate);
      endTime.setHours(endHour, endMin, 0, 0);

      while (currentTime < endTime) {
        slots.push({
          fechaHora: Timestamp.fromDate(new Date(currentTime)),
          duracionMinutos: parseInt(duracionMinutos)
        });
        
        currentTime.setMinutes(currentTime.getMinutes() + parseInt(duracionMinutos) + parseInt(intervaloMinutos));
      }

      currentDate.setDate(currentDate.getDate() + 7);
    }

    return slots;
  };

  const handleCreateSlots = async () => {
    const slots = generateTimeSlots();
    
    if (slots.length === 0) {
      alert('No se generaron slots. Verifica los horarios.');
      return;
    }

    if (!confirm(`Se crearán ${slots.length} turnos disponibles. ¿Continuar?`)) {
      return;
    }

    const result = await appointmentsService.createTimeSlots(slots);
    if (result.success) {
      alert('Turnos creados exitosamente');
      setShowCreateSlots(false);
      loadAppointments();
    } else {
      alert('Error al crear turnos: ' + result.error);
    }
  };

  const handleMarkAttended = async (appointmentId) => {
    const result = await appointmentsService.markAsAttended(appointmentId);
    if (result.success) {
      loadAppointments();
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm('¿Cancelar este turno?')) return;
    
    const result = await appointmentsService.cancelAppointment(appointmentId);
    if (result.success) {
      alert('Turno cancelado');
      loadAppointments();
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!confirm('¿Eliminar este turno permanentemente?')) return;
    
    const result = await appointmentsService.deleteAppointment(appointmentId);
    if (result.success) {
      alert('Turno eliminado');
      loadAppointments();
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleBlockAppointment = async (appointmentId) => {
    const result = await appointmentsService.blockAppointment(appointmentId);
    if (result.success) {
      loadAppointments();
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleUnblockAppointment = async (appointmentId) => {
    const result = await appointmentsService.unblockAppointment(appointmentId);
    if (result.success) {
      loadAppointments();
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleSelectSlot = (appointment) => {
    const options = [];
    
    if (appointment.estado === 'disponible') {
      options.push({ label: 'Bloquear Turno', action: () => handleBlockAppointment(appointment.id) });
    }
    
    if (appointment.estado === 'bloqueado') {
      options.push({ label: 'Desbloquear Turno', action: () => handleUnblockAppointment(appointment.id) });
    }
    
    if (appointment.estado === 'reservado') {
      options.push({ label: 'Marcar como Asistió', action: () => handleMarkAttended(appointment.id) });
      options.push({ label: 'Cancelar Turno', action: () => handleCancelAppointment(appointment.id) });
    }
    
    options.push({ label: 'Eliminar', action: () => handleDeleteAppointment(appointment.id) });

    const choice = prompt(
      `Turno: ${appointment.estado}\n\nOpciones:\n${options.map((opt, i) => `${i + 1}. ${opt.label}`).join('\n')}\n\nIngresa el número de opción:`
    );

    const index = parseInt(choice) - 1;
    if (index >= 0 && index < options.length) {
      options[index].action();
    }
  };

  const getTodayMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (loading) {
    return <div className="loading">Cargando turnos...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Turnos</h1>
        <button 
          onClick={() => setShowCreateSlots(!showCreateSlots)} 
          className="btn btn-primary"
        >
          {showCreateSlots ? 'Cancelar' : '+ Crear Turnos'}
        </button>
      </div>

      {showCreateSlots && (
        <div className="create-slots-form card">
          <h3>Generar Turnos Disponibles</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="diaSemana">Día de la Semana</label>
              <select
                id="diaSemana"
                name="diaSemana"
                value={slotsForm.diaSemana}
                onChange={handleSlotFormChange}
              >
                <option value="1">Lunes</option>
                <option value="2">Martes</option>
                <option value="3">Miércoles</option>
                <option value="4">Jueves</option>
                <option value="5">Viernes</option>
                <option value="6">Sábado</option>
                <option value="0">Domingo</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fechaDesde">Desde</label>
              <input
                type="date"
                id="fechaDesde"
                name="fechaDesde"
                value={slotsForm.fechaDesde}
                onChange={handleSlotFormChange}
                min={getTodayMinDate()}
              />
            </div>

            <div className="form-group">
              <label htmlFor="fechaHasta">Hasta</label>
              <input
                type="date"
                id="fechaHasta"
                name="fechaHasta"
                value={slotsForm.fechaHasta}
                onChange={handleSlotFormChange}
                min={slotsForm.fechaDesde || getTodayMinDate()}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="horaInicio">Hora Inicio</label>
              <input
                type="time"
                id="horaInicio"
                name="horaInicio"
                value={slotsForm.horaInicio}
                onChange={handleSlotFormChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="horaFin">Hora Fin</label>
              <input
                type="time"
                id="horaFin"
                name="horaFin"
                value={slotsForm.horaFin}
                onChange={handleSlotFormChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="duracionMinutos">Duración (minutos)</label>
              <input
                type="number"
                id="duracionMinutos"
                name="duracionMinutos"
                value={slotsForm.duracionMinutos}
                onChange={handleSlotFormChange}
                min="15"
                step="5"
              />
            </div>

            <div className="form-group">
              <label htmlFor="intervaloMinutos">Intervalo entre turnos (minutos)</label>
              <input
                type="number"
                id="intervaloMinutos"
                name="intervaloMinutos"
                value={slotsForm.intervaloMinutos}
                onChange={handleSlotFormChange}
                min="0"
                step="5"
              />
            </div>
          </div>

          <button onClick={handleCreateSlots} className="btn btn-primary">
            Generar Turnos
          </button>
        </div>
      )}

      <div className="appointments-stats card">
        <div className="stat">
          <span className="stat-label">Disponibles</span>
          <span className="stat-value">{appointments.filter(a => a.estado === 'disponible').length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Bloqueados</span>
          <span className="stat-value">{appointments.filter(a => a.estado === 'bloqueado').length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Reservados</span>
          <span className="stat-value">{appointments.filter(a => a.estado === 'reservado').length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Cancelados</span>
          <span className="stat-value">{appointments.filter(a => a.estado === 'cancelado').length}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Asistieron</span>
          <span className="stat-value">{appointments.filter(a => a.estado === 'asistio').length}</span>
        </div>
      </div>

      <AppointmentCalendar
        appointments={appointments}
        onSelectSlot={handleSelectSlot}
        showOnlyAvailable={false}
      />
    </div>
  );
};

export default AppointmentsManager;
