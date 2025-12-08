import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function AdminDashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Dashboard Administrativo</h1>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            <span className="badge badge--primary">{role}</span>
            <button onClick={handleLogout} className="btn btn--sm btn--outline">
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="card__body">
          <p>Bienvenido, <strong>{user?.email}</strong></p>

          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h2>Gestión de Usuarios</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
              <Link to={ROUTES.USER_MANAGEMENT} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Usuarios del Sistema</h3>
                <p>Crear usuarios, asignar roles (guías, talleristas, familias, admin)</p>
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h2>Comunicaciones</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
              <Link to={ROUTES.SEND_COMMUNICATION} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Enviar Comunicado</h3>
                <p>Crear y enviar comunicados segmentados a la comunidad</p>
              </Link>
              <Link to={ROUTES.READ_RECEIPTS} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Confirmaciones de Lectura</h3>
                <p>Ver quién ha leído los comunicados obligatorios</p>
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h2>Gestión de Alumnos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
              <Link to="/admin/alumnos" className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Fichas de Alumnos</h3>
                <p>Gestionar datos personales y médicos de alumnos</p>
              </Link>
              <Link to="/admin/turnos" className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Gestión de Turnos</h3>
                <p>Crear y administrar turnos para reuniones con familias</p>
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h2>Talleres Especiales</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
              <Link to={ROUTES.TALLERES_MANAGER} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Gestión de Talleres</h3>
                <p>Crear talleres especiales y asignar talleristas</p>
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-xl)' }} className="alert alert--success">
            <strong>Fase 5 completada:</strong> Sistema de talleres especiales y documentos institucionales.
          </div>
        </div>
      </div>
    </div>
  );
}
