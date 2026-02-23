import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function AspiranteDashboard() {
  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Panel Aspirante</h1>
          <p className="dashboard-subtitle">Seguimiento del proceso de admisión.</p>
        </div>
        <span className="badge badge--info">Aspirante</span>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-section">
          <h2 className="section-title">Proceso de Admisión</h2>
          <div className="grid-cards">
            <Link to={ROUTES.ASPIRANTE_DOCUMENTS} className="card card--clickable link-unstyled">
              <h3 className="card__title">Documentos</h3>
              <p>Ver y descargar documentación del proceso de admisión</p>
            </Link>
            <Link to={ROUTES.INSTITUTIONAL_GALLERY_ASPIRANTE} className="card card--clickable link-unstyled">
              <h3 className="card__title">Galería</h3>
              <p>Recorridos virtuales e información visual de la escuela</p>
            </Link>
            <div className="card" style={{ opacity: 0.6 }}>
              <h3 className="card__title">Mi Estado</h3>
              <p>Ver etapa actual del proceso (próximamente)</p>
            </div>
            <div className="card" style={{ opacity: 0.6 }}>
              <h3 className="card__title">Entrevistas</h3>
              <p>Agendar entrevistas y reuniones (próximamente)</p>
            </div>
          </div>
          <div className="alert alert--info">
            <strong>En desarrollo:</strong> Sistema completo de admisión en próximas fases.
          </div>
        </section>
      </div>
    </div>
  );
}
