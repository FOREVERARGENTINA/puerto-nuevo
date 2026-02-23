import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_DASHBOARDS } from '../../config/constants';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';
import Icon from '../ui/Icon';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const resetLock = useRef(false);
  const navigate = useNavigate();
  const { refreshToken } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await authService.login(email, password);

    if (result.success) {
      // Esperar a que se actualice el rol desde el token
      await refreshToken();

      // Obtener el rol del token
      const tokenResult = await result.user.getIdTokenResult();
      const userRole = tokenResult.claims.role || 'family';

      // Redirigir según rol
      const dashboard = ROLE_DASHBOARDS[userRole] || '/';
      navigate(dashboard);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const openResetModal = () => {
    setResetEmail(email.trim());
    setResetError('');
    setResetSuccess('');
    resetLock.current = false;
    setShowReset(true);
  };

  const closeResetModal = () => {
    if (!resetLoading) {
      resetLock.current = false;
      setShowReset(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetLock.current || resetLoading || resetSuccess) return;
    resetLock.current = true;
    setResetError('');
    setResetSuccess('');

    const cleanEmail = resetEmail.trim();
    if (!cleanEmail) {
      setResetError('Ingresa tu email para enviar el enlace.');
      resetLock.current = false;
      return;
    }

    let success = false;
    setResetLoading(true);
    try {
      const check = await authService.checkUserEmail(cleanEmail);
      if (!check.success) {
        setResetError('No se pudo verificar el correo. Intenta nuevamente.');
        return;
      }

      if (!check.exists) {
        setResetError('Ese correo no está registrado. Verifica que esté bien escrito.');
        return;
      }

      const result = await authService.resetPassword(cleanEmail);
      if (result.success) {
        setResetSuccess('Te enviamos un correo con el enlace para restablecer la contraseña.');
        success = true;
      } else {
        setResetError('No se pudo enviar el correo: ' + result.error);
      }
    } finally {
      setResetLoading(false);
      resetLock.current = success;
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-group">
          <label htmlFor="email" className="required">Email</label>
          <input
            id="email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="required">Contraseña</label>
          <div className="login-password-field">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-pressed={showPassword}
            >
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} ariaHidden />
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner spinner--sm"></span>
              Ingresando...
            </>
          ) : (
            'Ingresar'
          )}
        </button>

        <button
          type="button"
          className="btn btn--link btn--full login-forgot-btn"
          onClick={openResetModal}
        >
          ¿Necesitas cambiar o recuperar tu contraseña?
        </button>
      </form>

      <Modal isOpen={showReset} onClose={closeResetModal} size="sm">
        <ModalHeader title="Recuperar contraseña" onClose={closeResetModal} />
        <form onSubmit={handleResetPassword}>
          <ModalBody>
            <p className="login-reset-text">
              Te enviaremos un correo para restablecer tu contraseña. Nadie en la escuela
              conoce ni sabrá tu clave.
            </p>

            <div className="form-group">
              <label htmlFor="resetEmail" className="required">Email</label>
              <input
                id="resetEmail"
                type="email"
                className="form-input"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {resetError && (
              <div className="alert alert--error" role="alert">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="alert alert--success" role="alert">
                {resetSuccess}
              </div>
            )}

            <p className="login-reset-hint">
              Si no llega en unos minutos, revisa spam o verifica que el email sea correcto.
            </p>
          </ModalBody>
          <ModalFooter>
            <button
              type="button"
              className="btn btn--outline"
              onClick={closeResetModal}
              disabled={resetLoading}
            >
              Cerrar
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={resetLoading || !!resetSuccess}
            >
              {resetLoading ? 'Enviando...' : 'Enviar enlace'}
            </button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
