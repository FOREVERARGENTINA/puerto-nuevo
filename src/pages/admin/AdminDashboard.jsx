import { Link } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { ROUTES } from '../../config/constants';

export function AdminDashboard() {
  return (
    <div className="container page-container admin-dashboard-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Panel Administrativo</h1>
          <p className="dashboard-subtitle">Accesos clave y gestión institucional del día a día.</p>
        </div>
      </div>
      <div className="dashboard-content">
        <section className="dashboard-section admin-dashboard-panel admin-dashboard-panel--featured">
          <div className="section-heading section-heading--inline">
            <h2 className="section-title">
              Accesos prioritarios <span className="section-subtitle">Acciones que se usan todos los días.</span>
            </h2>
          </div>
          <div className="grid-cards-sm admin-dashboard-grid admin-dashboard-grid--featured">
            <Link to={ROUTES.SEND_COMMUNICATION} className="card card--compact card--clickable link-unstyled admin-dashboard-card admin-dashboard-card--featured">
              <div className="admin-dashboard-card__icon">
                <Icon name="send" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Comunicados</h3>
                <p>Crear y enviar comunicados</p>
              </div>
            </Link>
            <Link to={ROUTES.ADMIN_CONVERSATIONS} className="card card--compact card--clickable link-unstyled admin-dashboard-card admin-dashboard-card--featured">
              <div className="admin-dashboard-card__icon">
                <Icon name="chat" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Conversaciones</h3>
                <p>Mensajes privados con familias</p>
              </div>
            </Link>
            <Link to={ROUTES.READ_RECEIPTS} className="card card--compact card--clickable link-unstyled admin-dashboard-card admin-dashboard-card--featured">
              <div className="admin-dashboard-card__icon">
                <Icon name="check-circle" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Confirmaciones de Lectura</h3>
                <p>Revisar lecturas pendientes</p>
              </div>
            </Link>
            <Link to="/portal/admin/turnos" className="card card--compact card--clickable link-unstyled admin-dashboard-card admin-dashboard-card--featured">
              <div className="admin-dashboard-card__icon">
                <Icon name="calendar" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Turnos</h3>
                <p>Administrar turnos</p>
              </div>
            </Link>
          </div>
        </section>

        <section className="dashboard-section admin-dashboard-panel">
          <div className="section-heading section-heading--inline">
            <h2 className="section-title">
              Organización diaria <span className="section-subtitle">Calendario, horarios y seguimiento general.</span>
            </h2>
          </div>
          <div className="grid-cards-sm admin-dashboard-grid">
            <Link to={ROUTES.ADMIN_ACTIVITIES} className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="edit" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Actividades</h3>
                <p>Publicar tareas por ambiente</p>
              </div>
            </Link>
            <Link to={ROUTES.EVENTS_MANAGER} className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="event" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Eventos</h3>
                <p>Gestionar calendario</p>
              </div>
            </Link>
            <Link to="/portal/admin/horarios" className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="calendar" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Horario Semanal</h3>
                <p>Ver horarios</p>
              </div>
            </Link>
            <Link to="/portal/admin/snacks" className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="snack" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Snacks</h3>
                <p>Asignar responsables</p>
              </div>
            </Link>
            <Link to={ROUTES.TALLERES_MANAGER} className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="book" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Talleres</h3>
                <p>Crear y asignar talleres</p>
              </div>
            </Link>
          </div>
        </section>

        <section className="dashboard-section admin-dashboard-panel">
          <div className="section-heading section-heading--inline">
            <h2 className="section-title">
              Gestión institucional <span className="section-subtitle">Altas, información de alumnos y documentación.</span>
            </h2>
          </div>
          <div className="grid-cards-sm admin-dashboard-grid">
            <Link to={ROUTES.USER_MANAGEMENT} className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="users" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Usuarios</h3>
                <p>Crear usuarios y roles</p>
              </div>
            </Link>
            <Link to="/portal/admin/alumnos" className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="user" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Alumnos</h3>
                <p>Datos personales y médicos</p>
              </div>
            </Link>
            <Link to={ROUTES.ADMIN_DOCUMENTS} className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="file" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Documentos</h3>
                <p>Biblioteca y permisos</p>
              </div>
            </Link>
            <Link to={ROUTES.INSTITUTIONAL_GALLERY_ADMIN} className="card card--compact card--clickable link-unstyled admin-dashboard-card">
              <div className="admin-dashboard-card__icon">
                <Icon name="image" size={18} />
              </div>
              <div className="admin-dashboard-card__content">
                <h3 className="card__title">Galería Institucional</h3>
                <p>Fotos, videos y multimedia</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

