import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { clasesAbiertasService } from '../../services/clasesAbiertas.service';
import CalendarioConvocatoria from '../../components/ui/CalendarioConvocatoria';

const TIPO_LABELS = { ambiente_abierto: 'Ambiente Abierto', taller_abierto: 'Taller Abierto' };
const AMBIENTE_LABELS = { taller1: 'Taller 1', taller2: 'Taller 2' };
const TIPOS = ['ambiente_abierto', 'taller_abierto'];
const AMBIENTES = ['taller1', 'taller2'];

const formatFechaDisplay = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const formatFechaInput = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function PanelConvocatoria({ tipo, ambiente }) {
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
  const [editingDiaId, setEditingDiaId] = useState('');
  const [editDia, setEditDia] = useState({ fecha: '', horario: '', nombreTaller: '' });
  const [deletingDiaId, setDeletingDiaId] = useState('');

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

  const inscriptosPorDia = (diaId) => inscripciones.filter((i) => i.diaId === diaId);
  const cupoPorDia = (diaId) => convocatoria?.cupos?.[diaId] || 0;

  const marcadores = useMemo(() => {
    if (!convocatoria) return new Map();
    const m = new Map();
    (convocatoria.dias || []).forEach((dia) => {
      const cupo = cupoPorDia(dia.id);
      const insc = inscriptosPorDia(dia.id);
      if (tipo === 'ambiente_abierto') {
        m.set(dia.id, cupo >= 2 ? 'completo' : insc.length > 0 ? 'inscripto' : 'disponible');
      } else {
        m.set(dia.id, insc.length > 0 ? 'inscripto' : 'disponible');
      }
    });
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convocatoria, inscripciones]);

  const selectedDia = convocatoria?.dias?.find((d) => d.id === selectedDiaId) || null;
  const isEditing = editingDiaId === selectedDiaId;
  const isDeleting = deletingDiaId === selectedDiaId;
  const insc = selectedDia ? inscriptosPorDia(selectedDia.id) : [];
  const cupo = selectedDia ? cupoPorDia(selectedDia.id) : 0;

  if (loading) return <p style={{ color: 'var(--color-text-light)', padding: 'var(--spacing-md)' }}>Cargando...</p>;

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}

      {!convocatoria ? (
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <p style={{ color: 'var(--color-text-light)', marginBottom: 'var(--spacing-md)' }}>
              No hay convocatoria activa para {TIPO_LABELS[tipo]} — {AMBIENTE_LABELS[ambiente]}.
            </p>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn--primary" onClick={handleNuevaConvocatoria} disabled={submitting}>
                Nueva convocatoria
              </button>
              {convocatoriaPasada && (
                <button className="btn btn--secondary" onClick={handleReactivar} disabled={submitting}>
                  Reactivar convocatoria anterior
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card__title">{TIPO_LABELS[tipo]} — {AMBIENTE_LABELS[ambiente]}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: convocatoria.activo ? 'var(--color-success)' : 'var(--color-text-light)' }}>
                {convocatoria.activo ? 'Activa' : 'Inactiva'}
              </span>
              <button className="btn btn--secondary" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={handleToggle} disabled={submitting}>
                {convocatoria.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={handleNuevaConvocatoria} disabled={submitting}>
                Nueva convocatoria
              </button>
            </div>
          </div>

          <div className="card__body">
            {(convocatoria.dias || []).length > 0 ? (
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text)' }}>
                  Días programados
                </h4>
                <CalendarioConvocatoria
                  dias={convocatoria.dias}
                  selectedDiaId={selectedDiaId}
                  onSelectDia={(dia) => {
                    setSelectedDiaId(dia?.id || '');
                    setEditingDiaId('');
                    setDeletingDiaId('');
                  }}
                  marcadores={marcadores}
                />

                {selectedDia && (
                  <div style={{ marginTop: 'var(--spacing-md)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', background: 'var(--color-background-alt)' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
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
                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                          <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => handleSaveEdit(selectedDia.id)} disabled={submitting}>Guardar</button>
                          <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => setEditingDiaId('')} disabled={submitting}>Cancelar</button>
                        </div>
                      </div>
                    ) : isDeleting ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                          ¿Eliminar {formatFechaDisplay(selectedDia.fecha)}?
                          {insc.length > 0 && <strong style={{ color: 'var(--color-error)' }}> Se borrarán {insc.length} inscripción{insc.length !== 1 ? 'es' : ''}.</strong>}
                        </span>
                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                          <button className="btn btn--danger" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => handleConfirmDelete(selectedDia.id)} disabled={submitting}>Eliminar</button>
                          <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => setDeletingDiaId('')} disabled={submitting}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                          <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize' }}>{formatFechaDisplay(selectedDia.fecha)}</span>
                            <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>{selectedDia.horario}</span>
                            {tipo === 'taller_abierto' && selectedDia.nombreTaller && (
                              <span className="badge badge--info">{selectedDia.nombreTaller}</span>
                            )}
                            <span style={{ fontSize: 'var(--font-size-sm)', color: tipo === 'ambiente_abierto' && cupo >= 2 ? 'var(--color-error)' : 'var(--color-success)' }}>
                              {tipo === 'ambiente_abierto' ? `${cupo}/2 inscriptos` : `${insc.length} inscripto${insc.length !== 1 ? 's' : ''}`}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                            <button className="btn btn--secondary" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => handleStartEdit(selectedDia)}>Editar</button>
                            <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }} onClick={() => { setDeletingDiaId(selectedDia.id); setEditingDiaId(''); }}>Eliminar</button>
                          </div>
                        </div>
                        {insc.length > 0 && (
                          <div style={{ marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border)' }}>
                            {insc.map((i) => (
                              <div key={i.id} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', padding: 'var(--spacing-xs) 0' }}>
                                <strong>{i.familiaNombre}</strong> — {i.hijoNombre}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-light)', marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)' }}>No hay días cargados todavía.</p>
            )}

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-lg)' }}>
              <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text)' }}>Agregar día</h4>
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
        </div>
      )}
    </div>
  );
}

export default function ClasesAbiertasManager() {
  const [tipoActivo, setTipoActivo] = useState('ambiente_abierto');
  const [ambienteActivo, setAmbienteActivo] = useState('taller1');

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>Clases Abiertas</h1>
        <p style={{ color: 'var(--color-text-light)', marginTop: 'var(--spacing-xs)' }}>Gestioná las convocatorias de Ambiente Abierto y Taller Abierto.</p>
      </div>
      <div className="tabs__header" style={{ marginBottom: 'var(--spacing-md)' }}>
        {TIPOS.map((tipo) => (
          <button key={tipo} className={`tabs__tab${tipoActivo === tipo ? ' tabs__tab--active' : ''}`} onClick={() => setTipoActivo(tipo)}>
            {TIPO_LABELS[tipo]}
          </button>
        ))}
      </div>
      <div className="tabs__header" style={{ marginBottom: 'var(--spacing-lg)' }}>
        {AMBIENTES.map((amb) => (
          <button key={amb} className={`tabs__tab${ambienteActivo === amb ? ' tabs__tab--active' : ''}`} onClick={() => setAmbienteActivo(amb)}>
            {AMBIENTE_LABELS[amb]}
          </button>
        ))}
      </div>
      <PanelConvocatoria key={`${tipoActivo}_${ambienteActivo}`} tipo={tipoActivo} ambiente={ambienteActivo} />
    </div>
  );
}
