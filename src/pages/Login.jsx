import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ROLE_DASHBOARDS } from '../config/constants';
import logoLogin from '../../datos/imagenes/logo-login.png';

export function Login() {
  const { user, role, loading } = useAuth();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [isLoadingScreenExiting, setIsLoadingScreenExiting] = useState(false);

  useEffect(() => {
    if (loading) {
      setShowLoadingScreen(true);
      setIsLoadingScreenExiting(false);
      return;
    }

    setIsLoadingScreenExiting(true);
    const timeoutId = window.setTimeout(() => {
      setShowLoadingScreen(false);
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [loading]);

  // Si ya está logueado, redirigir a su dashboard
  if (showLoadingScreen) {
    return <LoadingScreen message="Iniciando sesión..." isExiting={isLoadingScreenExiting} />;
  }

  if (user && role) {
    const dashboard = ROLE_DASHBOARDS[role] || '/';
    return <Navigate to={dashboard} replace />;
  }

  return (
    <div className="login-page">
      <div className="login-split">
        <div className="login-split__left">
          <div className="login-split__brand">
            <img
              src={logoLogin}
              alt="Puerto Nuevo"
              className="login-brand-logo"
            />
            <p className="login-brand-subtitle">Portal Educativo</p>
          </div>
        </div>
        <div className="login-split__right">
          <div className="login-card">
            <h2 className="login-card__title">Acceso al portal</h2>
            <p className="login-card__subtitle">Ingresa a tu cuenta</p>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
