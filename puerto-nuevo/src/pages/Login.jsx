import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ROLE_DASHBOARDS } from '../config/constants';

export function Login() {
  const { user, role, loading } = useAuth();

  // Si ya está logueado, redirigir a su dashboard
  if (loading) {
    return <LoadingScreen message="Iniciando sesión..." />;
  }

  if (user && role) {
    const dashboard = ROLE_DASHBOARDS[role] || '/';
    return <Navigate to={dashboard} replace />;
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="card__header">
          <img
            src="/logo-login.png"
            alt="Montessori Puerto Nuevo"
            className="login-logo"
          />
          <p className="login-subtitle">Portal Educativo</p>
        </div>
        <div className="card__body">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
