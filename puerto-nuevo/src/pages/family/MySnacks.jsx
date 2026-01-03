import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { snacksService } from '../../services/snacks.service';
import { ROUTES } from '../../config/constants';

export function MySnacks() {
  const { user } = useAuth();
  const [myAssignments, setMyAssignments] = useState([]);
  const [snackList, setSnackList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar asignaciones de la familia
  const loadMyAssignments = async () => {
    setLoading(true);
    const result = await snacksService.getAssignmentsByFamily(user.uid);
    if (result.success) {
      // Ordenar por fecha
      const sorted = result.assignments.sort((a, b) =>
        new Date(a.fechaInicio) - new Date(b.fechaInicio)
      );
      setMyAssignments(sorted);

      // Si tiene asignaciones, cargar lista de snacks del ambiente
      if (sorted.length > 0) {
        const ambiente = sorted[0].ambiente;
        const listResult = await snacksService.getSnackList(ambiente);
        if (listResult.success) {
          setSnackList(listResult.snackList);
        }
      }
    } else {
      setError('Error al cargar asignaciones: ' + result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMyAssignments();
  }, [user.uid]);

  const handleConfirm = async (assignmentId) => {
    const result = await snacksService.confirmAssignment(assignmentId);
    if (result.success) {
      setSuccess('¡Confirmación registrada! Gracias por avisar.');
      await loadMyAssignments();
    } else {
      setError('Error al confirmar: ' + result.error);
    }
  };

  const handleRequestChange = async (assignmentId) => {
    const motivo = prompt(
      'No puedes llevar los snacks esta semana?\n\n' +
      'Por favor indica:\n' +
      '1. El motivo por el cual no puedes\n' +
      '2. Una fecha alternativa que te venga mejor (indica el lunes de la semana)\n\n' +
      'Ejemplo: "Estaremos de viaje esa semana. Prefiero la semana del lunes 20 de enero."'
    );

    if (motivo === null) return; // Usuario canceló

    if (!motivo || motivo.trim() === '') {
      setError('Debes indicar el motivo y una fecha alternativa');
      return;
    }

    const result = await snacksService.requestChange(assignmentId, motivo);
    if (result.success) {
      setSuccess('Solicitud de cambio enviada. La escuela se pondrá en contacto contigo para confirmar la nueva fecha.');
      await loadMyAssignments();
    } else {
      setError('Error al solicitar cambio: ' + result.error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatWeek = (fechaInicio, fechaFin) => {
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const fin = new Date(fechaFin + 'T00:00:00');

    const inicioStr = inicio.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    const finStr = fin.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

    return `Semana del ${inicioStr} al ${finStr}`;
  };

  const isUpcoming = (fechaInicio) => {
    const inicio = new Date(fechaInicio + 'T00:00:00');
    const today = new Date();
    const diffDays = Math.ceil((inicio - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7; // Próxima semana
  };

  const isPast = (fechaFin) => {
    const fin = new Date(fechaFin + 'T00:00:00');
    const today = new Date();
    return fin < today;
  };

  return (
    <div className="container page-container">
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">🍎 Mis Turnos de Snacks</h1>
          <Link to={ROUTES.FAMILY_DASHBOARD} className="btn btn--outline">
            ← Volver
          </Link>
        </div>

        <div className="card__body">
          {error && (
            <div className="alert alert--error mb-md">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert--success mb-md">
              {success}
            </div>
          )}

          {loading ? (
            <p>Cargando tus turnos...</p>
          ) : myAssignments.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state__icon">📅</p>
              <p>No tienes turnos asignados para llevar snacks.</p>
              <p className="empty-state__text">
                Cuando la escuela te asigne un turno, aparecerá aquí.
              </p>
            </div>
          ) : (
            <>
              {/* Lista de Snacks */}
              {snackList && (
                <div className="card snack-list-card">
                  <div className="card__body">
                    <h3 className="mb-md">📋 Lista de Snacks a Traer</h3>
                    <ul className="snack-list">
                      {snackList.items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                    {snackList.observaciones && (
                      <p className="snack-note">
                        <strong>Nota:</strong> {snackList.observaciones}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Mis Asignaciones */}
              <h3 className="mb-md">Tus Semanas Asignadas</h3>

              <div className="assignments-list">
                {myAssignments.map(assignment => {
                  const upcoming = isUpcoming(assignment.fechaInicio);
                  const past = isPast(assignment.fechaFin);

                  return (
                    <div
                      key={assignment.id}
                      className={`card assignment-card ${
                        upcoming ? 'assignment-card--upcoming' : ''
                      } ${past ? 'assignment-card--past' : ''}`}
                    >
                      <div className="card__body">
                        <div className="assignment-header">
                          <div>
                            <h4 className="assignment-title">
                              {upcoming && '⚠️ '} {formatWeek(assignment.fechaInicio, assignment.fechaFin)}
                            </h4>
                          </div>
                          <span className={`badge ${
                            assignment.estado === 'completado' ? 'badge--success' :
                            assignment.estado === 'confirmado' ? 'badge--info' :
                            'badge--warning'
                          }`}>
                            {assignment.estado}
                          </span>
                        </div>

                        {upcoming && !assignment.confirmadoPorFamilia && (
                          <div className="assignment-warning">
                            <strong>¡Tu turno es esta semana!</strong> Recuerda traer los snacks el lunes.
                          </div>
                        )}

                        <div className="assignment-actions">
                          {assignment.confirmadoPorFamilia ? (
                            <div className="assignment-confirmed">
                              <span>✓</span>
                              <span>Ya confirmaste que traerás los snacks</span>
                            </div>
                          ) : assignment.solicitudCambio ? (
                            <div className="assignment-change-request">
                              <p>
                                <strong>⚠️ Solicitud de cambio enviada</strong>
                              </p>
                              {assignment.motivoCambio && (
                                <p className="assignment-change-request__message">
                                  {assignment.motivoCambio}
                                </p>
                              )}
                              <p className="assignment-change-request__note">
                                La escuela confirmará si puede asignarte la fecha que solicitaste.
                              </p>
                            </div>
                          ) : !past && (
                            <div className="assignment-buttons">
                              <button
                                onClick={() => handleConfirm(assignment.id)}
                                className="btn btn--primary"
                              >
                                ✓ Confirmar que traeré los snacks
                              </button>
                              <button
                                onClick={() => handleRequestChange(assignment.id)}
                                className="btn btn--outline btn--danger-outline"
                              >
                                ✗ No puedo, solicitar cambio
                              </button>
                            </div>
                          )}
                        </div>

                        {past && (
                          <p className="assignment-past-note">
                            Esta semana ya pasó
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
