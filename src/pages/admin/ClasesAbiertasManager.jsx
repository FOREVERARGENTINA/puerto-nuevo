import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { clasesAbiertasService } from '../../services/clasesAbiertas.service';
import { childrenService } from '../../services/children.service';
import { usersService } from '../../services/users.service';
import CalendarioConvocatoria from '../../components/ui/CalendarioConvocatoria';
import './ClasesAbiertasManager.css';

const TIPO_LABELS = { ambiente_abierto: 'Ambiente Abierto', taller_abierto: 'Taller Abierto' };
const AMBIENTE_LABELS = { taller1: 'Taller 1', taller2: 'Taller 2' };
const TIPOS = ['ambiente_abierto', 'taller_abierto'];
const AMBIENTES = ['taller1', 'taller2'];

const toDayKey = (date) => {
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (!d || Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const formatFechaDisplay = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const formatHorario = (v) => {
  if (!v) return '';
  const s = String(v).trim();
  // Si ya contiene "hs" o letras que no sean dígitos/separadores, dejarlo tal cual
  if (/hs/i.test(s)) return s;
  // Si es solo dígitos o "H:MM" o "H:MM - H:MM", agregar " hs" al final
  return s + ' hs';
};

const formatFechaInput = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function PanelConvocatoria({ tipo, ambiente, onActionsChange }) {
  const { user } = useAuth();
  const [convocatoria, setConvocatoria] = useState(null);
  const [convocatoriaPasada, setConvocatoriaPasada] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newDia, setNewDia] = useState({ fecha: '', horario: '', nombreTaller: '' });
  const [selectedDiaId, setSelectedDiaId] = useState('');
  // Para Taller Abierto: días de la fecha seleccionada (puede ser > 1)
  const [diasFechaSeleccionada, setDiasFechaSeleccionada] = useState([]);
  const [editingDiaId, setEditingDiaId] = useState('');
  const [editDia, setEditDia] = useState({ fecha: '', horario: '', nombreTaller: '' });
  const [deletingDiaId, setDeletingDiaId] = useState('');
  const [deletingInscripcionId, setDeletingInscripcionId] = useState('');
  const [agregandoFamilia, setAgregandoFamilia] = useState(false);
  const [hijosAmbiente, setHijosAmbiente] = useState([]);
  const [hijoSeleccionado, setHijoSeleccionado] = useState('');

  const showMsg = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };
  const showErr = (m) => { setError(m); setTimeout(() => setError(''), 4000); };

  const cargar = useCallback(async () => {
    setLoading(true);
    const [activaRes, recienteRes] = await Promise.all([
      clasesAbiertasService.getConvocatoriaActiva(tipo, ambiente),
      clasesAbiertasService.getConvocatoriaReciente(tipo, ambiente)
    ]);
    if (activaRes.success) {
      setConvocatoria(activaRes.convocatoria);
      if (activaRes.convocatoria) {
        const ir = await clasesAbiertasService.getInscripcionesByConvocatoria(activaRes.convocatoria.id);
        if (ir.success) setInscripciones(ir.inscripciones);
        else showErr(`Error cargando inscriptos: ${ir.error}`);
      }
    }
    if (recienteRes.success && recienteRes.convocatoria && !activaRes.convocatoria) {
      setConvocatoriaPasada(recienteRes.convocatoria);
    } else {
      setConvocatoriaPasada(null);
    }
    setLoading(false);
  }, [tipo, ambiente]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    if (!onActionsChange) return;
    if (loading) { onActionsChange(null); return; }
    if (!convocatoria) {
      onActionsChange(
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
          <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={handleNuevaConvocatoria} disabled={submitting}>
            Nueva convocatoria
          </button>
          {convocatoriaPasada && (
            <button className="btn btn--secondary" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={handleReactivar} disabled={submitting}>
              Reactivar anterior
            </button>
          )}
        </div>
      );
    } else {
      onActionsChange(
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: convocatoria.activo ? 'var(--color-success)' : 'var(--color-text-light)', marginRight: 'var(--spacing-xs)' }}>
            {convocatoria.activo ? 'Convocatoria activa' : 'Convocatoria inactiva'}
          </span>
          <button className="btn btn--secondary" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={handleToggle} disabled={submitting}>
            {convocatoria.activo ? 'Desactivar' : 'Activar'}
          </button>
          <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={handleNuevaConvocatoria} disabled={submitting}>
            Nueva convocatoria
          </button>
        </div>
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convocatoria, convocatoriaPasada, submitting, loading]);

  const handleNuevaConvocatoria = async () => {
    setSubmitting(true);
    const anteriorId = convocatoria?.id || convocatoriaPasada?.id || null;
    const res = await clasesAbiertasService.createNuevaConvocatoria(tipo, ambiente, user.uid, anteriorId);
    if (res.success) { showMsg('Nueva convocatoria creada.'); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleReactivar = async () => {
    if (!convocatoriaPasada) return;
    setSubmitting(true);
    const res = await clasesAbiertasService.reactivateConvocatoria(convocatoriaPasada.id);
    if (res.success) { showMsg('Convocatoria reactivada.'); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleToggle = async () => {
    if (!convocatoria) return;
    setSubmitting(true);
    const res = await clasesAbiertasService.toggleConvocatoria(convocatoria.id, !convocatoria.activo);
    if (res.success) { showMsg(`Convocatoria ${!convocatoria.activo ? 'activada' : 'desactivada'}.`); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleAddDia = async (e) => {
    e.preventDefault();
    if (!newDia.fecha || !newDia.horario.trim()) { showErr('La fecha y el horario son obligatorios.'); return; }
    if (tipo === 'taller_abierto' && !newDia.nombreTaller.trim()) { showErr('El nombre del taller es obligatorio.'); return; }
    setSubmitting(true);
    const diaData = {
      fecha: new Date(newDia.fecha + 'T12:00:00'),
      horario: newDia.horario.trim(),
      ...(tipo === 'taller_abierto' ? { nombreTaller: newDia.nombreTaller.trim() } : {})
    };
    const res = await clasesAbiertasService.addDia(convocatoria.id, diaData);
    if (res.success) { showMsg('Día agregado.'); setNewDia({ fecha: '', horario: '', nombreTaller: '' }); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleStartEdit = (dia) => {
    setEditingDiaId(dia.id);
    setEditDia({ fecha: formatFechaInput(dia.fecha), horario: dia.horario || '', nombreTaller: dia.nombreTaller || '' });
    setDeletingDiaId('');
  };

  const handleSaveEdit = async (diaId) => {
    if (!editDia.fecha || !editDia.horario.trim()) { showErr('La fecha y el horario son obligatorios.'); return; }
    setSubmitting(true);
    const cambios = {
      fecha: new Date(editDia.fecha + 'T12:00:00'),
      horario: editDia.horario.trim(),
      ...(tipo === 'taller_abierto' ? { nombreTaller: editDia.nombreTaller.trim() } : {})
    };
    const res = await clasesAbiertasService.updateDia(convocatoria.id, diaId, cambios);
    if (res.success) { showMsg('Día actualizado.'); setEditingDiaId(''); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleConfirmDelete = async (diaId) => {
    setSubmitting(true);
    const res = await clasesAbiertasService.deleteDia(convocatoria.id, diaId);
    if (res.success) { showMsg('Día eliminado.'); setDeletingDiaId(''); setSelectedDiaId(''); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleDeleteInscripcion = async (inscripcionId) => {
    setSubmitting(true);
    const res = await clasesAbiertasService.cancelarInscripcion(convocatoria.id, inscripcionId);
    if (res.success) { showMsg('Inscripción eliminada.'); setDeletingInscripcionId(''); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleAbrirAgregarFamilia = async () => {
    if (!hijosAmbiente.length) {
      const res = await childrenService.getChildrenByAmbiente(ambiente);
      if (res.success) setHijosAmbiente(res.children);
    }
    setHijoSeleccionado('');
    setAgregandoFamilia(true);
  };

  const handleAgregarFamilia = async () => {
    if (!hijoSeleccionado || !selectedDia) return;
    const hijo = hijosAmbiente.find((h) => h.id === hijoSeleccionado);
    if (!hijo) return;

    const familiaUid = hijo.responsables?.[0];
    if (!familiaUid) { showErr('Este alumno no tiene responsable registrado.'); return; }

    setSubmitting(true);
    let familiaNombre = hijo.nombreCompleto;
    const userRes = await usersService.getUserById(familiaUid);
    if (userRes.success) familiaNombre = userRes.user.displayName || userRes.user.email || hijo.nombreCompleto;

    const payload = {
      diaId: selectedDia.id,
      familiaUid,
      familiaNombre,
      hijoId: hijo.id,
      hijoNombre: hijo.nombreCompleto,
      ambiente,
      inscriptoPorAdmin: true
    };

    const fn = tipo === 'ambiente_abierto'
      ? clasesAbiertasService.inscribirAmbienteAbierto
      : clasesAbiertasService.inscribirTallerAbierto;

    const res = await fn(convocatoria.id, payload);
    if (res.success) {
      showMsg('Familia agregada.');
      setAgregandoFamilia(false);
      setHijoSeleccionado('');
      cargar();
    } else {
      showErr(res.error);
    }
    setSubmitting(false);
  };

  const handleSyncCupos = async () => {
    if (!convocatoria || tipo !== 'ambiente_abierto') return;
    setSubmitting(true);
    const res = await clasesAbiertasService.recalcularEstadoConvocatoria(convocatoria.id);
    if (res.success) { showMsg('Cupos resincronizados.'); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const inscriptosPorDia = (diaId) => inscripciones.filter((i) => i.diaId === diaId);
  const cupoPorDia = (diaId) => convocatoria?.cupos?.[diaId] || 0;

  const marcadores = useMemo(() => {
    if (!convocatoria) return new Map();
    const m = new Map();
    (convocatoria.dias || []).forEach((dia) => {
      const cupo = cupoPorDia(dia.id);
      const insc = inscriptosPorDia(dia.id);
      if (tipo === 'ambiente_abierto') {
        m.set(dia.id, cupo >= 2 ? 'completo' : cupo > 0 ? 'inscripto' : 'disponible');
      } else {
        m.set(dia.id, insc.length > 0 ? 'inscripto' : 'disponible');
      }
    });
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convocatoria, inscripciones]);

  const selectedDia = convocatoria?.dias?.find((d) => d.id === selectedDiaId) || null;
  const isEditing = editingDiaId === selectedDiaId && Boolean(selectedDiaId);
  const isDeleting = deletingDiaId === selectedDiaId && Boolean(selectedDiaId);
  const insc = selectedDia ? inscriptosPorDia(selectedDia.id) : [];
  const cupo = selectedDia ? cupoPorDia(selectedDia.id) : 0;
  const cupoDesincronizado = tipo === 'ambiente_abierto' && selectedDia && cupo !== insc.length;

  // selectedFechaKey: para Taller Abierto, la fecha seleccionada en el calendario
  const selectedFechaKey = tipo === 'taller_abierto'
    ? (diasFechaSeleccionada.length ? toDayKey(diasFechaSeleccionada[0].fecha) : '')
    : null;

  if (loading) return <p style={{ color: 'var(--color-text-light)', padding: 'var(--spacing-md)' }}>Cargando...</p>;

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}

      {!convocatoria ? (
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <p style={{ color: 'var(--color-text-light)' }}>
              No hay convocatoria activa para {TIPO_LABELS[tipo]} — {AMBIENTE_LABELS[ambiente]}.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Layout lado a lado: calendario + detalle */}
          <div className="clases-abiertas-manager-layout">
            {/* Izquierda: calendario */}
            <div className="card">
              <div className="card__header">
                <h3 className="card__title">Días programados</h3>
                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                  {(convocatoria.dias || []).length} día{(convocatoria.dias || []).length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="card__body">
                {(convocatoria.dias || []).length === 0 ? (
                  <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>No hay días cargados todavía.</p>
                ) : tipo === 'taller_abierto' ? (
                    <CalendarioConvocatoria
                      dias={convocatoria.dias}
                      selectedFechaKey={selectedFechaKey}
                      onSelectFecha={(grupo) => {
                        setDiasFechaSeleccionada(grupo || []);
                        setSelectedDiaId(grupo?.[0]?.id || '');
                        setEditingDiaId('');
                        setDeletingDiaId('');
                        setAgregandoFamilia(false);
                        setHijoSeleccionado('');
                      }}
                      marcadores={marcadores}
                    />
                  ) : (
                    <CalendarioConvocatoria
                      dias={convocatoria.dias}
                      selectedDiaId={selectedDiaId}
                      onSelectDia={(dia) => {
                        setSelectedDiaId(dia?.id || '');
                        setEditingDiaId('');
                        setDeletingDiaId('');
                        setAgregandoFamilia(false);
                        setHijoSeleccionado('');
                      }}
                      marcadores={marcadores}
                    />
                  )}
              </div>
            </div>

            {/* Derecha: detalle/edición del día seleccionado */}
            <div className="card">
              <div className="card__header">
                <h3 className="card__title">{selectedDia ? 'Día seleccionado' : 'Detalle'}</h3>
                {!selectedDia && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>Seleccioná un día</span>}
              </div>
              {/* Tabs de talleres para Taller Abierto con múltiples talleres por fecha */}
              {tipo === 'taller_abierto' && diasFechaSeleccionada.length > 1 && (
                <div className="tabs__header" style={{ padding: '0 var(--spacing-md)', borderBottom: '1px solid var(--color-border)' }}>
                  {diasFechaSeleccionada.map((dia) => (
                    <button
                      key={dia.id}
                      className={`tabs__tab${selectedDiaId === dia.id ? ' tabs__tab--active' : ''}`}
                      style={{ fontSize: 'var(--font-size-sm)' }}
                      onClick={() => { setSelectedDiaId(dia.id); setEditingDiaId(''); setDeletingDiaId(''); setAgregandoFamilia(false); }}
                    >
                      {dia.nombreTaller || dia.horario || dia.id}
                    </button>
                  ))}
                </div>
              )}
              <div className="card__body">
                {!selectedDia ? (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) var(--spacing-md)', color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                    Seleccioná un día en el calendario para ver los inscriptos o editarlo.
                  </div>
                ) : isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Fecha</label>
                      <input type="date" className="form-input" value={editDia.fecha} onChange={(e) => setEditDia((p) => ({ ...p, fecha: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Horario</label>
                      <input type="text" className="form-input" placeholder="ej: 10:00 - 11:00" value={editDia.horario} onChange={(e) => setEditDia((p) => ({ ...p, horario: e.target.value }))} />
                    </div>
                    {tipo === 'taller_abierto' && (
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Taller</label>
                        <input type="text" className="form-input" placeholder="ej: Teatro" value={editDia.nombreTaller} onChange={(e) => setEditDia((p) => ({ ...p, nombreTaller: e.target.value }))} />
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
                      <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => handleSaveEdit(selectedDia.id)} disabled={submitting}>Guardar</button>
                      <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => setEditingDiaId('')} disabled={submitting}>Cancelar</button>
                    </div>
                  </div>
                ) : isDeleting ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                      ¿Eliminar <strong>{formatFechaDisplay(selectedDia.fecha)}</strong>?
                    </p>
                    {insc.length > 0 && (
                      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)', fontWeight: 'var(--font-weight-medium)' }}>
                        Se borrarán {insc.length} inscripción{insc.length !== 1 ? 'es' : ''}.
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                      <button className="btn btn--danger" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => handleConfirmDelete(selectedDia.id)} disabled={submitting}>Eliminar</button>
                      <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => setDeletingDiaId('')} disabled={submitting}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                    <div>
                      <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize', marginBottom: 'var(--spacing-xs)' }}>
                        {formatFechaDisplay(selectedDia.fecha)}
                        {selectedDia.horario && <span style={{ fontWeight: 'normal', color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-sm)' }}>{formatHorario(selectedDia.horario)}</span>}
                      </p>
                      {tipo === 'taller_abierto' && selectedDia.nombreTaller && (
                        <span className="badge badge--info" style={{ marginTop: 'var(--spacing-xs)', display: 'inline-block' }}>{selectedDia.nombreTaller}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                      <p style={{ fontSize: 'var(--font-size-sm)', color: tipo === 'ambiente_abierto' && insc.length >= 2 ? 'var(--color-error)' : 'var(--color-success)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>
                        {tipo === 'ambiente_abierto' ? `${insc.length}/2 inscriptos` : `${insc.length} inscripto${insc.length !== 1 ? 's' : ''}`}
                      </p>
                      {cupoDesincronizado && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)' }}>
                            Cupo interno desincronizado: {cupo}/2
                          </span>
                          <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={handleSyncCupos} disabled={submitting}>
                            Sincronizar cupos
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-sm)' }}>
                      {insc.map((i) => (
                        <div key={i.id} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', padding: 'var(--spacing-xs) 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                          <span><strong>{i.familiaNombre}</strong> — {i.hijoNombre}</span>
                          {deletingInscripcionId === i.id ? (
                            <span style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                              <button className="btn btn--danger" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={() => handleDeleteInscripcion(i.id)} disabled={submitting}>
                                Confirmar
                              </button>
                              <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={() => setDeletingInscripcionId('')} disabled={submitting}>
                                Cancelar
                              </button>
                            </span>
                          ) : (
                            <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)', color: 'var(--color-error)' }} onClick={() => setDeletingInscripcionId(i.id)} disabled={submitting}>
                              Quitar
                            </button>
                          )}
                        </div>
                      ))}
                      {agregandoFamilia ? (
                        <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                          <select
                            className="form-input"
                            style={{ fontSize: 'var(--font-size-sm)' }}
                            value={hijoSeleccionado}
                            onChange={(e) => setHijoSeleccionado(e.target.value)}
                          >
                            <option value="">Seleccioná un alumno...</option>
                            {hijosAmbiente
                              .filter((h) => !insc.some((i) => i.hijoId === h.id))
                              .map((h) => (
                                <option key={h.id} value={h.id}>{h.nombreCompleto}</option>
                              ))}
                          </select>
                          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                            <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={handleAgregarFamilia} disabled={submitting || !hijoSeleccionado}>
                              Agregar
                            </button>
                            <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={() => setAgregandoFamilia(false)} disabled={submitting}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        !(tipo === 'ambiente_abierto' && insc.length >= 2) && (
                          <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-xs) var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }} onClick={handleAbrirAgregarFamilia} disabled={submitting}>
                            + Agregar familia
                          </button>
                        )
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', paddingTop: 'var(--spacing-xs)' }}>
                      <button className="btn btn--secondary" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => handleStartEdit(selectedDia)}>Editar</button>
                      <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }} onClick={() => { setDeletingDiaId(selectedDia.id); setEditingDiaId(''); }}>Eliminar</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Formulario para agregar días — siempre visible abajo */}
          <div className="card" style={{ marginTop: 'var(--spacing-lg)' }}>
            <div className="card__header"><h3 className="card__title">Agregar día</h3></div>
            <div className="card__body">
              <form onSubmit={handleAddDia} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-input" value={newDia.fecha} onChange={(e) => setNewDia((p) => ({ ...p, fecha: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Horario</label>
                  <input type="text" className="form-input" placeholder="ej: 10:00 - 11:00" value={newDia.horario} onChange={(e) => setNewDia((p) => ({ ...p, horario: e.target.value }))} required />
                </div>
                {tipo === 'taller_abierto' && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nombre del taller</label>
                    <input type="text" className="form-input" placeholder="ej: Teatro" value={newDia.nombreTaller} onChange={(e) => setNewDia((p) => ({ ...p, nombreTaller: e.target.value }))} required />
                  </div>
                )}
                <button type="submit" className="btn btn--primary" disabled={submitting}>Agregar día</button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ClasesAbiertasManager() {
  const [tipoActivo, setTipoActivo] = useState('ambiente_abierto');
  const [ambienteActivo, setAmbienteActivo] = useState('taller1');
  const [panelActions, setPanelActions] = useState(null);

  return (
    <div className="container page-container" style={{ paddingTop: 'var(--spacing-xl)' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
        <div className="tabs__header" style={{ margin: 0 }}>
          {TIPOS.map((tipo) => (
            <button key={tipo} className={`tabs__tab${tipoActivo === tipo ? ' tabs__tab--active' : ''}`} onClick={() => setTipoActivo(tipo)}>
              {TIPO_LABELS[tipo]}
            </button>
          ))}
        </div>
        {panelActions && <div>{panelActions}</div>}
      </div>
      <div className="tabs__header" style={{ marginBottom: 'var(--spacing-lg)' }}>
        {AMBIENTES.map((amb) => (
          <button key={amb} className={`tabs__tab${ambienteActivo === amb ? ' tabs__tab--active' : ''}`} onClick={() => setAmbienteActivo(amb)}>
            {AMBIENTE_LABELS[amb]}
          </button>
        ))}
      </div>
      <PanelConvocatoria key={`${tipoActivo}_${ambienteActivo}`} tipo={tipoActivo} ambiente={ambienteActivo} onActionsChange={setPanelActions} />
    </div>
  );
}
