import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function TalleristaDashboard() {
  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Panel Tallerista</h1>
          <p className="dashboard-subtitle">Gestión y recursos del taller especial.</p>
        </div>
        <span className="badge badge--warning">Tallerista</span>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-section">
          <h2 className="section-title">Mi Taller Especial</h2>
          <div className="grid-cards">
            <Link to={ROUTES.MY_TALLER_ESPECIAL} className="card card--clickable link-unstyled">
              <h3 className="card__title">Mi Taller</h3>
              <p>Gestionar información y horarios del taller</p>
            </Link>
            <Link to={ROUTES.TALLER_GALLERY} className="card card--clickable link-unstyled">
              <h3 className="card__title">Galería</h3>
              <p>Publicar fotos y videos del taller</p>
            </Link>
            <Link to={ROUTES.TALLER_DOCUMENTS} className="card card--clickable link-unstyled">
              <h3 className="card__title">Documentos</h3>
              <p>Subir y gestionar documentos del taller</p>
            </Link>
            <Link to="/portal/tallerista/horarios" className="card card--clickable link-unstyled">
              <h3 className="card__title">Horario Semanal</h3>
              <p>Ver calendario semanal de ambientes y talleres</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

