import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { useAuth } from '../../hooks/useAuth';
import { ambienteActivitiesService } from '../../services/ambienteActivities.service';

const HORARIOS_BY_AMBIENTE = {
  taller1: {
    label: 'Taller 1',
    fileName: 'horario-taller-1.jpg',
    url: '/datos/imagenes/horarios_taller1.jpg'
  },
  taller2: {
    label: 'Taller 2',
    fileName: 'horario-taller-2.jpg',
    url: '/datos/imagenes/horarios_taller_2.jpg'
  }
};

export function FamilyHorariosPlaceholder() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [familyAmbientes, setFamilyAmbientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingAmbiente, setDownloadingAmbiente] = useState('');

  useEffect(() => {
    const loadFamilyAmbientes = async () => {
      if (!user?.uid) {
        setFamilyAmbientes([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      const result = await ambienteActivitiesService.getFamilyAmbientes(user.uid);
      if (result.success) {
        setFamilyAmbientes(result.ambientes || []);
      } else {
        setFamilyAmbientes([]);
        setError(result.error || 'No se pudieron cargar los horarios.');
      }

      setLoading(false);
    };

    void loadFamilyAmbientes();
  }, [user?.uid]);

  const visibleSchedules = useMemo(
    () => familyAmbientes
      .filter((ambiente) => HORARIOS_BY_AMBIENTE[ambiente])
      .map((ambiente) => ({ ambiente, ...HORARIOS_BY_AMBIENTE[ambiente] })),
    [familyAmbientes]
  );

  const handleDownload = (schedule) => {
    setDownloadingAmbiente(schedule.ambiente);

    const link = document.createElement('a');
    link.href = schedule.url;
    link.download = schedule.fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      setDownloadingAmbiente('');
    }, 250);
  };

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Horario semanal</h1>
          <p className="dashboard-subtitle">Consultá y descargá el horario correspondiente a tu familia.</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn btn--outline btn--back">
          <Icon name="chevron-left" size={16} />
          Volver
        </button>
      </div>

      {loading ? (
        <section className="card empty-state empty-state--card" role="status" aria-live="polite">
          <Icon name="calendar" size={38} className="empty-state__icon" />
          <h2 className="card__title">Cargando horarios</h2>
          <p className="empty-state__text">Estamos buscando los ambientes asociados a tu familia.</p>
        </section>
      ) : error ? (
        <section className="card empty-state empty-state--card" role="alert">
          <Icon name="alert-circle" size={38} className="empty-state__icon" />
          <h2 className="card__title">No pudimos cargar los horarios</h2>
          <p className="empty-state__text">{error}</p>
        </section>
      ) : visibleSchedules.length === 0 ? (
        <section className="card empty-state empty-state--card" role="status" aria-live="polite">
          <Icon name="calendar" size={38} className="empty-state__icon" />
          <h2 className="card__title">Sin horario disponible</h2>
          <p className="empty-state__text">Todavía no encontramos un ambiente asignado para mostrarte.</p>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
          {visibleSchedules.length > 1 ? (
            <section className="card">
              <div className="card__body">
                <p className="card__subtitle" style={{ margin: 0 }}>
                  Tu familia tiene alumnos en ambos talleres. Por eso ves los dos horarios disponibles.
                </p>
              </div>
            </section>
          ) : null}

          {visibleSchedules.map((schedule) => (
            <section key={schedule.ambiente} className="card">
              <div className="card__body" style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                <div>
                  <h2 className="card__title" style={{ marginBottom: 'var(--spacing-xs)' }}>{schedule.label}</h2>
                  <p className="card__subtitle" style={{ margin: 0 }}>
                    Vista del horario semanal con opción de descarga.
                  </p>
                </div>

                <a
                  href={schedule.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir horario de ${schedule.label} en tamaño completo`}
                  style={{
                    display: 'block',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface-secondary, #f6f7f7)'
                  }}
                >
                  <img
                    src={schedule.url}
                    alt={`Horario semanal de ${schedule.label}`}
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  />
                </a>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                  <a
                    href={schedule.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--outline btn--sm"
                  >
                    Ver en grande
                  </a>
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => handleDownload(schedule)}
                    disabled={downloadingAmbiente === schedule.ambiente}
                  >
                    {downloadingAmbiente === schedule.ambiente ? 'Descargando...' : 'Descargar horario'}
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
