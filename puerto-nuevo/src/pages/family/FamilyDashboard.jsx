import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function FamilyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Dashboard Familiar</h1>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            <span className="badge badge--success">Familia</span>
            <button onClick={handleLogout} className="btn btn--sm btn--outline">
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="card__body">
          <p>Bienvenida familia, <strong>{user?.email}</strong></p>

          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h2>Acceso Rápido</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
              <Link to={ROUTES.COMMUNICATIONS} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Comunicados</h3>
                <p>Ver comunicados de la escuela y confirmar lectura</p>
              </Link>
              <Link to="/familia/hijos" className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Fichas de Alumnos</h3>
                <p>Ver información y datos médicos de sus hijos</p>
              </Link>
              <Link to="/familia/turnos" className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Turnos y Reuniones</h3>
                <p>Reservar turnos para reuniones con la escuela</p>
              </Link>
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-xl)' }} className="alert alert--success">
            <strong>Fase 3 completada:</strong> Sistema de fichas de alumnos y turnero funcionando.
          </div>
        </div>
      </div>
    </div>
  );
}
