import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../config/firebase';

export function AuthAction() {
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const mode = params.get('mode') || '';
  const oobCode = params.get('oobCode') || '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState('idle'); // idle | ready | success | error

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      setLoading(true);
      setError('');

      if (mode !== 'resetPassword' || !oobCode) {
        if (isMounted) {
          setState('error');
          setError('El enlace no es válido. Solicita un nuevo restablecimiento.');
          setLoading(false);
        }
        return;
      }

      try {
        const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
        if (isMounted) {
          setEmail(verifiedEmail || '');
          setState('ready');
        }
      } catch (err) {
        if (isMounted) {
          setState('error');
          setError('El enlace es inválido o ya venció. Solicita un nuevo restablecimiento.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    run();
    return () => { isMounted = false; };
  }, [mode, oobCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== password2) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setState('success');
    } catch (err) {
      setError('No se pudo restablecer la contraseña. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-split">
        <div className="login-split__right" style={{ flex: 1 }}>
          <div className="login-card">
            <h2 className="login-card__title">Restablecer contraseña</h2>
            <p className="login-card__subtitle">Configura una nueva contraseña</p>

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                <div className="spinner"></div>
              </div>
            )}

            {!loading && state === 'error' && (
              <>
                <div className="alert alert--error" role="alert">{error}</div>
                <Link to="/login" className="btn btn--primary btn--full">
                  Ir al login
                </Link>
              </>
            )}

            {!loading && state === 'ready' && (
              <form onSubmit={handleSubmit} className="login-form">
                {email && (
                  <p className="login-reset-hint">
                    Cuenta: <strong>{email}</strong>
                  </p>
                )}
                <div className="form-group">
                  <label htmlFor="newPassword" className="required">Nueva contraseña</label>
                  <input
                    id="newPassword"
                    type="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="newPassword2" className="required">Repetir contraseña</label>
                  <input
                    id="newPassword2"
                    type="password"
                    className="form-input"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>

                {error && (
                  <div className="alert alert--error" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn--primary btn--full"
                  disabled={submitting}
                >
                  {submitting ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </form>
            )}

            {!loading && state === 'success' && (
              <>
                <div className="alert alert--success" role="alert">
                  Contraseña cambiada. Ya puedes iniciar sesión.
                </div>
                <Link to="/login" className="btn btn--primary btn--full">
                  Ir al login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
