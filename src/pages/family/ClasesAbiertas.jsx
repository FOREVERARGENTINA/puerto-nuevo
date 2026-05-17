import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClasesAbiertas } from '../../hooks/useClasesAbiertas';
import { clasesAbiertasService } from '../../services/clasesAbiertas.service';
import { childrenService } from '../../services/children.service';

const AMBIENTE_LABELS = { taller1: 'Taller 1', taller2: 'Taller 2' };

const formatFechaDisplay = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

function SelectorHijo({ hijos, onSeleccionar, onCancelar }) {
  const [hijoId, setHijoId] = useState(hijos[0]?.id || '');
  return (
    <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-md)', background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>¿Para qué alumno?</span>
      <select className="form-input" style={{ width: 'auto' }} value={hijoId} onChange={(e) => setHijoId(e.target.value)}>
        {hijos.map((h) => <option key={h.id} value={h.id}>{h.nombreCompleto}</option>)}
      </select>
      <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => { const h = hijos.find((x) => x.id === hijoId); if (h) onSeleccionar(h); }}>
        Confirmar
      </button>
      <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)' }} onClick={onCancelar}>Cancelar</button>
    </div>
  );
}

function SeccionAmbienteAbierto({ convocatoria, inscripcionesPropia, hijos, ambiente, onRecargar }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [seleccionandoDiaId, setSeleccionandoDiaId] = useState('');

  const showErr = (m) => { setError(m); setTimeout(() => setError(''), 4000); };
  const showMsg = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };

  const miInscripcion = inscripcionesPropia?.find((i) => i.familiaUid === user?.uid);

  const estaCompleto = (diaId) => (convocatoria?.cupos?.[diaId] || 0) >= 2;

  const handleAnotarme = async (dia, hijo) => {
    setSubmitting(true);
    setSeleccionandoDiaId('');
    const res = await clasesAbiertasService.inscribirAmbienteAbierto(convocatoria.id, {
      diaId: dia.id,
      familiaUid: user.uid,
      familiaNombre: user.displayName || user.email,
      hijoId: hijo.id,
      hijoNombre: hijo.nombreCompleto,
      ambiente
    });
    if (res.success) { showMsg('¡Te anotaste correctamente!'); onRecargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleDesanotarme = async () => {
    if (!miInscripcion) return;
    setSubmitting(true);
    const res = await clasesAbiertasService.cancelarInscripcion(convocatoria.id, miInscripcion.id);
    if (res.success) { showMsg('Inscripción cancelada.'); onRecargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  if (!convocatoria) return <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Sin fechas disponibles por el momento.</p>;
  const dias = convocatoria.dias || [];
  if (!dias.length) return <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Sin fechas disponibles por el momento.</p>;

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {dias.map((dia) => {
          const esMiDia = miInscripcion?.diaId === dia.id;
          const completo = estaCompleto(dia.id);
          const yaInscripta = !!miInscripcion;

          return (
            <div key={dia.id} style={{ border: `1px solid ${esMiDia ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', background: esMiDia ? 'var(--color-primary-soft)' : 'var(--color-background-alt)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                <div>
                  <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize' }}>{formatFechaDisplay(dia.fecha)}</span>
                  <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-sm)' }}>{dia.horario}</span>
                </div>
                <div>
                  {esMiDia ? (
                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                      <span className="badge badge--success">Anotada</span>
                      <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }} disabled={submitting} onClick={handleDesanotarme}>
                        Desanotarme
                      </button>
                    </div>
                  ) : completo ? (
                    <span className="badge badge--error">Completo</span>
                  ) : yaInscripta ? (
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>Ya tenés una fecha elegida</span>
                  ) : (
                    <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} disabled={submitting} onClick={() => { if (hijos.length === 1) handleAnotarme(dia, hijos[0]); else setSeleccionandoDiaId(dia.id); }}>
                      Anotarme
                    </button>
                  )}
                </div>
              </div>
              {seleccionandoDiaId === dia.id && (
                <SelectorHijo hijos={hijos} onSeleccionar={(h) => handleAnotarme(dia, h)} onCancelar={() => setSeleccionandoDiaId('')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SeccionTallerAbierto({ convocatoria, inscripcionesPropia, hijos, ambiente, onRecargar }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [seleccionandoDiaId, setSeleccionandoDiaId] = useState('');

  const showErr = (m) => { setError(m); setTimeout(() => setError(''), 4000); };
  const showMsg = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };

  const getMiInscripcion = (diaId) => (inscripcionesPropia || []).find((i) => i.diaId === diaId);

  const handleAnotarme = async (dia, hijo) => {
    setSubmitting(true);
    setSeleccionandoDiaId('');
    const res = await clasesAbiertasService.inscribirTallerAbierto(convocatoria.id, {
      diaId: dia.id,
      familiaUid: user.uid,
      familiaNombre: user.displayName || user.email,
      hijoId: hijo.id,
      hijoNombre: hijo.nombreCompleto,
      ambiente
    });
    if (res.success) { showMsg('¡Te anotaste correctamente!'); onRecargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleDesanotarme = async (inscripcionId) => {
    setSubmitting(true);
    const res = await clasesAbiertasService.cancelarInscripcion(convocatoria.id, inscripcionId);
    if (res.success) { showMsg('Inscripción cancelada.'); onRecargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  if (!convocatoria) return <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Sin fechas disponibles por el momento.</p>;
  const dias = convocatoria.dias || [];
  if (!dias.length) return <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Sin fechas disponibles por el momento.</p>;

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {dias.map((dia) => {
          const miInscripcion = getMiInscripcion(dia.id);
          return (
            <div key={dia.id} style={{ border: `1px solid ${miInscripcion ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', background: miInscripcion ? 'var(--color-primary-soft)' : 'var(--color-background-alt)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                <div>
                  <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize' }}>{formatFechaDisplay(dia.fecha)}</span>
                  <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-sm)' }}>{dia.horario}</span>
                  {dia.nombreTaller && <span className="badge badge--info" style={{ marginLeft: 'var(--spacing-sm)' }}>{dia.nombreTaller}</span>}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                  {miInscripcion ? (
                    <>
                      <span className="badge badge--success">Anotada</span>
                      <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }} disabled={submitting} onClick={() => handleDesanotarme(miInscripcion.id)}>
                        Desanotarme
                      </button>
                    </>
                  ) : (
                    <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} disabled={submitting} onClick={() => { if (hijos.length === 1) handleAnotarme(dia, hijos[0]); else setSeleccionandoDiaId(dia.id); }}>
                      Anotarme
                    </button>
                  )}
                </div>
              </div>
              {seleccionandoDiaId === dia.id && (
                <SelectorHijo hijos={hijos} onSeleccionar={(h) => handleAnotarme(dia, h)} onCancelar={() => setSeleccionandoDiaId('')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelAmbiente({ ambiente, convocatorias, inscripcionesPropia, hijos, onRecargar }) {
  const convAA = convocatorias[`${ambiente}_ambiente_abierto`] || null;
  const convTA = convocatorias[`${ambiente}_taller_abierto`] || null;
  const inscAA = convAA ? (inscripcionesPropia[convAA.id] || []) : [];
  const inscTA = convTA ? (inscripcionesPropia[convTA.id] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header"><h3 className="card__title">Ambiente Abierto</h3></div>
        <div className="card__body">
          <SeccionAmbienteAbierto convocatoria={convAA} inscripcionesPropia={inscAA} hijos={hijos} ambiente={ambiente} onRecargar={onRecargar} />
        </div>
      </div>
      <div className="card">
        <div className="card__header"><h3 className="card__title">Taller Abierto</h3></div>
        <div className="card__body">
          <SeccionTallerAbierto convocatoria={convTA} inscripcionesPropia={inscTA} hijos={hijos} ambiente={ambiente} onRecargar={onRecargar} />
        </div>
      </div>
    </div>
  );
}

export default function ClasesAbiertas() {
  const { user } = useAuth();
  const [hijos, setHijos] = useState([]);
  const [loadingHijos, setLoadingHijos] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    childrenService.getChildrenByResponsable(user.uid).then((res) => {
      if (res.success) setHijos(res.children);
      setLoadingHijos(false);
    });
  }, [user?.uid]);

  const ambientes = [...new Set(hijos.map((h) => h.ambiente).filter(Boolean))];
  const { convocatorias, inscripcionesPropia, loading, recargar } = useClasesAbiertas(ambientes);

  const [ambienteActivo, setAmbienteActivo] = useState('');
  useEffect(() => {
    if (ambientes.length && !ambienteActivo) setAmbienteActivo(ambientes[0]);
  }, [ambientes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadingHijos || loading) {
    return <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}><p style={{ color: 'var(--color-text-light)' }}>Cargando...</p></div>;
  }

  if (!ambientes.length) {
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card"><div className="card__body"><p style={{ color: 'var(--color-text-light)' }}>No se encontraron alumnos asociados a tu cuenta.</p></div></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>Clases Abiertas</h1>
        <p style={{ color: 'var(--color-text-light)', marginTop: 'var(--spacing-xs)' }}>Anotate a las fechas disponibles.</p>
      </div>
      {ambientes.length > 1 && (
        <div className="tabs__header" style={{ marginBottom: 'var(--spacing-lg)' }}>
          {ambientes.map((amb) => (
            <button key={amb} className={`tabs__tab${ambienteActivo === amb ? ' tabs__tab--active' : ''}`} onClick={() => setAmbienteActivo(amb)}>
              {AMBIENTE_LABELS[amb]}
            </button>
          ))}
        </div>
      )}
      {ambienteActivo && (
        <PanelAmbiente
          ambiente={ambienteActivo}
          convocatorias={convocatorias}
          inscripcionesPropia={inscripcionesPropia}
          hijos={hijos.filter((h) => h.ambiente === ambienteActivo)}
          onRecargar={recargar}
        />
      )}
    </div>
  );
}
