import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/auth.service';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function AspiranteDashboard() {
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
          <h1 className="card__title">Dashboard Aspirante</h1>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            <span className="badge badge--info">Aspirante</span>
            <button onClick={handleLogout} className="btn btn--sm btn--outline">
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="card__body">
          <p>Bienvenido/a, <strong>{user?.email}</strong></p>

          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h2>Proceso de Admisión</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
              <Link to={ROUTES.ASPIRANTE_DOCUMENTS} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Documentos</h3>
                <p>Ver y descargar documentación del proceso de admisión</p>
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
          </div>

          <div style={{ marginTop: 'var(--spacing-xl)' }} className="alert alert--info">
            <strong>En desarrollo:</strong> Sistema completo de admisión en próximas fases.
          </div>
        </div>
      </div>
    </div>
  );
}
