import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { snacksService } from '../../services/snacks.service';
import { usersService } from '../../services/users.service';
import { ROUTES, AMBIENTES } from '../../config/constants';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { useDialog } from '../../hooks/useDialog';

export function SnacksCalendar() {
  const { user } = useAuth();
  const [ambiente, setAmbiente] = useState(AMBIENTES.TALLER_1);
  const [assignments, setAssignments] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'table'

  const confirmDialog = useDialog();

  const [formData, setFormData] = useState({
    fechaInicio: '',
    familiaUid: '',
    familiaEmail: '',
    familiaNombre: ''
  });

  // Cargar familias
  const loadFamilies = async () => {
    const result = await usersService.getAllUsers();
    if (result.success) {
      const familyUsers = result.users.filter(u => u.role === 'family');
      setFamilies(familyUsers);
    }
  };

  // Cargar asignaciones del ambiente
  const loadAssignments = async () => {
    setLoading(true);
    const result = await snacksService.getAssignmentsByAmbiente(ambiente);
    if (result.success) {
      setAssignments(result.assignments);
    } else {
      setError('Error al cargar asignaciones: ' + result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [ambiente]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'familiaUid') {
      const selectedFamily = families.find(f => f.id === value);
      setFormData(prev => ({
        ...prev,
        familiaUid: value,
        familiaEmail: selectedFamily?.email || '',
        familiaNombre: selectedFamily?.displayName || selectedFamily?.email || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.fechaInicio || !formData.familiaUid) {
      setError('Todos los campos son obligatorios');
      return;
    }

    // Validar que fechaInicio sea lunes
    const inicio = new Date(formData.fechaInicio + 'T00:00:00');

    if (inicio.getDay() !== 1) {
      setError('La fecha debe ser un lunes');
      return;
    }

    // Calcular automáticamente el viernes (4 días después del lunes)
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 4);
    const fechaFin = fin.toISOString().split('T')[0];

    const result = await snacksService.createSnackAssignment({
      ambiente,
      fechaInicio: formData.fechaInicio,
      fechaFin: fechaFin,
      familiaUid: formData.familiaUid,
      familiaEmail: formData.familiaEmail,
      familiaNombre: formData.familiaNombre
    });

    if (result.success) {
      setSuccess('Asignación creada exitosamente');
      setFormData({
        fechaInicio: '',
        familiaUid: '',
        familiaEmail: '',
        familiaNombre: ''
      });
      setShowCreateForm(false);
      await loadAssignments();
    } else {
      setError('Error al crear asignación: ' + result.error);
    }
  };

  const handleDelete = async (assignmentId) => {
    confirmDialog.openDialog({
      title: 'Eliminar Asignación',
      message: '¿Estás seguro de eliminar esta asignación?',
      type: 'danger',
      onConfirm: async () => {
        const result = await snacksService.deleteAssignment(assignmentId);
        if (result.success) {
          setSuccess('Asignación eliminada');
          await loadAssignments();
        } else {
          setError('Error al eliminar: ' + result.error);
        }
      }
    });
  };

  const handleMarkCompleted = async (assignmentId) => {
    const result = await snacksService.markAsCompleted(assignmentId);
    if (result.success) {
      setSuccess('Marcado como completado');
      await loadAssignments();
    } else {
      setError('Error: ' + result.error);
    }
  };

  const getEstadoBadgeClass = (estado) => {
    switch (estado) {
      case 'confirmado':
        return 'badge--success';
      case 'completado':
        return 'badge--info';
      case 'cambio_solicitado':
        return 'badge--error';
      default:
        return 'badge--warning';
    }
  };

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'confirmado':
        return 'Confirmado';
      case 'completado':
        return 'Completado';
      case 'cambio_solicitado':
        return 'Cambio solicitado';
      case 'pendiente':
        return 'Pendiente';
      default:
        return estado;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatWeek = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');

    const inicioStr = inicio.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    const finStr = fin.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

    return `Semana del ${inicioStr} al ${finStr}`;
  };

  // Generar próximas 16 semanas (4 meses aproximadamente)
  const generateWeeks = () => {
    const weeks = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Debug: ver qué fechas tienen las asignaciones
    console.log('Asignaciones actuales:', assignments.map(a => ({
      fecha: a.fechaInicio,
      familia: a.familiaNombre
    })));

    // Encontrar el próximo lunes o lunes actual
    let currentMonday = new Date(today);
    const dayOfWeek = currentMonday.getDay();

    if (dayOfWeek === 1) {
      // Ya es lunes, empezar desde hoy
    } else if (dayOfWeek === 0) {
      // Es domingo, ir al lunes siguiente
      currentMonday.setDate(currentMonday.getDate() + 1);
    } else {
      // Otro día, ir al próximo lunes
      const daysUntilMonday = 8 - dayOfWeek;
      currentMonday.setDate(currentMonday.getDate() + daysUntilMonday);
    }

    // Generar 16 semanas
    for (let i = 0; i < 16; i++) {
      const monday = new Date(currentMonday);
      monday.setHours(0, 0, 0, 0);

      const friday = new Date(monday);
      friday.setDate(friday.getDate() + 4);
      friday.setHours(0, 0, 0, 0);

      // Formato YYYY-MM-DD
      const mondayStr = monday.toISOString().split('T')[0];
      const fridayStr = friday.toISOString().split('T')[0];

      // Buscar si esta semana tiene asignación
      const assignment = assignments.find(a => {
        const match = a.fechaInicio === mondayStr;
        if (match) {
          console.log('Match encontrado:', mondayStr, a.familiaNombre);
        }
        return match;
      });

      weeks.push({
        fechaInicio: mondayStr,
        fechaFin: fridayStr,
        assignment: assignment || null,
        monday: monday,
        friday: friday
      });

      // Avanzar a la próxima semana
      currentMonday.setDate(currentMonday.getDate() + 7);
    }

    console.log('Semanas generadas:', weeks.map(w => ({
      fecha: w.fechaInicio,
      tieneAsignacion: !!w.assignment,
      familia: w.assignment?.familiaNombre
    })));

    return weeks;
  };

  const getWeekCardStyle = (week) => {
    if (!week.assignment) {
      return {
        background: '#f5f5f5',
        border: '2px dashed #ccc',
        color: '#999'
      };
    }

    if (week.assignment.solicitudCambio) {
      return {
        background: 'var(--color-error-light)',
        border: '2px solid var(--color-error)'
      };
    }

    if (week.assignment.confirmadoPorFamilia) {
      return {
        background: '#e8f5e9',
        border: '2px solid var(--color-success)'
      };
    }

    return {
      background: '#fff3e0',
      border: '2px solid var(--color-warning)'
    };
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">📅 Calendario de Snacks</h1>
          <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline">
            ← Volver al Dashboard
          </Link>
        </div>

        <div className="card__body">
          {error && (
            <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>
              {success}
            </div>
          )}

          {/* Selector de Ambiente */}
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <label htmlFor="ambiente" style={{ display: 'block', marginBottom: 'var(--spacing-sm)', fontWeight: 600 }}>
              Seleccionar Taller:
            </label>
            <select
              id="ambiente"
              value={ambiente}
              onChange={(e) => setAmbiente(e.target.value)}
              className="form-input"
              style={{ maxWidth: '300px' }}
            >
              <option value={AMBIENTES.TALLER_1}>Taller 1</option>
              <option value={AMBIENTES.TALLER_2}>Taller 2</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
              <p><strong>Total de asignaciones:</strong> {assignments.length}</p>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', background: 'var(--color-background)', padding: 'var(--spacing-xs)', borderRadius: 'var(--border-radius)' }}>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={`btn btn--sm ${viewMode === 'calendar' ? 'btn--primary' : 'btn--outline'}`}
                >
                  📅 Calendario
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`btn btn--sm ${viewMode === 'table' ? 'btn--primary' : 'btn--outline'}`}
                >
                  📋 Tabla
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn--primary"
            >
              {showCreateForm ? 'Cancelar' : '+ Nueva Asignación'}
            </button>
          </div>

          {/* Formulario Crear Asignación */}
          {showCreateForm && (
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', background: 'var(--color-background)' }}>
              <div className="card__body">
                <h3>Nueva Asignación de Snacks</h3>
                <form onSubmit={handleCreateAssignment} style={{ marginTop: 'var(--spacing-md)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
                    <div className="form-group">
                      <label htmlFor="familiaUid">Familia Responsable *</label>
                      <select
                        id="familiaUid"
                        name="familiaUid"
                        value={formData.familiaUid}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                      >
                        <option value="">Seleccionar familia...</option>
                        {families.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.displayName || f.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="fechaInicio">Semana (selecciona el lunes) *</label>
                      <input
                        type="date"
                        id="fechaInicio"
                        name="fechaInicio"
                        value={formData.fechaInicio}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                      />
                      <small style={{ color: 'var(--color-text-light)' }}>Debe ser un lunes - el viernes se calcula automáticamente</small>
                    </div>
                  </div>

                  <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button type="submit" className="btn btn--primary">
                      Crear Asignación
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="btn btn--outline"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Vista Calendario */}
          {loading ? (
            <p>Cargando calendario...</p>
          ) : viewMode === 'calendar' ? (
            <>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3 style={{ marginBottom: 'var(--spacing-sm)' }}>Próximas 16 semanas</h3>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <div style={{ width: '20px', height: '20px', background: '#f5f5f5', border: '2px dashed #ccc' }}></div>
                    <small>Sin asignar</small>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <div style={{ width: '20px', height: '20px', background: '#fff3e0', border: '2px solid var(--color-warning)' }}></div>
                    <small>Pendiente confirmación</small>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <div style={{ width: '20px', height: '20px', background: '#e8f5e9', border: '2px solid var(--color-success)' }}></div>
                    <small>Confirmado</small>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                    <div style={{ width: '20px', height: '20px', background: 'var(--color-error-light)', border: '2px solid var(--color-error)' }}></div>
                    <small>Solicitud de cambio</small>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                {generateWeeks().map((week, index) => {
                  const cardStyle = getWeekCardStyle(week);
                  const isFirstOfMonth = week.monday.getDate() <= 7;

                  return (
                    <div key={week.fechaInicio}>
                      {isFirstOfMonth && (
                        <div style={{ gridColumn: '1 / -1', marginTop: index > 0 ? 'var(--spacing-lg)' : 0, marginBottom: 'var(--spacing-sm)' }}>
                          <h4 style={{ color: 'var(--color-primary)' }}>
                            {week.monday.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }).toUpperCase()}
                          </h4>
                        </div>
                      )}
                      <div
                        className="card"
                        style={{
                          ...cardStyle,
                          padding: 'var(--spacing-md)',
                          cursor: week.assignment ? 'default' : 'pointer'
                        }}
                        onClick={() => {
                          if (!week.assignment && !showCreateForm) {
                            setFormData(prev => ({ ...prev, fechaInicio: week.fechaInicio }));
                            setShowCreateForm(true);
                          }
                        }}
                      >
                        <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                          <strong style={{ fontSize: '0.9rem' }}>
                            {week.monday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} - {week.friday.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                          </strong>
                        </div>

                        {week.assignment ? (
                          <>
                            <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                              <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                                {week.assignment.familiaNombre}
                              </p>
                              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-light)' }}>
                                {week.assignment.familiaEmail}
                              </p>
                            </div>

                            {week.assignment.solicitudCambio && (
                              <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-xs)', background: 'white', borderRadius: 'var(--border-radius)' }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-error)' }}>
                                  ⚠️ Solicitud de cambio
                                </p>
                                {week.assignment.motivoCambio && (
                                  <p style={{ fontSize: '0.75rem', marginTop: 'var(--spacing-xs)', whiteSpace: 'pre-wrap' }}>
                                    {week.assignment.motivoCambio.substring(0, 60)}{week.assignment.motivoCambio.length > 60 ? '...' : ''}
                                  </p>
                                )}
                              </div>
                            )}

                            {week.assignment.confirmadoPorFamilia && !week.assignment.solicitudCambio && (
                              <div style={{ marginTop: 'var(--spacing-sm)' }}>
                                <span className="badge badge--success badge--sm">✓ Confirmado</span>
                              </div>
                            )}

                            <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', gap: 'var(--spacing-xs)' }}>
                              {week.assignment.estado !== 'completado' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkCompleted(week.assignment.id);
                                  }}
                                  className="btn btn--sm btn--success"
                                  title="Marcar completado"
                                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                                >
                                  ✓
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(week.assignment.id);
                                }}
                                className="btn btn--sm btn--error"
                                title="Eliminar"
                                style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                              >
                                ×
                              </button>
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: 'center', padding: 'var(--spacing-md) 0' }}>
                            <p style={{ fontSize: '0.85rem', color: '#999' }}>
                              Sin asignar
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#999', marginTop: 'var(--spacing-xs)' }}>
                              Click para asignar
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : assignments.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: 'var(--spacing-xl)' }}>
              No hay asignaciones para este taller. Crea la primera asignación.
            </p>
          ) : (
            /* Vista Tabla */
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Semana</th>
                    <th>Familia</th>
                    <th>Estado</th>
                    <th>Detalles</th>
                    <th>Recordatorio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map(assignment => (
                    <tr key={assignment.id} style={{
                      background: assignment.solicitudCambio ? 'var(--color-error-light)' : 'transparent'
                    }}>
                      <td>
                        <strong>{formatWeek(assignment.fechaInicio, assignment.fechaFin)}</strong>
                      </td>
                      <td>
                        <div>
                          <strong>{assignment.familiaNombre}</strong>
                          <br />
                          <small style={{ color: 'var(--color-text-light)' }}>
                            {assignment.familiaEmail}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getEstadoBadgeClass(assignment.estado)}`}>
                          {getEstadoLabel(assignment.estado)}
                        </span>
                      </td>
                      <td>
                        {assignment.solicitudCambio ? (
                          <div style={{ maxWidth: '250px' }}>
                            <strong style={{ color: 'var(--color-error)' }}>⚠️ Solicitud de cambio</strong>
                            {assignment.motivoCambio && (
                              <p style={{ fontSize: '0.85rem', marginTop: 'var(--spacing-xs)', whiteSpace: 'pre-wrap' }}>
                                {assignment.motivoCambio}
                              </p>
                            )}
                            <p style={{ fontSize: '0.8rem', marginTop: 'var(--spacing-xs)', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
                              Elimina esta asignación, asigna otra familia para esta fecha y crea nueva asignación en la fecha que solicitó la familia.
                            </p>
                          </div>
                        ) : assignment.confirmadoPorFamilia ? (
                          <span className="badge badge--success">✓ Confirmado</span>
                        ) : (
                          <span className="badge badge--warning">Pendiente confirmación</span>
                        )}
                      </td>
                      <td>
                        {assignment.recordatorioEnviado ? (
                          <span className="badge badge--info">Enviado</span>
                        ) : (
                          <span className="badge badge--outline">No enviado</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                          {assignment.estado !== 'completado' && (
                            <button
                              onClick={() => handleMarkCompleted(assignment.id)}
                              className="btn btn--sm btn--success"
                              title="Marcar completado"
                            >
                              ✓
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(assignment.id)}
                            className="btn btn--sm btn--error"
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
