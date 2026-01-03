import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../config/constants';

export function TalleristaDashboard() {
  const { user } = useAuth();

  return (
    <div className="container page-container">
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Dashboard Tallerista</h1>
          <span className="badge badge--warning">Tallerista</span>
        </div>

        <div className="card__body">
          <p>Bienvenido/a, <strong>{user?.email}</strong></p>

          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h2>Mi Taller Especial</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
              <Link to={ROUTES.MY_TALLER_ESPECIAL} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Mi Taller</h3>
                <p>Gestionar información y horarios del taller</p>
              </Link>
              <Link to={ROUTES.TALLER_GALLERY} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Galería</h3>
                <p>Publicar fotos y videos del taller</p>
              </Link>
              <Link to={ROUTES.TALLER_DOCUMENTS} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Documentos</h3>
                <p>Subir y gestionar documentos del taller</p>
              </Link>
              <Link to={ROUTES.SEND_COMMUNICATION} className="card" style={{ textDecoration: 'none' }}>
                <h3 className="card__title">Enviar Comunicado</h3>
                <p>Comunicar novedades a familias del taller</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
