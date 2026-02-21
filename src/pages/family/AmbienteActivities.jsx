import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  AMBIENTE_ACTIVITY_CATEGORY_OPTIONS,
  resolveCategoryLabel
} from '../../config/ambienteActivities';
import { useAuth } from '../../hooks/useAuth';
import { ambienteActivitiesService } from '../../services/ambienteActivities.service';

const AMBIENTE_OPTIONS = [
  { value: 'todas', label: 'Todos los ambientes' },
  { value: 'taller1', label: 'Taller 1' },
  { value: 'taller2', label: 'Taller 2' }
];

const AMBIENTE_LABELS = {
  taller1: 'Taller 1',
  taller2: 'Taller 2'
};

const categoryFilterOptions = [
  { value: 'todas', label: 'Todas las categorías' },
  ...AMBIENTE_ACTIVITY_CATEGORY_OPTIONS
];

const formatDate = (value) => {
  if (!value) return '';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR');
};

export default function AmbienteActivities() {
  const { user } = useAuth();
  const location = useLocation();

  const [activities, setActivities] = useState([]);
  const [familyAmbientes, setFamilyAmbientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAmbiente, setSelectedAmbiente] = useState('todas');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const filterControlStyle = {
    height: '52px',
    minHeight: '52px',
    padding: '0 var(--spacing-md)',
    lineHeight: '1.4',
    fontSize: 'var(--font-size-md)',
    boxSizing: 'border-box'
  };

  const deepLink = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      ambiente: params.get('ambiente') || '',
      activityId: params.get('activityId') || ''
    };
  }, [location.search]);

  useEffect(() => {
    const load = async () => {
      if (!user?.uid) return;

      setLoading(true);
      setError('');

      const ambientesResult = await ambienteActivitiesService.getFamilyAmbientes(user.uid);
      const ambientes = ambientesResult.success ? ambientesResult.ambientes : [];
      setFamilyAmbientes(ambientes);

      if (deepLink.ambiente && ambientes.includes(deepLink.ambiente)) {
        setSelectedAmbiente(deepLink.ambiente);
      } else if (ambientes.length === 1) {
        setSelectedAmbiente(ambientes[0]);
      } else {
        setSelectedAmbiente('todas');
      }

      const activitiesResult = await ambienteActivitiesService.getActivities({
        sinceDays: 120,
        limit: 120,
        ambientes
      });

      if (activitiesResult.success) {
        setActivities(activitiesResult.activities || []);
      } else {
        setActivities([]);
        setError(activitiesResult.error || 'No se pudieron cargar las actividades');
      }

      setLoading(false);
    };

    void load();
  }, [user?.uid, deepLink.ambiente]);

  useEffect(() => {
    if (!deepLink.activityId || activities.length === 0) return;

    const timeoutId = window.setTimeout(() => {
      const el = document.getElementById(`activity-${deepLink.activityId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);

    return () => window.clearTimeout(timeoutId);
  }, [deepLink.activityId, activities]);

  const visibleActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (selectedAmbiente !== 'todas' && activity.ambiente !== selectedAmbiente) {
        return false;
      }

      if (selectedCategory !== 'todas' && activity.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [activities, selectedAmbiente, selectedCategory]);

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Actividades</h1>
          <p className="dashboard-subtitle">Materiales y propuestas para el hogar por ambiente.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="card__body" style={{ display: 'grid', gap: 'var(--spacing-md)', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {familyAmbientes.length > 1 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="family-ambiente-filter">Ambiente</label>
              <select
                id="family-ambiente-filter"
                className="form-control form-select"
                style={filterControlStyle}
                value={selectedAmbiente}
                onChange={(e) => setSelectedAmbiente(e.target.value)}
              >
                {AMBIENTE_OPTIONS
                  .filter((option) => (
                    option.value === 'todas' || familyAmbientes.includes(option.value)
                  ))
                  .map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
              </select>
            </div>
          )}

          {familyAmbientes.length === 1 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ambiente</label>
              <div className="form-control" style={{ display: 'flex', alignItems: 'center', ...filterControlStyle }}>
                {AMBIENTE_LABELS[familyAmbientes[0]] || 'Taller'}
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="family-category-filter">Categoría</label>
            <select
              id="family-category-filter"
              className="form-control form-select"
              style={filterControlStyle}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categoryFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="card__body"><p>Cargando actividades...</p></div></div>
      ) : error ? (
        <div className="alert alert--danger">{error}</div>
      ) : visibleActivities.length === 0 ? (
        <div className="card"><div className="card__body"><p>No hay actividades para los filtros seleccionados.</p></div></div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          {visibleActivities.map((activity) => {
            const isHighlighted = deepLink.activityId === activity.id;

            return (
              <article
                key={activity.id}
                id={`activity-${activity.id}`}
                className="card"
                style={{
                  border: isHighlighted ? '2px solid var(--color-primary)' : '1px solid var(--color-border)'
                }}
              >
                <div className="card__body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                    <div>
                      <h2 className="card__title" style={{ marginBottom: 'var(--spacing-xs)' }}>{activity.title}</h2>
                      <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{activity.description || 'Sin descripción'}</p>
                    </div>
                    <span className="badge badge--secondary">{activity.ambiente === 'taller1' ? 'Taller 1' : 'Taller 2'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginTop: 'var(--spacing-sm)' }}>
                    <span className="badge badge--primary">{resolveCategoryLabel(activity.category, activity.customCategory)}</span>
                    {activity.dueDate && <span className="badge badge--secondary">Vence: {formatDate(activity.dueDate)}</span>}
                    <span className="badge badge--secondary">{activity.itemCount || (activity.items || []).length} ítems</span>
                  </div>

                  {(activity.items || []).length > 0 && (
                    <ul style={{ marginTop: 'var(--spacing-sm)', marginBottom: 0 }}>
                      {(activity.items || []).map((item, index) => (
                        <li key={`${activity.id}-${index}`}>
                          <a href={item.url} target="_blank" rel="noreferrer">
                            {item.label || item.url || 'Recurso'}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
