import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { eventsService } from '../../services/events.service';
import { communicationsService } from '../../services/communications.service';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/common/Modal';
import { AlertDialog } from '../../components/common/AlertDialog';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { EventDetailModal } from '../../components/common/EventDetailModal';
import { FileSelectionList, FileUploadSelector } from '../../components/common/FileUploadSelector';
import { ROUTES } from '../../config/constants';
import Icon from '../../components/ui/Icon';
import './EventsManager.css';

export function EventsManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleEventsCount, setVisibleEventsCount] = useState(20);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [commAttachments, setCommAttachments] = useState([]);
  const [commLoading, setCommLoading] = useState(false);
  const [commError, setCommError] = useState('');
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
    tipo: 'general' // general, reuniones, talleres, muestra, acto
  });
  const [selectedMediaFiles, setSelectedMediaFiles] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEventForView, setSelectedEventForView] = useState(null);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const maxMediaSizeBytes = 50 * 1024 * 1024;
  const maxMediaSizeLabel = '50MB';
  const allowedMediaExtensions = new Set([
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
    'mp4', 'mov', 'webm', 'ogv',
    'mp3', 'wav', 'm4a', 'ogg',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'txt', 'csv'
  ]);
  const blockedMediaExtensions = new Set(['zip', 'exe', 'bat']);
  const allowedMediaMimePrefixes = ['image/', 'video/', 'audio/'];
  const allowedMediaMimeTypes = new Set([
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/heic',
    'image/heif',
    'image/heic-sequence',
    'image/heif-sequence'
  ]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const result = await eventsService.getEventsByMonth(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth()
    );
    if (result.success) {
      setEvents(result.events);
    }
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    let active = true;

    const loadCommunicationAttachments = async () => {
      if (!showModal || !editingEvent?.communicationId) {
        setCommAttachments([]);
        setCommError('');
        setCommLoading(false);
        return;
      }

      setCommLoading(true);
      setCommError('');

      const result = await communicationsService.getCommunicationById(
        editingEvent.communicationId
      );

      if (!active) return;

      if (result.success) {
        const attachments = Array.isArray(result.communication?.attachments)
          ? result.communication.attachments
          : [];
        setCommAttachments(attachments);
      } else {
        setCommAttachments([]);
        setCommError(result.error || 'Adjuntos no disponibles');
      }
      setCommLoading(false);
    };

    loadCommunicationAttachments();

    return () => {
      active = false;
    };
  }, [editingEvent?.communicationId, showModal]);

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

    const dateTime = new Date(eventDate);
    const hora = typeof event?.hora === 'string' ? event.hora.trim() : '';
    const timeMatch = hora.match(/^(\d{1,2}):(\d{2})$/);

    if (timeMatch) {
      const hours = Number(timeMatch[1]);
      const minutes = Number(timeMatch[2]);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        dateTime.setHours(hours, minutes, 0, 0);
        return dateTime;
      }
    }

    // Sin hora explicita: se considera al final del dia.
    dateTime.setHours(23, 59, 59, 999);
    return dateTime;
  };

  const isPastEvent = (event, referenceDate = new Date()) => {
    const eventDateTime = parseEventDateTime(event);
    if (!eventDateTime) return false;
    return eventDateTime < referenceDate;
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
      setExistingMedia(Array.isArray(event.media) ? event.media : []);
    } else {
      setEditingEvent(null);
      setFormData({
        titulo: '',
        descripcion: '',
        fecha: '',
        hora: '',
        tipo: 'general'
      });
      setExistingMedia([]);
    }
    setSelectedMediaFiles([]);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (saving || uploadingMedia) return;
    setShowModal(false);
    setEditingEvent(null);
    setFormData({
      titulo: '',
      descripcion: '',
      fecha: '',
      hora: '',
      tipo: 'general'
    });
    setSelectedMediaFiles([]);
    setExistingMedia([]);
    setCommAttachments([]);
    setCommError('');
  };

  const handleViewEvent = (event) => {
    setSelectedEventForView(event);
    setShowEventDetail(true);
  };

  const handleCloseEventDetail = () => {
    setShowEventDetail(false);
    setSelectedEventForView(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMediaFilesChange = (selectedFiles) => {
    const files = Array.isArray(selectedFiles) ? selectedFiles : [];
    if (files.length === 0) return;

    const validFiles = [];
    let hasInvalidType = false;
    let hasBlockedType = false;
    let hasOversize = false;

    files.forEach((file) => {
      const name = (file.name || '').toLowerCase();
      const ext = name.includes('.') ? name.split('.').pop() : '';
      const type = (file.type || '').toLowerCase();
      const isBlocked = ext && blockedMediaExtensions.has(ext);
      const isAllowedExt = ext && allowedMediaExtensions.has(ext);
      const isAllowedMime = type
        ? (allowedMediaMimePrefixes.some(prefix => type.startsWith(prefix)) || allowedMediaMimeTypes.has(type))
        : false;

      if (isBlocked) {
        hasBlockedType = true;
        return;
      }
      if (!isAllowedExt && !isAllowedMime) {
        hasInvalidType = true;
        return;
      }
      if (file.size > maxMediaSizeBytes) {
        hasOversize = true;
        return;
      }
      validFiles.push(file);
    });

    if (hasInvalidType || hasOversize || hasBlockedType) {
      let message = '';
      if (hasInvalidType || hasBlockedType) {
        message = 'Solo se permiten imágenes, videos, audio, documentos o texto. Bloqueados: .zip, .exe, .bat.';
      }
      if (hasOversize) {
        message = `${message ? `${message} ` : ''}Algunos archivos superan el límite de ${maxMediaSizeLabel}.`;
      }
      setAlertDialog({
        isOpen: true,
        title: 'Archivo no valido',
        message,
        type: 'warning'
      });
    }

    if (validFiles.length > 0) {
      setSelectedMediaFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeSelectedMediaFile = (index) => {
    setSelectedMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (size = 0) => {
    if (!size) return '';
    const kb = size / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getMediaTypeLabel = (type = '') => {
    if (type.startsWith('image/')) return 'imagen';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type === 'application/pdf') return 'documento';
    if (type.includes('wordprocessingml') || type.includes('msword')) return 'documento';
    if (type.includes('spreadsheetml') || type.includes('ms-excel')) return 'documento';
    if (type.includes('presentationml') || type.includes('ms-powerpoint')) return 'documento';
    if (type === 'text/plain') return 'texto';
    if (type === 'text/csv') return 'texto';
    return 'archivo';
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

    setSaving(true);
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
      let mediaResult = { success: true };
      const eventId = editingEvent ? editingEvent.id : result.id;
      if (selectedMediaFiles.length > 0) {
        setUploadingMedia(true);
        mediaResult = await eventsService.uploadEventMedia(
          eventId,
          selectedMediaFiles,
          editingEvent ? existingMedia : []
        );
        setUploadingMedia(false);
      }

      setAlertDialog({
        isOpen: true,
        title: 'Listo',
        message: mediaResult.success
          ? (editingEvent ? 'Evento actualizado correctamente.' : 'Evento creado correctamente.')
          : 'El evento se guardo, pero hubo un error al subir la media.',
        type: mediaResult.success ? 'success' : 'warning'
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
    setSaving(false);
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
      muestra: 'Muestra',
      acto: 'Acto',
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
    return events;
  }, [events]);

  const eventsForCalendar = useMemo(() => {
    let list = eventsForMonth;
    if (typeFilter !== 'all') {
      list = list.filter(event => event.tipo === typeFilter);
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
  }, [eventsForMonth, searchTerm, typeFilter]);

  const filteredEvents = useMemo(() => {
    if (!selectedDay) return eventsForCalendar;
    return eventsForCalendar.filter(event => {
      const eventDate = normalizeEventDate(event.fecha);
      return eventDate && eventDate.getDate() === selectedDay;
    });
  }, [eventsForCalendar, selectedDay]);

  const sortedFilteredEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const pastA = isPastEvent(a);
      const pastB = isPastEvent(b);
      if (pastA !== pastB) return pastA ? 1 : -1;

      const dateA = parseEventDateTime(a);
      const dateB = parseEventDateTime(b);
      if (!dateA || !dateB) return 0;

      // Proximos en ascendente, pasados del mas reciente al mas lejano.
      return pastA ? dateB - dateA : dateA - dateB;
    });
  }, [filteredEvents]);

  const upcomingEventsPreview = useMemo(() => {
    return sortedFilteredEvents.filter(event => !isPastEvent(event)).slice(0, 2);
  }, [sortedFilteredEvents]);

  const upcomingEventsSummary = useMemo(() => {
    if (upcomingEventsPreview.length === 0) {
      return 'Próximos eventos: sin eventos próximos en este rango.';
    }

    if (upcomingEventsPreview.length === 1) {
      return `Próximo evento: ${upcomingEventsPreview[0].titulo}`;
    }

    return `Próximos eventos: ${upcomingEventsPreview.map(event => event.titulo).join(' / ')}`;
  }, [upcomingEventsPreview]);

  const visibleEvents = useMemo(() => {
    return sortedFilteredEvents.slice(0, visibleEventsCount);
  }, [sortedFilteredEvents, visibleEventsCount]);

  const groupedEvents = useMemo(() => {
    const sorted = visibleEvents;

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
  }, [normalizeEventDate, visibleEvents]);

  const [daysWithEvents, daysWithUpcomingEvents, daysWithPastEvents] = useMemo(() => {
    const allDays = new Set();
    const upcomingDays = new Set();
    const pastDays = new Set();
    const now = new Date();

    eventsForCalendar.forEach(event => {
      const eventDate = normalizeEventDate(event.fecha);
      if (!eventDate) return;

      const eventDay = eventDate.getDate();
      allDays.add(eventDay);
      if (isPastEvent(event, now)) {
        pastDays.add(eventDay);
      } else {
        upcomingDays.add(eventDay);
      }
    });

    return [allDays, upcomingDays, pastDays];
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
  const hasFilters = searchTerm.trim() || typeFilter !== 'all';

  useEffect(() => {
    setVisibleEventsCount(20);
  }, [selectedMonthIndex, selectedMonthYear, searchTerm, typeFilter, selectedDay]);

  return (
    <div className="container page-container events-manager-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Eventos</h1>
          <p className="dashboard-subtitle">Administra el calendario de eventos institucionales</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button onClick={() => handleOpenModal()} className="btn btn--primary">
            Crear Evento
          </button>
          <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline btn--back">
            <Icon name="chevron-left" size={16} />
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
                      <p className="events-list-next">{upcomingEventsSummary}</p>
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
                        <option value="muestra">Muestra</option>
                        <option value="acto">Acto</option>
                      </select>
                    </div>
                    {hasFilters && (
                      <button
                        type="button"
                        className="btn btn--sm btn--outline events-filter-clear"
                        onClick={() => {
                          setSearchTerm('');
                          setTypeFilter('all');
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
                          {group.events.map(event => {
                            const pastEvent = isPastEvent(event);
                            return (
                            <div
                              key={event.id}
                              className={`card card--compact card--clickable ${pastEvent ? 'events-list-card--past' : ''}`}
                              data-tipo={event.tipo}
                              onClick={() => handleViewEvent(event)}
                            >
                              <div className="card__header card__header--compact">
                                <div className="event-card-main">
                                  <div className="event-card-title-row">
                                    <h3 className="card__title">{event.titulo}</h3>
                                    {pastEvent && (
                                      <span className="badge badge--sm events-list-card__past-badge">
                                        Evento pasado
                                      </span>
                                    )}
                                  </div>
                                  <p className="card__subtitle">
                                    {getEventMeta(event)}
                                  </p>
                                  {Array.isArray(event.media) && event.media.length > 0 && (
                                    <div className="event-card-indicator">
                                      <Icon name="paperclip" size={14} />
                                      <span>{event.media.length} {event.media.length === 1 ? 'adjunto' : 'adjuntos'}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            );
                          })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {sortedFilteredEvents.length > visibleEventsCount && (
                    <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => setVisibleEventsCount(prev => prev + 20)}
                      >
                        Cargar mas
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Crear/Editar Evento */}
      <Modal isOpen={showModal} onClose={handleCloseModal} size="md" closeOnOverlay={false}>
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
                <option value="muestra">Muestra</option>
                <option value="acto">Acto</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="event-media" className="form-label">
                Media (opcional)
              </label>
              <FileUploadSelector
                id="event-media"
                multiple
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.heic,.heif,.webp,.webm,.mov,.mp3,.wav,.m4a,.ogg"
                onFilesSelected={handleMediaFilesChange}
                disabled={saving || uploadingMedia}
                hint={`Formatos: imagenes, videos, audio, documentos o texto. Bloqueados: .zip, .exe, .bat. Maximo ${maxMediaSizeLabel} por archivo`}
              />

              {selectedMediaFiles.length > 0 && (
                <div className="event-media-list">
                  <strong>Archivos a subir:</strong>
                  <FileSelectionList files={selectedMediaFiles} onRemove={removeSelectedMediaFile} />
                </div>
              )}

              {existingMedia.length > 0 && (
                <div className="event-media-list">
                  <strong>Media actual:</strong>
                  <ul className="event-media-list__items">
                    {existingMedia.map((item, idx) => {
                      const metaParts = [];
                      if (item?.type) metaParts.push(getMediaTypeLabel(item.type));
                      const sizeLabel = formatFileSize(item?.size || 0);
                      if (sizeLabel) metaParts.push(sizeLabel);
                      const meta = metaParts.join(' - ');
                      return (
                        <li key={`${item?.path || item?.url || idx}`}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            {item.name || 'Archivo'}
                          </a>
                          {meta && (
                            <span className="event-media-list__meta">
                              ({meta})
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {editingEvent?.communicationId && (
              <div className="form-group">
                <label className="form-label">Adjuntos del comunicado</label>
                {commLoading ? (
                  <p className="form-help">Cargando adjuntos...</p>
                ) : commError ? (
                  <p className="form-help">Adjuntos no disponibles.</p>
                ) : commAttachments.length === 0 ? (
                  <p className="form-help">Sin adjuntos.</p>
                ) : (
                  <ul className="event-media-list__items">
                    {commAttachments.map((attachment, idx) => (
                      <li key={`${attachment.path || attachment.url || idx}`}>
                        <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                          {attachment.name || 'Archivo'}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

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
            <button type="button" onClick={handleCloseModal} className="btn btn--outline" disabled={saving || uploadingMedia}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving || uploadingMedia}>
              {saving || uploadingMedia ? 'Guardando...' : `${editingEvent ? 'Actualizar' : 'Crear'} Evento`}
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

      <EventDetailModal
        event={selectedEventForView}
        isOpen={showEventDetail}
        onClose={handleCloseEventDetail}
        adminActions={
          selectedEventForView && (
            <>
              <button
                onClick={() => {
                  handleCloseEventDetail();
                  handleOpenModal(selectedEventForView);
                }}
                className="btn btn--sm btn--primary"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  handleCloseEventDetail();
                  setEventToDelete(selectedEventForView);
                  setShowDeleteConfirm(true);
                }}
                className="btn btn--sm btn--danger"
              >
                Eliminar
              </button>
            </>
          )
        }
      />
    </div>
  );
}
