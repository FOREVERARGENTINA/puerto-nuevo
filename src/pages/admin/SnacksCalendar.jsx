import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { snacksService } from '../../services/snacks.service';
import { usersService } from '../../services/users.service';
import { childrenService } from '../../services/children.service';
import { ROUTES, AMBIENTES } from '../../config/constants';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/common/Modal';
import { LoadingModal } from '../../components/common/LoadingModal';
import { useDialog } from '../../hooks/useDialog';

export function SnacksCalendar() {
  const [assignmentsTaller1, setAssignmentsTaller1] = useState([]);
  const [assignmentsTaller2, setAssignmentsTaller2] = useState([]);
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
  const [success, setSuccess] = useState('');

  const confirmDialog = useDialog();

  // Cargar familias por taller
  const loadFamiliesByTaller = async (taller) => {
    try {
      console.log(`Cargando familias para ${taller}...`);
      const childrenResult = await childrenService.getChildrenByAmbiente(taller);

      if (!childrenResult.success) {
        console.error(`Error al cargar hijos de ${taller}:`, childrenResult.error);
        return [];
      }

      console.log(`📚 Hijos en ${taller}:`, childrenResult.children.length);

      const responsableUids = new Set();
      childrenResult.children.forEach(child => {
        (child.responsables || []).forEach(r => responsableUids.add(r));
      });

      console.log(`👥 Responsables únicos en ${taller}:`, responsableUids.size);

      if (responsableUids.size === 0) return [];

      const userPromises = Array.from(responsableUids).map(uid => usersService.getUserById(uid));
      const usersResults = await Promise.all(userPromises);
      const familyUsers = usersResults
        .filter(r => r.success && r.user && r.user.role === 'family')
        .map(r => r.user);

      console.log(`Familias cargadas para ${taller}:`, familyUsers.length);
      familyUsers.forEach(f => console.log(`  - ${f.displayName || f.email}`));

      // Guardar también la lista de hijos para este taller
      setChildrenByTaller(prev => ({ ...prev, [taller]: childrenResult.children }));

      return familyUsers; 
    } catch (err) {
      console.error('Error cargando familias:', err);
      return [];
    }
  };

  // Cargar todas las asignaciones
  const loadAllAssignments = async () => {
    setLoading(true);
    try {
      const [result1, result2] = await Promise.all([
        snacksService.getAssignmentsByAmbiente(AMBIENTES.TALLER_1),
        snacksService.getAssignmentsByAmbiente(AMBIENTES.TALLER_2),
        loadFamiliesByTaller(AMBIENTES.TALLER_1),
        loadFamiliesByTaller(AMBIENTES.TALLER_2)
      ]);

      if (result1.success) setAssignmentsTaller1(result1.assignments);
      if (result2.success) setAssignmentsTaller2(result2.assignments);

      console.log('🔑 AMBIENTES.TALLER_1:', AMBIENTES.TALLER_1);
      console.log('🔑 AMBIENTES.TALLER_2:', AMBIENTES.TALLER_2);
    } catch (err) {
      console.error('Error en loadAllAssignments:', err);
      setError('Error al cargar asignaciones: ' + err.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllAssignments();
  }, []);

  // Generar semanas hasta fin de año (excluyendo última semana de diciembre)
  const generateWeeks = () => {
    const weeks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Encontrar próximo lunes
    let currentMonday = new Date(today);
    const dayOfWeek = currentMonday.getDay();

    if (dayOfWeek === 1) {
      // Ya es lunes
    } else if (dayOfWeek === 0) {
      currentMonday.setDate(currentMonday.getDate() + 1);
    } else {
      const daysUntilMonday = 8 - dayOfWeek;
      currentMonday.setDate(currentMonday.getDate() + daysUntilMonday);
    }

    // Calcular límite: 20 de diciembre (para no incluir semana de fin de año)
    const endLimit = new Date(today.getFullYear(), 11, 20); // 20 de diciembre
    endLimit.setHours(0, 0, 0, 0);

    // Generar semanas hasta el 20 de diciembre
    while (currentMonday <= endLimit) {
      const monday = new Date(currentMonday);
      const friday = new Date(monday);
      friday.setDate(friday.getDate() + 4);

      const mondayStr = monday.toISOString().split('T')[0];
      const fridayStr = friday.toISOString().split('T')[0];

      const assignmentT1 = assignmentsTaller1.find(a => a.fechaInicio === mondayStr);
      const assignmentT2 = assignmentsTaller2.find(a => a.fechaInicio === mondayStr);

      weeks.push({
        fechaInicio: mondayStr,
        fechaFin: fridayStr,
        monday,
        friday,
        taller1: assignmentT1 || null,
        taller2: assignmentT2 || null
      });

      currentMonday.setDate(currentMonday.getDate() + 7);
    }

    console.log(`📅 Generadas ${weeks.length} semanas hasta fin de año`);
    return weeks;
  };

  // Abrir modal de asignación
  const openAssignModal = (week, taller) => {
    console.log('🔓 Abriendo modal para:', taller);
    console.log('Hijos disponibles:', childrenByTaller);
    console.log('👥 Hijos para', taller, ':', childrenByTaller[taller]);
    setSelectedWeek(week);
    setSelectedTaller(taller);
    setSelectedChildId('');
    setShowAssignModal(true);
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
      setSuccess('Asignación existente actualizada con el alumno seleccionado');
    } else {
      setSuccess('Asignación creada para el alumno; las familias recibirán recordatorio programado');
    }

    await loadAllAssignments();
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
          setSuccess('Asignación eliminada');
          setShowChangeModal(false);
          await loadAllAssignments();
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
    if (!assignment) return { style: 'empty', label: 'Sin asignar' };
    if (assignment.suspendido || assignment.estado === 'suspendido') {
      return { style: 'suspended', label: 'No hay snacks', isSuspended: true };
    }
    if (assignment.solicitudCambio) return { style: 'alert', label: 'Cambio solicitado' };
    if (assignment.confirmadoPorFamilia) return { style: 'confirmed', label: 'Confirmado' };
    return { style: 'pending', label: 'Pendiente confirmación' };
  };

  const getWeekStatus = (week) => {
    const hasT1 = !!week.taller1;
    const hasT2 = !!week.taller2;

    if (!hasT1 || !hasT2) return { style: 'incomplete', label: 'Incompleto' };

    const t1Status = getTallerStatus(week.taller1);
    const t2Status = getTallerStatus(week.taller2);

    if (t1Status.style === 'alert' || t2Status.style === 'alert') {
      return { style: 'alert', label: 'Requiere atención' };
    }

    if (t1Status.style === 'confirmed' && t2Status.style === 'confirmed') {
      return { style: 'complete', label: 'Completo' };
    }

    return { style: 'pending', label: 'Pendiente' };
  };

  const getStatusBadgeClass = (style) => {
    switch (style) {
      case 'empty': return 'snack-status snack-status--empty';
      case 'alert': return 'snack-status snack-status--alert';
      case 'confirmed': return 'snack-status snack-status--confirmed';
      case 'pending': return 'snack-status snack-status--pending';
      case 'incomplete': return 'snack-status snack-status--incomplete';
      case 'complete': return 'snack-status snack-status--complete';
      case 'suspended': return 'snack-status snack-status--suspended';
      default: return 'snack-status';
    }
  };

  // Marcar TODA la semana como suspendida (ambos talleres)
  const handleSuspendWeek = async (week) => {
    const motivo = prompt('Motivo de la suspensión para AMBOS talleres (ej: Vacaciones de invierno, Feriado largo):', 'Vacaciones');
    if (!motivo) return;

    setSaving(true);

    // Crear suspensión para ambos talleres
    const [result1, result2] = await Promise.all([
      snacksService.createSuspendedWeek(AMBIENTES.TALLER_1, week.fechaInicio, week.fechaFin, motivo),
      snacksService.createSuspendedWeek(AMBIENTES.TALLER_2, week.fechaInicio, week.fechaFin, motivo)
    ]);

    setSaving(false);

    if (result1.success && result2.success) {
      setSuccess('Semana completa marcada como suspendida (ambos talleres)');
      await loadAllAssignments();
    } else {
      setError('Error al marcar semana como suspendida');
    }
  };

  const weeks = generateWeeks();

  if (loading) {
    return (
      <div className="container page-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div className="card">
        <div className="card__header">
          <div>
            <h1 className="card__title">Calendario de Snacks</h1>
            <p className="muted-text">Vista unificada de ambos talleres - Año escolar {new Date().getFullYear()}</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline">
              ← Volver
            </Link>
          </div>
        </div>

        <div className="card__body">
          {error && (
            <div className="alert alert--error mb-md" onClick={() => setError('')}>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert--success mb-md" onClick={() => setSuccess('')}>
              {success}
            </div>
          )}

          {/* Leyenda */}
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-lg)',
            flexWrap: 'wrap',
            padding: 'var(--spacing-md)',
            background: 'var(--color-background-alt)',
            borderRadius: 'var(--radius-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <span className="snack-status snack-status--empty">Sin asignar</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <span className="snack-status snack-status--pending">Pendiente</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <span className="snack-status snack-status--confirmed">Confirmado</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <span className="snack-status snack-status--alert">Cambio solicitado</span>
            </div>
          </div>

          {/* Tabla de Semanas */}
          <div className="table-container">
            <table className="table table--hover">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Semana</th>
                  <th>Taller 1</th>
                  <th>Taller 2</th>
                  <th style={{ width: '160px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => {
                  const weekStatus = getWeekStatus(week);
                  const t1Status = getTallerStatus(week.taller1);
                  const t2Status = getTallerStatus(week.taller2);

                  return (
                    <tr key={week.fechaInicio}>
                      <td>
                        <strong>{formatWeek(week.monday, week.friday)}</strong>
                        <br />
                        <small className="muted-text">
                          {week.monday.toLocaleDateString('es-AR', { year: 'numeric' })}
                        </small>
                      </td>

                      {/* Taller 1 */}
                      <td>
                        {week.taller1 ? (
                          <div>
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
                                    className="btn btn--sm btn--ghost"
                                    title="Quitar suspensión"
                                    style={{ fontSize: '0.875rem', padding: '4px 8px', color: 'var(--color-text-light)' }}
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
                                  {week.taller1.confirmadoPor ? (
                                    <small className="muted-text" style={{ color: 'var(--color-success)', fontWeight: 500 }}>
                                      Confirmado por: {week.taller1.confirmadoPor}
                                    </small>
                                  ) : (
                                    <small className="muted-text">{week.taller1.familiaEmail || ''}</small>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap', marginTop: 'var(--spacing-xs)' }}>
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
                                    className="btn btn--sm btn--ghost"
                                    title="Eliminar asignación"
                                    style={{ fontSize: '0.875rem', padding: '4px 8px', color: 'var(--color-text-light)' }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => openAssignModal(week, AMBIENTES.TALLER_1)}
                            className="btn btn--outline btn--sm"
                            style={{ width: '100%' }}
                          >
                            + Asignar alumno
                          </button>
                        )}
                      </td>

                      {/* Taller 2 */}
                      <td>
                        {week.taller2 ? (
                          <div>
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
                                    className="btn btn--sm btn--ghost"
                                    title="Quitar suspensión"
                                    style={{ fontSize: '0.875rem', padding: '4px 8px', color: 'var(--color-text-light)' }}
                                  >
                                    Quitar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                                  <strong>{week.taller2.childName || week.taller2.familiaNombre}</strong>
                                  <br />
                                  {week.taller2.confirmadoPor ? (
                                    <small className="muted-text" style={{ color: 'var(--color-success)', fontWeight: 500 }}>
                                      Confirmado por: {week.taller2.confirmadoPor}
                                    </small>
                                  ) : (
                                    <small className="muted-text">{week.taller2.familiaEmail || ''}</small>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap', marginTop: 'var(--spacing-xs)' }}>
                                  <span className={getStatusBadgeClass(t2Status.style)}>
                                    {t2Status.label}
                                  </span>
                                  {week.taller2.solicitudCambio && (
                                    <button
                                      onClick={() => openChangeModal(week.taller2)}
                                      className="btn btn--sm btn--outline"
                                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                    >
                                      Ver solicitud
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteAssignment(week.taller2.id)}
                                    className="btn btn--sm btn--ghost"
                                    title="Eliminar asignación"
                                    style={{ fontSize: '0.875rem', padding: '4px 8px', color: 'var(--color-text-light)' }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => openAssignModal(week, AMBIENTES.TALLER_2)}
                            className="btn btn--outline btn--sm"
                            style={{ width: '100%' }}
                          >
                            + Asignar alumno
                          </button>
                        )}
                      </td>

                      {/* Estado General + Acciones */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', alignItems: 'flex-start' }}>
                          <span className={getStatusBadgeClass(weekStatus.style)}>
                            {weekStatus.label}
                          </span>
                          {!week.taller1 && !week.taller2 && (
                            <button
                              onClick={() => handleSuspendWeek(week)}
                              className="btn btn--ghost btn--sm"
                              style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', padding: '2px 8px' }}
                            >
                              ⛔ No hay snacks esta semana
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                >
                  <option value="">-- Seleccionar --</option>
                  {childrenByTaller[selectedTaller]?.map(child => (
                    <option key={child.id} value={child.id}>
                      {child.nombreCompleto || child.nombre || `Alumno ${child.id}`}
                    </option>
                  ))}
                </select>
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
    </div>
  );
}





