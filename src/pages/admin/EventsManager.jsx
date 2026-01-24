import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventsService } from '../../services/events.service';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/common/Modal';
import { AlertDialog } from '../../components/common/AlertDialog';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ROUTES } from '../../config/constants';
import Icon from '../../components/ui/Icon';

export function EventsManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fecha: '',
    hora: '',
    tipo: 'general' // general, reuniones, talleres, snacks
  });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const result = await eventsService.getAllEvents();
    if (result.success) {
      setEvents(result.events);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();
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

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

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

  const toDateInputValue = (date) => {
    if (!date) return '';
    const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return adjusted.toISOString().split('T')[0];
  };

  const handleOpenModal = (event = null) => {
    if (event) {
      const eventDate = normalizeEventDate(event.fecha);
      setEditingEvent(event);
      setFormData({
        titulo: event.titulo || '',
        descripcion: event.descripcion || '',
        fecha: eventDate ? toDateInputValue(eventDate) : '',
        hora: event.hora || '',
        tipo: event.tipo || 'general'
      });
    } else {
      setEditingEvent(null);
      setFormData({
        titulo: '',
        descripcion: '',
        fecha: '',
        hora: '',
        tipo: 'general'
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setFormData({
      titulo: '',
      descripcion: '',
      fecha: '',
      hora: '',
      tipo: 'general'
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.titulo.trim() || !formData.fecha) {
      setAlertDialog({
        isOpen: true,
        title: 'Campos incompletos',
        message: 'El título y la fecha son obligatorios.',
        type: 'warning'
      });
      return;
    }

    const eventData = {
      titulo: formData.titulo.trim(),
      descripcion: formData.descripcion.trim(),
      fecha: formData.fecha,
      hora: formData.hora.trim(),
      tipo: formData.tipo
    };

    let result;
    if (editingEvent) {
      result = await eventsService.updateEvent(editingEvent.id, eventData);
    } else {
      result = await eventsService.createEvent(eventData);
    }

    if (result.success) {
      setAlertDialog({
        isOpen: true,
        title: 'Listo',
        message: editingEvent ? 'Evento actualizado correctamente.' : 'Evento creado correctamente.',
        type: 'success'
      });
      handleCloseModal();
      loadEvents();
    } else {
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: `Error: ${result.error}`,
        type: 'error'
      });
    }
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;

    const result = await eventsService.deleteEvent(eventToDelete.id);
    if (result.success) {
      setAlertDialog({
        isOpen: true,
        title: 'Listo',
        message: 'Evento eliminado correctamente.',
        type: 'success'
      });
      setShowDeleteConfirm(false);
      setEventToDelete(null);
      loadEvents();
    } else {
      setAlertDialog({
        isOpen: true,
        title: 'Error',
        message: `Error: ${result.error}`,
        type: 'error'
      });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = normalizeEventDate(timestamp);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  const getTipoLabel = (tipo) => {
    const labels = {
      general: 'General',
      reuniones: 'Reuniones',
      talleres: 'Talleres',
      snacks: 'Snacks'
    };
    return labels[tipo] || tipo;
  };

  const getEventMeta = (event) => {
    const parts = [formatDate(event.fecha)];
    if (event.hora) parts.push(event.hora);
    parts.push(getTipoLabel(event.tipo));
    return parts.join(' • ');
  };

  const selectedMonthYear = selectedMonth.getFullYear();
  const selectedMonthIndex = selectedMonth.getMonth();

  const eventsForMonth = useMemo(() => {
    return events.filter(event => {
      const eventDate = normalizeEventDate(event.fecha);
      return (
        eventDate &&
        eventDate.getFullYear() === selectedMonthYear &&
        eventDate.getMonth() === selectedMonthIndex
      );
    });
  }, [events, selectedMonthIndex, selectedMonthYear]);

  const eventsForCalendar = useMemo(() => {
    let list = eventsForMonth;
    if (typeFilter !== 'all') {
      list = list.filter(event => event.tipo === typeFilter);
    }
    if (timeFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      list = list.filter(event => {
        const eventDate = normalizeEventDate(event.fecha);
        if (!eventDate) return false;
        if (timeFilter === 'upcoming') return eventDate >= today;
        return eventDate < today;
      });
    }
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      list = list.filter(event => {
        const title = (event.titulo || '').toLowerCase();
        const desc = (event.descripcion || '').toLowerCase();
        return title.includes(term) || desc.includes(term);
      });
    }
    return list;
  }, [eventsForMonth, normalizeEventDate, searchTerm, timeFilter, typeFilter]);

  const filteredEvents = useMemo(() => {
    if (!selectedDay) return eventsForCalendar;
    return eventsForCalendar.filter(event => {
      const eventDate = normalizeEventDate(event.fecha);
      return eventDate && eventDate.getDate() === selectedDay;
    });
  }, [eventsForCalendar, selectedDay]);

  const groupedEvents = useMemo(() => {
    const sorted = [...filteredEvents].sort((a, b) => {
      const dateA = normalizeEventDate(a.fecha) || new Date(0);
      const dateB = normalizeEventDate(b.fecha) || new Date(0);
      const timeA = a.hora || '99:99';
      const timeB = b.hora || '99:99';
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      return timeA.localeCompare(timeB);
    });

    const groups = new Map();
    sorted.forEach(event => {
      const eventDate = normalizeEventDate(event.fecha);
      const key = eventDate ? eventDate.toISOString().split('T')[0] : 'sin-fecha';
      if (!groups.has(key)) {
        groups.set(key, { date: eventDate, events: [] });
      }
      groups.get(key).events.push(event);
    });

    return Array.from(groups.values());
  }, [filteredEvents]);

  const daysWithEvents = useMemo(() => {
    const set = new Set();
    eventsForCalendar.forEach(event => {
      const eventDate = normalizeEventDate(event.fecha);
      if (eventDate) set.add(eventDate.getDate());
    });
    return set;
  }, [eventsForCalendar]);

  const formatDayHeading = (date) => {
    if (!date) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'long'
    }).format(date);
  };

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
  const hasFilters = searchTerm.trim() || typeFilter !== 'all' || timeFilter !== 'all';

  return (
    <div className="container page-container events-manager-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Gestión de Eventos</h1>
          <p className="dashboard-subtitle">Administra el calendario de eventos institucionales</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button onClick={() => handleOpenModal()} className="btn btn--primary">
            Crear Evento
          </button>
          <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline">
            Volver
          </Link>
        </div>
      </div>

      <div className="dashboard-content">
        {loading ? (
          <p>Cargando eventos...</p>
        ) : (
          <div className="events-manager-layout">
            <div className="card events-calendar-panel">
              <div className="card__header">
                <div>
                  <h3 className="card__title">Calendario</h3>
                  <p className="card__subtitle">
                    {monthNames[selectedMonthIndex]} {selectedMonthYear}
                  </p>
                </div>
                <span className="badge badge--info">{eventsForMonth.length} este mes</span>
              </div>
              <div className="card__body">
                <div className="event-calendar events-calendar--manager">
                  <div className="event-calendar__header">
                    <button
                      onClick={() => handleMonthChange(-1)}
                      className="event-calendar__nav-btn"
                      aria-label="Mes anterior"
                    >
                      <Icon name="chevron-left" size={16} className="event-calendar__nav-icon" />
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

            <div className="events-list-panel">
              {eventsForMonth.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state__text">No hay eventos para este mes</p>
                  <button onClick={() => handleOpenModal()} className="btn btn--primary">
                    Crear Primer Evento
                  </button>
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
                      <label className="form-label" htmlFor="events-search">
                        Buscar
                      </label>
                      <input
                        id="events-search"
                        type="text"
                        className="form-input form-input--sm"
                        placeholder="Buscar por título o descripción"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div className="events-filter-field">
                      <label className="form-label" htmlFor="events-type-filter">
                        Tipo
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

                    <div className="events-filter-field">
                      <label className="form-label" htmlFor="events-time-filter">
                        Estado
                      </label>
                      <select
                        id="events-time-filter"
                        className="form-select form-input--sm"
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                      >
                        <option value="all">Todos</option>
                        <option value="upcoming">Próximos</option>
                        <option value="past">Pasados</option>
                      </select>
                    </div>

                    {hasFilters && (
                      <button
                        type="button"
                        className="btn btn--sm btn--outline events-filter-clear"
                        onClick={() => {
                          setSearchTerm('');
                          setTypeFilter('all');
                          setTimeFilter('all');
                        }}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>

                  <div className="events-list">
                    {groupedEvents.length === 0 ? (
                      <div className="empty-state">
                        <p className="empty-state__text">No hay eventos con esos filtros</p>
                      </div>
                    ) : (
                      groupedEvents.map(group => (
                        <div
                          key={group.date ? group.date.toISOString().split('T')[0] : 'sin-fecha'}
                          className="events-day-group"
                        >
                          <div className="events-day-heading">{formatDayHeading(group.date)}</div>
                          <div className="events-day-items">
                          {group.events.map(event => (
                            <div key={event.id} className="card card--compact">
                              <div className="card__header card__header--compact">
                                <div>
                                  <h3 className="card__title">{event.titulo}</h3>
                                  <p className="card__subtitle">
                                    {getEventMeta(event)}
                                  </p>
                                </div>
                                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                    <button
                                      onClick={() => handleOpenModal(event)}
                                      className="btn btn--sm btn--outline"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEventToDelete(event);
                                        setShowDeleteConfirm(true);
                                      }}
                                      className="btn btn--sm btn--outline btn--danger-outline"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                                {event.descripcion && (
                                  <div className="card__body">
                                    <p>{event.descripcion}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar Evento */}
      <Modal isOpen={showModal} onClose={handleCloseModal} size="md">
        <ModalHeader
          title={editingEvent ? 'Editar Evento' : 'Crear Nuevo Evento'}
          onClose={handleCloseModal}
        />
        <form onSubmit={handleSubmit} className="events-modal-compact">
          <ModalBody>
            {editingEvent && (
              <div className="events-modal-summary">
                {getEventMeta(editingEvent)}
              </div>
            )}
            <div className="form-group">
              <label htmlFor="titulo" className="form-label">
                Título del Evento *
              </label>
              <input
                type="text"
                id="titulo"
                name="titulo"
                value={formData.titulo}
                onChange={handleChange}
                className="form-input form-input--sm"
                required
                placeholder="Ej: Reunión de padres"
              />
            </div>

            <div className="events-form-row">
              <div className="form-group">
                <label htmlFor="fecha" className="form-label">
                  Fecha *
                </label>
                <input
                  type="date"
                  id="fecha"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  className="form-input form-input--sm"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="hora" className="form-label">
                  Hora (opcional)
                </label>
                <input
                  type="time"
                  id="hora"
                  name="hora"
                  value={formData.hora}
                  onChange={handleChange}
                  className="form-input form-input--sm"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="tipo" className="form-label">
                Tipo de Evento
              </label>
              <select
                id="tipo"
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                className="form-select form-input--sm"
              >
                <option value="general">General</option>
                <option value="reuniones">Reuniones</option>
                <option value="talleres">Talleres</option>
                <option value="snacks">Snacks</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="descripcion" className="form-label">
                Descripción (opcional)
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className="form-textarea form-input--sm events-form-textarea"
                rows="3"
                placeholder="Descripción del evento..."
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <button type="button" onClick={handleCloseModal} className="btn btn--outline">
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary">
              {editingEvent ? 'Actualizar' : 'Crear'} Evento
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setEventToDelete(null);
        }}
        onConfirm={handleDelete}
        title="Eliminar Evento"
        message={`¿Estás seguro de que deseas eliminar el evento "${eventToDelete?.titulo}"?`}
        confirmText="Eliminar"
        type="danger"
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
        title={alertDialog.title}
        message={alertDialog.message}
        type={alertDialog.type}
      />
    </div>
  );
}

