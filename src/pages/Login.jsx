import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ROLE_DASHBOARDS } from '../config/constants';
import logoLogin from '../../datos/imagenes/logo-login.png';

const LOADING_SCREEN_EXIT_MS = 260;

export function Login() {
  const { user, role, loading } = useAuth();
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [isLoadingScreenExiting, setIsLoadingScreenExiting] = useState(false);
  const [isLoginContentVisible, setIsLoginContentVisible] = useState(false);

  useEffect(() => {
    if (loading) {
      setShowLoadingScreen(true);
      setIsLoadingScreenExiting(false);
      setIsLoginContentVisible(false);
      return;
    }

    setIsLoadingScreenExiting(true);

    const frameId = window.requestAnimationFrame(() => {
      setIsLoginContentVisible(true);
    });

    const timeoutId = window.setTimeout(() => {
      setShowLoadingScreen(false);
    }, LOADING_SCREEN_EXIT_MS);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [loading]);

  if (!showLoadingScreen && user && role) {
    const dashboard = ROLE_DASHBOARDS[role] || '/';
    return <Navigate to={dashboard} replace />;
  }

  return (
    <>
      {(!user || !role) && (
        <div
          className={`login-page login-page--transition${isLoginContentVisible ? ' login-page--ready' : ' login-page--preparing'}`}
        >
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
                <img
                  src={logoLogin}
                  alt="Puerto Nuevo"
                  className="login-card__logo-mobile"
                />
                <h2 className="login-card__title">Acceso al portal</h2>
                <p className="login-card__subtitle">Ingresa a tu cuenta</p>
                <LoginForm />
              </div>
            </div>
          </div>
        </div>
      )}
      {showLoadingScreen && (
        <LoadingScreen message="Iniciando sesion..." isExiting={isLoadingScreenExiting} />
      )}
    </>
  );
}
