import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function AdminDashboard() {
  return (
    <div className="container page-container admin-dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Panel Administrativo</h1>
        </div>
      </div>
      <div className="dashboard-content">
        <section className="dashboard-section">
          <h2 className="section-title">Uso diario</h2>
          <div className="grid-cards-sm">
            <Link to={ROUTES.SEND_COMMUNICATION} className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Comunicados</h3>
              <p>Crear y enviar comunicados</p>
            </Link>
            <Link to={ROUTES.ADMIN_CONVERSATIONS} className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Conversaciones</h3>
              <p>Mensajes privados con familias</p>
            </Link>
            <Link to={ROUTES.READ_RECEIPTS} className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Confirmaciones de Lectura</h3>
              <p>Revisar lecturas pendientes</p>
            </Link>
            <Link to="/admin/turnos" className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Turnos</h3>
              <p>Administrar turnos</p>
            </Link>
            <Link to={ROUTES.EVENTS_MANAGER} className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Eventos</h3>
              <p>Gestionar calendario</p>
            </Link>
          </div>
        </section>

        <section className="dashboard-section">
          <h2 className="section-title">Gestión periódica</h2>
          <div className="grid-cards-sm">
            <Link to={ROUTES.USER_MANAGEMENT} className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Usuarios</h3>
              <p>Crear usuarios y roles</p>
            </Link>
            <Link to="/admin/alumnos" className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Alumnos</h3>
              <p>Datos personales y médicos</p>
            </Link>
            <Link to={ROUTES.TALLERES_MANAGER} className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Talleres</h3>
              <p>Crear y asignar talleres</p>
            </Link>
            <Link to="/admin/horarios" className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Horario Semanal</h3>
              <p>Ver horarios</p>
            </Link>
            <Link to="/admin/snacks" className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Snacks</h3>
              <p>Asignar responsables</p>
            </Link>
            <Link to={ROUTES.ADMIN_DOCUMENTS} className="card card--compact card--clickable link-unstyled">
              <h3 className="card__title">Documentos</h3>
              <p>Biblioteca y permisos</p>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
