import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function FamilyDashboard() {
  const { user } = useAuth();

  return (
    <div className="container page-container">
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Dashboard Familiar</h1>
          <span className="badge badge--success">Familia</span>
        </div>

        <div className="card__body">
          <p>Bienvenida familia, <strong>{user?.email}</strong></p>

          <div className="mt-xl">
            <h2>Acceso Rápido</h2>
            <div className="grid-cards mt-md">
              <Link to={ROUTES.COMMUNICATIONS} className="card card--clickable link-unstyled">
                <h3 className="card__title">Comunicados</h3>
                <p>Ver comunicados de la escuela y confirmar lectura</p>
              </Link>
              <Link to="/familia/hijos" className="card card--clickable link-unstyled">
                <h3 className="card__title">Fichas de Alumnos</h3>
                <p>Ver información y datos médicos de sus hijos</p>
              </Link>
              <Link to="/familia/talleres" className="card card--clickable link-unstyled">
                <h3 className="card__title">Talleres Especiales</h3>
                <p>Ver información, calendarios y galerías de los talleres</p>
              </Link>
              <Link to="/familia/turnos" className="card card--clickable link-unstyled">
                <h3 className="card__title">Turnos y Reuniones</h3>
                <p>Reservar turnos para reuniones con la escuela</p>
              </Link>
              <Link to="/familia/snacks" className="card card--clickable link-unstyled">
                <h3 className="card__title">🍎 Mis Turnos de Snacks</h3>
                <p>Ver tus semanas asignadas y confirmar que traerás los snacks</p>
              </Link>
              <Link to={ROUTES.DOCUMENTS} className="card card--clickable link-unstyled">
                <h3 className="card__title">Documentos</h3>
                <p>Acceder a documentos institucionales y material informativo</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
