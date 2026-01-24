import { useState, useEffect, useCallback } from 'react';
import { eventsService } from '../../services/events.service';
import Icon from '../ui/Icon';

/**
 * EventCalendar - Calendario mensual compacto para el sidebar
 * Muestra eventos del mes actual con indicadores visuales
 */
export function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const loadEvents = useCallback(async () => {
    const result = await eventsService.getEventsByMonth(year, month);
    if (result.success) {
      setEvents(result.events);
    }
  }, [month, year]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const handleEventsUpdated = () => loadEvents();
    window.addEventListener('events:updated', handleEventsUpdated);
    return () => window.removeEventListener('events:updated', handleEventsUpdated);
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

  // Generar días del mes
  const getDaysInMonth = () => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days = [];

    // Días vacíos al inicio
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  // Verificar si un día tiene eventos
  const hasEvent = (day) => {
    if (!day) return false;
    return events.some(event => {
      const eventDate = normalizeEventDate(event.fecha);
      return (
        eventDate &&
        eventDate.getDate() === day &&
        eventDate.getMonth() === month &&
        eventDate.getFullYear() === year
      );
    });
  };

  // Obtener eventos de un día específico
  const getEventsForDay = (day) => {
    if (!day) return [];
    return events.filter(event => {
      const eventDate = normalizeEventDate(event.fecha);
      return (
        eventDate &&
        eventDate.getDate() === day &&
        eventDate.getMonth() === month &&
        eventDate.getFullYear() === year
      );
    });
  };

  // Navegar entre meses
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
  const isToday = (day) => {
    return (
      day &&
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };
  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="event-calendar">
      {/* Header */}
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

      {/* Day names */}
      <div className="event-calendar__weekdays">
        {dayNames.map((name, i) => (
          <div key={i} className="event-calendar__weekday">
            {name}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="event-calendar__days">
        {days.map((day, index) => (
          <div
            key={index}
            className={`event-calendar__day ${
              day ? 'event-calendar__day--active' : 'event-calendar__day--empty'
            } ${hasEvent(day) ? 'event-calendar__day--has-event' : ''} ${
              selectedDate === day ? 'event-calendar__day--selected' : ''
            } ${isToday(day) ? 'event-calendar__day--today' : ''}`}
            onClick={() => day && setSelectedDate(selectedDate === day ? null : day)}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Selected day events */}
      {selectedDate && selectedDayEvents.length > 0 && (
        <div className="event-calendar__events">
          <div className="event-calendar__events-title">
            Eventos del {selectedDate}
          </div>
          {selectedDayEvents.map(event => (
            <div key={event.id} className="event-calendar__event-item">
              <div className="event-calendar__event-title">
                {event.hora ? `${event.hora} · ${event.titulo}` : event.titulo}
              </div>
              {event.descripcion && (
                <div className="event-calendar__event-desc">
                  {event.descripcion}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



