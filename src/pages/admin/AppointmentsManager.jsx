import { useState, useEffect } from 'react';
import { appointmentsService } from '../../services/appointments.service';
import { usersService } from '../../services/users.service';
import { childrenService } from '../../services/children.service';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AlertDialog } from '../../components/common/AlertDialog';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/common/Modal';
import { useDialog } from '../../hooks/useDialog';
import { useAuth } from '../../hooks/useAuth';
import { Timestamp, serverTimestamp } from 'firebase/firestore';
import { ROLES } from '../../config/constants';
import Icon from '../../components/ui/Icon';

const NOTES_MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const NOTES_MAX_FILE_SIZE_LABEL = '50MB';
const NOTES_ALLOWED_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
  'mp4', 'mov', 'webm', 'ogv',
  'mp3', 'wav', 'm4a', 'ogg',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv'
]);
const NOTES_BLOCKED_EXTENSIONS = new Set(['zip', 'exe', 'bat']);
const NOTES_ALLOWED_MIME_PREFIXES = ['image/', 'video/', 'audio/'];
const NOTES_ALLOWED_MIME_TYPES = new Set([
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

const AppointmentsManager = () => {
  const initialToday = new Date();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleAppointmentsCount, setVisibleAppointmentsCount] = useState(30);
  const [showCreateSlots, setShowCreateSlots] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showPastAppointments, setShowPastAppointments] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const handleSearchChange = (e) => setSearchTerm(e.target.value.trimStart());
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [familyUsers, setFamilyUsers] = useState([]);
  const [children, setChildren] = useState([]);
  const [childSearchTerm, setChildSearchTerm] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [familySearchTerm, setFamilySearchTerm] = useState('');
  const [selectedFamilyIds, setSelectedFamilyIds] = useState([]);
  const [slotsForm, setSlotsForm] = useState({
    diaSemana: '1',
    fechaDesde: '',
    fechaHasta: '',
    horaInicio: '09:00',
    horaFin: '17:00',
    duracionMinutos: 30,
    intervaloMinutos: 0
  });
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesForm, setNotesForm] = useState({
    resumen: '',
    acuerdos: '',
    proximosPasos: '',
    visibilidad: 'familia'
  });
  const [notesFiles, setNotesFiles] = useState([]);
  const [notesExistingAttachments, setNotesExistingAttachments] = useState([]);
  const [notesHasExisting, setNotesHasExisting] = useState(false);

  const { user } = useAuth();
  const confirmDialog = useDialog();
  const alertDialog = useDialog();

  const getMonthRange = (date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  };

  const isMonthBeforeToday = (date) => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    return date.getFullYear() < todayYear ||
      (date.getFullYear() === todayYear && date.getMonth() < todayMonth);
  };

  const loadAppointments = async () => {
    setLoading(true);
    const { start, end } = getMonthRange(currentMonth);
    const result = await appointmentsService.getAppointmentsByDateRange(start, end);
    if (result.success) {
      setAppointments(result.appointments);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    loadAppointments();
  }, [currentMonth]);

  useEffect(() => {
    if (!showAssignModal) return;

    const loadAssignOptions = async () => {
      setAssignLoading(true);
      setAssignError('');
      const [usersResult, childrenResult] = await Promise.all([
        usersService.getUsersByRole(ROLES.FAMILY),
        childrenService.getAllChildren()
      ]);

      if (usersResult.success) {
        setFamilyUsers(usersResult.users);
      }

      if (childrenResult.success) {
        setChildren(childrenResult.children);
      }

      setAssignLoading(false);
    };

    setChildSearchTerm('');
    setFamilySearchTerm('');
    setSelectedChildId('');
    setSelectedFamilyIds([]);
    loadAssignOptions();
  }, [showAssignModal]);

  useEffect(() => {
    if (!showAssignModal) return;
    setSelectedFamilyIds([]);
    setFamilySearchTerm('');
  }, [selectedChildId, showAssignModal]);

  useEffect(() => {
    setVisibleAppointmentsCount(30);
  }, [currentMonth, searchTerm, selectedDay, showPastAppointments]);

  const handleSlotFormChange = (e) => {
    const { name, value } = e.target;
    setSlotsForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNotesChange = (e) => {
    const { name, value } = e.target;
    setNotesForm(prev => ({ ...prev, [name]: value }));
  };

  const validateNotesFiles = (files) => {
    const validFiles = [];
    let hasInvalidType = false;
    let hasBlockedType = false;
    let hasOversize = false;

    files.forEach((file) => {
      const name = (file.name || '').toLowerCase();
      const ext = name.includes('.') ? name.split('.').pop() : '';
      const type = (file.type || '').toLowerCase();
      const isBlocked = ext && NOTES_BLOCKED_EXTENSIONS.has(ext);
      const isAllowedExt = ext && NOTES_ALLOWED_EXTENSIONS.has(ext);
      const isAllowedMime = type
        ? (NOTES_ALLOWED_MIME_PREFIXES.some(prefix => type.startsWith(prefix)) || NOTES_ALLOWED_MIME_TYPES.has(type))
        : false;

      if (isBlocked) {
        hasBlockedType = true;
        return;
      }
      if (!isAllowedExt && !isAllowedMime) {
        hasInvalidType = true;
        return;
      }
      if (file.size > NOTES_MAX_FILE_SIZE_BYTES) {
        hasOversize = true;
        return;
      }
      validFiles.push(file);
    });

    return { validFiles, hasInvalidType, hasBlockedType, hasOversize };
  };

  const handleNotesFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const { validFiles, hasInvalidType, hasBlockedType, hasOversize } = validateNotesFiles(files);

    if (hasInvalidType || hasBlockedType || hasOversize) {
      let message = '';
      if (hasInvalidType || hasBlockedType) {
        message = 'Solo se permiten imágenes, videos, audio, documentos o texto. Bloqueados: .zip, .exe, .bat.';
      }
      if (hasOversize) {
        message = `${message ? `${message} ` : ''}Algunos archivos superan el límite de ${NOTES_MAX_FILE_SIZE_LABEL}.`;
      }
      alertDialog.openDialog({
        title: 'Archivo no válido',
        message,
        type: 'warning'
      });
    }

    if (validFiles.length > 0) {
      setNotesFiles(prev => [...prev, ...validFiles]);
    }

    e.target.value = null;
  };

  const removeNotesFile = (index) => {
    setNotesFiles(prev => prev.filter((_, i) => i !== index));
  };

  const openNotesModal = async (appointment) => {
    if (!appointment || appointment.estado !== 'asistio') {
      alertDialog.openDialog({
        title: 'No permitido',
        message: 'Las notas solo se pueden cargar cuando el turno está marcado como asistió.',
        type: 'warning'
      });
      return;
    }

    setShowActionsModal(false);
    setNotesLoading(true);
    setNotesFiles([]);
    setNotesExistingAttachments([]);
    setNotesHasExisting(false);
    setNotesForm({
      resumen: '',
      acuerdos: '',
      proximosPasos: '',
      visibilidad: 'familia'
    });
    setShowNotesModal(true);

    const noteResult = await appointmentsService.getAppointmentNote(appointment.id);
    if (noteResult.success && noteResult.note) {
      const note = noteResult.note;
      setNotesHasExisting(true);
      setNotesForm({
        resumen: note.resumen || '',
        acuerdos: note.acuerdos || '',
        proximosPasos: note.proximosPasos || '',
        visibilidad: note.visibilidad || 'familia'
      });
      setNotesExistingAttachments(Array.isArray(note.attachments) ? note.attachments : []);
    }

    setNotesLoading(false);
  };

  const closeNotesModal = () => {
    if (notesSaving) return;
    setShowNotesModal(false);
    setNotesFiles([]);
    setNotesExistingAttachments([]);
    setNotesHasExisting(false);
  };

  const handleSaveNotes = async (appointment) => {
    if (!appointment || appointment.estado !== 'asistio') return;
    if (!notesForm.resumen.trim()) {
      alertDialog.openDialog({
        title: 'Campos incompletos',
        message: 'El resumen es obligatorio.',
        type: 'warning'
      });
      return;
    }

    setNotesSaving(true);
    const payload = {
      resumen: notesForm.resumen.trim(),
      acuerdos: notesForm.acuerdos.trim(),
      proximosPasos: notesForm.proximosPasos.trim(),
      visibilidad: notesForm.visibilidad,
      updatedBy: user?.uid || '',
      updatedByDisplayName: user?.displayName || user?.email || ''
    };

    if (!notesHasExisting) {
      payload.createdBy = user?.uid || '';
      payload.createdByDisplayName = user?.displayName || user?.email || '';
    }

    const saveResult = await appointmentsService.saveAppointmentNote(appointment.id, payload);
    if (!saveResult.success) {
      alertDialog.openDialog({
        title: 'Error',
        message: saveResult.error || 'No se pudieron guardar las notas.',
        type: 'error'
      });
      setNotesSaving(false);
      return;
    }

    if (notesFiles.length > 0) {
      const uploadResult = await appointmentsService.uploadAppointmentNoteAttachments(
        appointment.id,
        notesFiles,
        notesHasExisting ? notesExistingAttachments : []
      );
      if (!uploadResult.success) {
        alertDialog.openDialog({
        title: 'Atención',
          message: 'Las notas se guardaron, pero hubo un error al subir adjuntos.',
          type: 'warning'
        });
      }
    }

    setNotesSaving(false);
    closeNotesModal();
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
    setActionLoading(true);
    try {
      const result = await appointmentsService.markAsAttended(appointmentId);
      if (result.success) {
        await loadAppointments();
      } else {
        alertDialog.openDialog({
          title: 'Error',
          message: result.error,
          type: 'error'
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const confirmMarkAttended = (appointmentId) => {
    confirmDialog.openDialog({
      title: 'Marcar como Asistió',
      message: '¿Confirmas que la familia asistió a este turno?',
      type: 'info',
      onConfirm: () => handleActionWithClose(() => handleMarkAttended(appointmentId))
    });
  };

  const handleCancelAppointment = async (appointmentId) => {
    setActionLoading(true);
    try {
      const result = await appointmentsService.cancelAppointment(appointmentId, 'escuela');
      if (result.success) {
        await loadAppointments();
      } else {
        alertDialog.openDialog({
          title: 'Error',
          message: result.error,
          type: 'error'
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const confirmCancelAppointment = (appointmentId) => {
    confirmDialog.openDialog({
      title: 'Cancelar Turno',
      message: '¿Estás seguro de que deseas cancelar este turno? La familia será notificada.',
      type: 'warning',
      onConfirm: () => handleActionWithClose(() => handleCancelAppointment(appointmentId))
    });
  };

  const handleDeleteAppointment = async (appointmentId) => {
    setActionLoading(true);
    try {
      const result = await appointmentsService.deleteAppointment(appointmentId);
      if (result.success) {
        await loadAppointments();
      } else {
        alertDialog.openDialog({
          title: 'Error',
          message: result.error,
          type: 'error'
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDeleteAppointment = (appointmentId) => {
    confirmDialog.openDialog({
      title: 'Eliminar Permanentemente',
      message: '¿Estás seguro de que deseas eliminar este turno? Esta acción no se puede deshacer.',
      type: 'danger',
      onConfirm: () => handleActionWithClose(() => handleDeleteAppointment(appointmentId))
    });
  };

  const handleBlockAppointment = async (appointmentId) => {
    setActionLoading(true);
    try {
      const result = await appointmentsService.blockAppointment(appointmentId);
      if (result.success) {
        await loadAppointments();
      } else {
        alertDialog.openDialog({
          title: 'Error',
          message: result.error,
          type: 'error'
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const confirmBlockAppointment = (appointmentId) => {
    confirmDialog.openDialog({
      title: 'Bloquear Turno',
      message: '¿Estás seguro de que deseas bloquear este turno? No estará disponible para asignación.',
      type: 'warning',
      onConfirm: () => handleActionWithClose(() => handleBlockAppointment(appointmentId))
    });
  };

  const handleUnblockAppointment = async (appointmentId) => {
    setActionLoading(true);
    try {
      const result = await appointmentsService.unblockAppointment(appointmentId);
      if (result.success) {
        await loadAppointments();
      } else {
        alertDialog.openDialog({
          title: 'Error',
          message: result.error,
          type: 'error'
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const confirmUnblockAppointment = (appointmentId) => {
    confirmDialog.openDialog({
      title: 'Liberar Turno',
      message: '¿Estás seguro de que deseas liberar este turno? Quedará disponible para asignación.',
      type: 'warning',
      onConfirm: () => handleActionWithClose(() => handleUnblockAppointment(appointmentId))
    });
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

  const handleOpenAssignModal = () => {
    if (selectedAppointment && isPastAppointment(selectedAppointment)) {
      alertDialog.openDialog({
        title: 'No disponible',
        message: 'No se puede asignar un turno pasado.',
        type: 'error'
      });
      return;
    }
    setAssignError('');
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignError('');
    setSelectedChildId('');
    setSelectedFamilyIds([]);
  };

  const toggleFamilySelection = (uid) => {
    if (selectedFamilyIds.includes(uid)) {
      setSelectedFamilyIds(prev => prev.filter(id => id !== uid));
      return;
    }

    if (selectedFamilyIds.length >= 2) {
      setAssignError('Podés seleccionar hasta 2 familias.');
      return;
    }

    setAssignError('');
    setSelectedFamilyIds(prev => [...prev, uid]);
  };

  const handleAssignFamilies = async () => {
    if (!selectedAppointment) return;
    if (!selectedChildId) {
      setAssignError('Seleccioná un alumno.');
      return;
    }
    if (selectedFamilyIds.length === 0) {
      setAssignError('Seleccioná al menos una familia.');
      return;
    }

    setAssignLoading(true);
    setAssignError('');
    const familiesInfo = selectedFamilyIds
      .map(uid => {
        const user = familyUsers.find(item => item.id === uid);
        return {
          uid,
          email: user?.email || '',
          displayName: user?.displayName || ''
        };
      })
      .filter(info => info.email || info.displayName);
    const primaryFamily = familiesInfo[0] || {};
    const childInfo = children.find(child => child.id === selectedChildId);

    const result = await appointmentsService.updateAppointment(selectedAppointment.id, {
      estado: 'reservado',
      familiaUid: selectedFamilyIds[0],
      familiasUids: selectedFamilyIds,
      hijoId: selectedChildId,
      familiaEmail: primaryFamily.email || '',
      familiaDisplayName: primaryFamily.displayName || '',
      familiasInfo: familiesInfo,
      hijoNombre: childInfo?.nombreCompleto || '',
      assignedAt: serverTimestamp()
    });

    setAssignLoading(false);

    if (result.success) {
      closeAssignModal();
      closeActionsModal();
      loadAppointments();
    } else {
      setAssignError(result.error || 'No se pudo asignar el turno.');
    }
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // Date navigation helpers
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(null);
    setShowPastAppointments(false);
  };

  const formatTime = (timestamp) => {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };


  const formatFullDate = (date) => {
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusLabel = (status) => {
    const map = {
      disponible: 'Disponible',
      bloqueado: 'Bloqueado',
      reservado: 'Reservado',
      asistio: 'Asistió',
      cancelado: 'Cancelado'
    };
    return map[status] || status || 'Sin estado';
  };

  const getCancelledByLabel = (value) => {
    const map = {
      familia: 'familia',
      escuela: 'escuela',
      admin: 'escuela'
    };
    return map[value] || '';
  };

  const isPastAppointment = (appointment) => {
    const appDate = appointment?.fechaHora?.toDate
      ? appointment.fechaHora.toDate()
      : new Date(appointment?.fechaHora);
    return appDate.getTime() < new Date().getTime();
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
    if (isMonthBeforeToday(newMonth)) {
      setShowPastAppointments(true);
    }
  };

  const getTodayMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="container page-container appointments-manager-page">
        <div className="dashboard-header dashboard-header--compact appointments-header">
          <div>
            <h1 className="dashboard-title">Turnos</h1>
            <p className="dashboard-subtitle">Calendario y administración</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <button
              onClick={() => setShowCreateSlots(!showCreateSlots)}
              className="btn btn--primary"
              disabled
            >
              + Crear Turnos
            </button>
          </div>
        </div>

        <div className="dashboard-content">
          <div className="appointments-manager-layout">
            <div className="appointments-list-panel">
              <div className="card">
                <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                  <div className="spinner spinner--lg"></div>
                  <p style={{ marginTop: 'var(--spacing-sm)' }}>Cargando turnos...</p>
                </div>
              </div>
            </div>

            <div className="card events-calendar-panel appointments-calendar-panel">
              <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                <div className="spinner spinner--lg"></div>
                <p style={{ marginTop: 'var(--spacing-sm)' }}>Cargando calendario...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const todayDateString = new Date().toISOString().split('T')[0];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const currentMonthYear = currentMonth.getFullYear();
  const currentMonthIndex = currentMonth.getMonth();

  const appointmentsForMonth = appointments.filter(app => {
    const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
    return appDate.getFullYear() === currentMonthYear && appDate.getMonth() === currentMonthIndex;
  });

  const filteredAppointments = selectedDay
    ? appointmentsForMonth.filter(app => {
        const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
        return appDate.getDate() === selectedDay;
      })
    : appointmentsForMonth.filter(app => {
        if (showPastAppointments) return true;
        const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
        return appDate.getTime() >= startOfToday.getTime();
      });

  const searchedAppointments = searchTerm.trim()
    ? filteredAppointments.filter(app => {
        const term = searchTerm.trim().toLowerCase();
        const email = (app.familiaEmail || '').toLowerCase();
        const name = (app.familiaDisplayName || '').toLowerCase();
        const child = (app.hijoNombre || '').toLowerCase();
        const estado = (app.estado || '').toLowerCase();
        return email.includes(term) || name.includes(term) || child.includes(term) || estado.includes(term);
      })
    : filteredAppointments;

  const sortedAppointments = (() => {
    const sorted = [...searchedAppointments].sort((a, b) => {
      const dateA = a.fechaHora?.toDate ? a.fechaHora.toDate() : new Date(a.fechaHora);
      const dateB = b.fechaHora?.toDate ? b.fechaHora.toDate() : new Date(b.fechaHora);
      return dateA - dateB;
    });
    return sorted;
  })();

  const visibleAppointments = sortedAppointments.slice(0, visibleAppointmentsCount);

  const grouped = (() => {
    const map = new Map();
    const sorted = visibleAppointments;
    sorted.forEach(app => {
      const appDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
      const key = appDate.toISOString().split('T')[0];
      if (!map.has(key)) map.set(key, { date: appDate, items: [] });
      map.get(key).items.push(app);
    });
    return Array.from(map.values());
  })();

  const daysWithAppointments = (() => {
    const set = new Set();
    appointmentsForMonth.forEach(app => {
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

  const familyUsersMap = new Map(familyUsers.map(user => [user.id, user]));
  const filteredChildren = childSearchTerm.trim()
    ? children.filter(child =>
        (child.nombreCompleto || '').toLowerCase().includes(childSearchTerm.trim().toLowerCase())
      )
    : children;

  const selectedChild = selectedChildId
    ? children.find(child => child.id === selectedChildId)
    : null;

  const childResponsables = Array.isArray(selectedChild?.responsables) ? selectedChild.responsables : [];

  const responsablesInfo = childResponsables.map(uid => {
    const user = familyUsersMap.get(uid);
    return user || { id: uid, displayName: '', email: '' };
  });

  const filteredResponsables = familySearchTerm.trim()
    ? responsablesInfo.filter(user => {
        const term = familySearchTerm.trim().toLowerCase();
        return (user.displayName || '').toLowerCase().includes(term) ||
          (user.email || '').toLowerCase().includes(term);
      })
    : responsablesInfo;

  const selectedFamiliesInfo = Array.isArray(selectedAppointment?.familiasInfo)
    ? selectedAppointment.familiasInfo
    : [];

  return (
    <div className="container page-container appointments-manager-page">
      <div className="dashboard-header dashboard-header--compact appointments-header">
        <div>
          <h1 className="dashboard-title">Reuniones</h1>
          <p className="dashboard-subtitle">Calendario y administración de turnos para reuniones</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
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

      <div className="dashboard-content">
        <div className="appointments-manager-layout">
          <div className="appointments-list-panel">
            <div className="card">
              <div className="card__body">
                <div className="events-filters" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <div className="events-filter-field" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="appointments-search">
                      Buscar familia o alumno
                    </label>
                    <input
                      id="appointments-search"
                      type="text"
                      className="form-input form-input--sm"
                      placeholder="Buscar por familia, alumno o estado..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                  <div className="flex gap-sm" style={{ alignItems: 'flex-end' }}>
                    {selectedDay && (
                      <button className="btn btn--sm btn--outline" onClick={() => setSelectedDay(null)}>
                        Ver todo el mes
                      </button>
                    )}
                    {!selectedDay && (
                      <button
                        type="button"
                        className="btn btn--sm btn--outline"
                        onClick={() => setShowPastAppointments(prev => !prev)}
                      >
                        {showPastAppointments ? 'Ocultar turnos pasados' : 'Mostrar turnos pasados'}
                      </button>
                    )}
                    {searchTerm.trim() && (
                      <button
                        type="button"
                        className="btn btn--sm btn--outline events-filter-clear"
                        onClick={() => setSearchTerm('')}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>
                <p className="form-help" style={{ marginBottom: 'var(--spacing-md)' }}>
                  {selectedDay
                    ? `Mostrando: ${formatFullDate(new Date(currentMonthYear, currentMonthIndex, selectedDay))}`
                    : showPastAppointments
                      ? 'Mostrando: todo el mes (incluye pasados)'
                      : 'Mostrando: desde hoy'}
                </p>
                {grouped.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state__text">No hay turnos para esta fecha</p>
                  </div>
                ) : (
                  <div className="day-appointments-list">
                    {grouped.map(group => (
                      <div key={group.date.toISOString()}>
                        <div className="events-day-heading" style={{ marginTop: 'var(--spacing-md)' }}>
                          {formatFullDate(group.date)}
                        </div>
                        {group.items.length === 0 ? (
                          <div className="empty-day-message">Sin turnos</div>
                        ) : (
                          group.items.map(app => {
                            const familiesInfo = Array.isArray(app.familiasInfo) ? app.familiasInfo : [];
                            const fallbackFamilyLabel = app.familiaDisplayName || app.familiaEmail;
                            const familyLabels = familiesInfo.length > 0
                              ? familiesInfo.map(fam => fam.displayName || fam.email).filter(Boolean)
                              : (fallbackFamilyLabel ? [fallbackFamilyLabel] : []);
                            const showSecondaryEmail = familiesInfo.length === 0 && app.familiaDisplayName && app.familiaEmail;
                            const childLabel = app.hijoNombre || '';

                            return (
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
                                    {getStatusLabel(app.estado)}
                                  </span>
                                  {app.estado !== 'disponible' && (familyLabels.length > 0 || showSecondaryEmail || childLabel) && (
                                    <div className="appointment-identity">
                                      {familyLabels.map((label, index) => (
                                        <span
                                          key={`${app.id}-family-${index}`}
                                          className={`appointment-family ${index > 0 ? 'appointment-family--secondary' : ''}`}
                                        >
                                          {label}
                                        </span>
                                      ))}
                                      {showSecondaryEmail && (
                                        <span className="appointment-family appointment-family--secondary">
                                          {app.familiaEmail}
                                        </span>
                                      )}
                                      {childLabel && (
                                        <span className="appointment-child">Alumno: {childLabel}</span>
                                      )}
                                    </div>
                                  )}
                                  {app.estado === 'cancelado' && (
                                    <span className="appointment-note-preview">
                                      {`Turno cancelado${getCancelledByLabel(app.canceladoPor) ? ` por ${getCancelledByLabel(app.canceladoPor)}` : ''}`}
                                    </span>
                                  )}
                                  {app.estado !== 'disponible' && app.nota && (
                                    <span className="appointment-note-preview">{app.nota}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {sortedAppointments.length > visibleAppointmentsCount && (
                <div style={{ marginTop: 'var(--spacing-md)', textAlign: 'center' }}>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => setVisibleAppointmentsCount(prev => prev + 30)}
                  >
                    Cargar mas
                  </button>
                </div>
              )}
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
              <span className="badge badge--info">{appointmentsForMonth.length} este mes</span>
            </div>

            <div className="card__body">
              <div className="event-calendar events-calendar--manager">
                <div className="event-calendar__header">
                  <button
                    onClick={() => changeMonth(-1)}
                    className="event-calendar__nav-btn"
                    aria-label="Mes anterior"
                  >
                    <Icon name="chevron-left" size={16} className="event-calendar__nav-icon" />
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
                    const isToday = day && new Date(currentMonthYear, currentMonthIndex, day).toISOString().split('T')[0] === todayDateString;
                    const hasAppointments = day && daysWithAppointments.has(day);
                    return (
                      <div
                        key={index}
                        className={`event-calendar__day ${
                          day ? 'event-calendar__day--active' : 'event-calendar__day--empty'
                        } ${day && hasAppointments ? 'event-calendar__day--has-event' : ''} ${
                          selectedDay === day ? 'event-calendar__day--selected' : ''
                        } ${isToday ? 'event-calendar__day--today' : ''}`}
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
        </div>
      </div>

      {/* Actions Modal */}
      {showActionsModal && selectedAppointment && (
        <div className="modal-overlay" onClick={closeActionsModal}>
          <div className="modal-content modal-content--actions" onClick={(e) => e.stopPropagation()}>
            {actionLoading && (
              <div className="modal-loading-overlay">
                <div className="spinner"></div>
                <p>Procesando...</p>
              </div>
            )}
            <div className="modal-header">
              <h3>Acciones del Turno</h3>
              <button onClick={closeActionsModal} className="modal-close" disabled={actionLoading}>X</button>
            </div>
            <div className="modal-body">
              {isPastAppointment(selectedAppointment) && selectedAppointment.estado === 'disponible' && (
                <div className="alert alert--error mb-md">
                  Este turno ya pasó. No se puede asignar.
                </div>
              )}
              <div className="appointment-details-summary">
                <p><strong>Fecha y Hora:</strong> {formatFullDate(selectedAppointment.fechaHora?.toDate ? selectedAppointment.fechaHora.toDate() : new Date(selectedAppointment.fechaHora))} - {formatTime(selectedAppointment.fechaHora)}</p>
                <p><strong>Estado:</strong> <span className={`badge badge--${
                  selectedAppointment.estado === 'disponible' ? 'success' :
                  selectedAppointment.estado === 'bloqueado' ? 'secondary' :
                  selectedAppointment.estado === 'reservado' ? 'warning' :
                  selectedAppointment.estado === 'asistio' ? 'info' :
                  'danger'
                }`}>{getStatusLabel(selectedAppointment.estado)}</span></p>
                {selectedAppointment.estado !== 'disponible' && (
                  <>
                    {selectedFamiliesInfo.length > 0 ? (
                      <>
                        <p><strong>Familias:</strong> {selectedFamiliesInfo.map(fam => fam.displayName || fam.email).filter(Boolean).join(', ')}</p>
                        {selectedFamiliesInfo.some(fam => fam.email) && (
                          <p><strong>Emails:</strong> {selectedFamiliesInfo.map(fam => fam.email).filter(Boolean).join(', ')}</p>
                        )}
                      </>
                    ) : (
                      selectedAppointment.familiaEmail && (
                        <>
                          <p><strong>Familia:</strong> {selectedAppointment.familiaDisplayName || selectedAppointment.familiaEmail}</p>
                          {selectedAppointment.familiaDisplayName && selectedAppointment.familiaEmail && (
                            <p><strong>Email:</strong> {selectedAppointment.familiaEmail}</p>
                          )}
                        </>
                      )
                    )}
                    {selectedAppointment.hijoNombre && (
                      <p><strong>Alumno:</strong> {selectedAppointment.hijoNombre}</p>
                    )}
                    {selectedAppointment.nota && (
                      <p><strong>Nota:</strong> {selectedAppointment.nota}</p>
                    )}
                  </>
                )}
                {selectedAppointment.estado === 'cancelado' && (
                  <p>
                    <strong>Cancelado por:</strong>{' '}
                    {getCancelledByLabel(selectedAppointment.canceladoPor) || 'No especificado'}
                  </p>
                )}
              </div>

              <div className="modal-actions-grid">
                {selectedAppointment.estado === 'disponible' && (
                  <>
                    <button
                      onClick={() => confirmBlockAppointment(selectedAppointment.id)}
                      className="btn btn--secondary btn--full"
                      disabled={actionLoading}
                    >
                      Bloquear turno
                    </button>
                    <button
                      onClick={handleOpenAssignModal}
                      className="btn btn--primary btn--full"
                      disabled={isPastAppointment(selectedAppointment) || actionLoading}
                    >
                      Asignar a familia/s
                    </button>
                  </>
                )}

                {selectedAppointment.estado === 'bloqueado' && (
                  <button
                    onClick={() => confirmUnblockAppointment(selectedAppointment.id)}
                    className="btn btn--primary btn--full"
                    disabled={actionLoading}
                  >
                    Desbloquear turno
                  </button>
                )}

                {selectedAppointment.estado === 'reservado' && (
                  <>
                    <button
                      onClick={() => confirmMarkAttended(selectedAppointment.id)}
                      className="btn btn--primary btn--full"
                      disabled={actionLoading}
                    >
                      Marcar como Asistió
                    </button>
                    <button
                      onClick={() => confirmCancelAppointment(selectedAppointment.id)}
                      className="btn btn--danger btn--full"
                      disabled={actionLoading}
                    >
                      Cancelar Turno
                    </button>
                  </>
                )}

                {selectedAppointment.estado === 'cancelado' && (
                  <button
                    onClick={() => confirmUnblockAppointment(selectedAppointment.id)}
                    className="btn btn--primary btn--full"
                    disabled={actionLoading}
                  >
                    Liberar turno (dejar disponible)
                  </button>
                )}
                {selectedAppointment.estado === 'asistio' && (
                  <button
                    onClick={() => openNotesModal(selectedAppointment)}
                    className="btn btn--primary btn--full"
                    disabled={actionLoading}
                  >
                    Notas de la reunión
                  </button>
                )}

                <button
                  onClick={() => confirmDeleteAppointment(selectedAppointment.id)}
                  className="btn btn--danger btn--outline btn--full"
                  disabled={actionLoading}
                >
                  Eliminar permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotesModal && selectedAppointment && (
        <Modal isOpen={showNotesModal} onClose={closeNotesModal} size="md">
          <ModalHeader title="Notas de la reunión" onClose={closeNotesModal} />
          <ModalBody>
            {notesLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                <div className="spinner spinner--lg"></div>
                <p style={{ marginTop: 'var(--spacing-sm)' }}>Cargando notas...</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSaveNotes(selectedAppointment); }} className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="resumen" className="required">Resumen</label>
                  <textarea
                    id="resumen"
                    name="resumen"
                    className="form-textarea"
                    rows="4"
                    value={notesForm.resumen}
                    onChange={handleNotesChange}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="acuerdos">Acuerdos</label>
                  <textarea
                    id="acuerdos"
                    name="acuerdos"
                    className="form-textarea"
                    rows="3"
                    value={notesForm.acuerdos}
                    onChange={handleNotesChange}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="proximosPasos">Próximos pasos</label>
                  <textarea
                    id="proximosPasos"
                    name="proximosPasos"
                    className="form-textarea"
                    rows="3"
                    value={notesForm.proximosPasos}
                    onChange={handleNotesChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="visibilidad">Visibilidad</label>
                  <select
                    id="visibilidad"
                    name="visibilidad"
                    className="form-input"
                    value={notesForm.visibilidad}
                    onChange={handleNotesChange}
                  >
                    <option value="familia">Visible para familia</option>
                    <option value="escuela">Solo escuela</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Adjuntos</label>
                  <input
                    type="file"
                    multiple
                    className="form-input"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.heic,.heif,.webp,.webm,.mov,.mp3,.wav,.m4a,.ogg"
                    onChange={handleNotesFilesChange}
                  />
                  <p className="form-help">
                    Formatos: imágenes, videos, audio, documentos o texto. Bloqueados: .zip, .exe, .bat. Máximo {NOTES_MAX_FILE_SIZE_LABEL} por archivo.
                  </p>

                  {notesFiles.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 'var(--spacing-sm) 0 0' }}>
                      {notesFiles.map((file, index) => (
                        <li key={`${file.name}-${index}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{file.name}</span>
                          <button type="button" className="btn btn--link" onClick={() => removeNotesFile(index)}>
                            Quitar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {notesExistingAttachments.length > 0 && (
                    <div style={{ marginTop: 'var(--spacing-sm)' }}>
                      <strong>Adjuntos existentes:</strong>
                      <ul style={{ margin: 'var(--spacing-xs) 0 0', paddingLeft: '1.1rem' }}>
                        {notesExistingAttachments.map((file, index) => (
                          <li key={`existing-note-${index}`}>
                            <a href={file.url} target="_blank" rel="noreferrer">{file.name || 'Archivo'}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <ModalFooter>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', width: '100%' }}>
                    <button type="button" className="btn btn--outline" onClick={closeNotesModal} disabled={notesSaving}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn--primary" disabled={notesSaving}>
                      {notesSaving ? 'Guardando...' : 'Guardar notas'}
                    </button>
                  </div>
                </ModalFooter>
              </form>
            )}
          </ModalBody>
        </Modal>
      )}

      {showAssignModal && selectedAppointment && (
        <div className="modal-overlay" onClick={closeAssignModal}>
          <div className="modal-content modal-content--actions" onClick={(e) => e.stopPropagation()}>
            {assignLoading && (
              <div className="modal-loading-overlay">
                <div className="spinner"></div>
                <p>Asignando turno...</p>
              </div>
            )}
            <div className="modal-header">
              <h3>Asignar turno a familia/s</h3>
              <button onClick={closeAssignModal} className="modal-close" disabled={assignLoading}>X</button>
            </div>
            <div className="modal-body">
              {assignError && (
                <div className="alert alert--error mb-md">
                  {assignError}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="assign-child-search">Buscar alumno</label>
                <input
                  id="assign-child-search"
                  type="text"
                  className="form-input"
                  placeholder="Buscar por nombre de alumno..."
                  value={childSearchTerm}
                  onChange={(e) => setChildSearchTerm(e.target.value.trimStart())}
                />
              </div>

              <div className="form-group">
                <label htmlFor="assign-child-select">Alumno *</label>
                <select
                  id="assign-child-select"
                  className="form-input"
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                >
                  <option value="">Seleccionar alumno...</option>
                  {filteredChildren.map(child => (
                    <option key={child.id} value={child.id}>
                      {child.nombreCompleto}
                    </option>
                  ))}
                </select>
              </div>

              {selectedChild && (
                <>
                  <div className="form-group">
                    <label htmlFor="assign-family-search">Buscar familia</label>
                    <input
                      id="assign-family-search"
                      type="text"
                      className="form-input"
                      placeholder="Buscar por nombre o email..."
                      value={familySearchTerm}
                      onChange={(e) => setFamilySearchTerm(e.target.value.trimStart())}
                    />
                  </div>

                  <div className="assign-family-list">
                    {filteredResponsables.length === 0 ? (
                      <p className="empty-state__text">No hay familias responsables para este alumno.</p>
                    ) : (
                      filteredResponsables.map(user => {
                        const label = user.displayName || user.email || 'Familia';
                        const secondary = user.displayName && user.email ? user.email : '';
                        const isSelected = selectedFamilyIds.includes(user.id);
                        const disableSelection = !isSelected && selectedFamilyIds.length >= 2;

                        return (
                          <label key={user.id} className={`assign-family-item ${disableSelection ? 'assign-family-item--disabled' : ''}`}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={disableSelection}
                              onChange={() => toggleFamilySelection(user.id)}
                            />
                            <span className="assign-family-label">
                              <span>{label}</span>
                              {secondary && <small>{secondary}</small>}
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>

                  <p className="assign-family-hint">Podés seleccionar hasta 2 familias responsables del alumno.</p>
                </>
              )}

              {!selectedChild && (
                <p className="empty-state__text">Seleccioná un alumno para ver sus responsables.</p>
              )}
            </div>

            <div className="flex-row mt-md" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn--outline" onClick={closeAssignModal}>
                Cancelar
              </button>
              <button
                className="btn btn--primary"
                onClick={handleAssignFamilies}
                disabled={assignLoading}
              >
                {assignLoading ? 'Asignando...' : 'Asignar turno'}
              </button>
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












