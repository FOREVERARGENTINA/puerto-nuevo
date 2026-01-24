import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';
import { ROLE_DASHBOARDS } from '../../config/constants';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  return (
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
        <input
          id="password"
          type="password"
          className="form-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
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
    </form>
  );
}
