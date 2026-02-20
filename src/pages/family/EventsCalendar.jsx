import { useState, useEffect, useMemo, useCallback } from 'react';
import { eventsService } from '../../services/events.service';
import { childrenService } from '../../services/children.service';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../../components/ui/Icon';
import { EventDetailModal } from '../../components/common/EventDetailModal';
import './EventsCalendar.css';

export function EventsCalendar() {
  const { user, isFamily } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [familyAmbientes, setFamilyAmbientes] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetail, setShowEventDetail] = useState(false);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const headerTitle = isFamily ? 'Eventos' : 'Calendario de Eventos';
  const headerSubtitle = isFamily
    ? 'Actividades y fechas importantes de la escuela'
    : 'Calendario institucional de actividades y fechas importantes';

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const result = await eventsService.getEventsByMonth(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth()
    );
    if (result.success) {
      setEvents(result.events || []);
    } else {
      setEvents([]);
    }
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const loadFamilyAmbientes = async () => {
      if (!isFamily || !user?.uid) return;
      const result = await childrenService.getChildrenByResponsable(user.uid);
      if (result.success) {
        const ambientes = Array.from(new Set(
          (result.children || []).map(child => child.ambiente).filter(Boolean)
        ));
        setFamilyAmbientes(ambientes);
      }
    };
    loadFamilyAmbientes();
  }, [user, isFamily]);

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

  const parseEventDateTime = (event) => {
    const eventDate = normalizeEventDate(event?.fecha);
    if (!eventDate || Number.isNaN(eventDate.getTime())) return null;

    const eventDateTime = new Date(eventDate);
    const hora = typeof event?.hora === 'string' ? event.hora.trim() : '';
    const timeMatch = hora.match(/^(\d{1,2}):(\d{2})$/);

    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        eventDateTime.setHours(hours, minutes, 0, 0);
        return eventDateTime;
      }
    }

    // Sin hora explícita: fin del día.
    eventDateTime.setHours(23, 59, 59, 999);
    return eventDateTime;
  };

  const isPastEvent = (event) => {
    const eventDateTime = parseEventDateTime(event);
    if (!eventDateTime) return false;
    return eventDateTime < new Date();
  };

  const getDaysInMonth = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
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

  const handleMonthChange = (delta) => {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
  };

  const handleCloseDetail = () => {
    setShowEventDetail(false);
    setSelectedEvent(null);
  };

  const getEventTypeLabel = (tipo) => {
    const labels = {
      general: 'General',
      reuniones: 'Reuniones',
      talleres: 'Talleres',
      snacks: 'Snacks'
    };
    return labels[tipo] || tipo;
  };

  const getEventTypeBadge = (tipo) => {
    const badges = {
      general: 'badge--info',
      reuniones: 'badge--warning',
      talleres: 'badge--success',
      snacks: 'badge--primary'
    };
    return badges[tipo] || 'badge--neutral';
  };

  const selectedMonthYear = selectedMonth.getFullYear();
  const selectedMonthIndex = selectedMonth.getMonth();

  const visibleEvents = useMemo(() => (
    events.filter(event => {
      if (!isFamily) return true;
      if (event.scope !== 'taller') return true;
      if (!familyAmbientes.length) return false;
      if (event.ambiente && familyAmbientes.includes(event.ambiente)) return true;
      return false;
    })
  ), [events, familyAmbientes, isFamily]);

  const eventsForCalendar = useMemo(() => visibleEvents, [visibleEvents]);

  const filteredEvents = useMemo(() => {
    let list = eventsForCalendar;
    if (selectedDay) {
      list = list.filter(event => {
        const eventDate = normalizeEventDate(event.fecha);
        return eventDate && eventDate.getDate() === selectedDay;
      });
    }
    return [...list].sort((a, b) => {
      const pastA = isPastEvent(a);
      const pastB = isPastEvent(b);
      if (pastA !== pastB) return pastA ? 1 : -1;

      const dateA = parseEventDateTime(a);
      const dateB = parseEventDateTime(b);
      if (!dateA || !dateB) return 0;

      // Próximos en orden ascendente, pasados del más reciente al más lejano.
      return pastA ? dateB - dateA : dateA - dateB;
    });
  }, [eventsForCalendar, selectedDay]);

  const upcomingEventsPreview = useMemo(() => {
    return filteredEvents.filter(event => !isPastEvent(event)).slice(0, 2);
  }, [filteredEvents]);

  const upcomingEventsSummary = useMemo(() => {
    if (upcomingEventsPreview.length === 0) {
      return 'Próximos eventos: sin eventos próximos en este rango.';
    }

    if (upcomingEventsPreview.length === 1) {
      return `Próximo evento: ${upcomingEventsPreview[0].titulo}`;
    }

    return `Próximos eventos: ${upcomingEventsPreview.map(event => event.titulo).join(' / ')}`;
  }, [upcomingEventsPreview]);

  const [daysWithEvents, daysWithUpcomingEvents, daysWithPastEvents] = useMemo(() => {
    const allDays = new Set();
    const upcomingDays = new Set();
    const pastDays = new Set();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    eventsForCalendar.forEach(event => {
      const eventDate = normalizeEventDate(event.fecha);
      if (!eventDate) return;

      const eventDay = eventDate.getDate();
      const eventDateStart = new Date(eventDate);
      eventDateStart.setHours(0, 0, 0, 0);

      allDays.add(eventDay);
      if (eventDateStart < todayStart) {
        pastDays.add(eventDay);
      } else {
        upcomingDays.add(eventDay);
      }
    });

    return [allDays, upcomingDays, pastDays];
  }, [eventsForCalendar]);

  const days = useMemo(() => getDaysInMonth(), [selectedMonth]);
  const today = new Date();
  const isToday = (day) => {
    return (
      day &&
      today.getDate() === day &&
      today.getMonth() === selectedMonthIndex &&
      today.getFullYear() === selectedMonthYear
    );
  };

  return (
    <div className="container page-container events-calendar-page">
      <div className="dashboard-header dashboard-header--compact communications-header">
        <div>
          <h1 className="dashboard-title">{headerTitle}</h1>
          <p className="dashboard-subtitle">{headerSubtitle}</p>
        </div>
        <div className="communications-summary">
          <span className="badge badge--info">
            {visibleEvents.length} {visibleEvents.length === 1 ? 'evento' : 'eventos'}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Cargando eventos...</p>
        </div>
      ) : (
        <div className="events-manager-layout">
            {/* Panel del calendario */}
            <div className="card events-calendar-panel">
              <div className="card__header">
                <div>
                  <h3 className="card__title">Calendario</h3>
                  <p className="card__subtitle">
                    {monthNames[selectedMonthIndex]} {selectedMonthYear}
                  </p>
                </div>
                <span className="badge badge--info">{visibleEvents.length} este mes</span>
              </div>
              <div className="card__body">
                <div className="event-calendar">
                  <div className="event-calendar__header">
                    <button
                      onClick={() => handleMonthChange(-1)}
                      className="event-calendar__nav-btn"
                      aria-label="Mes anterior"
                    >
                      <Icon name="chevron-left" size={16} />
                    </button>
                    <div className="event-calendar__month">
                      {monthNames[selectedMonthIndex]} {selectedMonthYear}
                    </div>
                    <div className="event-calendar__actions">
                      <button
                        onClick={() => handleMonthChange(1)}
                        className="event-calendar__nav-btn"
                        aria-label="Siguiente mes"
                      >
                        <Icon name="chevron-right" size={16} />
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
                      const hasEvent = day && daysWithEvents.has(day);
                      const hasUpcomingEvent = day && daysWithUpcomingEvents.has(day);
                      const hasPastEvent = day && daysWithPastEvents.has(day);

                      return (
                        <div
                          key={index}
                          className={`event-calendar__day ${
                            day ? 'event-calendar__day--active' : 'event-calendar__day--empty'
                          } ${hasEvent ? 'event-calendar__day--has-event' : ''} ${
                            hasUpcomingEvent ? 'event-calendar__day--has-upcoming-event' : ''
                          } ${hasPastEvent ? 'event-calendar__day--has-past-event' : ''} ${
                            selectedDay === day ? 'event-calendar__day--selected' : ''
                          } ${isToday(day) ? 'event-calendar__day--today' : ''}`}
                          onClick={() => day && setSelectedDay(selectedDay === day ? null : day)}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selectedDay && (
                  <button
                    className="btn btn--sm btn--outline events-calendar-clear"
                    onClick={() => setSelectedDay(null)}
                  >
                    Ver todo el mes
                  </button>
                )}
              </div>
            </div>

            {/* Panel de lista de eventos */}
            <div className="events-list-panel">
              {events.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state__text">No hay eventos para este mes</p>
                </div>
              ) : (
                <>
                  <div className="events-list-header">
                    <div>
                      <h3 className="events-list-title">
                        {selectedDay
                          ? `Eventos del ${selectedDay} de ${monthNames[selectedMonthIndex].toLowerCase()}`
                          : `Eventos de ${monthNames[selectedMonthIndex].toLowerCase()}`}
                      </h3>
                      <p className="events-list-subtitle">
                        {filteredEvents.length} {filteredEvents.length === 1 ? 'evento' : 'eventos'}
                      </p>
                      <p className="events-list-next">{upcomingEventsSummary}</p>
                    </div>
                  </div>

                  {filteredEvents.length === 0 ? (
                    <div className="empty-state empty-state--compact">
                      <Icon name="calendar" size={32} className="empty-state__icon" />
                      <p>No hay eventos para mostrar</p>
                    </div>
                  ) : (
                    <div className="events-list">
                      {filteredEvents.map(event => {
                        const pastEvent = isPastEvent(event);
                        return (
                        <div
                          key={event.id}
                          className={`event-item event-item--clickable ${pastEvent ? 'event-item--past' : ''}`}
                          data-tipo={event.tipo}
                          onClick={() => handleEventClick(event)}
                        >
                          <div className="event-item__date">
                            <span className="event-item__day">
                              {normalizeEventDate(event.fecha)?.getDate()}
                            </span>
                            <span className="event-item__month">
                              {monthNames[normalizeEventDate(event.fecha)?.getMonth()]?.slice(0, 3)}
                            </span>
                          </div>
                          <div className="event-item__content">
                            <div className="event-item__header">
                              <h4 className="event-item__title">{event.titulo}</h4>
                              {pastEvent && (
                                <span className="badge badge--sm event-item__past-badge">
                                  Evento pasado
                                </span>
                              )}
                              <span className={`badge badge--sm ${getEventTypeBadge(event.tipo)}`}>
                                {getEventTypeLabel(event.tipo)}
                              </span>
                            </div>
                            {event.hora && (
                              <div className="event-item__time">
                                <Icon name="clock" size={12} />
                                <span>{event.hora}</span>
                              </div>
                            )}
                            {event.media && event.media.length > 0 && (
                              <div className="event-item__indicator">
                                <Icon name="paperclip" size={14} />
                                <span>{event.media.length} {event.media.length === 1 ? 'adjunto' : 'adjuntos'}</span>
                              </div>
                            )}
                          </div>
                          <Icon name="chevron-right" size={16} className="event-item__arrow" />
                        </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
      )}

      <EventDetailModal
        event={selectedEvent}
        isOpen={showEventDetail}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
