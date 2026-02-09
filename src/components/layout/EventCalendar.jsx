import { useState, useEffect, useCallback, useMemo } from 'react';
import { eventsService } from '../../services/events.service';
import { snacksService } from '../../services/snacks.service';
import { appointmentsService } from '../../services/appointments.service';
import { AMBIENTES } from '../../config/constants';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../ui/Icon';

const SNACK_TERMINAL_STATES = new Set(['cancelado', 'completado', 'suspendido']);
const APPOINTMENT_VISIBLE_STATES = new Set(['reservado', 'asistio']);

const toDateSafe = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const parseSnackDate = (dateStr) => {
  if (typeof dateStr !== 'string') return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatSnackWeek = (fechaInicio, fechaFin) => {
  const start = parseSnackDate(fechaInicio);
  const end = parseSnackDate(fechaFin);
  if (!start || !end) return 'Semana de snacks confirmada';

  const startLabel = start.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const endLabel = end.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  return `Semana ${startLabel} - ${endLabel}`;
};

const getAmbienteLabel = (ambiente) => {
  if (ambiente === AMBIENTES.TALLER_1) return 'Taller 1';
  if (ambiente === AMBIENTES.TALLER_2) return 'Taller 2';
  return 'Taller';
};

const getFamilyFirstName = (displayName, email) => {
  const cleanDisplay = typeof displayName === 'string' ? displayName.trim() : '';
  if (cleanDisplay) {
    return cleanDisplay.split(/\s+/)[0];
  }

  const cleanEmail = typeof email === 'string' ? email.trim() : '';
  if (!cleanEmail) return '';

  const localPart = cleanEmail.split('@')[0] || '';
  const firstToken = localPart.split(/[._-]+/)[0] || localPart;
  if (!firstToken) return '';
  return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
};

const isSnackConfirmedByFamily = (assignment, familyUid) => {
  if (!assignment || !familyUid) return false;
  if (assignment.suspendido) return false;
  if (SNACK_TERMINAL_STATES.has(assignment.estado)) return false;

  const families = Array.isArray(assignment.familias) ? assignment.familias : [];
  if (families.length > 0) {
    const targetFamily = families.find((family) => family.uid === familyUid);
    return Boolean(targetFamily?.confirmed);
  }

  return assignment.familiaUid === familyUid && assignment.confirmadoPorFamilia === true;
};

const mapConfirmedSnacksToCalendarEvents = (assignments, familyUid, year, month) => (
  (Array.isArray(assignments) ? assignments : [])
    .filter((assignment) => isSnackConfirmedByFamily(assignment, familyUid))
    .map((assignment) => {
      const snackDate = parseSnackDate(assignment.fechaInicio);
      if (!snackDate) return null;
      if (snackDate.getFullYear() !== year || snackDate.getMonth() !== month) return null;

      return {
        id: `snack-${assignment.id}`,
        fecha: snackDate,
        titulo: `Snacks - ${getAmbienteLabel(assignment.ambiente)}`,
        descripcion: formatSnackWeek(assignment.fechaInicio, assignment.fechaFin),
        hora: null,
        source: 'snack'
      };
    })
    .filter(Boolean)
);

const mapAppointmentsToCalendarEvents = (appointments, year, month, { includeFamilyInfo = false } = {}) => (
  (Array.isArray(appointments) ? appointments : [])
    .filter((appointment) => APPOINTMENT_VISIBLE_STATES.has(appointment.estado))
    .map((appointment) => {
      const appointmentDate = toDateSafe(appointment.fechaHora);
      if (!appointmentDate) return null;
      if (appointmentDate.getFullYear() !== year || appointmentDate.getMonth() !== month) return null;

      const hourLabel = appointmentDate.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const familyFirstName = getFamilyFirstName(appointment.familiaDisplayName, appointment.familiaEmail);
      const childName = appointment.hijoNombre || '';
      const title = includeFamilyInfo
        ? `${familyFirstName || 'Familia'} - ${childName || 'Alumno'}`
        : childName
          ? `Reunion (${childName})`
          : 'Reunion';
      const description = includeFamilyInfo
        ? ''
        : (appointment.estado === 'asistio' ? 'Reunion realizada' : 'Turno de reunion confirmado');

      return {
        id: `appointment-${appointment.id}`,
        fecha: appointmentDate,
        hora: hourLabel,
        titulo: title,
        descripcion: description,
        source: 'appointment'
      };
    })
    .filter(Boolean)
);

/**
 * EventCalendar - Calendario mensual compacto para el sidebar
 * Muestra eventos y snacks confirmados del mes actual
 */
export function EventCalendar() {
  const { user, isFamily, isAdmin } = useAuth();
  const familyUid = user?.uid || null;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadEvents = useCallback(async () => {
    const monthStart = new Date(year, month, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const [eventsResult, snacksResult, appointmentsResult] = await Promise.all([
      eventsService.getEventsByMonth(year, month),
      isFamily && familyUid
        ? snacksService.getAssignmentsByFamily(familyUid)
        : Promise.resolve({ success: true, assignments: [] }),
      isFamily && familyUid
        ? appointmentsService.getAppointmentsByFamily(familyUid)
        : isAdmin
          ? appointmentsService.getAppointmentsByDateRange(monthStart, monthEnd)
        : Promise.resolve({ success: true, appointments: [] })
    ]);

    const schoolEvents = eventsResult.success ? eventsResult.events : [];
    const familySnackEvents = isFamily && familyUid && snacksResult.success
      ? mapConfirmedSnacksToCalendarEvents(snacksResult.assignments, familyUid, year, month)
      : [];
    const familyAppointmentEvents = isFamily && familyUid && appointmentsResult.success
      ? mapAppointmentsToCalendarEvents(appointmentsResult.appointments, year, month)
      : [];
    const adminAppointmentEvents = isAdmin && appointmentsResult.success
      ? mapAppointmentsToCalendarEvents(appointmentsResult.appointments, year, month, { includeFamilyInfo: true })
      : [];

    setEvents([...schoolEvents, ...familySnackEvents, ...familyAppointmentEvents, ...adminAppointmentEvents]);
  }, [familyUid, isAdmin, isFamily, month, year]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const handleCalendarRefresh = () => loadEvents();
    window.addEventListener('events:updated', handleCalendarRefresh);
    window.addEventListener('snacks:updated', handleCalendarRefresh);
    window.addEventListener('appointments:updated', handleCalendarRefresh);
    return () => {
      window.removeEventListener('events:updated', handleCalendarRefresh);
      window.removeEventListener('snacks:updated', handleCalendarRefresh);
      window.removeEventListener('appointments:updated', handleCalendarRefresh);
    };
  }, [loadEvents]);

  const normalizeEventDate = (timestamp) => {
    if (!timestamp) return null;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (
      date.getUTCHours() === 0 &&
      date.getUTCMinutes() === 0 &&
      date.getUTCSeconds() === 0
    ) {
      return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }
    return date;
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const now = new Date();

  const parseEventDateTime = (event) => {
    const eventDate = normalizeEventDate(event.fecha);
    if (!eventDate || Number.isNaN(eventDate.getTime())) return null;

    const eventDateTime = new Date(eventDate);
    const hora = typeof event.hora === 'string' ? event.hora.trim() : '';
    const timeMatch = hora.match(/^(\d{1,2}):(\d{2})$/);

    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        eventDateTime.setHours(hours, minutes, 0, 0);
        return eventDateTime;
      }
    }

    eventDateTime.setHours(23, 59, 59, 999);
    return eventDateTime;
  };

  const isEventPast = (event) => {
    const eventDateTime = parseEventDateTime(event);
    if (!eventDateTime) return false;
    return eventDateTime < now;
  };

  const eventsByDay = useMemo(() => {
    const grouped = new Map();

    events.forEach((event) => {
      const eventDate = normalizeEventDate(event.fecha);
      if (!eventDate) return;
      if (eventDate.getMonth() !== month || eventDate.getFullYear() !== year) return;

      const day = eventDate.getDate();
      if (!grouped.has(day)) {
        grouped.set(day, []);
      }
      grouped.get(day).push(event);
    });

    return grouped;
  }, [events, month, year]);

  const getEventsForDay = (day) => {
    if (!day) return [];
    return eventsByDay.get(day) || [];
  };

  const getDayMarkerType = (day) => {
    if (!day) return null;
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length === 0) return null;

    const hasUpcomingOrCurrent = dayEvents.some(event => !isEventPast(event));
    return hasUpcomingOrCurrent ? 'upcoming' : 'past';
  };

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today.getDate());
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const days = getDaysInMonth();
  const today = new Date();
  const isToday = (day) => (
    day
    && today.getDate() === day
    && today.getMonth() === month
    && today.getFullYear() === year
  );

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];
  const showDayDetails = Boolean(selectedDate && selectedDayEvents.length > 0);
  const selectedDateLabel = selectedDate
    ? new Date(year, month, selectedDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
    : '';

  const closeDayDetails = () => setSelectedDate(null);
  const isSnackEvent = (event) => event?.source === 'snack';
  const isAppointmentEvent = (event) => event?.source === 'appointment';

  return (
    <div className="event-calendar">
      <div className="event-calendar__header">
        <button
          onClick={previousMonth}
          className="event-calendar__nav-btn"
          aria-label="Mes anterior"
        >
          <Icon name="chevron-left" size={16} className="event-calendar__nav-icon" />
        </button>
        <div className="event-calendar__month">
          {monthNames[month]} {year}
        </div>
        <div className="event-calendar__actions">
          <button
            onClick={nextMonth}
            className="event-calendar__nav-btn"
            aria-label="Siguiente mes"
          >
            <Icon name="chevron-right" size={16} className="event-calendar__nav-icon" />
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
          const dayMarkerType = getDayMarkerType(day);
          return (
            <div
              key={index}
              className={`event-calendar__day ${
                day ? 'event-calendar__day--active' : 'event-calendar__day--empty'
              } ${dayMarkerType ? 'event-calendar__day--has-event' : ''} ${
                dayMarkerType === 'upcoming' ? 'event-calendar__day--has-upcoming-event' : ''
              } ${dayMarkerType === 'past' ? 'event-calendar__day--has-past-event' : ''} ${
                selectedDate === day ? 'event-calendar__day--selected' : ''
              } ${isToday(day) ? 'event-calendar__day--today' : ''}`}
              onClick={() => day && setSelectedDate(selectedDate === day ? null : day)}
            >
              {day}
            </div>
          );
        })}
      </div>

      {showDayDetails && (
        <div className="event-calendar__popover" role="dialog" aria-label={`Eventos del ${selectedDateLabel}`}>
          <div className="event-calendar__details-header">
            <div className="event-calendar__details-title">Eventos del {selectedDateLabel}</div>
            <button
              type="button"
              className="event-calendar__details-close"
              onClick={closeDayDetails}
              aria-label="Cerrar eventos del día"
            >
              ×
            </button>
          </div>
          <div className="event-calendar__details-list">
            {selectedDayEvents.map((event, index) => {
              const isPast = isEventPast(event);
              return (
                <div
                  key={event.id || `event-${index}`}
                  className={`event-calendar__event-item ${isPast ? 'event-calendar__event-item--past' : ''}`}
                >
                  <div className="event-calendar__event-title">
                    {event.hora ? `${event.hora} - ${event.titulo}` : event.titulo}
                  </div>
                  {isSnackEvent(event) && (
                    <span className="event-calendar__event-badge event-calendar__event-badge--snack">
                      Snack confirmado
                    </span>
                  )}
                  {isAppointmentEvent(event) && (
                    <span className="event-calendar__event-badge event-calendar__event-badge--appointment">
                      Reunión
                    </span>
                  )}
                  {!isSnackEvent(event) && !isAppointmentEvent(event) && isPast && (
                    <span className="event-calendar__event-badge event-calendar__event-badge--past">
                      Evento pasado
                    </span>
                  )}
                  {event.descripcion && (
                    <div className="event-calendar__event-desc">
                      {event.descripcion}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showDayDetails && (
        <>
          <button
            type="button"
            className="event-calendar__sheet-backdrop"
            aria-label="Cerrar detalle de eventos"
            onClick={closeDayDetails}
          />
          <div className="event-calendar__sheet" role="dialog" aria-modal="true" aria-label={`Eventos del ${selectedDateLabel}`}>
            <div className="event-calendar__sheet-handle" />
            <div className="event-calendar__details-header">
              <div className="event-calendar__details-title">Eventos del {selectedDateLabel}</div>
              <button
                type="button"
                className="event-calendar__details-close"
                onClick={closeDayDetails}
                aria-label="Cerrar eventos del día"
              >
                ×
              </button>
            </div>
            <div className="event-calendar__details-list">
              {selectedDayEvents.map((event, index) => {
                const isPast = isEventPast(event);
                return (
                  <div
                    key={`sheet-${event.id || index}`}
                    className={`event-calendar__event-item ${isPast ? 'event-calendar__event-item--past' : ''}`}
                  >
                    <div className="event-calendar__event-title">
                      {event.hora ? `${event.hora} - ${event.titulo}` : event.titulo}
                    </div>
                    {isSnackEvent(event) && (
                      <span className="event-calendar__event-badge event-calendar__event-badge--snack">
                        Snack confirmado
                      </span>
                    )}
                    {isAppointmentEvent(event) && (
                      <span className="event-calendar__event-badge event-calendar__event-badge--appointment">
                        Reunión
                      </span>
                    )}
                    {!isSnackEvent(event) && !isAppointmentEvent(event) && isPast && (
                      <span className="event-calendar__event-badge event-calendar__event-badge--past">
                        Evento pasado
                      </span>
                    )}
                    {event.descripcion && (
                      <div className="event-calendar__event-desc">
                        {event.descripcion}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
