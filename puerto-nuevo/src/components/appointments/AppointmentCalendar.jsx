import { useState, useEffect, useCallback } from 'react';

const AppointmentCalendar = ({ appointments, onSelectSlot, showOnlyAvailable = false }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filteredAppointments, setFilteredAppointments] = useState([]);

  const filterAppointmentsByDate = useCallback((date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filtered = appointments.filter(app => {
      const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
      const isInRange = appDate >= startOfDay && appDate <= endOfDay;
      
      if (showOnlyAvailable) {
        return isInRange && app.estado === 'disponible';
      }
      return isInRange;
    });

    filtered.sort((a, b) => {
      const dateA = a.fechaHora?.toDate ? a.fechaHora.toDate() : new Date(a.fechaHora);
      const dateB = b.fechaHora?.toDate ? b.fechaHora.toDate() : new Date(b.fechaHora);
      return dateA - dateB;
    });

    setFilteredAppointments(filtered);
  }, [appointments, showOnlyAvailable]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    filterAppointmentsByDate(selectedDate);
  }, [selectedDate, filterAppointmentsByDate]);

  const formatTime = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-AR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'disponible':
        return 'badge-success';
      case 'bloqueado':
        return 'badge-secondary';
      case 'reservado':
        return 'badge-warning';
      case 'cancelado':
        return 'badge-danger';
      case 'asistio':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  };

  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  return (
    <div className="appointment-calendar">
      <div className="calendar-header">
        <button onClick={() => changeDate(-1)} className="btn btn-sm btn-secondary">
          ← Anterior
        </button>
        <div className="calendar-date">
          <h3>{formatDate(selectedDate)}</h3>
          <button onClick={goToToday} className="btn btn-sm btn-link">
            Hoy
          </button>
        </div>
        <button onClick={() => changeDate(1)} className="btn btn-sm btn-secondary">
          Siguiente →
        </button>
      </div>

      <div className="calendar-body">
        {filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <p>No hay turnos {showOnlyAvailable ? 'disponibles' : ''} para este día</p>
          </div>
        ) : (
          <div className="appointments-list">
            {filteredAppointments.map(appointment => (
              <div 
                key={appointment.id} 
                className={`appointment-slot ${appointment.estado}`}
                onClick={() => appointment.estado === 'disponible' && onSelectSlot && onSelectSlot(appointment)}
                style={{ cursor: appointment.estado === 'disponible' && onSelectSlot ? 'pointer' : 'default' }}
              >
                <div className="slot-time">
                  <strong>{formatTime(appointment.fechaHora)}</strong>
                  {appointment.duracionMinutos && (
                    <span className="duration">({appointment.duracionMinutos} min)</span>
                  )}
                </div>
                <div className="slot-info">
                  <span className={`badge ${getEstadoBadgeClass(appointment.estado)}`}>
                    {appointment.estado}
                  </span>
                  {appointment.familiaEmail && (
                    <span className="family-info">{appointment.familiaEmail}</span>
                  )}
                  {appointment.nota && (
                    <span className="slot-note">{appointment.nota}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentCalendar;
