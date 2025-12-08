import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import { ROLE_DASHBOARDS } from '../config/constants';

export function Login() {
  const { user, role, loading } = useAuth();

  // Si ya está logueado, redirigir a su dashboard
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (user && role) {
    const dashboard = ROLE_DASHBOARDS[role] || '/';
    return <Navigate to={dashboard} replace />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--color-background-alt)'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', margin: 'var(--spacing-md)' }}>
        <div className="card__header" style={{ textAlign: 'center' }}>
          <h1 className="card__title">Montessori Puerto Nuevo</h1>
          <p className="card__subtitle">Ingresa a tu cuenta</p>
        </div>
        <div className="card__body">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
