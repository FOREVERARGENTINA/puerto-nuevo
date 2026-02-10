import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { ROUTES } from '../../config/constants';

export function FamilyDashboard() {
  return (
    <div className="container page-container family-dashboard-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Portal de Familias</h1>
          <p className="dashboard-subtitle">Bienvenidos al espacio de comunicación y seguimiento de la comunidad Montessori.</p>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Accesos prioritarios */}
        <section className="dashboard-section admin-dashboard-panel admin-dashboard-panel--featured">
          <div className="section-heading section-heading--inline">
            <h2 className="section-title">Comunicación</h2>
          </div>
          <div className="grid-cards-sm admin-dashboard-grid admin-dashboard-grid--featured">
            <Link to={ROUTES.COMMUNICATIONS} className="card card--compact card--clickable link-unstyled admin-dashboard-card admin-dashboard-card--featured family-card-accent">
              <div className="admin-dashboard-card__icon">
                <Icon name="send" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Comunicados</h3>
                <p>Ver y confirmar lectura de avisos</p>
              </div>
            </Link>
            <Link to={ROUTES.FAMILY_CONVERSATIONS} className="card card--compact card--clickable link-unstyled admin-dashboard-card admin-dashboard-card--featured family-card-info">
              <div className="admin-dashboard-card__icon">
                <Icon name="chat" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Conversaciones</h3>
                <p>Consultas privadas con la escuela</p>
              </div>
            </Link>
            <Link to="/portal/familia/turnos" className="card card--compact card--clickable link-unstyled admin-dashboard-card admin-dashboard-card--featured family-card-success">
              <div className="admin-dashboard-card__icon">
                <Icon name="calendar" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Reuniones</h3>
                <p>Reservar turnos con la escuela</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Información de alumnos */}
        <section className="dashboard-section admin-dashboard-panel">
          <div className="section-heading section-heading--inline">
            <h2 className="section-title">Información de alumnos</h2>
          </div>
          <div className="grid-cards-sm admin-dashboard-grid">
            <Link to="/portal/familia/hijos" className="card card--compact card--clickable link-unstyled admin-dashboard-card family-card-primary">
              <div className="admin-dashboard-card__icon">
                <Icon name="user" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Fichas de Alumnos</h3>
                <p>Datos personales y médicos</p>
              </div>
            </Link>
            <Link to="/portal/familia/talleres" className="card card--compact card--clickable link-unstyled admin-dashboard-card family-card-warning">
              <div className="admin-dashboard-card__icon">
                <Icon name="book" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Talleres Especiales</h3>
                <p>Calendarios y galerías de fotos</p>
              </div>
            </Link>
            <Link to="/portal/familia/horarios" className="card card--compact card--clickable link-unstyled admin-dashboard-card family-card-info">
              <div className="admin-dashboard-card__icon">
                <Icon name="calendar" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Horario Semanal</h3>
                <p>Calendario de ambientes y talleres</p>
              </div>
            </Link>
            <Link to={ROUTES.INSTITUTIONAL_GALLERY_FAMILY} className="card card--compact card--clickable link-unstyled admin-dashboard-card family-card-success">
              <div className="admin-dashboard-card__icon">
                <Icon name="image" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Galería</h3>
                <p>Fotos, videos y recuerdos</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Participación familiar */}
        <section className="dashboard-section admin-dashboard-panel">
          <div className="section-heading section-heading--inline">
            <h2 className="section-title">Participación familiar</h2>
          </div>
          <div className="grid-cards-sm admin-dashboard-grid">
            <Link to="/portal/familia/snacks" className="card card--compact card--clickable link-unstyled admin-dashboard-card family-card-accent">
              <div className="admin-dashboard-card__icon">
                <Icon name="snack" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Mis Turnos de Snacks</h3>
                <p>Confirmar semanas asignadas</p>
              </div>
            </Link>
            <Link to="/portal/familia/eventos" className="card card--compact card--clickable link-unstyled admin-dashboard-card family-card-success">
              <div className="admin-dashboard-card__icon">
                <Icon name="event" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Eventos</h3>
                <p>Calendario de actividades escolares</p>
              </div>
            </Link>
            <Link to={ROUTES.DOCUMENTS} className="card card--compact card--clickable link-unstyled admin-dashboard-card family-card-neutral">
              <div className="admin-dashboard-card__icon">
                <Icon name="file" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Documentos</h3>
                <p>Material informativo y reglamentos</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

