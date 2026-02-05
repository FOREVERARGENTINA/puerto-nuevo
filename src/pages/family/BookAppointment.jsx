import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { appointmentsService } from '../../services/appointments.service';
import { childrenService } from '../../services/children.service';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import AppointmentForm from '../../components/appointments/AppointmentForm';

const BookAppointment = () => {
  const { user } = useAuth();
  const [availableAppointments, setAvailableAppointments] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [appointmentNotes, setAppointmentNotes] = useState({});
  const [userChildren, setUserChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [earliestAllowed, setEarliestAllowed] = useState(null);

  const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  };

  const alertDialog = useDialog();

  const loadAvailableAppointments = async () => {
    const { start, end } = getMonthRange(currentMonth);
    const result = await appointmentsService.getAppointmentsByDateRange(start, end);
    if (result.success) {
      const minLeadTimeMs = 12 * 60 * 60 * 1000;
      const earliestAllowedDate = new Date(Date.now() + minLeadTimeMs);
      setEarliestAllowed(earliestAllowedDate);
      const available = result.appointments.filter(app => 
        app.estado === 'disponible' &&
        !app.familiaUid &&
        (!Array.isArray(app.familiasUids) || app.familiasUids.length === 0) &&
        (app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora)) >= earliestAllowedDate
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

  useEffect(() => {
    const loadNotes = async () => {
      const attended = myAppointments.filter(app => app.estado === 'asistio');
      if (attended.length === 0) {
        setAppointmentNotes({});
        return;
      }

      const results = await Promise.all(attended.map(app => appointmentsService.getAppointmentNote(app.id)));
      const notesMap = {};
      attended.forEach((app, index) => {
        const result = results[index];
        if (result.success && result.note && result.note.visibilidad === 'familia') {
          notesMap[app.id] = result.note;
        }
      });
      setAppointmentNotes(notesMap);
    };

    loadNotes();
  }, [myAppointments]);

  useEffect(() => {
    if (user) {
      loadAvailableAppointments();
    }
  }, [currentMonth, user]);

  const handleSelectSlot = (appointment) => {
    setSelectedSlot(appointment);
    setShowBookingForm(true);
  };

  const handleBookingSubmit = async (data) => {
    const selectedChild = userChildren.find(child => child.id === data.hijoId);

    const result = await appointmentsService.updateAppointment(data.appointmentId, {
      familiaUid: user.uid,
      familiasUids: [user.uid],
      hijoId: data.hijoId,
      nota: data.nota,
      estado: 'reservado',
      familiaEmail: user.email || '',
      familiaDisplayName: user.displayName || '',
      familiasInfo: [
        {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || ''
        }
      ],
      hijoNombre: selectedChild?.nombreCompleto || ''
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
    const result = await appointmentsService.cancelAppointment(appointmentId, 'familia');
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
      const meetsLeadTime = earliestAllowed ? appDate >= earliestAllowed : true;
      return appDateString === dateString && meetsLeadTime;
    });
  };


  const changeMonth = (offset) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
    setSelectedDate(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
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
    return (
      <div className="container page-container">
        <div className="dashboard-header dashboard-header--compact">
          <div>
            <h1 className="dashboard-title">Turnos y Reuniones</h1>
            <p className="dashboard-subtitle">Reservá un turno con la escuela.</p>
          </div>
        </div>
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <div className="spinner spinner--lg"></div>
            <p style={{ marginTop: 'var(--spacing-sm)' }}>Cargando turnos disponibles...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showBookingForm && selectedSlot) {
    return (
      <div className="container page-container">
        <div className="dashboard-header dashboard-header--compact">
          <div>
            <h1 className="dashboard-title">Reservar Turno</h1>
            <p className="dashboard-subtitle">Seleccioná la fecha y completá el formulario.</p>
          </div>
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

  const upcomingAppointments = getUpcomingAppointments();
  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];
  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const todayDateString = new Date().toISOString().split('T')[0];
  const earliestAllowedDate = earliestAllowed || null;
  const currentMonthYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();

  const availableAppointmentsForMonth = availableAppointments.filter(app => {
    const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
    return appDate.getFullYear() === currentMonthYear && appDate.getMonth() === currentMonthIndex;
  });

  const daysWithAppointments = (() => {
    const set = new Set();
    availableAppointmentsForMonth.forEach(app => {
      const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
      set.add(appDate.getDate());
    });
    return set;
  })();

  const days = (() => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const offset = (startingDayOfWeek + 6) % 7;
    const list = [];
    for (let i = 0; i < offset; i++) list.push(null);
    for (let day = 1; day <= daysInMonth; day++) list.push(day);
    return list;
  })();

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Turnos y Reuniones</h1>
          <p className="dashboard-subtitle">Reservá turnos y consultá tu agenda.</p>
        </div>
      </div>

      <div className="appointments-manager-layout">
        <div className="appointments-list-panel">
          <div className="card">
            <div className="card__body">
              {upcomingAppointments.length > 0 && (
                <>
                  <h2 className="card__title">Próximos turnos</h2>
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
                  <div className="divider" />
                </>
              )}

              <h2 className="card__title">
                {selectedDate
                  ? `Turnos del ${selectedDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}`
                  : 'Selecciona un día'}
              </h2>
              <p className="form-help">Solo se pueden reservar turnos con 12 hs de anticipación.</p>

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

              {myAppointments.length > 0 && (
                <>
                  <div className="divider" />
                  <h2 className="card__title">Todos mis turnos</h2>
                  <div className="my-appointments-list">
                    {myAppointments.map(app => {
                      const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
                      const isPast = appDate < new Date();
                      const note = appointmentNotes[app.id];

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
                          {app.estado === 'asistio' && note && (
                            <div style={{ marginTop: 'var(--spacing-xs)', color: 'var(--color-text-light)' }}>
                              <div><strong>Resumen:</strong> {note.resumen}</div>
                              {note.acuerdos && <div><strong>Acuerdos:</strong> {note.acuerdos}</div>}
                              {note.proximosPasos && <div><strong>Próximos pasos:</strong> {note.proximosPasos}</div>}
                              {Array.isArray(note.attachments) && note.attachments.length > 0 && (
                                <div style={{ marginTop: 'var(--spacing-xs)' }}>
                                  <strong>Adjuntos:</strong>
                                  <ul style={{ margin: 'var(--spacing-xs) 0 0', paddingLeft: '1.1rem' }}>
                                    {note.attachments.map((file, index) => (
                                      <li key={`${app.id}-note-${index}`}>
                                        <a href={file.url} target="_blank" rel="noreferrer">{file.name || 'Archivo'}</a>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
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
                </>
              )}
            </div>
          </div>
        </div>

        <div className="card events-calendar-panel appointments-calendar-panel">
          <div className="card__header">
            <div>
              <h2 className="card__title">Calendario</h2>
              <p className="card__subtitle">
                {monthNames[currentMonthIndex]} {currentMonthYear}
              </p>
            </div>
            <span className="badge badge--info">{availableAppointmentsForMonth.length} este mes</span>
          </div>

          <div className="card__body">
            <div className="event-calendar events-calendar--manager">
              <div className="event-calendar__header">
                <button
                  onClick={() => changeMonth(-1)}
                  className="event-calendar__nav-btn"
                  aria-label="Mes anterior"
                >
                  <span>‹</span>
                </button>
                <div className="event-calendar__month">
                  {monthNames[currentMonthIndex]} {currentMonthYear}
                </div>
                <div className="event-calendar__actions">
                  <button
                    onClick={() => changeMonth(1)}
                    className="event-calendar__nav-btn"
                    aria-label="Siguiente mes"
                  >
                    <span>›</span>
                  </button>
                  <button
                    onClick={goToToday}
                    className="event-calendar__today-btn"
                    type="button"
                  >
                    Hoy
                  </button>
                </div>
              </div>

              <div className="event-calendar__weekdays">
                {dayNames.map((name, i) => (
                  <div key={i} className="event-calendar__weekday">
                    {name}
                  </div>
                ))}
              </div>

              <div className="event-calendar__days">
                {days.map((day, index) => {
                  const dayDate = day ? new Date(currentMonthYear, currentMonthIndex, day) : null;
                  const isToday = dayDate && dayDate.toISOString().split('T')[0] === todayDateString;
                  const hasAppointments = day && daysWithAppointments.has(day);
                  const isTooSoon = dayDate && earliestAllowedDate && dayDate < earliestAllowedDate;
                  const isSelected = selectedDate &&
                    day &&
                    selectedDate.toISOString().split('T')[0] === new Date(currentMonthYear, currentMonthIndex, day).toISOString().split('T')[0];
                  return (
                    <div
                      key={index}
                      className={`event-calendar__day ${
                        day ? 'event-calendar__day--active' : 'event-calendar__day--empty'
                      } ${day && hasAppointments ? 'event-calendar__day--has-event' : ''} ${
                        isSelected ? 'event-calendar__day--selected' : ''
                      } ${isToday ? 'event-calendar__day--today' : ''}`}
                      onClick={() => day && !isTooSoon && setSelectedDate(new Date(currentMonthYear, currentMonthIndex, day))}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookAppointment;








