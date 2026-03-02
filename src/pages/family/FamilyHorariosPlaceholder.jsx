import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';

export function FamilyHorariosPlaceholder() {
  const navigate = useNavigate();

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Horario semanal</h1>
          <p className="dashboard-subtitle">Esta seccion se encuentra en actualizacion temporal.</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn btn--outline btn--back">
          <Icon name="chevron-left" size={16} />
          Volver
        </button>
      </div>

      <section className="card empty-state empty-state--card" role="status" aria-live="polite">
        <Icon name="calendar" size={38} className="empty-state__icon" />
        <h2 className="card__title">En desarrollo</h2>
        <p className="empty-state__text">Estamos asignando talleres y horarios.</p>
        <p className="empty-state__text">Cuando finalice la asignacion, esta vista mostrara la grilla completa.</p>
      </section>
    </div>
  );
}
