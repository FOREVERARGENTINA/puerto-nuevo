import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function AdminDashboard() {
  const { user, role } = useAuth();

  return (
    <div className="container page-container">
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Dashboard Administrativo</h1>
          <span className="badge badge--primary">{role}</span>
        </div>

        <div className="card__body">
          <p>Bienvenido, <strong>{user?.email}</strong></p>

          <div className="mt-xl">
            <h2>Gestión de Usuarios</h2>
            <div className="grid-cards mt-md">
              <Link to={ROUTES.USER_MANAGEMENT} className="card card--clickable link-unstyled">
                <h3 className="card__title">Usuarios del Sistema</h3>
                <p>Crear usuarios, asignar roles (guías, talleristas, familias, admin)</p>
              </Link>
            </div>
          </div>

          <div className="mt-xl">
            <h2>Comunicaciones</h2>
            <div className="grid-cards mt-md">
              <Link to={ROUTES.SEND_COMMUNICATION} className="card card--clickable link-unstyled">
                <h3 className="card__title">Enviar Comunicado</h3>
                <p>Crear y enviar comunicados segmentados a la comunidad</p>
              </Link>
              <Link to={ROUTES.READ_RECEIPTS} className="card card--clickable link-unstyled">
                <h3 className="card__title">Comunicados y Confirmaciones</h3>
                <p>Ver comunicados obligatorios y quién los ha leído</p>
              </Link>
            </div>
          </div>

          <div className="mt-xl">
            <h2>Gestión de Alumnos</h2>
            <div className="grid-cards mt-md">
              <Link to="/admin/alumnos" className="card card--clickable link-unstyled">
                <h3 className="card__title">Fichas de Alumnos</h3>
                <p>Gestionar datos personales y médicos de alumnos</p>
              </Link>
              <Link to="/admin/turnos" className="card card--clickable link-unstyled">
                <h3 className="card__title">Gestión de Turnos</h3>
                <p>Crear y administrar turnos para reuniones con familias</p>
              </Link>
              <Link to="/admin/snacks" className="card card--clickable link-unstyled">
                <h3 className="card__title">🍎 Calendario de Snacks</h3>
                <p>Asignar familias responsables del snack semanal</p>
              </Link>
            </div>
          </div>

          <div className="mt-xl">
            <h2>Talleres Especiales</h2>
            <div className="grid-cards mt-md">
              <Link to={ROUTES.TALLERES_MANAGER} className="card card--clickable link-unstyled">
                <h3 className="card__title">Gestión de Talleres</h3>
                <p>Crear talleres especiales y asignar talleristas</p>
              </Link>
              <Link to={ROUTES.ADMIN_DOCUMENTS} className="card card--clickable link-unstyled">
                <h3 className="card__title">Documentos Institucionales</h3>
                <p>Gestionar biblioteca de documentos y permisos</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
