import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { snacksService } from '../../services/snacks.service';
import { AMBIENTES, ROUTES } from '../../config/constants';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/common/Modal';
import Icon from '../../components/ui/Icon';
import {
  getSnackStatusMeta,
  isSnackAssignmentActiveForFamily
} from '../../utils/snackAssignmentState';

export function MySnacks() {
  const { user } = useAuth();
  const [myAssignments, setMyAssignments] = useState([]);
  const [snackLists, setSnackLists] = useState({});
  const [snackAmbientes, setSnackAmbientes] = useState([]);
  const [snackListError, setSnackListError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [actionType, setActionType] = useState(''); // 'edit' o 'cancel'
  const [motivo, setMotivo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [expandedSnackAmbientes, setExpandedSnackAmbientes] = useState({});
  const [historyOpen, setHistoryOpen] = useState(false);

  const syncExpandedSnackAmbientes = (ambientes = []) => {
    setExpandedSnackAmbientes((prev) => {
      if (!Array.isArray(ambientes) || ambientes.length === 0) return {};
      const next = {};
      ambientes.forEach((ambiente) => {
        next[ambiente] = Boolean(prev[ambiente]);
      });
      // Todos inician cerrados
      return next;
    });
  };

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

      // Si tiene asignaciones, cargar listas de snacks por ambiente
      if (sorted.length > 0) {
        const ambientes = Array.from(
          new Set(sorted.map(assignment => assignment.ambiente).filter(Boolean))
        );
        setSnackAmbientes(ambientes);

        if (ambientes.length === 0) {
          setSnackLists({});
          setSnackListError('');
          syncExpandedSnackAmbientes([]);
        } else {
          const listResults = await Promise.all(
            ambientes.map(ambiente => snacksService.getSnackList(ambiente))
          );

          const lists = {};
          let hasError = false;
          listResults.forEach((listResult, idx) => {
            const ambienteKey = ambientes[idx];
            if (listResult.success && listResult.snackList) {
              lists[ambienteKey] = listResult.snackList;
            } else {
              hasError = true;
            }
          });

          setSnackLists(lists);
          setSnackListError(hasError ? 'No pudimos cargar todas las listas.' : '');
          syncExpandedSnackAmbientes(ambientes);
        }
      } else {
        setSnackLists({});
        setSnackAmbientes([]);
        setSnackListError('');
        syncExpandedSnackAmbientes([]);
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
    const result = await snacksService.confirmFamilyAssignment(assignmentId, user.uid);
    if (result.success) {
      setSuccess('¡Confirmación registrada! Gracias por avisar.');
      await loadMyAssignments();
    } else {
      setError('Error al confirmar: ' + result.error);
    }
  };

  const handleOpenEditModal = (assignment, type) => {
    setSelectedAssignment(assignment);
    setActionType(type);
    setMotivo('');
    setShowEditModal(true);
    setError('');
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setSelectedAssignment(null);
    setActionType('');
    setMotivo('');
  };

  const handleSubmitEdit = async () => {
    if (!motivo || motivo.trim() === '') {
      setError('Por favor, indica el motivo');
      return;
    }

    setProcessing(true);
    
    let result;
    if (actionType === 'edit') {
      result = await snacksService.requestChange(selectedAssignment.id, motivo);
      if (result.success) {
        setSuccess('Solicitud de cambio enviada. La escuela se pondrá en contacto contigo.');
      }
    } else if (actionType === 'cancel') {
      result = await snacksService.cancelAssignment(selectedAssignment.id, motivo);
      if (result.success) {
        setSuccess('Turno rechazado. La escuela reasignará esta semana a otra familia.');
      }
    }

    if (!result.success) {
      setError('Error al procesar solicitud: ' + result.error);
    }

    setProcessing(false);
    handleCloseEditModal();
    await loadMyAssignments();
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

  const getAmbienteLabel = (ambiente) => {
    if (ambiente === AMBIENTES.TALLER_1) return 'Taller 1';
    if (ambiente === AMBIENTES.TALLER_2) return 'Taller 2';
    return 'Sin taller';
  };

  const getAssignmentBadge = (assignment) => {
    const status = getSnackStatusMeta(assignment);
    switch (status.style) {
      case 'suspended':
        return { className: 'badge--warning', label: 'suspendido', status };
      case 'confirmed':
        return { className: 'badge--success', label: 'confirmado', status };
      case 'completed':
        return { className: 'badge--primary', label: 'completado', status };
      case 'cancelled':
        return { className: 'badge--error', label: 'cancelado', status };
      case 'alert':
        return { className: 'badge--warning', label: 'cambio solicitado', status };
      case 'pending':
        return { className: 'badge--info', label: 'pendiente', status };
      default:
        return { className: 'badge--info', label: status.label.toLowerCase(), status };
    }
  };

  const renderSnackList = (ambiente, showHeading) => {
    const list = snackLists[ambiente];
    return (
      <div key={ambiente} className="snack-list-block">
        {showHeading && (
          <h4 className="snack-list-title">{getAmbienteLabel(ambiente)}</h4>
        )}
        {list && Array.isArray(list.items) ? (
          <>
            <ul className="snack-list">
              {list.items.map((item, index) => (
                <li key={`${ambiente}-${index}`}>{item}</li>
              ))}
            </ul>
            {list.observaciones && (
              <p className="snack-note">
                <strong>Nota:</strong> {list.observaciones}
              </p>
            )}
          </>
        ) : (
          <p className="form-help">Lista no disponible.</p>
        )}
      </div>
    );
  };

  const upcomingAssignments = myAssignments.filter((assignment) => !isPast(assignment.fechaFin));
  const pendingAssignments = upcomingAssignments.filter((assignment) => (
    getSnackStatusMeta(assignment).style === 'pending'
  ));
  const pastAssignments = myAssignments.filter((assignment) => isPast(assignment.fechaFin));
  const nextAssignment = upcomingAssignments.find((assignment) => (
    isSnackAssignmentActiveForFamily(assignment)
  )) || null;
  const snackAmbientesText = snackAmbientes.map((ambiente) => getAmbienteLabel(ambiente)).join(' y ');

  return (
    <div className="container page-container family-snacks-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Mis turnos de snacks</h1>
          <p className="dashboard-subtitle">Confirmá o solicitá cambios en tus turnos.</p>
        </div>
        <Link to={ROUTES.FAMILY_DASHBOARD} className="btn btn--outline btn--back">
          <Icon name="chevron-left" size={16} />
          Volver
        </Link>
      </div>

      <div className="card family-snacks-card">
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
              <p>No tienes turnos asignados para llevar snacks.</p>
              <p className="empty-state__text">
                Cuando la escuela te asigne un turno, aparecerá aquí.
              </p>
            </div>
          ) : (
            <>
              {nextAssignment && (
                <div className="family-snacks-next">
                  <p className="family-snacks-next__label">Tu próximo turno</p>
                  <p className="family-snacks-next__week">
                    {formatWeek(nextAssignment.fechaInicio, nextAssignment.fechaFin)}
                  </p>
                </div>
              )}
              {!nextAssignment && upcomingAssignments.length > 0 && (
                <div className="family-snacks-next">
                  <p className="family-snacks-next__label">Tu próximo turno</p>
                  <p className="family-snacks-next__week">No hay turnos activos para confirmar.</p>
                </div>
              )}

              {pendingAssignments.length > 0 && (
                <p className="family-snacks-pending-note">
                  {pendingAssignments.length === 1
                    ? 'Tienes 1 turno pendiente de confirmar.'
                    : `Tienes ${pendingAssignments.length} turnos pendientes de confirmar.`}
                </p>
              )}

              <div className="family-snacks-section">
                <h3 className="family-snacks-section__title">Cuándo debo llevar alimentos</h3>
                {upcomingAssignments.length === 0 ? (
                  <p className="empty-state__text">No tienes turnos próximos.</p>
                ) : (
                  <div className="assignments-list">
                    {upcomingAssignments.map((assignment) => {
                      const upcoming = isUpcoming(assignment.fechaInicio);
                      const past = isPast(assignment.fechaFin);
                      const badge = getAssignmentBadge(assignment);
                      const status = badge.status;

                      return (
                        <div
                          key={assignment.id}
                          className={`card assignment-card ${
                            upcoming ? 'assignment-card--upcoming' : ''
                          }`}
                        >
                          <div className="card__body">
                            <div className="assignment-header">
                              <div>
                                <h4 className="assignment-title">
                                  {formatWeek(assignment.fechaInicio, assignment.fechaFin)}
                                </h4>
                                <p className="assignment-ambiente">
                                  {getAmbienteLabel(assignment.ambiente)}
                                </p>
                              </div>
                              <span className={`badge ${badge.className}`}>
                                {badge.label}
                              </span>
                            </div>

                            {upcoming && status.style === 'pending' && (
                              <div className="assignment-warning">
                                <strong>Este turno es esta semana.</strong> Recordá traer los snacks el lunes.
                              </div>
                            )}

                            <div className="assignment-actions">
                              {(() => {
                                if (status.style === 'suspended') {
                                  return (
                                    <div className="assignment-suspended">
                                      <span>Semana suspendida</span>
                                      {assignment.motivoSuspension && (
                                        <p className="assignment-suspended__message">
                                          {assignment.motivoSuspension}
                                        </p>
                                      )}
                                    </div>
                                  );
                                }

                                if (status.style === 'cancelled') {
                                  return (
                                    <div className="assignment-cancelled">
                                      <span>Turno rechazado</span>
                                      {assignment.motivoCancelacion && (
                                        <p className="assignment-cancelled__message">
                                          {assignment.motivoCancelacion}
                                        </p>
                                      )}
                                    </div>
                                  );
                                }

                                if (status.style === 'completed') {
                                  return (
                                    <p className="assignment-past-note">
                                      Turno completado
                                    </p>
                                  );
                                }

                                if (status.style === 'alert') {
                                  return (
                                    <div className="assignment-change-request">
                                      <p>
                                        <strong>Solicitud de cambio enviada</strong>
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
                                  );
                                }

                                if (past) {
                                  return (
                                    <p className="assignment-past-note">
                                      Esta semana ya pasó
                                    </p>
                                  );
                                }

                                const myFamily = Array.isArray(assignment.familias)
                                  ? assignment.familias.find((family) => family.uid === user.uid)
                                  : null;
                                const iConfirmed = myFamily?.confirmed;
                                const alreadyConfirmed = status.isConfirmedState;
                                const confirmedByName = assignment.confirmadoPor || 'otra persona responsable';

                                return (
                                  <>
                                    {alreadyConfirmed && (
                                      <div className="assignment-confirmed mb-sm">
                                        <span aria-hidden="true">•</span>
                                        <span>
                                          {iConfirmed
                                            ? 'Ya confirmaste que traerás los snacks'
                                            : `Ya confirmado por: ${confirmedByName}`
                                          }
                                        </span>
                                      </div>
                                    )}

                                    <div className="assignment-buttons">
                                      {/* Estado PENDIENTE: puede confirmar o rechazar */}
                                      {status.key === 'pending' && !alreadyConfirmed && (
                                        <>
                                          <button
                                            onClick={() => handleConfirm(assignment.id)}
                                            className="btn btn--primary"
                                          >
                                            Confirmar
                                          </button>
                                          <button
                                            onClick={() => handleOpenEditModal(assignment, 'cancel')}
                                            className="btn btn--outline btn--danger-outline"
                                          >
                                            Rechazar turno
                                          </button>
                                        </>
                                      )}

                                      {/* Estado CONFIRMADO: solo puede solicitar cambio de fecha */}
                                      {status.key === 'confirmed' && (
                                        <button
                                          onClick={() => handleOpenEditModal(assignment, 'edit')}
                                          className="btn btn--outline"
                                        >
                                          Solicitar cambio de fecha
                                        </button>
                                      )}
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Lista de Snacks */}
              {snackAmbientes.length > 0 && (
                <div className="card snack-list-card">
                  <div className="card__body">
                    <div className="snack-list-header">
                      <div>
                        <h3 className="snack-list-heading">Qué alimentos llevar</h3>
                        <p className="snack-list-subtitle">
                          {snackAmbientes.length === 1
                            ? `Lista correspondiente a ${snackAmbientesText}.`
                            : `Tenés hijos en ${snackAmbientesText}. Revisá cada lista por separado.`
                          }
                        </p>
                      </div>
                    </div>
                    {snackListError && (
                      <p className="form-help">{snackListError}</p>
                    )}

                    {snackAmbientes.length === 1
                      ? renderSnackList(snackAmbientes[0], true)
                      : (
                        <div className="snack-accordion-list">
                          {snackAmbientes.map((ambiente) => {
                            const isOpen = Boolean(expandedSnackAmbientes[ambiente]);
                            return (
                              <div
                                key={ambiente}
                                className={`snack-accordion ${isOpen ? 'snack-accordion--open' : ''}`}
                              >
                                <button
                                  type="button"
                                  className="snack-accordion__trigger"
                                  onClick={() => {
                                    setExpandedSnackAmbientes((prev) => ({
                                      ...prev,
                                      [ambiente]: !prev[ambiente]
                                    }));
                                  }}
                                >
                                  <span className="snack-accordion__title">{getAmbienteLabel(ambiente)}</span>
                                  <span className="snack-accordion__state">{isOpen ? 'Ocultar' : 'Ver lista'}</span>
                                </button>
                                {isOpen && (
                                  <div className="snack-accordion__content">
                                    {renderSnackList(ambiente, false)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                  </div>
                </div>
              )}

              <div className="family-snacks-history">
                <button
                  type="button"
                  className="family-snacks-history__trigger"
                  onClick={() => setHistoryOpen((prev) => !prev)}
                >
                  <span>Historial de turnos</span>
                  <span className="family-snacks-history__meta">
                    {pastAssignments.length} {pastAssignments.length === 1 ? 'semana' : 'semanas'}
                  </span>
                </button>
                {historyOpen && (
                  <div className="family-snacks-history__content">
                    {pastAssignments.length === 0 ? (
                      <p className="empty-state__text">No tienes turnos anteriores.</p>
                    ) : (
                      <div className="assignments-list">
                        {pastAssignments.map((assignment) => {
                          const badge = getAssignmentBadge(assignment);
                          return (
                            <div
                              key={assignment.id}
                              className="card assignment-card assignment-card--past"
                            >
                              <div className="card__body">
                                <div className="assignment-header">
                                  <div>
                                    <h4 className="assignment-title">
                                      {formatWeek(assignment.fechaInicio, assignment.fechaFin)}
                                    </h4>
                                    <p className="assignment-ambiente">
                                      {getAmbienteLabel(assignment.ambiente)}
                                    </p>
                                  </div>
                                  <span className={`badge ${badge.className}`}>
                                    {badge.label}
                                  </span>
                                </div>
                                <p className="assignment-past-note">
                                  Turno finalizado
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de Edición/Rechazo */}
      <Modal isOpen={showEditModal} onClose={handleCloseEditModal} size="md">
        <ModalHeader
          title={actionType === 'edit' ? 'Solicitar cambio de fecha' : 'Rechazar turno'}
          onClose={handleCloseEditModal}
        />
        <ModalBody>
          {selectedAssignment && (
            <>
              <div className="mb-md">
                <p className="text-muted mb-sm">
                  Turno: <strong>{formatWeek(selectedAssignment.fechaInicio, selectedAssignment.fechaFin)}</strong>
                </p>
              </div>

              {actionType === 'edit' ? (
                <div className="form-group">
                  <label className="form-label">
                    Indica el motivo y una fecha alternativa que te venga mejor:
                  </label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ejemplo: Estaremos de viaje esa semana. Prefiero la semana del lunes 20 de enero."
                  />
                  <p className="form-help mt-sm">
                    La escuela revisará tu solicitud y confirmará si puede asignarte la fecha alternativa.
                  </p>
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">
                    Indica el motivo por el cual no puedes cumplir con este turno:
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder="Ejemplo: Tenemos un viaje familiar programado esa semana."
                  />
                  <p className="form-help mt-sm">
                    La escuela reasignará esta semana a otra familia.
                  </p>
                </div>
              )}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <button
            onClick={handleCloseEditModal}
            className="btn btn--outline"
            disabled={processing}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmitEdit}
            className={`btn ${actionType === 'cancel' ? 'btn--danger' : 'btn--primary'}`}
            disabled={processing || !motivo.trim()}
          >
            {processing ? 'Procesando...' : actionType === 'edit' ? 'Enviar solicitud' : 'Rechazar turno'}
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}













