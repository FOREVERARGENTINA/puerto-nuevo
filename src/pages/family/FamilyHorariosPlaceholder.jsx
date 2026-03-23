import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { useAuth } from '../../hooks/useAuth';
import { ambienteActivitiesService } from '../../services/ambienteActivities.service';

const ImageLightbox = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out'
      }}
    >
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '95vw', maxHeight: '95vh', borderRadius: 'var(--radius-md)', cursor: 'default' }}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        style={{
          position: 'absolute', top: 16, right: 16,
          background: 'rgba(255,255,255,0.15)', border: 'none',
          color: '#fff', borderRadius: '50%', width: 40, height: 40,
          fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        ✕
      </button>
    </div>
  );
};

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
  const [lightboxSrc, setLightboxSrc] = useState(null);

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
    <>
    {lightboxSrc && (
      <ImageLightbox
        src={lightboxSrc}
        alt="Horario semanal en tamaño completo"
        onClose={() => setLightboxSrc(null)}
      />
    )}
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

                <button
                  type="button"
                  onClick={() => setLightboxSrc(schedule.url)}
                  aria-label={`Abrir horario de ${schedule.label} en tamaño completo`}
                  style={{
                    display: 'block', width: '100%', padding: 0, border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'zoom-in',
                    background: 'var(--color-surface-secondary, #f6f7f7)'
                  }}
                >
                  <img
                    src={schedule.url}
                    alt={`Horario semanal de ${schedule.label}`}
                    style={{ display: 'block', width: '100%', height: 'auto' }}
                  />
                </button>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
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
    </>
  );
}
