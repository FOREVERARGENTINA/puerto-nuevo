import { useState, useEffect } from 'react';
import { appointmentsService } from '../../services/appointments.service';
import { usersService } from '../../services/users.service';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import { Timestamp } from 'firebase/firestore';

const AppointmentsManager = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateSlots, setShowCreateSlots] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState('week'); // 'day', 'week', or 'month'
  const [slotsForm, setSlotsForm] = useState({
    diaSemana: '1',
    fechaDesde: '',
    fechaHasta: '',
    horaInicio: '09:00',
    horaFin: '17:00',
    duracionMinutos: 30,
    intervaloMinutos: 0
  });

  const confirmDialog = useDialog();
  const alertDialog = useDialog();

  const enrichWithUserEmails = async (appointments) => {
    const enriched = [];
    for (const app of appointments) {
      if (app.familiaUid) {
        const userResult = await usersService.getUserById(app.familiaUid);
        if (userResult.success) {
          enriched.push({
            ...app,
            familiaEmail: userResult.user.email
          });
        } else {
          enriched.push(app);
        }
      } else {
        enriched.push(app);
      }
    }
    return enriched;
  };

  const loadAppointments = async () => {
    setLoading(true);
    const result = await appointmentsService.getAllAppointments();
    if (result.success) {
      const appointmentsWithEmails = await enrichWithUserEmails(result.appointments);
      setAppointments(appointmentsWithEmails);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    loadAppointments();
  }, []);

  const handleSlotFormChange = (e) => {
    const { name, value } = e.target;
    setSlotsForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generateTimeSlots = () => {
    const { diaSemana, fechaDesde, fechaHasta, horaInicio, horaFin, duracionMinutos, intervaloMinutos } = slotsForm;
    
    if (!diaSemana || !fechaDesde || !fechaHasta || !horaInicio || !horaFin) {
      alert('Por favor completa todos los campos');
      return;
    }

    const slots = [];
    const targetDayOfWeek = parseInt(diaSemana);
    const startDate = new Date(fechaDesde);
    const endDate = new Date(fechaHasta);

    let currentDate = new Date(startDate);
    while (currentDate.getDay() !== targetDayOfWeek) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    while (currentDate <= endDate) {
      const [startHour, startMin] = horaInicio.split(':').map(Number);
      const [endHour, endMin] = horaFin.split(':').map(Number);
      
      let currentTime = new Date(currentDate);
      currentTime.setHours(startHour, startMin, 0, 0);
      
      const endTime = new Date(currentDate);
      endTime.setHours(endHour, endMin, 0, 0);

      while (currentTime < endTime) {
        slots.push({
          fechaHora: Timestamp.fromDate(new Date(currentTime)),
          duracionMinutos: parseInt(duracionMinutos)
        });
        
        currentTime.setMinutes(currentTime.getMinutes() + parseInt(duracionMinutos) + parseInt(intervaloMinutos));
      }

      currentDate.setDate(currentDate.getDate() + 7);
    }

    return slots;
  };

  const handleCreateSlots = async () => {
    const slots = generateTimeSlots();

    if (slots.length === 0) {
      alertDialog.openDialog({
        title: 'Error',
        message: 'No se generaron slots. Verifica los horarios.',
        type: 'error'
      });
      return;
    }

    confirmDialog.openDialog({
      title: 'Crear Turnos',
      message: `Se crearán ${slots.length} turnos disponibles. ¿Deseas continuar?`,
      onConfirm: async () => {
        const result = await appointmentsService.createTimeSlots(slots);
        if (result.success) {
          alertDialog.openDialog({
            title: 'Éxito',
            message: 'Turnos creados exitosamente',
            type: 'success'
          });
          setShowCreateSlots(false);
          loadAppointments();
        } else {
          alertDialog.openDialog({
            title: 'Error',
            message: 'Error al crear turnos: ' + result.error,
            type: 'error'
          });
        }
      }
    });
  };

  const handleMarkAttended = async (appointmentId) => {
    const result = await appointmentsService.markAsAttended(appointmentId);
    if (result.success) {
      loadAppointments();
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error,
        type: 'error'
      });
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    const result = await appointmentsService.cancelAppointment(appointmentId);
    if (result.success) {
      loadAppointments();
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error,
        type: 'error'
      });
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    const result = await appointmentsService.deleteAppointment(appointmentId);
    if (result.success) {
      loadAppointments();
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error,
        type: 'error'
      });
    }
  };

  const handleBlockAppointment = async (appointmentId) => {
    const result = await appointmentsService.blockAppointment(appointmentId);
    if (result.success) {
      loadAppointments();
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error,
        type: 'error'
      });
    }
  };

  const handleUnblockAppointment = async (appointmentId) => {
    const result = await appointmentsService.unblockAppointment(appointmentId);
    if (result.success) {
      loadAppointments();
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error,
        type: 'error'
      });
    }
  };

  const handleSelectSlot = (appointment) => {
    setSelectedAppointment(appointment);
    setShowActionsModal(true);
  };

  const closeActionsModal = () => {
    setShowActionsModal(false);
    setSelectedAppointment(null);
  };

  const handleActionWithClose = async (action) => {
    await action();
    closeActionsModal();
  };

  // Date navigation helpers
  const changeDate = (days) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const changeWeek = (weeks) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (weeks * 7));
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const getWeekDays = (date) => {
    const days = [];
    const currentDate = new Date(date);
    const dayOfWeek = currentDate.getDay();
    const diff = currentDate.getDate() - dayOfWeek; // First day is Sunday

    for (let i = 0; i < 7; i++) {
      const day = new Date(currentDate.setDate(diff + i));
      days.push(new Date(day));
    }

    return days;
  };

  const getAppointmentsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return appointments.filter(app => {
      const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
      const appDateString = appDate.toISOString().split('T')[0];
      return appDateString === dateString;
    }).sort((a, b) => {
      const dateA = a.fechaHora?.toDate ? a.fechaHora.toDate() : new Date(a.fechaHora);
      const dateB = b.fechaHora?.toDate ? b.fechaHora.toDate() : new Date(b.fechaHora);
      return dateA - dateB;
    });
  };

  const formatTime = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const formatFullDate = (date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Month view helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const changeMonth = (offset) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setCurrentMonth(newMonth);
  };

  const getAppointmentCountForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    const dayAppointments = appointments.filter(app => {
      const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
      const appDateString = appDate.toISOString().split('T')[0];
      return appDateString === dateString;
    });

    return {
      total: dayAppointments.length,
      disponible: dayAppointments.filter(a => a.estado === 'disponible').length,
      reservado: dayAppointments.filter(a => a.estado === 'reservado').length,
      bloqueado: dayAppointments.filter(a => a.estado === 'bloqueado').length,
      asistio: dayAppointments.filter(a => a.estado === 'asistio').length,
      cancelado: dayAppointments.filter(a => a.estado === 'cancelado').length
    };
  };

  const getTodayMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (loading) {
    return <LoadingScreen message="Cargando gestión de turnos..." />;
  }

  const weekDays = getWeekDays(selectedDate);
  const todayDateString = new Date().toISOString().split('T')[0];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Turnos</h1>
        <div className="page-header-actions">
          <button
            onClick={() => setShowCreateSlots(!showCreateSlots)}
            className="btn btn--primary"
          >
            {showCreateSlots ? 'Cancelar' : '+ Crear Turnos'}
          </button>
        </div>
      </div>

      {showCreateSlots && (
        <div className="card create-slots-form-card">
          <div className="card__header">
            <h2 className="card__title">Generar Turnos Disponibles</h2>
          </div>
          <div className="card__body">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="diaSemana">Día de la Semana</label>
                <select
                  id="diaSemana"
                  name="diaSemana"
                  value={slotsForm.diaSemana}
                  onChange={handleSlotFormChange}
                >
                  <option value="1">Lunes</option>
                  <option value="2">Martes</option>
                  <option value="3">Miércoles</option>
                  <option value="4">Jueves</option>
                  <option value="5">Viernes</option>
                  <option value="6">Sábado</option>
                  <option value="0">Domingo</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="fechaDesde">Desde</label>
                <input
                  type="date"
                  id="fechaDesde"
                  name="fechaDesde"
                  value={slotsForm.fechaDesde}
                  onChange={handleSlotFormChange}
                  min={getTodayMinDate()}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fechaHasta">Hasta</label>
                <input
                  type="date"
                  id="fechaHasta"
                  name="fechaHasta"
                  value={slotsForm.fechaHasta}
                  onChange={handleSlotFormChange}
                  min={slotsForm.fechaDesde || getTodayMinDate()}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="horaInicio">Hora Inicio</label>
                <input
                  type="time"
                  id="horaInicio"
                  name="horaInicio"
                  value={slotsForm.horaInicio}
                  onChange={handleSlotFormChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="horaFin">Hora Fin</label>
                <input
                  type="time"
                  id="horaFin"
                  name="horaFin"
                  value={slotsForm.horaFin}
                  onChange={handleSlotFormChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="duracionMinutos">Duración (minutos)</label>
                <input
                  type="number"
                  id="duracionMinutos"
                  name="duracionMinutos"
                  value={slotsForm.duracionMinutos}
                  onChange={handleSlotFormChange}
                  min="15"
                  step="5"
                />
              </div>

              <div className="form-group">
                <label htmlFor="intervaloMinutos">Intervalo entre turnos (minutos)</label>
                <input
                  type="number"
                  id="intervaloMinutos"
                  name="intervaloMinutos"
                  value={slotsForm.intervaloMinutos}
                  onChange={handleSlotFormChange}
                  min="0"
                  step="5"
                />
              </div>
            </div>

            <button onClick={handleCreateSlots} className="btn btn--primary">
              Generar Turnos
            </button>
          </div>
        </div>
      )}

      {/* Week View */}
      <div className="card admin-appointments-calendar-card">
        <div className="card__header">
          <h2 className="card__title">Calendario Semanal</h2>
          <div className="view-mode-toggle">
            <button
              className={`btn btn--sm ${viewMode === 'day' ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setViewMode('day')}
            >
              Día
            </button>
            <button
              className={`btn btn--sm ${viewMode === 'week' ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setViewMode('week')}
            >
              Semana
            </button>
            <button
              className={`btn btn--sm ${viewMode === 'month' ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setViewMode('month')}
            >
              Mes
            </button>
          </div>
        </div>

        <div className="card__body">
          {/* Navigation */}
          <div className="calendar-month-nav">
            <button
              onClick={() => {
                if (viewMode === 'week') changeWeek(-1);
                else if (viewMode === 'day') changeDate(-1);
                else changeMonth(-1);
              }}
              className="btn btn--sm btn--ghost"
            >
              ← {viewMode === 'week' ? 'Semana Anterior' : viewMode === 'day' ? 'Día Anterior' : 'Mes Anterior'}
            </button>
            <div className="calendar-nav-center">
              <h3 className="calendar-month-title">
                {viewMode === 'week'
                  ? `Semana del ${formatDate(weekDays[0])} al ${formatDate(weekDays[6])}`
                  : viewMode === 'day'
                  ? formatFullDate(selectedDate)
                  : currentMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
                }
              </h3>
              <button onClick={goToToday} className="btn btn--sm btn--ghost">
                Hoy
              </button>
            </div>
            <button
              onClick={() => {
                if (viewMode === 'week') changeWeek(1);
                else if (viewMode === 'day') changeDate(1);
                else changeMonth(1);
              }}
              className="btn btn--sm btn--ghost"
            >
              {viewMode === 'week' ? 'Semana Siguiente' : viewMode === 'day' ? 'Día Siguiente' : 'Mes Siguiente'} →
            </button>
          </div>

          {/* Week View */}
          {viewMode === 'week' ? (
            <div className="week-grid">
              {weekDays.map((day, index) => {
                const dayAppointments = getAppointmentsForDate(day);
                const isToday = day.toISOString().split('T')[0] === todayDateString;

                return (
                  <div key={index} className={`week-day-column ${isToday ? 'week-day-column--today' : ''}`}>
                    <div className="week-day-header">
                      <div className="week-day-name">
                        {day.toLocaleDateString('es-AR', { weekday: 'short' })}
                      </div>
                      <div className="week-day-date">
                        {day.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className="week-day-slots">
                      {dayAppointments.length === 0 ? (
                        <div className="empty-day-message">Sin turnos</div>
                      ) : (
                        dayAppointments.map(app => (
                          <div
                            key={app.id}
                            className={`admin-appointment-slot admin-appointment-slot--${app.estado}`}
                            onClick={() => handleSelectSlot(app)}
                          >
                            <div className="slot-time-badge">{formatTime(app.fechaHora)}</div>
                            <div className={`slot-estado-badge slot-estado-badge--${app.estado}`}>
                              {app.estado === 'disponible' && 'Disponible'}
                              {app.estado === 'bloqueado' && 'Bloqueado'}
                              {app.estado === 'reservado' && 'Reservado'}
                              {app.estado === 'asistio' && 'Asistió'}
                              {app.estado === 'cancelado' && 'Cancelado'}
                            </div>
                            {app.familiaEmail && (
                              <div className="slot-family-name">{app.familiaEmail.split('@')[0]}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'month' ? (
            /* Month View */
            <div className="admin-month-view">
              <div className="admin-calendar-grid">
                {/* Day headers */}
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="calendar-day-header">{day}</div>
                ))}

                {/* Empty cells before first day */}
                {[...Array(getDaysInMonth(currentMonth).startingDayOfWeek)].map((_, i) => (
                  <div key={`empty-${i}`} className="admin-calendar-day admin-calendar-day--empty"></div>
                ))}

                {/* Days of month */}
                {[...Array(getDaysInMonth(currentMonth).daysInMonth)].map((_, i) => {
                  const dayNumber = i + 1;
                  const date = new Date(getDaysInMonth(currentMonth).year, getDaysInMonth(currentMonth).month, dayNumber);
                  const dateString = date.toISOString().split('T')[0];
                  const isToday = dateString === todayDateString;
                  const counts = getAppointmentCountForDate(date);

                  return (
                    <div
                      key={dayNumber}
                      className={`admin-calendar-day ${isToday ? 'admin-calendar-day--today' : ''}`}
                      onClick={() => {
                        setSelectedDate(date);
                        setViewMode('day');
                      }}
                    >
                      <div className="admin-calendar-day-number">{dayNumber}</div>
                      {counts.total > 0 && (
                        <div className="admin-calendar-day-stats">
                          {counts.disponible > 0 && (
                            <div className="admin-stat-badge admin-stat-badge--success" title="Disponibles">
                              {counts.disponible}
                            </div>
                          )}
                          {counts.reservado > 0 && (
                            <div className="admin-stat-badge admin-stat-badge--warning" title="Reservados">
                              {counts.reservado}
                            </div>
                          )}
                          {counts.bloqueado > 0 && (
                            <div className="admin-stat-badge admin-stat-badge--secondary" title="Bloqueados">
                              {counts.bloqueado}
                            </div>
                          )}
                          {counts.asistio > 0 && (
                            <div className="admin-stat-badge admin-stat-badge--info" title="Asistieron">
                              {counts.asistio}
                            </div>
                          )}
                          {counts.cancelado > 0 && (
                            <div className="admin-stat-badge admin-stat-badge--danger" title="Cancelados">
                              {counts.cancelado}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Month Legend */}
              <div className="admin-month-legend">
                <div className="legend-title">Estados de Turnos:</div>
                <div className="legend-items">
                  <div className="legend-item">
                    <div className="admin-stat-badge admin-stat-badge--success">0</div>
                    <span>Disponibles</span>
                  </div>
                  <div className="legend-item">
                    <div className="admin-stat-badge admin-stat-badge--warning">0</div>
                    <span>Reservados</span>
                  </div>
                  <div className="legend-item">
                    <div className="admin-stat-badge admin-stat-badge--secondary">0</div>
                    <span>Bloqueados</span>
                  </div>
                  <div className="legend-item">
                    <div className="admin-stat-badge admin-stat-badge--info">0</div>
                    <span>Asistieron</span>
                  </div>
                  <div className="legend-item">
                    <div className="admin-stat-badge admin-stat-badge--danger">0</div>
                    <span>Cancelados</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Day View */
            <div className="day-appointments-list">
              {getAppointmentsForDate(selectedDate).length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state__text">No hay turnos para este día</p>
                </div>
              ) : (
                getAppointmentsForDate(selectedDate).map(app => (
                  <div
                    key={app.id}
                    className={`admin-day-appointment-item admin-day-appointment-item--${app.estado}`}
                    onClick={() => handleSelectSlot(app)}
                  >
                    <div className="appointment-time-section">
                      <div className="appointment-time">{formatTime(app.fechaHora)}</div>
                      <div className="appointment-duration">{app.duracionMinutos} min</div>
                    </div>
                    <div className="appointment-info-section">
                      <span className={`badge badge--${
                        app.estado === 'disponible' ? 'success' :
                        app.estado === 'bloqueado' ? 'secondary' :
                        app.estado === 'reservado' ? 'warning' :
                        app.estado === 'asistio' ? 'info' :
                        'danger'
                      }`}>
                        {app.estado}
                      </span>
                      {app.familiaEmail && (
                        <span className="appointment-family">{app.familiaEmail}</span>
                      )}
                      {app.nota && (
                        <span className="appointment-note-preview">{app.nota}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions Modal */}
      {showActionsModal && selectedAppointment && (
        <div className="modal-overlay" onClick={closeActionsModal}>
          <div className="modal-content modal-content--actions" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Acciones del Turno</h3>
              <button onClick={closeActionsModal} className="modal-close">✕</button>
            </div>
            <div className="modal-body">
              <div className="appointment-details-summary">
                <p><strong>Fecha y Hora:</strong> {formatFullDate(selectedAppointment.fechaHora?.toDate ? selectedAppointment.fechaHora.toDate() : new Date(selectedAppointment.fechaHora))} - {formatTime(selectedAppointment.fechaHora)}</p>
                <p><strong>Estado:</strong> <span className={`badge badge--${
                  selectedAppointment.estado === 'disponible' ? 'success' :
                  selectedAppointment.estado === 'bloqueado' ? 'secondary' :
                  selectedAppointment.estado === 'reservado' ? 'warning' :
                  selectedAppointment.estado === 'asistio' ? 'info' :
                  'danger'
                }`}>{selectedAppointment.estado}</span></p>
                {selectedAppointment.familiaEmail && (
                  <p><strong>Familia:</strong> {selectedAppointment.familiaEmail}</p>
                )}
                {selectedAppointment.nota && (
                  <p><strong>Nota:</strong> {selectedAppointment.nota}</p>
                )}
              </div>

              <div className="modal-actions-grid">
                {selectedAppointment.estado === 'disponible' && (
                  <button
                    onClick={() => handleActionWithClose(() => handleBlockAppointment(selectedAppointment.id))}
                    className="btn btn--secondary btn--full"
                  >
                    🔒 Bloquear Turno
                  </button>
                )}

                {selectedAppointment.estado === 'bloqueado' && (
                  <button
                    onClick={() => handleActionWithClose(() => handleUnblockAppointment(selectedAppointment.id))}
                    className="btn btn--primary btn--full"
                  >
                    🔓 Desbloquear Turno
                  </button>
                )}

                {selectedAppointment.estado === 'reservado' && (
                  <>
                    <button
                      onClick={() => handleActionWithClose(() => handleMarkAttended(selectedAppointment.id))}
                      className="btn btn--primary btn--full"
                    >
                      Marcar como Asistió
                    </button>
                    <button
                      onClick={() => handleActionWithClose(() => handleCancelAppointment(selectedAppointment.id))}
                      className="btn btn--danger btn--full"
                    >
                      Cancelar Turno
                    </button>
                  </>
                )}

                {selectedAppointment.estado === 'cancelado' && (
                  <button
                    onClick={() => handleActionWithClose(() => handleUnblockAppointment(selectedAppointment.id))}
                    className="btn btn--primary btn--full"
                  >
                    🔄 Liberar Turno (Dejar Disponible)
                  </button>
                )}

                <button
                  onClick={() => handleActionWithClose(() => handleDeleteAppointment(selectedAppointment.id))}
                  className="btn btn--danger btn--outline btn--full"
                >
                  🗑️ Eliminar Permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.closeDialog}
        onConfirm={confirmDialog.dialogData.onConfirm || (() => {})}
        title={confirmDialog.dialogData.title}
        message={confirmDialog.dialogData.message}
        type={confirmDialog.dialogData.type}
      />

      {/* Alert Dialog */}
      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={alertDialog.closeDialog}
        title={alertDialog.dialogData.title}
        message={alertDialog.dialogData.message}
        type={alertDialog.dialogData.type}
      />
    </div>
  );
};

export default AppointmentsManager;
