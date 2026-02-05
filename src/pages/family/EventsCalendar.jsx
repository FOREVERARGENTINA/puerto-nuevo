import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventsService } from '../../services/events.service';
import { childrenService } from '../../services/children.service';
import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../config/constants';
import Icon from '../../components/ui/Icon';
import { EventDetailModal } from '../../components/common/EventDetailModal';

export function EventsCalendar() {
  const { user, isFamily } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [familyAmbientes, setFamilyAmbientes] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventDetail, setShowEventDetail] = useState(false);

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

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

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = normalizeEventDate(timestamp);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'long'
    }).format(date);
  };

  const selectedMonthYear = selectedMonth.getFullYear();
  const selectedMonthIndex = selectedMonth.getMonth();

  const isEventVisibleForFamily = (event) => {
    if (!isFamily) return true;
    if (event.scope !== 'taller') return true;
    if (!familyAmbientes.length) return false;
    if (event.ambiente && familyAmbientes.includes(event.ambiente)) return true;
    return false;
  };

  const visibleEvents = useMemo(() => (
    events.filter(isEventVisibleForFamily)
  ), [events, familyAmbientes]);

  const filteredEvents = useMemo(() => {
    let list = visibleEvents;
    if (typeFilter !== 'all') {
      list = list.filter(event => event.tipo === typeFilter);
    }
    if (selectedDay) {
      list = list.filter(event => {
        const eventDate = normalizeEventDate(event.fecha);
        return eventDate && eventDate.getDate() === selectedDay;
      });
    }
    return list.sort((a, b) => {
      const dateA = normalizeEventDate(a.fecha);
      const dateB = normalizeEventDate(b.fecha);
      return dateA - dateB;
    });
  }, [visibleEvents, typeFilter, selectedDay]);

  const daysWithEvents = useMemo(() => {
    const set = new Set();
    visibleEvents.forEach(event => {
      const eventDate = normalizeEventDate(event.fecha);
      if (eventDate) set.add(eventDate.getDate());
    });
    return set;
  }, [visibleEvents]);

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
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Calendario de Eventos</h1>
          <p className="dashboard-subtitle">Actividades y fechas importantes de la escuela</p>
        </div>
        <Link to={ROUTES.FAMILY_DASHBOARD} className="btn btn--outline">
          Volver
        </Link>
      </div>

      <div className="dashboard-content">
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
                    {days.map((day, index) => (
                      <div
                        key={index}
                        className={`event-calendar__day ${
                          day ? 'event-calendar__day--active' : 'event-calendar__day--empty'
                        } ${day && daysWithEvents.has(day) ? 'event-calendar__day--has-event' : ''} ${
                          selectedDay === day ? 'event-calendar__day--selected' : ''
                        } ${isToday(day) ? 'event-calendar__day--today' : ''}`}
                        onClick={() => day && setSelectedDay(selectedDay === day ? null : day)}
                      >
                        {day}
                      </div>
                    ))}
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
                    </div>
                  </div>

                  <div className="events-filters">
                    <div className="events-filter-field">
                      <label className="form-label" htmlFor="events-type-filter">
                        Tipo de evento
                      </label>
                      <select
                        id="events-type-filter"
                        className="form-select form-input--sm"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <option value="all">Todos</option>
                        <option value="general">General</option>
                        <option value="reuniones">Reuniones</option>
                        <option value="talleres">Talleres</option>
                        <option value="snacks">Snacks</option>
                      </select>
                    </div>
                  </div>

                  {filteredEvents.length === 0 ? (
                    <div className="empty-state empty-state--compact">
                      <Icon name="calendar" size={32} className="empty-state__icon" />
                      <p>No hay eventos que coincidan con los filtros</p>
                    </div>
                  ) : (
                    <div className="events-list">
                      {filteredEvents.map(event => (
                        <div 
                          key={event.id} 
                          className="event-item event-item--clickable"
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
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <EventDetailModal
        event={selectedEvent}
        isOpen={showEventDetail}
        onClose={handleCloseDetail}
      />
    </div>
  );
}
