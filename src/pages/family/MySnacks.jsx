import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { snacksService } from '../../services/snacks.service';
import { ROUTES } from '../../config/constants';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/common/Modal';

export function MySnacks() {
  const { user } = useAuth();
  const [myAssignments, setMyAssignments] = useState([]);
  const [snackList, setSnackList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [actionType, setActionType] = useState(''); // 'edit' o 'cancel'
  const [motivo, setMotivo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('activos'); // 'activos' o 'historial'

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
    const result = await snacksService.confirmFamilyAssignment(assignmentId, user.uid);
    if (result.success) {
      setSuccess('Â¡ConfirmaciÃ³n registrada! Gracias por avisar.');
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
        setSuccess('Solicitud de cambio enviada. La escuela se pondrÃ¡ en contacto contigo.');
      }
    } else if (actionType === 'cancel') {
      result = await snacksService.cancelAssignment(selectedAssignment.id, motivo);
      if (result.success) {
        setSuccess('Turno rechazado. La escuela reasignarÃ¡ esta semana a otra familia.');
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
    return diffDays >= 0 && diffDays <= 7; // PrÃ³xima semana
  };

  const isPast = (fechaFin) => {
    const fin = new Date(fechaFin + 'T00:00:00');
    const today = new Date();
    return fin < today;
  };

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Mis turnos de snacks</h1>
          <p className="dashboard-subtitle">Confirmá o solicitá cambios en tus turnos.</p>
        </div>
        <Link to={ROUTES.FAMILY_DASHBOARD} className="btn btn--outline">
          ? Volver
        </Link>
      </div>

      <div className="card">
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
                Cuando la escuela te asigne un turno, aparecerÃ¡ aquÃ­.
              </p>
            </div>
          ) : (
            <>
              {/* Lista de Snacks */}
              {snackList && (
                <div className="card snack-list-card">
                  <div className="card__body">
                    <h3 className="mb-md">ðŸ“‹ Lista de Snacks a Traer</h3>
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
              <div className="tabs">
                <div className="tabs__header">
                  <button
                    className={`tabs__tab ${activeTab === 'activos' ? 'tabs__tab--active' : ''}`}
                    onClick={() => setActiveTab('activos')}
                  >
                    PrÃ³ximos Turnos
                  </button>
                  <button
                    className={`tabs__tab ${activeTab === 'historial' ? 'tabs__tab--active' : ''}`}
                    onClick={() => setActiveTab('historial')}
                  >
                    ðŸ“‹ Historial
                  </button>
                </div>

                <div className="tabs__content">
                  {activeTab === 'activos' && (
                    <div className="assignments-list">
                      {myAssignments.filter(a => !isPast(a.fechaFin)).length === 0 ? (
                        <p className="empty-state__text">No tienes turnos prÃ³ximos.</p>
                      ) : (
                        myAssignments.filter(a => !isPast(a.fechaFin)).map(assignment => {
                          const upcoming = isUpcoming(assignment.fechaInicio);
                          const past = isPast(assignment.fechaFin);

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
                              {upcoming && 'âš ï¸ '} {formatWeek(assignment.fechaInicio, assignment.fechaFin)}
                            </h4>
                          </div>
                          <span className={`badge ${
                            assignment.estado === 'confirmado' ? 'badge--success' :
                            assignment.estado === 'cancelado' ? 'badge--error' :
                            assignment.estado === 'cambio_solicitado' ? 'badge--warning' :
                            'badge--info'
                          }`}>
                            {assignment.estado === 'cambio_solicitado' ? 'cambio solicitado' : assignment.estado}
                          </span>
                        </div>

                        {upcoming && !assignment.confirmadoPorFamilia && assignment.estado === 'pendiente' && (
                          <div className="assignment-warning">
                            <strong>Â¡Tu turno es esta semana!</strong> Recuerda traer los snacks el lunes.
                          </div>
                        )}

                        <div className="assignment-actions">
                          {(() => {
                            // Estados finales sin acciÃ³n
                            if (assignment.estado === 'cancelado') {
                              return (
                                <div className="assignment-cancelled">
                                  <span>âœ— Turno rechazado</span>
                                  {assignment.motivoCancelacion && (
                                    <p className="assignment-cancelled__message">
                                      {assignment.motivoCancelacion}
                                    </p>
                                  )}
                                </div>
                              );
                            }
                            
                            if (assignment.solicitudCambio) {
                              return (
                                <div className="assignment-change-request">
                                  <p>
                                    <strong>âš ï¸ Solicitud de cambio enviada</strong>
                                  </p>
                                  {assignment.motivoCambio && (
                                    <p className="assignment-change-request__message">
                                      {assignment.motivoCambio}
                                    </p>
                                  )}
                                  <p className="assignment-change-request__note">
                                    La escuela confirmarÃ¡ si puede asignarte la fecha que solicitaste.
                                  </p>
                                </div>
                              );
                            }

                            if (past) {
                              return (
                                <p className="assignment-past-note">
                                  Esta semana ya pasÃ³
                                </p>
                              );
                            }
                            
                            // Turno activo (no pasado, no cancelado, no en solicitud de cambio)
                            const myFamily = Array.isArray(assignment.familias) 
                              ? assignment.familias.find(f => f.uid === user.uid)
                              : null;
                            const iConfirmed = myFamily?.confirmed;
                            const alreadyConfirmed = assignment.confirmadoPorFamilia;
                            
                            return (
                              <>
                                {alreadyConfirmed && (
                                  <div className="assignment-confirmed mb-sm">
                                    <span>âœ“</span>
                                    <span>
                                      {iConfirmed 
                                        ? 'Ya confirmaste que traerÃ¡s los snacks'
                                        : `Ya confirmado por: ${assignment.confirmadoPor}`
                                      }
                                    </span>
                                  </div>
                                )}
                                
                                <div className="assignment-buttons">
                                  {!alreadyConfirmed && (
                                    <button
                                      onClick={() => handleConfirm(assignment.id)}
                                      className="btn btn--primary"
                                    >
                                      âœ“ Confirmar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleOpenEditModal(assignment, 'edit')}
                                    className="btn btn--outline"
                                  >
                                    Solicitar cambio de fecha
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditModal(assignment, 'cancel')}
                                    className="btn btn--outline btn--danger-outline"
                                  >
                                    âœ— Rechazar turno
                                  </button>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                      </div>
                    </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {activeTab === 'historial' && (
                    <div className="assignments-list">
                      {myAssignments.filter(a => isPast(a.fechaFin)).length === 0 ? (
                        <p className="empty-state__text">No tienes turnos anteriores.</p>
                      ) : (
                        myAssignments.filter(a => isPast(a.fechaFin)).map(assignment => (
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
                                </div>
                                <span className={`badge ${
                                  assignment.estado === 'confirmado' ? 'badge--success' :
                                  assignment.estado === 'cancelado' ? 'badge--error' :
                                  assignment.estado === 'cambio_solicitado' ? 'badge--warning' :
                                  'badge--info'
                                }`}>
                                  {assignment.estado === 'cambio_solicitado' ? 'cambio solicitado' : assignment.estado}
                                </span>
                              </div>
                              <p className="assignment-past-note">
                                Turno finalizado
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de EdiciÃ³n/Rechazo */}
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
                    La escuela revisarÃ¡ tu solicitud y confirmarÃ¡ si puede asignarte la fecha alternativa.
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
                    La escuela reasignarÃ¡ esta semana a otra familia.
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






