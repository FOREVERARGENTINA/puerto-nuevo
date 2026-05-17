import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClasesAbiertas } from '../../hooks/useClasesAbiertas';
import { clasesAbiertasService } from '../../services/clasesAbiertas.service';
import { childrenService } from '../../services/children.service';
import CalendarioConvocatoria from '../../components/ui/CalendarioConvocatoria';
import './ClasesAbiertas.css';

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
  const [selectedDiaId, setSelectedDiaId] = useState('');
  const [seleccionandoHijo, setSeleccionandoHijo] = useState(false);

  const showErr = (m) => { setError(m); setTimeout(() => setError(''), 4000); };
  const showMsg = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };

  const miInscripcion = inscripcionesPropia?.find((i) => i.familiaUid === user?.uid);

  const marcadores = useMemo(() => {
    if (!convocatoria) return new Map();
    const m = new Map();
    (convocatoria.dias || []).forEach((dia) => {
      const cupo = convocatoria.cupos?.[dia.id] || 0;
      if (miInscripcion?.diaId === dia.id) m.set(dia.id, 'inscripto');
      else if (cupo >= 2) m.set(dia.id, 'completo');
      else m.set(dia.id, 'disponible');
    });
    return m;
  }, [convocatoria, miInscripcion]);

  const selectedDia = convocatoria?.dias?.find((d) => d.id === selectedDiaId) || null;
  const esMiDia = miInscripcion?.diaId === selectedDiaId;
  const estaCompleto = selectedDia ? (convocatoria?.cupos?.[selectedDia.id] || 0) >= 2 : false;

  const handleAnotarme = async (dia, hijo) => {
    setSubmitting(true);
    setSeleccionandoHijo(false);
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

  const handleClickAnotarme = () => {
    if (hijos.length === 1) handleAnotarme(selectedDia, hijos[0]);
    else setSeleccionandoHijo(true);
  };

  const dias = convocatoria?.dias || [];

  if (!convocatoria || !dias.length) {
    return <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Sin fechas disponibles por el momento.</p>;
  }

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}

      <div className="clases-abiertas-layout">
        {/* Izquierda: calendario */}
        <div className="card">
          <div className="card__header"><h3 className="card__title">Calendario</h3></div>
          <div className="card__body">
            <CalendarioConvocatoria
              dias={dias}
              selectedDiaId={selectedDiaId}
              onSelectDia={(dia) => { setSelectedDiaId(dia?.id || ''); setSeleccionandoHijo(false); }}
              marcadores={marcadores}
            />
          </div>
        </div>

        {/* Derecha: detalle del día seleccionado */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Fecha seleccionada</h3>
            {!selectedDia && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>Seleccioná un día</span>}
          </div>
          <div className="card__body">
            {!selectedDia ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) var(--spacing-md)', color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                Seleccioná un día en el calendario para ver las opciones.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div>
                  <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize', marginBottom: 'var(--spacing-xs)' }}>
                    {formatFechaDisplay(selectedDia.fecha)}
                  </p>
                  {selectedDia.horario && (
                    <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>{selectedDia.horario}</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                  {esMiDia ? (
                    <>
                      <span className="badge badge--success">Anotada</span>
                      <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }} disabled={submitting} onClick={handleDesanotarme}>
                        Desanotarme
                      </button>
                    </>
                  ) : estaCompleto ? (
                    <span className="badge badge--error">Completo</span>
                  ) : miInscripcion ? (
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>Ya tenés una fecha elegida</span>
                  ) : (
                    <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} disabled={submitting} onClick={handleClickAnotarme}>
                      Anotarme
                    </button>
                  )}
                </div>
                {seleccionandoHijo && (
                  <SelectorHijo hijos={hijos} onSeleccionar={(h) => handleAnotarme(selectedDia, h)} onCancelar={() => setSeleccionandoHijo(false)} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SeccionTallerAbierto({ convocatoria, inscripcionesPropia, hijos, ambiente, onRecargar }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedDiaId, setSelectedDiaId] = useState('');
  const [seleccionandoHijo, setSeleccionandoHijo] = useState(false);

  const showErr = (m) => { setError(m); setTimeout(() => setError(''), 4000); };
  const showMsg = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };

  const getMiInscripcion = (diaId) => (inscripcionesPropia || []).find((i) => i.diaId === diaId);

  const marcadores = useMemo(() => {
    if (!convocatoria) return new Map();
    const m = new Map();
    (convocatoria.dias || []).forEach((dia) => {
      m.set(dia.id, getMiInscripcion(dia.id) ? 'inscripto' : 'disponible');
    });
    return m;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convocatoria, inscripcionesPropia]);

  const selectedDia = convocatoria?.dias?.find((d) => d.id === selectedDiaId) || null;
  const miInscripcionSelected = selectedDia ? getMiInscripcion(selectedDia.id) : null;

  const handleAnotarme = async (dia, hijo) => {
    setSubmitting(true);
    setSeleccionandoHijo(false);
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

  const handleClickAnotarme = () => {
    if (hijos.length === 1) handleAnotarme(selectedDia, hijos[0]);
    else setSeleccionandoHijo(true);
  };

  const dias = convocatoria?.dias || [];

  if (!convocatoria || !dias.length) {
    return <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Sin fechas disponibles por el momento.</p>;
  }

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}

      <div className="clases-abiertas-layout">
        {/* Izquierda: calendario */}
        <div className="card">
          <div className="card__header"><h3 className="card__title">Calendario</h3></div>
          <div className="card__body">
            <CalendarioConvocatoria
              dias={dias}
              selectedDiaId={selectedDiaId}
              onSelectDia={(dia) => { setSelectedDiaId(dia?.id || ''); setSeleccionandoHijo(false); }}
              marcadores={marcadores}
            />
          </div>
        </div>

        {/* Derecha: detalle del día seleccionado */}
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Fecha seleccionada</h3>
            {!selectedDia && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>Seleccioná un día</span>}
          </div>
          <div className="card__body">
            {!selectedDia ? (
              <div style={{ textAlign: 'center', padding: 'var(--spacing-xl) var(--spacing-md)', color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                Seleccioná un día en el calendario para ver las opciones.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div>
                  <p style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize', marginBottom: 'var(--spacing-xs)' }}>
                    {formatFechaDisplay(selectedDia.fecha)}
                  </p>
                  {selectedDia.horario && (
                    <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>{selectedDia.horario}</p>
                  )}
                  {selectedDia.nombreTaller && (
                    <span className="badge badge--info" style={{ marginTop: 'var(--spacing-xs)', display: 'inline-block' }}>{selectedDia.nombreTaller}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                  {miInscripcionSelected ? (
                    <>
                      <span className="badge badge--success">Anotada</span>
                      <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }} disabled={submitting} onClick={() => handleDesanotarme(miInscripcionSelected.id)}>
                        Desanotarme
                      </button>
                    </>
                  ) : (
                    <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} disabled={submitting} onClick={handleClickAnotarme}>
                      Anotarme
                    </button>
                  )}
                </div>
                {seleccionandoHijo && (
                  <SelectorHijo hijos={hijos} onSeleccionar={(h) => handleAnotarme(selectedDia, h)} onCancelar={() => setSeleccionandoHijo(false)} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelAmbiente({ ambiente, convocatorias, inscripcionesPropia, hijos, onRecargar }) {
  const [tipoActivo, setTipoActivo] = useState('ambiente_abierto');

  const convAA = convocatorias[`${ambiente}_ambiente_abierto`] || null;
  const convTA = convocatorias[`${ambiente}_taller_abierto`] || null;
  const inscAA = convAA ? (inscripcionesPropia[convAA.id] || []) : [];
  const inscTA = convTA ? (inscripcionesPropia[convTA.id] || []) : [];

  return (
    <div>
      <div className="tabs__header" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <button className={`tabs__tab${tipoActivo === 'ambiente_abierto' ? ' tabs__tab--active' : ''}`} onClick={() => setTipoActivo('ambiente_abierto')}>
          Ambiente Abierto
        </button>
        <button className={`tabs__tab${tipoActivo === 'taller_abierto' ? ' tabs__tab--active' : ''}`} onClick={() => setTipoActivo('taller_abierto')}>
          Taller Abierto
        </button>
      </div>
      {tipoActivo === 'ambiente_abierto' ? (
        <SeccionAmbienteAbierto convocatoria={convAA} inscripcionesPropia={inscAA} hijos={hijos} ambiente={ambiente} onRecargar={onRecargar} />
      ) : (
        <SeccionTallerAbierto convocatoria={convTA} inscripcionesPropia={inscTA} hijos={hijos} ambiente={ambiente} onRecargar={onRecargar} />
      )}
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
    return <div className="container page-container" style={{ paddingTop: 'var(--spacing-xl)' }}><p style={{ color: 'var(--color-text-light)' }}>Cargando...</p></div>;
  }

  if (!ambientes.length) {
    return (
      <div className="container page-container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card"><div className="card__body"><p style={{ color: 'var(--color-text-light)' }}>No se encontraron alumnos asociados a tu cuenta.</p></div></div>
      </div>
    );
  }

  return (
    <div className="container page-container" style={{ paddingTop: 'var(--spacing-xl)' }}>

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
