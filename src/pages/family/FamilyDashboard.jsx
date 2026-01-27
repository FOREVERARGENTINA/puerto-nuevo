import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function FamilyDashboard() {
  return (
    <div className="container page-container family-dashboard-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Panel Familiar</h1>
          <p className="dashboard-subtitle">Accesos y herramientas para familias.</p>
        </div>
        <span className="badge badge--success">Familia</span>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-section">
          <div className="grid-cards-sm">
            <Link to={ROUTES.COMMUNICATIONS} className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Comunicados</h3>
              <p>Ver comunicados de la escuela y confirmar lectura</p>
            </Link>
            <Link to={ROUTES.FAMILY_CONVERSATIONS} className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Conversaciones</h3>
              <p>Enviar consultas privadas y ver respuestas</p>
            </Link>
            <Link to="/familia/hijos" className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Fichas de Alumnos</h3>
              <p>Ver información y datos médicos de sus hijos</p>
            </Link>
            <Link to="/familia/talleres" className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Talleres</h3>
              <p>Ver información, calendarios y galerías de los talleres</p>
            </Link>
            <Link to="/familia/horarios" className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Horario Semanal</h3>
              <p>Ver calendario semanal de ambientes y talleres</p>
            </Link>
            <Link to="/familia/turnos" className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Turnos y Reuniones</h3>
              <p>Reservar turnos para reuniones con la escuela</p>
            </Link>
            <Link to="/familia/snacks" className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Mis Turnos de Snacks</h3>
              <p>Ver tus semanas asignadas y confirmar que traerás los snacks</p>
            </Link>
            <Link to={ROUTES.DOCUMENTS} className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Documentos</h3>
              <p>Acceder a documentos institucionales y material informativo</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
