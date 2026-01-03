import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function TeacherDashboard() {
  const { user } = useAuth();

  return (
    <div className="container page-container">
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Dashboard Guía de Taller</h1>
          <span className="badge badge--primary">Guía</span>
        </div>

        <div className="card__body">
          <p>Bienvenido/a, <strong>{user?.email}</strong></p>

          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h2>Mi Taller</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
              <Link to={ROUTES.MY_TALLER} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Alumnos del Taller</h3>
                <p>Ver fichas y datos de los alumnos de tu ambiente</p>
              </Link>
              <Link to={ROUTES.SEND_COMMUNICATION} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Enviar Comunicado</h3>
                <p>Comunicar novedades a las familias de tu taller</p>
              </Link>
              <Link to={ROUTES.TEACHER_DOCUMENTS} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Documentos</h3>
                <p>Acceder a documentos pedagógicos e institucionales</p>
              </Link>
              <div className="card" style={{ opacity: 0.6 }}>
                <h3 className="card__title">Calendario</h3>
                <p>Ver calendario y asistencias (próximamente)</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-xl)' }} className="alert alert--info">
            <strong>En desarrollo:</strong> Funcionalidades específicas para guías en próximas fases.
          </div>
        </div>
      </div>
    </div>
  );
}
