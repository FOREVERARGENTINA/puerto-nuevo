import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { appointmentsService } from '../../services/appointments.service';
import { childrenService } from '../../services/children.service';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import AppointmentForm from '../../components/appointments/AppointmentForm';

const BookAppointment = () => {
  const { user } = useAuth();
  const [availableAppointments, setAvailableAppointments] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [userChildren, setUserChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const alertDialog = useDialog();

  const loadAvailableAppointments = async () => {
    const result = await appointmentsService.getAllAppointments();
    if (result.success) {
      const available = result.appointments.filter(app => 
        app.estado === 'disponible' && !app.familiaUid
      );
      setAvailableAppointments(available);
    }
  };

  const loadMyAppointments = async () => {
    const result = await appointmentsService.getAppointmentsByFamily(user.uid);
    if (result.success) {
      setMyAppointments(result.appointments);
    }
  };

  const loadUserData = async () => {
    const result = await childrenService.getChildrenByResponsable(user.uid);
    if (result.success) {
      setUserChildren(result.children);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadAvailableAppointments(),
      loadMyAppointments(),
      loadUserData()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
      loadData();
    }
  }, [user]);

  const handleSelectSlot = (appointment) => {
    setSelectedSlot(appointment);
    setShowBookingForm(true);
  };

  const handleBookingSubmit = async (data) => {
    const result = await appointmentsService.updateAppointment(data.appointmentId, {
      familiaUid: user.uid,
      hijoId: data.hijoId,
      nota: data.nota,
      estado: 'reservado'
    });

    if (result.success) {
      alertDialog.openDialog({
        title: 'Éxito',
        message: 'Turno reservado exitosamente',
        type: 'success'
      });
      setShowBookingForm(false);
      setSelectedSlot(null);
      loadData();
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: 'Error al reservar turno: ' + result.error,
        type: 'error'
      });
    }
  };

  const handleCancelBooking = () => {
    setShowBookingForm(false);
    setSelectedSlot(null);
  };

  const handleCancelAppointment = async (appointmentId) => {
    const result = await appointmentsService.cancelAppointment(appointmentId);
    if (result.success) {
      alertDialog.openDialog({
        title: 'Éxito',
        message: 'Turno cancelado exitosamente',
        type: 'success'
      });
      loadData();
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: 'Error al cancelar: ' + result.error,
        type: 'error'
      });
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getAppointmentsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return availableAppointments.filter(app => {
      const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
      const appDateString = appDate.toISOString().split('T')[0];
      return appDateString === dateString;
    });
  };

  const hasMyAppointmentOnDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return myAppointments.some(app => {
      const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
      const appDateString = appDate.toISOString().split('T')[0];
      return appDateString === dateString && app.estado === 'reservado';
    });
  };

  const changeMonth = (offset) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
    setSelectedDate(null);
  };

  const formatTime = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
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

  const getUpcomingAppointments = () => {
    const now = new Date();
    return myAppointments
      .filter(app => {
        const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
        return appDate >= now && app.estado === 'reservado';
      })
      .sort((a, b) => {
        const dateA = a.fechaHora?.toDate ? a.fechaHora.toDate() : new Date(a.fechaHora);
        const dateB = b.fechaHora?.toDate ? b.fechaHora.toDate() : new Date(b.fechaHora);
        return dateA - dateB;
      });
  };

  if (loading) {
    return <LoadingScreen message="Cargando turnos disponibles..." />;
  }

  if (showBookingForm && selectedSlot) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>Reservar Turno</h1>
        </div>
        <AppointmentForm
          appointment={selectedSlot}
          userChildren={userChildren}
          onSubmit={handleBookingSubmit}
          onCancel={handleCancelBooking}
        />
      </div>
    );
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
  const upcomingAppointments = getUpcomingAppointments();
  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Turnos y Reuniones</h1>
      </div>

      {/* Upcoming Appointments Section */}
      {upcomingAppointments.length > 0 && (
        <div className="card upcoming-appointments-card">
          <div className="card__header">
            <h2 className="card__title">Próximos Turnos Reservados</h2>
          </div>
          <div className="card__body">
            <div className="upcoming-appointments-list">
              {upcomingAppointments.slice(0, 3).map(app => (
                <div key={app.id} className="upcoming-appointment-item">
                  <div className="appointment-details">
                    <div className="appointment-datetime">{formatDateTime(app.fechaHora)}</div>
                    {app.nota && <div className="appointment-note">{app.nota}</div>}
                  </div>
                  <button
                    onClick={() => handleCancelAppointment(app.id)}
                    className="btn btn--sm btn--outline btn--danger-outline"
                  >
                    Cancelar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="appointments-main-grid">
        {/* Calendar Section */}
        <div className="card appointments-calendar-card">
          <div className="card__header">
            <h2 className="card__title">Calendario de Disponibilidad</h2>
          </div>
          <div className="card__body">
            {/* Month Navigation */}
            <div className="calendar-month-nav">
              <button onClick={() => changeMonth(-1)} className="btn btn--sm btn--ghost">
                ← Anterior
              </button>
              <h3 className="calendar-month-title">
                {currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
              </h3>
              <button onClick={() => changeMonth(1)} className="btn btn--sm btn--ghost">
                Siguiente →
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="calendar-grid">
              {/* Day headers */}
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="calendar-day-header">{day}</div>
              ))}

              {/* Empty cells before first day */}
              {[...Array(startingDayOfWeek)].map((_, i) => (
                <div key={`empty-${i}`} className="calendar-day calendar-day--empty"></div>
              ))}

              {/* Days of month */}
              {[...Array(daysInMonth)].map((_, i) => {
                const dayNumber = i + 1;
                const date = new Date(year, month, dayNumber);
                const dateString = date.toISOString().split('T')[0];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isPast = date < today;
                const isToday = dateString === today.toISOString().split('T')[0];
                const hasAppointments = getAppointmentsForDate(date).length > 0;
                const hasMyAppointment = hasMyAppointmentOnDate(date);
                const isSelected = selectedDate && dateString === selectedDate.toISOString().split('T')[0];

                return (
                  <div
                    key={dayNumber}
                    className={`calendar-day ${isPast ? 'calendar-day--past' : ''} ${isToday ? 'calendar-day--today' : ''} ${isSelected ? 'calendar-day--selected' : ''} ${hasAppointments && !isPast ? 'calendar-day--available' : ''} ${hasMyAppointment ? 'calendar-day--booked' : ''}`}
                    onClick={() => !isPast && setSelectedDate(date)}
                  >
                    <span className="calendar-day-number">{dayNumber}</span>
                    {hasMyAppointment && <div className="calendar-day-indicator calendar-day-indicator--booked"></div>}
                    {hasAppointments && !isPast && !hasMyAppointment && (
                      <div className="calendar-day-indicator calendar-day-indicator--available"></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="calendar-legend">
              <div className="legend-item">
                <div className="legend-color legend-color--available"></div>
                <span>Turnos disponibles</span>
              </div>
              <div className="legend-item">
                <div className="legend-color legend-color--booked"></div>
                <span>Tus turnos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Available Slots for Selected Date */}
        <div className="card appointments-slots-card">
          <div className="card__header">
            <h2 className="card__title">
              {selectedDate
                ? `Turnos del ${selectedDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
                : 'Selecciona un día'}
            </h2>
          </div>
          <div className="card__body">
            {!selectedDate ? (
              <div className="empty-state">
                <p className="empty-state__text">Selecciona un día en el calendario para ver los turnos disponibles</p>
              </div>
            ) : selectedDateAppointments.length === 0 ? (
              <div className="empty-state">
                <p className="empty-state__text">No hay turnos disponibles para este día</p>
              </div>
            ) : (
              <div className="available-slots-list">
                {selectedDateAppointments.map(app => (
                  <div key={app.id} className="available-slot-item">
                    <div className="slot-time-info">
                      <div className="slot-time">{formatTime(app.fechaHora)}</div>
                      <div className="slot-duration">{app.duracionMinutos} min</div>
                    </div>
                    <button
                      onClick={() => handleSelectSlot(app)}
                      className="btn btn--primary btn--sm"
                    >
                      Reservar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* All My Appointments */}
      {myAppointments.length > 0 && (
        <div className="card my-appointments-card">
          <div className="card__header">
            <h2 className="card__title">Todos Mis Turnos</h2>
          </div>
          <div className="card__body">
            <div className="my-appointments-list">
              {myAppointments.map(app => {
                const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
                const isPast = appDate < new Date();

                return (
                  <div key={app.id} className={`my-appointment-item my-appointment-item--${app.estado}`}>
                    <div className="appointment-datetime">
                      {formatDateTime(app.fechaHora)}
                    </div>
                    <div className="appointment-meta">
                      <span className={`badge badge--${
                        app.estado === 'reservado' ? 'warning' :
                        app.estado === 'asistio' ? 'success' :
                        'secondary'
                      }`}>
                        {app.estado === 'reservado' ? 'Confirmado' : app.estado}
                      </span>
                      {app.nota && <span className="appointment-note-preview">{app.nota}</span>}
                    </div>
                    {app.estado === 'reservado' && !isPast && (
                      <button
                        onClick={() => handleCancelAppointment(app.id)}
                        className="btn btn--sm btn--outline btn--danger-outline"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookAppointment;

