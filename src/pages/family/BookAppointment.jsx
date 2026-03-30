import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { appointmentsService } from '../../services/appointments.service';
import { childrenService } from '../../services/children.service';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import AppointmentForm from '../../components/appointments/AppointmentForm';
import { AMBIENTES, LEGACY_SLOTS_CUTOFF_DATE } from '../../config/constants';
import './BookAppointment.css';

const getAppointmentDate = (value) => (
  value?.toDate ? value.toDate() : new Date(value)
);

const formatTime = (timestamp) => {
  const date = getAppointmentDate(timestamp);
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const formatDateTime = (timestamp) => {
  const date = getAppointmentDate(timestamp);
  return date.toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getAppointmentModeLabel = (value) => {
  if (value === 'virtual') return 'Virtual';
  if (value === 'presencial') return 'Presencial';
  return 'Sin definir';
};

const BookAppointment = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [availableAppointments, setAvailableAppointments] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [appointmentNotes, setAppointmentNotes] = useState({});
  const [userChildren, setUserChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isMobileSlotsOpen, setIsMobileSlotsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [earliestAllowed, setEarliestAllowed] = useState(null);
  const [focusedAppointmentId, setFocusedAppointmentId] = useState('');

  const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  };

  const alertDialog = useDialog();
  const requestedAppointmentId = searchParams.get('appointmentId')?.trim() || '';
  const dialogElement = (
    <AlertDialog
      isOpen={alertDialog.isOpen}
      onClose={alertDialog.closeDialog}
      title={alertDialog.dialogData.title}
      message={alertDialog.dialogData.message}
      type={alertDialog.dialogData.type}
    />
  );

  const loadAvailableAppointments = async (children = []) => {
    const { start, end } = getMonthRange(currentMonth);
    const result = await appointmentsService.getAppointmentsByDateRange(start, end);
    if (result.success) {
      const minLeadTimeMs = 12 * 60 * 60 * 1000;
      const earliestAllowedDate = new Date(Date.now() + minLeadTimeMs);
      setEarliestAllowed(earliestAllowedDate);

      const familyAmbientes = new Set(
        children
          .map(child => child.ambiente)
          .filter(a => a === AMBIENTES.TALLER_1 || a === AMBIENTES.TALLER_2)
      );

      const available = result.appointments.filter(app => {
        if (app.estado !== 'disponible') return false;
        if (app.origenSlot === 'manual') return false;
        if (app.familiaUid) return false;
        if (Array.isArray(app.familiasUids) && app.familiasUids.length > 0) return false;

        const fechaDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
        if (fechaDate < earliestAllowedDate) return false;

        if (app.ambiente) {
          return familyAmbientes.has(app.ambiente);
        }

        return fechaDate < LEGACY_SLOTS_CUTOFF_DATE;
      });

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
      return result.children;
    }
    return [];
  };

  const loadData = async () => {
    setLoading(true);
    const children = await loadUserData();
    await Promise.all([
      loadAvailableAppointments(children),
      loadMyAppointments()
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
      loadAvailableAppointments(userChildren);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // userChildren is intentionally omitted: this effect reloads slots on month change.
    // At that point userChildren already has the correct value from the previous render.
    // Initial mount uses loadData() which passes children as an explicit argument.
  }, [currentMonth, user]);

  const handleSelectSlot = (appointment) => {
    setSelectedSlot(appointment);
    setShowBookingForm(true);
  };

  const handleBookingSubmit = async (data) => {
    const selectedChild = userChildren.find(child => child.id === data.hijoId);
    const selectedMode = data.modalidad === 'presencial' || data.modalidad === 'virtual'
      ? data.modalidad
      : null;

    const result = await appointmentsService.bookSlot(data.appointmentId, {
      payload: {
        familiaUid: user.uid,
        familiasUids: [user.uid],
        familiasInfo: [{ uid: user.uid, email: user.email || '', displayName: user.displayName || '' }],
        hijoId: data.hijoId,
        ...(selectedMode ? { modalidad: selectedMode } : {}),
        nota: data.nota,
        estado: 'reservado',
        familiaEmail: user.email || '',
        familiaDisplayName: user.displayName || '',
        hijoNombre: selectedChild?.nombreCompleto || ''
      }
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
      const appDate = getAppointmentDate(app.fechaHora);
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
    setIsMobileSlotsOpen(false);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
    setIsMobileSlotsOpen(true);
  };

  useEffect(() => {
    if (selectedDate) {
      setIsMobileSlotsOpen(true);
    }
  }, [selectedDate]);

  const getSlotSummary = (appointment) => {
    if (appointment?.modalidad === 'virtual' || appointment?.modalidad === 'presencial') {
      return `${appointment.duracionMinutos} min • ${getAppointmentModeLabel(appointment.modalidad)}`;
    }
    return `${appointment.duracionMinutos} min`;
  };

  const getUpcomingAppointments = () => {
    const now = new Date();
    return myAppointments
      .filter(app => {
        const appDate = getAppointmentDate(app.fechaHora);
        return appDate >= now && app.estado === 'reservado';
      })
      .sort((a, b) => {
        const dateA = getAppointmentDate(a.fechaHora);
        const dateB = getAppointmentDate(b.fechaHora);
        return dateA - dateB;
      });
  };

  useEffect(() => {
    if (!requestedAppointmentId || loading) return;

    const matchingAppointment = myAppointments.find((appointment) => appointment.id === requestedAppointmentId);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('appointmentId');
    nextSearchParams.delete('source');

    if (!matchingAppointment) {
      setFocusedAppointmentId('');
      setSearchParams(nextSearchParams, { replace: true });
      return;
    }

    const appointmentDate = getAppointmentDate(matchingAppointment.fechaHora);
    const isUpcomingReserved = matchingAppointment.estado === 'reservado' && appointmentDate >= new Date();

    setCurrentMonth((currentValue) => {
      const sameMonth = currentValue.getFullYear() === appointmentDate.getFullYear()
        && currentValue.getMonth() === appointmentDate.getMonth();
      return sameMonth ? currentValue : new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), 1);
    });
    setSelectedDate(new Date(
      appointmentDate.getFullYear(),
      appointmentDate.getMonth(),
      appointmentDate.getDate()
    ));
    setIsHistoryOpen(!isUpcomingReserved);
    setFocusedAppointmentId(matchingAppointment.id);
    setSearchParams(nextSearchParams, { replace: true });
  }, [loading, myAppointments, requestedAppointmentId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!focusedAppointmentId) return;

    const appointmentElement = document.querySelector(`[data-appointment-id="${focusedAppointmentId}"]`);
    if (!appointmentElement) return;

    window.requestAnimationFrame(() => {
      appointmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [focusedAppointmentId, isHistoryOpen, myAppointments]);

  if (loading) {
    return (
      <div className="container page-container">
        <div className="dashboard-header dashboard-header--compact">
          <div>
            <h1 className="dashboard-title">Turnos para Reuniones</h1>
            <p className="dashboard-subtitle">Reservá un turno con la escuela.</p>
          </div>
        </div>
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <div className="spinner spinner--lg"></div>
            <p style={{ marginTop: 'var(--spacing-sm)' }}>Cargando turnos disponibles...</p>
          </div>
        </div>
        {dialogElement}
      </div>
    );
  }

  if (showBookingForm && selectedSlot) {
    return (
      <div className="container page-container">
        <AppointmentForm
          appointment={selectedSlot}
          userChildren={userChildren}
          onSubmit={handleBookingSubmit}
          onCancel={handleCancelBooking}
        />
        {dialogElement}
      </div>
    );
  }

  const upcomingAppointments = getUpcomingAppointments();
  const hasUpcomingAppointments = upcomingAppointments.length > 0;
  const selectedDateAppointments = selectedDate
    ? getAppointmentsForDate(selectedDate).slice().sort((a, b) => {
        const order = { taller1: 0, taller2: 1 };
        const aOrder = order[a.ambiente] ?? 2;
        const bOrder = order[b.ambiente] ?? 2;
        if (aOrder !== bOrder) return aOrder - bOrder;
        const aTime = a.fechaHora?.toDate ? a.fechaHora.toDate() : new Date(a.fechaHora);
        const bTime = b.fechaHora?.toDate ? b.fechaHora.toDate() : new Date(b.fechaHora);
        return aTime - bTime;
      })
    : [];
  const upcomingAppointmentIds = new Set(upcomingAppointments.map(app => app.id));
  const appointmentHistory = myAppointments
    .filter(app => !upcomingAppointmentIds.has(app.id))
    .sort((a, b) => getAppointmentDate(b.fechaHora) - getAppointmentDate(a.fechaHora));
  const visibleUpcomingAppointments = focusedAppointmentId && upcomingAppointmentIds.has(focusedAppointmentId)
    ? upcomingAppointments
    : upcomingAppointments.slice(0, 3);
  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const todayDateString = new Date().toISOString().split('T')[0];
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
          <h1 className="dashboard-title">Turnos para Reuniones</h1>
          <p className="dashboard-subtitle">Reservá turnos y consultá tu agenda.</p>
        </div>
      </div>

      {/*
        DOM order matches the desired mobile stack:
          - Con próximo turno: upcoming -> calendario -> extras
          - Sin próximo turno: calendario -> extras -> upcoming (fallback)
          - list-panel (Horarios) se mantiene para desktop.
        CSS grid places panels into 3 columns on desktop via explicit grid-column.
      */}
      <div
        className={`appointments-manager-layout appointments-manager-layout--family ${
          hasUpcomingAppointments
            ? 'appointments-manager-layout--family-has-upcoming'
            : 'appointments-manager-layout--family-no-upcoming'
        }`}
      >

        {/* ── 1: Próximo turno ── */}
        <div className="appointments-upcoming-panel">
          <div className="card appointments-upcoming-card">
            <div className="card__body">
              <section className="appointments-section appointments-section--upcoming">
                <div className="appointments-section__header">
                  <h2 className="card__title">Próximos turnos</h2>
                </div>

                {upcomingAppointments.length > 0 ? (
                  <div className="upcoming-appointments-list">
                    {visibleUpcomingAppointments.map(app => (
                      <div
                        key={app.id}
                        data-appointment-id={app.id}
                        className={`upcoming-appointment-item ${
                          focusedAppointmentId === app.id ? 'upcoming-appointment-item--highlighted' : ''
                        }`}
                      >
                        <div className="appointment-details">
                          <div className="appointment-datetime">{formatDateTime(app.fechaHora)}</div>
                          <div className="appointment-note">Modalidad: {getAppointmentModeLabel(app.modalidad)}</div>
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
                ) : (
                  <div className="empty-state empty-state--compact">
                    <p className="empty-state__text">No tenés turnos reservados por ahora.</p>
                    <p className="form-help">Seleccioná un día en el calendario para ver horarios disponibles.</p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

        {/* ── 2: Calendario ── */}
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
                  const isSelected = selectedDate &&
                    day &&
                    selectedDate.toISOString().split('T')[0] === new Date(currentMonthYear, currentMonthIndex, day).toISOString().split('T')[0];
                  return (
                    <div
                      key={index}
                      className={`event-calendar__day ${
                        day ? 'event-calendar__day--active' : 'event-calendar__day--empty'
                      } ${day && hasAppointments ? 'event-calendar__day--has-event event-calendar__day--has-slot' : ''} ${
                        isSelected ? 'event-calendar__day--selected' : ''
                      } ${isToday ? 'event-calendar__day--today' : ''}`}
                      onClick={() => {
                        if (day) {
                          setSelectedDate(new Date(currentMonthYear, currentMonthIndex, day));
                          setIsMobileSlotsOpen(true);
                        }
                      }}
                    >
                      {day}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="appointments-mobile-slots">
              <button
                type="button"
                className="appointments-mobile-slots__trigger"
                onClick={() => setIsMobileSlotsOpen(prev => !prev)}
                aria-expanded={isMobileSlotsOpen}
                aria-controls="appointments-mobile-slots-content"
              >
                <span>
                  {selectedDate
                    ? `Slots del ${selectedDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`
                    : 'Slots disponibles'}
                </span>
                <span className="appointments-mobile-slots__meta">
                  {selectedDate ? `${selectedDateAppointments.length} disponibles` : 'Selecciona un día'}
                </span>
              </button>

              {isMobileSlotsOpen && (
                <div id="appointments-mobile-slots-content" className="appointments-mobile-slots__content">
                  {!selectedDate ? (
                    <div className="empty-state empty-state--compact">
                      <p className="empty-state__text">Selecciona un día en el calendario para ver horarios.</p>
                    </div>
                  ) : selectedDateAppointments.length === 0 ? (
                    <div className="empty-state empty-state--compact">
                      <p className="empty-state__text">No hay turnos disponibles para este día.</p>
                    </div>
                  ) : (
                    <div className="available-slots-list">
                      {selectedDateAppointments.map(app => (
                        <div key={app.id} className="available-slot-item">
                          <div className="slot-time-info">
                            <div className="slot-time">{formatTime(app.fechaHora)}</div>
                            <div className="slot-duration">
                              {getSlotSummary(app)}
                              {app.ambiente === 'taller1' && <span className="slot-ambiente-badge slot-ambiente-badge--t1">Taller 1</span>}
                              {app.ambiente === 'taller2' && <span className="slot-ambiente-badge slot-ambiente-badge--t2">Taller 2</span>}
                            </div>
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
              )}
            </div>
          </div>
        </div>

        {/* ── 3: Horarios disponibles (desktop only) ── */}
        <div className="appointments-list-panel appointments-list-panel--family-main">
          <div className="card appointments-availability-card">
            <div className="card__body">
              <section className="appointments-section appointments-section--availability">
                <div className="appointments-section__header">
                  <h2 className="card__title">Horarios disponibles</h2>
                  <span className="appointments-section__meta">
                    {selectedDate ? `${selectedDateAppointments.length} disponibles` : 'Selecciona un dia'}
                  </span>
                </div>

                {!selectedDate ? (
                  <div className="empty-state empty-state--compact">
                    <p className="empty-state__text">Selecciona un dia en el calendario para ver horarios.</p>
                  </div>
                ) : selectedDateAppointments.length === 0 ? (
                  <div className="empty-state empty-state--compact">
                    <p className="empty-state__text">No hay turnos disponibles para este dia.</p>
                  </div>
                ) : (
                  <div className="available-slots-list">
                    {selectedDateAppointments.map(app => (
                      <div key={app.id} className="available-slot-item">
                        <div className="slot-time-info">
                          <div className="slot-time">{formatTime(app.fechaHora)}</div>
                          <div className="slot-duration">
                            {getSlotSummary(app)}
                            {app.ambiente === 'taller1' && <span className="slot-ambiente-badge slot-ambiente-badge--t1">Taller 1</span>}
                            {app.ambiente === 'taller2' && <span className="slot-ambiente-badge slot-ambiente-badge--t2">Taller 2</span>}
                          </div>
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
              </section>
            </div>
          </div>
        </div>

        {/* ── 4: Cómo reservar + Historial ── */}
        <div className="appointments-extras-panel">
          <div className="card appointments-guide-card">
            <div className="card__body">
              <section className="appointments-section appointments-section--guide">
                <div className="appointments-section__header">
                  <h2 className="card__title">Cómo reservar</h2>
                  <div className="appointments-section__actions">
                    <button
                      type="button"
                      className="btn btn--sm btn--outline appointments-section__toggle"
                      onClick={() => setIsGuideOpen(prev => !prev)}
                      aria-expanded={isGuideOpen}
                      aria-controls="appointments-guide-content"
                    >
                      {isGuideOpen ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </div>
                {isGuideOpen && (
                  <div id="appointments-guide-content">
                    <ol className="appointments-guide-list">
                      <li>Elegí un día en el calendario con disponibilidad.</li>
                      <li>Seleccioná un horario en la lista de turnos.</li>
                      <li>Elegí modalidad: virtual o presencial.</li>
                      <li>Completá el formulario y confirmá.</li>
                    </ol>
                    <p className="form-help">Solo se pueden reservar turnos con 12 hs de anticipación.</p>
                  </div>
                )}
              </section>
            </div>
          </div>

          <div className="card appointments-history-card">
            <div className="card__body">
              <section className="appointments-section appointments-section--history">
                <div className="appointments-section__header">
                  <h2 className="card__title">Historial</h2>
                  <div className="appointments-section__actions">
                    <button
                      type="button"
                      className="btn btn--sm btn--outline appointments-section__toggle"
                      onClick={() => setIsHistoryOpen(prev => !prev)}
                      aria-expanded={isHistoryOpen}
                      aria-controls="appointments-history-content"
                    >
                      {isHistoryOpen ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </div>
                {isHistoryOpen && (
                  <div id="appointments-history-content">
                    {appointmentHistory.length === 0 ? (
                      <div className="empty-state empty-state--compact">
                        <p className="empty-state__text">Todavía no hay turnos para mostrar.</p>
                      </div>
                    ) : (
                      <div className="my-appointments-list">
                        {appointmentHistory.map(app => {
                          const appDate = getAppointmentDate(app.fechaHora);
                          const isPast = appDate < new Date();
                          const note = appointmentNotes[app.id];
                          return (
                            <div
                              key={app.id}
                              data-appointment-id={app.id}
                              className={`my-appointment-item my-appointment-item--${app.estado} ${
                                focusedAppointmentId === app.id ? 'my-appointment-item--highlighted' : ''
                              }`}
                            >
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
                                <span className="appointment-note-preview">{getAppointmentModeLabel(app.modalidad)}</span>
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
                                            <a href={file.url} target="_blank" rel="noreferrer">Adjunto {index + 1}</a>
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
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>

      </div>
      {dialogElement}
    </div>
  );
};

export default BookAppointment;
