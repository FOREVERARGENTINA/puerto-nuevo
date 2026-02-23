import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { snacksService } from '../../services/snacks.service';
import { usersService } from '../../services/users.service';
import { childrenService } from '../../services/children.service';
import { ROUTES, AMBIENTES } from '../../config/constants';
import { AlertDialog } from '../../components/common/AlertDialog';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/common/Modal';
import { LoadingModal } from '../../components/common/LoadingModal';
import { useDialog } from '../../hooks/useDialog';
import { getSnackStatusMeta } from '../../utils/snackAssignmentState';

export function SnacksCalendar() {
  const [assignmentsTaller1, setAssignmentsTaller1] = useState([]);
  const [assignmentsTaller2, setAssignmentsTaller2] = useState([]);
  const [calendarWeekCache, setCalendarWeekCache] = useState({});
  const [childrenByTaller, setChildrenByTaller] = useState({
    [AMBIENTES.TALLER_1]: [],
    [AMBIENTES.TALLER_2]: []
  });
  const [selectedChildId, setSelectedChildId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedTaller, setSelectedTaller] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedChildFamilies, setSelectedChildFamilies] = useState([]);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [alertDialog, setAlertDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('Vacaciones');
  const [suspendTargetWeek, setSuspendTargetWeek] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedWeekStart, setSelectedWeekStart] = useState(null);
  const [weeksAhead, setWeeksAhead] = useState(12);
  const [showPastWeeks, setShowPastWeeks] = useState(false);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [childrenLoadedByTaller, setChildrenLoadedByTaller] = useState({
    [AMBIENTES.TALLER_1]: false,
    [AMBIENTES.TALLER_2]: false
  });

  const confirmDialog = useDialog();
  const WEEKS_STEP = 8;
  const PAST_WEEKS = 6;

  // Cargar familias por taller
  const loadFamiliesByTaller = async (taller) => {
    try {
      setLoadingFamilies(true);
      const childrenResult = await childrenService.getChildrenByAmbiente(taller);

      if (!childrenResult.success) {
        console.error(`Error al cargar hijos de ${taller}:`, childrenResult.error);
        return [];
      }

      const responsableUids = new Set();
      childrenResult.children.forEach(child => {
        (child.responsables || []).forEach(r => responsableUids.add(r));
      });

      if (responsableUids.size === 0) return [];

      const userPromises = Array.from(responsableUids).map(uid => usersService.getUserById(uid));
      const usersResults = await Promise.all(userPromises);
      const familyUsers = usersResults
        .filter(r => r.success && r.user && r.user.role === 'family')
        .map(r => r.user);

      // Guardar también la lista de hijos para este taller
      setChildrenByTaller(prev => ({ ...prev, [taller]: childrenResult.children }));
      setChildrenLoadedByTaller(prev => ({ ...prev, [taller]: true }));

      return familyUsers; 
    } catch (err) {
      console.error('Error cargando familias:', err);
      return [];
    } finally {
      setLoadingFamilies(false);
    }
  };

  // Cargar asignaciones por rango
  const loadAssignmentsForRange = async (startDateStr, endDateStr) => {
    setLoading(true);
    try {
      const [result1, result2] = await Promise.all([
        snacksService.getAssignmentsByAmbienteRange(AMBIENTES.TALLER_1, startDateStr, endDateStr),
        snacksService.getAssignmentsByAmbienteRange(AMBIENTES.TALLER_2, startDateStr, endDateStr)
      ]);

      if (result1.success) setAssignmentsTaller1(result1.assignments);
      if (result2.success) setAssignmentsTaller2(result2.assignments);
    } catch (err) {
      console.error('Error en loadAssignmentsForRange:', err);
      setError('Error al cargar asignaciones: ' + err.message);
    }
    setLoading(false);
  };

  const addDays = (date, days) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const selectedMonthYear = selectedMonth.getFullYear();
  const selectedMonthIndex = selectedMonth.getMonth();

  const getDaysInMonth = () => {
    const year = selectedMonthYear;
    const month = selectedMonthIndex;
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
    setSelectedWeekStart(null);
  };

  const getWeekStart = (date) => {
    const start = new Date(date);
    const dayIndex = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - dayIndex);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  const getRangeDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let startMonday = getWeekStart(today);
    if (showPastWeeks) {
      startMonday = addDays(startMonday, -PAST_WEEKS * 7);
    }

    const totalWeeks = weeksAhead + (showPastWeeks ? PAST_WEEKS : 0);
    let endMonday = addDays(startMonday, (totalWeeks - 1) * 7);

    const endLimit = new Date(today.getFullYear(), 11, 20);
    endLimit.setHours(0, 0, 0, 0);
    if (endMonday > endLimit) endMonday = endLimit;

    return {
      startMonday,
      endMonday,
      totalWeeks
    };
  };

  const { startMonday, endMonday, totalWeeks } = getRangeDates();
  const startDateStr = startMonday.toISOString().split('T')[0];
  const endDateStr = endMonday.toISOString().split('T')[0];

  useEffect(() => {
    loadAssignmentsForRange(startDateStr, endDateStr);
  }, [startDateStr, endDateStr]);

  const goToToday = () => {
    const today = new Date();
    setSelectedMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedWeekStart(getWeekStart(today));
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === selectedMonthIndex &&
      today.getFullYear() === selectedMonthYear
    );
  };

  const toISODate = (date) => date.toISOString().split('T')[0];
  const days = getDaysInMonth();

  const pickAssignmentForWeek = (assignments, dateStr) => {
    const matches = assignments.filter(a => a.fechaInicio === dateStr);
    if (matches.length === 0) return null;
    const suspended = matches.find(a => a.suspendido || a.estado === 'suspendido');
    return suspended || matches[0];
  };

  const buildWeekEntry = (weekStartDate, assignmentT1 = null, assignmentT2 = null) => {
    const monday = getWeekStart(weekStartDate);
    const friday = new Date(monday);
    friday.setDate(friday.getDate() + 4);

    return {
      fechaInicio: toISODate(monday),
      fechaFin: toISODate(friday),
      monday,
      friday,
      taller1: assignmentT1,
      taller2: assignmentT2
    };
  };

  const isWeekInsideLoadedRange = (weekStartDate) => {
    if (!weekStartDate) return false;
    const monday = getWeekStart(weekStartDate);
    return monday >= startMonday && monday <= endMonday;
  };

  const loadCalendarWeekFromDb = async (weekStartDate, { force = false } = {}) => {
    if (!weekStartDate) return;

    const monday = getWeekStart(weekStartDate);
    const weekKey = toISODate(monday);
    if (!force && (isWeekInsideLoadedRange(monday) || calendarWeekCache[weekKey]?.loaded)) {
      return;
    }

    try {
      const [result1, result2] = await Promise.all([
        snacksService.getAssignmentsByAmbienteRange(AMBIENTES.TALLER_1, weekKey, weekKey),
        snacksService.getAssignmentsByAmbienteRange(AMBIENTES.TALLER_2, weekKey, weekKey)
      ]);

      if (!result1.success || !result2.success) {
        throw new Error(result1.error || result2.error || 'No se pudo cargar la semana seleccionada');
      }

      setCalendarWeekCache(prev => ({
        ...prev,
        [weekKey]: {
          loaded: true,
          taller1: pickAssignmentForWeek(result1.assignments, weekKey),
          taller2: pickAssignmentForWeek(result2.assignments, weekKey)
        }
      }));
    } catch (err) {
      console.error('Error cargando semana del calendario:', err);
      setError('Error al cargar la semana seleccionada');
    }
  };

  const reloadAssignments = async () => {
    await loadAssignmentsForRange(startDateStr, endDateStr);
    if (selectedWeekStart && !isWeekInsideLoadedRange(selectedWeekStart)) {
      await loadCalendarWeekFromDb(selectedWeekStart, { force: true });
    }
  };

  const handleWeekSelection = (weekStartDate) => {
    setSelectedWeekStart(weekStartDate);
    loadCalendarWeekFromDb(weekStartDate);
  };

  useEffect(() => {
    if (!selectedWeekStart) return;
    loadCalendarWeekFromDb(selectedWeekStart);
  }, [selectedWeekStart, startDateStr, endDateStr]);

  // Generar semanas hasta fin de año (excluyendo última semana de diciembre)
  const generateWeeks = () => {
    const weeks = [];
    let currentMonday = new Date(startMonday);

    // Calcular limite: 20 de diciembre (para no incluir semana de fin de ano)
    const endLimit = new Date(currentMonday.getFullYear(), 11, 20); // 20 de diciembre
    endLimit.setHours(0, 0, 0, 0);

    // Generar semanas hasta el 20 de diciembre
    while (currentMonday <= endLimit) {
      const monday = new Date(currentMonday);
      const friday = new Date(monday);
      friday.setDate(friday.getDate() + 4);

      const mondayStr = monday.toISOString().split('T')[0];
      const fridayStr = friday.toISOString().split('T')[0];

      const assignmentT1 = pickAssignmentForWeek(assignmentsTaller1, mondayStr);
      const assignmentT2 = pickAssignmentForWeek(assignmentsTaller2, mondayStr);

      weeks.push({
        fechaInicio: mondayStr,
        fechaFin: fridayStr,
        monday,
        friday,
        taller1: assignmentT1 || null,
        taller2: assignmentT2 || null
      });

      currentMonday.setDate(currentMonday.getDate() + 7);
      if (weeks.length >= totalWeeks) break;
    }

    return weeks;
  };

  // Abrir modal de asignación
  const openAssignModal = (week, taller) => {
    if (isClosedWeek(week)) {
      setError('No se pueden asignar alumnos en semanas cerradas.');
      return;
    }
    setSelectedWeek(week);
    setSelectedTaller(taller);
    setSelectedChildId('');
    setShowAssignModal(true);
    if (!childrenLoadedByTaller[taller]) {
      loadFamiliesByTaller(taller);
    }
  }; 

  // Crear asignación
  const handleCreateAssignment = async () => {
    if (!selectedChildId) {
      setError('Debes seleccionar un alumno');
      return;
    }

    setSaving(true);
    setError('');

    const child = childrenByTaller[selectedTaller]?.find(c => c.id === selectedChildId);
    if (!child) {
      setError('Alumno no encontrado');
      setSaving(false);
      return;
    }

    const responsables = Array.isArray(child.responsables) ? child.responsables : [];
    if (responsables.length === 0) {
      setError('Este alumno no tiene responsables asignados');
      setSaving(false);
      return;
    }

    // Construir lista de familias con datos (uid, name, email)
    const familyPromises = responsables.map(async (uid) => {
      const res = await usersService.getUserById(uid);
      if (res.success && res.user) {
        return { uid, name: res.user.displayName || res.user.email || uid, email: res.user.email || '' };
      }
      return { uid, name: uid, email: '' };
    });

    const familias = await Promise.all(familyPromises);

    const result = await snacksService.createSnackAssignment({
      ambiente: selectedTaller,
      fechaInicio: selectedWeek.fechaInicio,
      fechaFin: selectedWeek.fechaFin,
      responsables: familias, // service will map this into "familias"
      childId: child.id,
      childName: child.nombreCompleto || child.nombre || ''
    });

    if (!result.success) {
      setError(result.error || 'Error creando asignación');
      setSaving(false);
      return;
    }

    // No enviar comunicación ni email al crear la asignación — los recordatorios se envían automáticamente (viernes previo)
    // (Se omite la creación de comunicaciones aquí intencionalmente)

    setSaving(false);
    setShowAssignModal(false);

    if (result.updated) {
      openSuccessDialog('Asignación existente actualizada con el alumno seleccionado');
    } else {
      openSuccessDialog('Asignación creada para el alumno. Las familias recibirán recordatorio programado.');
    }

    await reloadAssignments();
  };

  // Abrir modal de gestión de cambio
  const openChangeModal = (assignment) => {
    setSelectedAssignment(assignment);
    setShowChangeModal(true);
  };

  // Eliminar asignación
  const handleDeleteAssignment = async (assignmentId) => {
    confirmDialog.openDialog({
      title: 'Eliminar Asignación',
      message: '¿Estás seguro de eliminar esta asignación?',
      type: 'danger',
      onConfirm: async () => {
        setSaving(true);
        const result = await snacksService.deleteAssignment(assignmentId);
        setSaving(false);

        if (result.success) {
          openSuccessDialog('Asignación eliminada');
          setShowChangeModal(false);
          await reloadAssignments();
        } else {
          setError('Error al eliminar: ' + result.error);
        }
      }
    });
  };


  const formatWeek = (monday, friday) => {
    const inicioStr = monday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    const finStr = friday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    return `${inicioStr} - ${finStr}`;
  };

  const getTallerStatus = (assignment) => {
    const status = getSnackStatusMeta(assignment);
    if (status.isConfirmedState) {
      return { ...status, style: 'confirmed', label: 'Confirmado' };
    }
    return status;
  };
  const statusFilterLabels = {
    empty: 'Sin asignar',
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    alert: 'Cambio solicitado',
    cancelled: 'Cancelado'
  };

  const getAssignmentSecondaryText = (assignment, status) => {
    if (!assignment) return '';
    if (status.isConfirmedState && assignment.confirmadoPor) return `Confirmado por: ${assignment.confirmadoPor}`;
    if (status.isConfirmedState) return 'Familia confirmada';
    return assignment.familiaEmail || '';
  };

  const getWeekStatus = (week) => {
    const t1Status = getTallerStatus(week.taller1);
    const t2Status = getTallerStatus(week.taller2);
    const t1NeedsAssignment = !week.taller1 || t1Status.style === 'alert';
    const t2NeedsAssignment = !week.taller2 || t2Status.style === 'alert';

    if (t1NeedsAssignment || t2NeedsAssignment) return { style: 'incomplete', label: 'Sin asignar' };

    if (t1Status.style === 'suspended' || t2Status.style === 'suspended') {
      return { style: 'suspended', label: 'Suspendido' };
    }

    if (t1Status.style === 'cancelled' || t2Status.style === 'cancelled') {
      return { style: 'cancelled', label: 'Con cancelacion' };
    }

    if (t1Status.isConfirmedState && t2Status.isConfirmedState) {
      return { style: 'complete', label: 'Completo' };
    }

    return { style: 'pending', label: 'Pendiente' };
  };

  const getStatusBadgeClass = (style) => {
    switch (style) {
      case 'empty': return 'snack-status snack-status--empty';
      case 'alert': return 'snack-status snack-status--alert';
      case 'confirmed': return 'snack-status snack-status--confirmed';
      case 'cancelled': return 'snack-status snack-status--cancelled';
      case 'pending': return 'snack-status snack-status--pending';
      case 'incomplete': return 'snack-status snack-status--incomplete';
      case 'complete': return 'snack-status snack-status--complete';
      case 'suspended': return 'snack-status snack-status--suspended';
      default: return 'snack-status';
    }
  };

  const isSuspensionPlaceholder = (assignment) => {
    if (!assignment) return false;
    if (assignment.familiaUid === 'SUSPENDED') return true;
    const hasFamilies = Array.isArray(assignment.familiasUids) && assignment.familiasUids.length > 0;
    const hasChild = Boolean(assignment.childId);
    return !hasFamilies && !hasChild && assignment.estado === 'suspendido';
  };

  const toggleStatusFilter = (value) => {
    setStatusFilter(prev => (prev === value ? null : value));
  };

  const isStatusFilterActive = (value) => statusFilter === value;

  const openSuccessDialog = (message, title = 'Accion completada') => {
    setAlertDialog({
      isOpen: true,
      title,
      message,
      type: 'success'
    });
  };

  // Marcar TODA la semana como suspendida (ambos talleres)
  const handleSuspendWeek = async (week, motivo) => {
    if (!motivo) {
      setError('Debes indicar un motivo para suspender la semana.');
      return;
    }
    setSaving(true);

    // Crear suspensión para ambos talleres
    const [result1, result2] = await Promise.all([
      snacksService.createSuspendedWeek(AMBIENTES.TALLER_1, week.fechaInicio, week.fechaFin, motivo),
      snacksService.createSuspendedWeek(AMBIENTES.TALLER_2, week.fechaInicio, week.fechaFin, motivo)
    ]);

    setSaving(false);

    if (result1.success && result2.success) {
      openSuccessDialog('Semana completa marcada como suspendida (ambos talleres)');
      await reloadAssignments();
    } else {
      setError('Error al marcar semana como suspendida');
      setTimeout(() => setError(''), 3500);
    }
  };

  const openSuspendWeekModal = (week) => {
    setSuspendTargetWeek(week);
    setSuspendReason('Vacaciones');
    setShowSuspendModal(true);
  };

  const confirmSuspendWeek = async () => {
    if (!suspendTargetWeek) return;
    await handleSuspendWeek(suspendTargetWeek, suspendReason.trim());
    setShowSuspendModal(false);
  };

  const handleRemoveWeekSuspension = async (week) => {
    setSaving(true);
    const operations = [];
    const clearSuspension = (assignment) => {
      if (!assignment?.suspendido) return;
      if (isSuspensionPlaceholder(assignment)) {
        operations.push(snacksService.deleteAssignment(assignment.id));
      } else {
        operations.push(snacksService.updateAssignment(assignment.id, {
          suspendido: false,
          motivoSuspension: null
        }));
      }
    };

    clearSuspension(week?.taller1);
    clearSuspension(week?.taller2);

    const results = await Promise.all(operations);
    setSaving(false);

    if (results.length > 0 && results.every(r => r.success)) {
      openSuccessDialog('Suspensión eliminada');
      await reloadAssignments();
    } else {
      setError('Error al quitar la suspensión');
      setTimeout(() => setError(''), 3500);
    }
  };

  const weeks = generateWeeks();
  const selectedWeekKey = selectedWeekStart ? toISODate(selectedWeekStart) : null;
  const selectedWeekCache = selectedWeekKey ? calendarWeekCache[selectedWeekKey] : null;
  const weeksByStart = new Map(weeks.map(week => [week.fechaInicio, week]));
  if (selectedWeekKey && selectedWeekStart && !weeksByStart.has(selectedWeekKey)) {
    weeksByStart.set(
      selectedWeekKey,
      buildWeekEntry(
        selectedWeekStart,
        selectedWeekCache?.taller1 || null,
        selectedWeekCache?.taller2 || null
      )
    );
  }
  const selectedWeekRecord = selectedWeekKey ? weeksByStart.get(selectedWeekKey) : null;
  const baseWeeks = selectedWeekKey
    ? (selectedWeekRecord ? [selectedWeekRecord] : [])
    : weeks;
  const filteredWeeks = !statusFilter
    ? baseWeeks
    : baseWeeks.filter((week) => {
        const t1 = getTallerStatus(week.taller1).style;
        const t2 = getTallerStatus(week.taller2).style;
        if (statusFilter === 'empty') {
          return t1 === 'empty' || t2 === 'empty' || t1 === 'alert' || t2 === 'alert';
        }
        return statusFilter === t1 || statusFilter === t2;
      });
  const hasWeekData = (week) => Boolean(week?.taller1 || week?.taller2);
  const weeksInSelectedMonth = weeks.filter(
    week => week.monday.getMonth() === selectedMonthIndex || week.friday.getMonth() === selectedMonthIndex
  );
  const selectedWeekLabel = selectedWeekKey && filteredWeeks[0]
    ? `Semana ${formatWeek(filteredWeeks[0].monday, filteredWeeks[0].friday)}`
    : 'Semana seleccionada';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = getWeekStart(today);
  const isClosedWeek = (week) => week?.monday && week.monday <= currentWeekStart;

  if (loading) {
    return (
      <div className="container page-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Snacks</h1>
          <p className="dashboard-subtitle">Vista unificada de ambos talleres - Año escolar {new Date().getFullYear()}</p>
        </div>
        <div className="snacks-header-actions">
          <Link to={ROUTES.ADMIN_SNACKS_LISTS} className="btn btn--outline">
            Listas de snacks
          </Link>
          <button
            className="btn btn--outline"
            onClick={() => setShowPastWeeks((prev) => !prev)}
          >
            {showPastWeeks ? 'Mostrar desde hoy' : 'Mostrar semanas anteriores'}
          </button>
          <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline btn--back">
            <Icon name="chevron-left" size={16} />
            Volver
          </Link>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="events-manager-layout snacks-manager-layout">
          <div className="events-list-panel">
            <div className="card">
              <div className="card__body">
                {error && (
                  <div className="alert alert--error mb-md" onClick={() => setError('')}>
                    {error}
                  </div>
                )}

                <div className="events-list-header">
                  <div>
                    <h3 className="events-list-title">
                      {selectedWeekKey ? selectedWeekLabel : 'Semanas de snacks'}
                    </h3>
                    <p className="events-list-subtitle">
                      {filteredWeeks.length} {filteredWeeks.length === 1 ? 'semana' : 'semanas'}
                    </p>
                  </div>
                </div>

                {/* Filtros */}
                <div className="snack-filters">
                  <button
                    type="button"
                    className={`snack-status snack-status--empty snack-filter-chip ${isStatusFilterActive('empty') ? 'snack-filter-chip--active' : ''}`}
                    onClick={() => toggleStatusFilter('empty')}
                  >
                    Sin asignar
                  </button>
                  <button
                    type="button"
                    className={`snack-status snack-status--pending snack-filter-chip ${isStatusFilterActive('pending') ? 'snack-filter-chip--active' : ''}`}
                    onClick={() => toggleStatusFilter('pending')}
                  >
                    Pendiente
                  </button>
                  <button
                    type="button"
                    className={`snack-status snack-status--confirmed snack-filter-chip ${isStatusFilterActive('confirmed') ? 'snack-filter-chip--active' : ''}`}
                    onClick={() => toggleStatusFilter('confirmed')}
                  >
                    Confirmado
                  </button>
                  <button
                    type="button"
                    className={`snack-status snack-status--alert snack-filter-chip ${isStatusFilterActive('alert') ? 'snack-filter-chip--active' : ''}`}
                    onClick={() => toggleStatusFilter('alert')}
                  >
                    Cambio solicitado
                  </button>
                  <button
                    type="button"
                    className={`snack-status snack-status--cancelled snack-filter-chip ${isStatusFilterActive('cancelled') ? 'snack-filter-chip--active' : ''}`}
                    onClick={() => toggleStatusFilter('cancelled')}
                  >
                    Cancelado
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => setStatusFilter(null)}
                    disabled={!statusFilter}
                  >
                    Limpiar filtros
                  </button>
                </div>
                <p className="snack-filters__active-hint">
                  {statusFilter
                    ? `Filtro activo: ${statusFilterLabels[statusFilter] || statusFilter}`
                    : 'Sin filtros activos'}
                </p>

                {filteredWeeks.length === 0 ? (
                  <div className="empty-state">
                    <p className="empty-state__text">No hay semanas en este rango.</p>
                    <button
                      onClick={() => setSelectedWeekStart(null)}
                      className="btn btn--outline"
                    >
                      Ver todas las semanas
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="table-container snacks-week-table-wrap">
                      <table className="table table--hover snacks-week-table">
                        <thead>
                          <tr>
                            <th style={{ width: '180px' }}>Semana</th>
                            <th>Taller 1</th>
                            <th>Taller 2</th>
                            <th style={{ width: '160px' }}>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredWeeks.map((week) => {
                            const weekStatus = getWeekStatus(week);
                            const t1Status = getTallerStatus(week.taller1);
                            const t2Status = getTallerStatus(week.taller2);

                            return (
                              <tr key={week.fechaInicio}>
                                <td className="snacks-week-table__week-cell">
                                  <strong>{formatWeek(week.monday, week.friday)}</strong>
                                  <br />
                                  <small className="muted-text">
                                    {week.monday.toLocaleDateString('es-AR', { year: 'numeric' })}
                                  </small>
                                  <div className="snack-week-date-actions">
                                    {week.taller1?.suspendido || week.taller2?.suspendido ? (
                                      <button
                                        onClick={() => handleRemoveWeekSuspension(week)}
                                        className="btn btn--sm snack-week-suspend-inline">
                                        Quitar suspensión
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => openSuspendWeekModal(week)}
                                        className="btn btn--sm btn--outline snack-week-suspend-inline"
                                      >
                                        Suspender semana
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* Taller 1 */}
                                <td className="snacks-week-table__taller-cell">
                                  {week.taller1 && t1Status.style !== 'alert' ? (
                                    <div className="snack-week-cell">
                                      {t1Status.isSuspended ? (
                                        <div>
                                          <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                            <strong style={{ color: 'var(--color-text-light)' }}>
                                              {week.taller1.motivoSuspension || 'No hay snacks'}
                                            </strong>
                                          </div>
                                          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span className={getStatusBadgeClass(t1Status.style)}>
                                              {t1Status.label}
                                            </span>
                                            <button
                                              onClick={() => handleDeleteAssignment(week.taller1.id)}
                                              className="btn btn--sm snack-action-button"
                                              title="Quitar suspensión"
                                              style={{ fontSize: '0.875rem', padding: '4px 8px' }}
                                            >
                                              Quitar
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                            <strong>{week.taller1.childName || week.taller1.familiaNombre}</strong>
                                            <br />
                                            <small
                                              className="muted-text"
                                              style={t1Status.isConfirmedState ? { color: 'var(--color-success)', fontWeight: 500 } : undefined}
                                            >
                                              {getAssignmentSecondaryText(week.taller1, t1Status)}
                                            </small>
                                            {t1Status.style === 'cancelled' && week.taller1.motivoCancelacion && (
                                              <small className="muted-text">Motivo: {week.taller1.motivoCancelacion}</small>
                                            )}
                                          </div>
                                          <div className="snack-week-cell__actions">
                                            <span className={getStatusBadgeClass(t1Status.style)}>
                                              {t1Status.label}
                                            </span>
                                            {week.taller1.solicitudCambio && (
                                              <button
                                                onClick={() => openChangeModal(week.taller1)}
                                                className="btn btn--sm btn--outline"
                                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                              >
                                                Ver solicitud
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDeleteAssignment(week.taller1.id)}
                                              className="btn btn--sm snack-delete-button"
                                              title="Eliminar asignación"
                                            >
                                              Eliminar
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="snack-week-cell snack-week-cell--empty">
                                      {week.taller1?.solicitudCambio && (
                                        <button
                                          onClick={() => openChangeModal(week.taller1)}
                                          className="btn btn--sm btn--outline"
                                          style={{ fontSize: '0.75rem', padding: '4px 8px', width: '100%' }}
                                        >
                                          Ver solicitud
                                        </button>
                                      )}
                                      <button
                                        onClick={() => openAssignModal(week, AMBIENTES.TALLER_1)}
                                        className="btn btn--outline btn--sm"
                                        style={{ width: '100%' }}
                                        disabled={isClosedWeek(week)}
                                        title={isClosedWeek(week) ? 'Semana cerrada: la asignación se realiza antes del lunes.' : undefined}
                                      >
                                        {isClosedWeek(week) ? 'Semana cerrada' : '+ Asignar alumno'}
                                      </button>
                                    </div>
                                  )}
                                </td>

                                {/* Taller 2 */}
                                <td className="snacks-week-table__taller-cell">
                                  {week.taller2 && t2Status.style !== 'alert' ? (
                                    <div className="snack-week-cell">
                                      {t2Status.isSuspended ? (
                                        <div>
                                          <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                            <strong style={{ color: 'var(--color-text-light)' }}>
                                              {week.taller2.motivoSuspension || 'No hay snacks'}
                                            </strong>
                                          </div>
                                          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <span className={getStatusBadgeClass(t2Status.style)}>
                                              {t2Status.label}
                                            </span>
                                            <button
                                              onClick={() => handleDeleteAssignment(week.taller2.id)}
                                              className="btn btn--sm snack-action-button"
                                              title="Quitar suspensión"
                                              style={{ fontSize: '0.875rem', padding: '4px 8px' }}>
                                              Quitar
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                            <strong>{week.taller2.childName || week.taller2.familiaNombre}</strong>
                                            <br />
                                            <small
                                              className="muted-text"
                                              style={t2Status.isConfirmedState ? { color: 'var(--color-success)', fontWeight: 500 } : undefined}
                                            >
                                              {getAssignmentSecondaryText(week.taller2, t2Status)}
                                            </small>
                                            {t2Status.style === 'cancelled' && week.taller2.motivoCancelacion && (
                                              <small className="muted-text">Motivo: {week.taller2.motivoCancelacion}</small>
                                            )}
                                          </div>
                                          <div className="snack-week-cell__actions">
                                            <span className={getStatusBadgeClass(t2Status.style)}>
                                              {t2Status.label}
                                            </span>
                                            {week.taller2.solicitudCambio && (
                                              <button
                                                onClick={() => openChangeModal(week.taller2)}
                                                className="btn btn--sm btn--outline"
                                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}>
                                                Ver solicitud
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDeleteAssignment(week.taller2.id)}
                                              className="btn btn--sm snack-delete-button"
                                              title="Eliminar asignación"
                                            >
                                              Eliminar
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="snack-week-cell snack-week-cell--empty">
                                      {week.taller2?.solicitudCambio && (
                                        <button
                                          onClick={() => openChangeModal(week.taller2)}
                                          className="btn btn--sm btn--outline"
                                          style={{ fontSize: '0.75rem', padding: '4px 8px', width: '100%' }}>
                                          Ver solicitud
                                        </button>
                                      )}
                                      <button
                                        onClick={() => openAssignModal(week, AMBIENTES.TALLER_2)}
                                        className="btn btn--outline btn--sm"
                                        style={{ width: '100%' }}
                                        disabled={isClosedWeek(week)}
                                        title={isClosedWeek(week) ? 'Semana cerrada: la asignación se realiza antes del lunes.' : undefined}>
                                        {isClosedWeek(week) ? 'Semana cerrada' : '+ Asignar alumno'}
                                      </button>
                                    </div>
                                  )}
                                </td>

                                {/* Estado General + Acciones */}
                                <td className="snacks-week-table__state-cell">
                                  <div className="snack-week-state">
                                    <span className={getStatusBadgeClass(weekStatus.style)}>
                                      {weekStatus.label}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="snacks-week-cards">
                      {filteredWeeks.map((week) => {
                        const weekStatus = getWeekStatus(week);
                        const t1Status = getTallerStatus(week.taller1);
                        const t2Status = getTallerStatus(week.taller2);

                        return (
                          <div key={week.fechaInicio} className="card snack-week-card">
                            <div className="card__body">
                              <div className="snack-week-card__header">
                                <div>
                                  <strong>{formatWeek(week.monday, week.friday)}</strong>
                                  <div className="muted-text">
                                    {week.monday.toLocaleDateString('es-AR', { year: 'numeric' })}
                                  </div>
                                </div>
                                <span className={getStatusBadgeClass(weekStatus.style)}>
                                  {weekStatus.label}
                                </span>
                              </div>

                              <div className="snack-week-card__section">
                                <div className="snack-week-card__label">Taller 1</div>
                                {week.taller1 && t1Status.style !== 'alert' ? (
                                  t1Status.isSuspended ? (
                                    <div>
                                      <div className="snack-week-card__title muted-text">
                                        {week.taller1.motivoSuspension || 'No hay snacks'}
                                      </div>
                                      <div className="snack-week-card__row">
                                        <span className={getStatusBadgeClass(t1Status.style)}>
                                          {t1Status.label}
                                        </span>
                                        <button
                                          onClick={() => handleDeleteAssignment(week.taller1.id)}
                                          className="btn btn--sm snack-action-button"
                                          title="Quitar suspensión"
                                        >
                                          Quitar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="snack-week-card__title">
                                        {week.taller1.childName || week.taller1.familiaNombre}
                                      </div>
                                      <div
                                        className="muted-text"
                                        style={t1Status.isConfirmedState ? { color: 'var(--color-success)' } : undefined}
                                      >
                                        {getAssignmentSecondaryText(week.taller1, t1Status)}
                                      </div>
                                      {t1Status.style === 'cancelled' && week.taller1.motivoCancelacion && (
                                        <div className="muted-text">Motivo: {week.taller1.motivoCancelacion}</div>
                                      )}
                                      <div className="snack-week-card__row">
                                        <span className={getStatusBadgeClass(t1Status.style)}>
                                          {t1Status.label}
                                        </span>
                                        {week.taller1.solicitudCambio && (
                                          <button
                                            onClick={() => openChangeModal(week.taller1)}
                                            className="btn btn--sm btn--outline"
                                          >
                                            Ver solicitud
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteAssignment(week.taller1.id)}
                                          className="btn btn--sm snack-delete-button"
                                          title="Eliminar asignación"
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <div className="snack-week-card__row">
                                    {week.taller1?.solicitudCambio && (
                                      <button
                                        onClick={() => openChangeModal(week.taller1)}
                                        className="btn btn--sm btn--outline"
                                      >
                                        Ver solicitud
                                      </button>
                                    )}
                                    <button
                                      onClick={() => openAssignModal(week, AMBIENTES.TALLER_1)}
                                      className="btn btn--outline btn--sm"
                                      disabled={isClosedWeek(week)}
                                      title={isClosedWeek(week) ? 'Semana cerrada: la asignación se realiza antes del lunes.' : undefined}
                                    >
                                      {isClosedWeek(week) ? 'Semana cerrada' : '+ Asignar alumno'}
                                    </button>
                                  </div>
                                )}
                              </div>

                              <div className="snack-week-card__section">
                                <div className="snack-week-card__label">Taller 2</div>
                                {week.taller2 && t2Status.style !== 'alert' ? (
                                  t2Status.isSuspended ? (
                                    <div>
                                      <div className="snack-week-card__title muted-text">
                                        {week.taller2.motivoSuspension || 'No hay snacks'}
                                      </div>
                                      <div className="snack-week-card__row">
                                        <span className={getStatusBadgeClass(t2Status.style)}>
                                          {t2Status.label}
                                        </span>
                                        <button
                                          onClick={() => handleDeleteAssignment(week.taller2.id)}
                                          className="btn btn--sm snack-action-button"
                                          title="Quitar suspensión"
                                        >
                                          Quitar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      <div className="snack-week-card__title">
                                        {week.taller2.childName || week.taller2.familiaNombre}
                                      </div>
                                      <div
                                        className="muted-text"
                                        style={t2Status.isConfirmedState ? { color: 'var(--color-success)' } : undefined}
                                      >
                                        {getAssignmentSecondaryText(week.taller2, t2Status)}
                                      </div>
                                      {t2Status.style === 'cancelled' && week.taller2.motivoCancelacion && (
                                        <div className="muted-text">Motivo: {week.taller2.motivoCancelacion}</div>
                                      )}
                                      <div className="snack-week-card__row">
                                        <span className={getStatusBadgeClass(t2Status.style)}>
                                          {t2Status.label}
                                        </span>
                                        {week.taller2.solicitudCambio && (
                                          <button
                                            onClick={() => openChangeModal(week.taller2)}
                                            className="btn btn--sm btn--outline"
                                          >
                                            Ver solicitud
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteAssignment(week.taller2.id)}
                                          className="btn btn--sm snack-delete-button"
                                          title="Eliminar asignación"
                                        >
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                  )
                                ) : (
                                  <div className="snack-week-card__row">
                                    {week.taller2?.solicitudCambio && (
                                      <button
                                        onClick={() => openChangeModal(week.taller2)}
                                        className="btn btn--sm btn--outline"
                                      >
                                        Ver solicitud
                                      </button>
                                    )}
                                    <button
                                      onClick={() => openAssignModal(week, AMBIENTES.TALLER_2)}
                                      className="btn btn--outline btn--sm"
                                      disabled={isClosedWeek(week)}
                                      title={isClosedWeek(week) ? 'Semana cerrada: la asignación se realiza antes del lunes.' : undefined}
                                    >
                                      {isClosedWeek(week) ? 'Semana cerrada' : '+ Asignar alumno'}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {week.taller1?.suspendido || week.taller2?.suspendido ? (
                                <button
                                  onClick={() => handleRemoveWeekSuspension(week)}
                                  className="btn btn--sm snack-action-button snack-week-card__suspend"
                                >
                                  Quitar suspensión
                                </button>
                              ) : (
                                <button
                                  onClick={() => openSuspendWeekModal(week)}
                                  className="btn btn--outline btn--sm snack-week-card__suspend"
                                >
                                  Suspender semana
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spacing-lg)' }}>
                      <button
                        className="btn btn--outline"
                        onClick={() => setWeeksAhead((prev) => prev + WEEKS_STEP)}>
                        Cargar mas
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="card events-calendar-panel">
            <div className="card__header">
              <div>
                <h3 className="card__title">Calendario</h3>
                <p className="card__subtitle">
                  {monthNames[selectedMonthIndex]} {selectedMonthYear}
                </p>
              </div>
              <span className="badge badge--info">{weeksInSelectedMonth.length} semanas</span>
            </div>
            <div className="card__body">
              <div className="event-calendar events-calendar--manager">
                <div className="event-calendar__header">
                  <button
                    onClick={() => handleMonthChange(-1)}
                    className="event-calendar__nav-btn"
                    aria-label="Mes anterior">
                    <Icon name="chevron-left" size={16} className="event-calendar__nav-icon" />
                  </button>
                  <div className="event-calendar__month">
                    {monthNames[selectedMonthIndex]} {selectedMonthYear}
                  </div>
                  <div className="event-calendar__actions">
                    <button
                      onClick={() => handleMonthChange(1)}
                      className="event-calendar__nav-btn"
                      aria-label="Siguiente mes">
                      <Icon name="chevron-right" size={16} className="event-calendar__nav-icon" />
                    </button>
                    <button
                      onClick={goToToday}
                      className="event-calendar__today-btn"
                      type="button">
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
                    if (!day) {
                      return (
                        <div
                          key={index}
                          className="event-calendar__day event-calendar__day--empty"
                        />
                      );
                    }

                    const date = new Date(selectedMonthYear, selectedMonthIndex, day);
                    const weekStart = getWeekStart(date);
                    const weekKey = toISODate(weekStart);
                    const weekHasData = hasWeekData(weeksByStart.get(weekKey));
                    const showWeekDot = weekHasData && date.getDay() === 1;
                    const isSelectedWeek = selectedWeekKey === weekKey;

                    return (
                      <div
                        key={index}
                        className={`event-calendar__day event-calendar__day--active ${showWeekDot ? 'event-calendar__day--has-event' : ''} ${isSelectedWeek ? 'event-calendar__day--selected' : ''} ${isToday(day) ? 'event-calendar__day--today' : ''}`}
                        onClick={() => handleWeekSelection(weekStart)}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedWeekKey && (
                <button
                  className="btn btn--sm btn--outline events-calendar-clear"
                  onClick={() => setSelectedWeekStart(null)}>
                  Ver todas las semanas
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
{/* Modal: Asignar Familia */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)}>
        <ModalHeader
          title="Asignar Snacks"
          onClose={() => setShowAssignModal(false)}
        />
        <ModalBody>
          {selectedWeek && selectedTaller && (
            <div>
              <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-sm)', background: 'var(--color-background-alt)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ margin: 0 }}>
                  <strong>Semana:</strong> {formatWeek(selectedWeek.monday, selectedWeek.friday)}
                </p>
                <p style={{ margin: '4px 0 0 0' }}>
                  <strong>Taller:</strong> {selectedTaller === AMBIENTES.TALLER_1 ? 'Taller 1' : 'Taller 2'}
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="childSelect">Seleccionar Alumno *</label>
                <select
                  id="childSelect"
                  value={selectedChildId}
                  onChange={async (e) => {
                    const id = e.target.value;
                    setSelectedChildId(id);
                    // Cargar familias para este alumno para mostrar en modal
                    if (!id) { return; }
                    const c = childrenByTaller[selectedTaller]?.find(ch => ch.id === id);
                    if (!c) { return; }
                    const responsables = Array.isArray(c.responsables) ? c.responsables : [];
                    const familyPromises = responsables.map(async (uid) => {
                      const res = await usersService.getUserById(uid);
                      return res.success && res.user ? { uid, name: res.user.displayName || res.user.email || uid, email: res.user.email || '' } : { uid, name: uid, email: '' };
                    });
                    const familias = await Promise.all(familyPromises);
                    setSelectedChildFamilies(familias);
                  }}
                  className="form-input"
                  disabled={loadingFamilies}
                >
                  <option value="">-- Seleccionar --</option>
                  {childrenByTaller[selectedTaller]?.map(child => (
                    <option key={child.id} value={child.id}>
                      {child.nombreCompleto || child.nombre || `Alumno ${child.id}`}
                    </option>
                  ))}
                </select>
                {loadingFamilies && (
                  <small className="form-helper-text">
                    Cargando alumnos...
                  </small>
                )}
                {childrenByTaller[selectedTaller]?.length === 0 && (
                  <small className="form-helper-text" style={{ color: 'var(--color-error)' }}>
                    No hay alumnos en este taller. Verifica la carga de alumnos.
                  </small>
                )}
                <small className="form-helper-text">
                  Alumnos disponibles: {childrenByTaller[selectedTaller]?.length || 0}
                </small>

                {/* Mostrar familias del alumno seleccionado */}
                {selectedChildFamilies.length > 0 && (
                  <div style={{ marginTop: 'var(--spacing-md)' }}>
                    <label>Familias responsables (serán notificadas en el recordatorio)</label>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {selectedChildFamilies.map(f => (
                        <div key={f.uid} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-background)' }}>
                          <div style={{ fontWeight: 600 }}>{f.name}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>{f.email}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div> 
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <button onClick={() => setShowAssignModal(false)} className="btn btn--outline">
            Cancelar
          </button>
          <button onClick={handleCreateAssignment} className="btn btn--primary">
            Asignar
          </button>
        </ModalFooter>
      </Modal>

      {/* Modal: Gestión de Cambio */}
      <Modal isOpen={showChangeModal} onClose={() => setShowChangeModal(false)}>
        <ModalHeader
          title="Solicitud de Cambio"
          onClose={() => setShowChangeModal(false)}
        />
        <ModalBody>
          {selectedAssignment && (
            <div>
              <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-sm)', background: 'var(--color-background-alt)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ margin: 0 }}><strong>Alumno:</strong> {selectedAssignment.childName || selectedAssignment.familiaNombre}</p>
                <p style={{ margin: '4px 0 0 0' }}><strong>Semana asignada:</strong> {selectedAssignment.fechaInicio}</p>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-error-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-error)' }}>
                <strong style={{ color: 'var(--color-error)' }}>Motivo:</strong>
                <p style={{ marginTop: 'var(--spacing-xs)', whiteSpace: 'pre-wrap' }}>
                  {selectedAssignment.motivoCambio || 'Sin motivo especificado'}
                </p>
              </div>

              <div style={{ padding: 'var(--spacing-sm)', background: 'var(--color-background-alt)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: '0.9rem', margin: 0 }}>
                  <strong>Pasos siguientes:</strong>
                </p>
                <ol style={{ marginTop: 'var(--spacing-xs)', paddingLeft: '20px', fontSize: '0.9rem' }}>
                  <li>Elimina esta asignación</li>
                  <li>Asigna otra familia para esta semana</li>
                  <li>Crea nueva asignación en la fecha que solicitó la familia</li>
                </ol>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <button onClick={() => setShowChangeModal(false)} className="btn btn--outline">
            Cerrar
          </button>
          <button
            onClick={() => selectedAssignment && handleDeleteAssignment(selectedAssignment.id)}
            className="btn btn--error"
          >
            Eliminar asignación
          </button>
        </ModalFooter>
      </Modal>

      {/* Modal: Suspender Semana */}
      <Modal isOpen={showSuspendModal} onClose={() => setShowSuspendModal(false)}>
        <ModalHeader
          title="Suspender semana"
          onClose={() => setShowSuspendModal(false)}
        />
        <ModalBody>
          {suspendTargetWeek && (
            <div>
              <div style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-sm)', background: 'var(--color-background-alt)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ margin: 0 }}>
                  <strong>Semana:</strong> {formatWeek(suspendTargetWeek.monday, suspendTargetWeek.friday)}
                </p>
                <p style={{ margin: '4px 0 0 0' }}>
                  Se suspende para ambos talleres.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="suspendReason">Motivo *</label>
                <input
                  id="suspendReason"
                  type="text"
                  className="form-input"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Ej: Vacaciones de invierno"
                />
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <button onClick={() => setShowSuspendModal(false)} className="btn btn--outline">
            Cancelar
          </button>
          <button onClick={confirmSuspendWeek} className="btn btn--primary">
            Confirmar suspensión
          </button>
        </ModalFooter>
      </Modal>

      {/* Modal de Loading */}
      <LoadingModal isOpen={saving} message="Guardando..." />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.closeDialog}
        onConfirm={confirmDialog.dialogData.onConfirm}
        title={confirmDialog.dialogData.title}
        message={confirmDialog.dialogData.message}
        type={confirmDialog.dialogData.type}
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






