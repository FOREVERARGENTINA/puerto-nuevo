import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function TeacherDashboard() {
  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Panel Docente</h1>
          <p className="dashboard-subtitle">Herramientas y accesos generales para docentes.</p>
        </div>
        <span className="badge badge--primary">Docente</span>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-section">
          <h2 className="section-title">Accesos</h2>
          <div className="grid-cards">
            <Link to={ROUTES.TEACHER_COMMUNICATIONS} className="card card--clickable link-unstyled">
              <h3 className="card__title">Mis Comunicados</h3>
              <p>Ver los comunicados que enviaste y su seguimiento</p>
            </Link>
            <Link to={`${ROUTES.SEND_COMMUNICATION}/nuevo`} className="card card--clickable link-unstyled">
              <h3 className="card__title">Enviar Comunicado</h3>
              <p>Comunicar novedades a familias y alumnos</p>
            </Link>
            <Link to={ROUTES.TEACHER_DOCUMENTS} className="card card--clickable link-unstyled">
              <h3 className="card__title">Documentos</h3>
              <p>Acceder a documentos pedagogicos e institucionales</p>
            </Link>
            <Link to={ROUTES.TEACHER_ACTIVITIES} className="card card--clickable link-unstyled">
              <h3 className="card__title">Actividades</h3>
              <p>Gestionar actividades de ambiente</p>
            </Link>
            <Link to="/portal/docente/horarios" className="card card--clickable link-unstyled">
              <h3 className="card__title">Horario Semanal</h3>
              <p>Ver calendario semanal de ambientes y talleres</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
