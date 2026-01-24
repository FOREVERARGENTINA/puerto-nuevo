import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function TeacherDashboard() {
  return (
    <div className="container page-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Panel Guía de Taller</h1>
        </div>
        <span className="badge badge--primary">Guía</span>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-section">
          <h2 className="section-title">Mi Taller</h2>
          <div className="grid-cards">
            <Link to={ROUTES.MY_TALLER} className="card card--clickable link-unstyled">
              <h3 className="card__title">Alumnos del Taller</h3>
              <p>Ver fichas y datos de los alumnos de tu ambiente</p>
            </Link>
            <Link to={ROUTES.SEND_COMMUNICATION} className="card card--clickable link-unstyled">
              <h3 className="card__title">Enviar Comunicado</h3>
              <p>Comunicar novedades a las familias de tu taller</p>
            </Link>
            <Link to={ROUTES.TEACHER_DOCUMENTS} className="card card--clickable link-unstyled">
              <h3 className="card__title">Documentos</h3>
              <p>Acceder a documentos pedagógicos e institucionales</p>
            </Link>
            <Link to="/docente/horarios" className="card card--clickable link-unstyled">
              <h3 className="card__title">Horario Semanal</h3>
              <p>Ver calendario semanal de ambientes y talleres</p>
            </Link>
          </div>
          <div className="alert alert--info">
            <strong>En desarrollo:</strong> Funcionalidades específicas para guías en próximas fases.
          </div>
        </section>
      </div>
    </div>
  );
}
