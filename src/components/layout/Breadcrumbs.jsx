import { Link, useLocation } from 'react-router-dom';

const ROUTE_NAMES = {
  '': 'Inicio',
  'admin': 'Administración',
  'familia': 'Familia',
  'docente': 'Docente',
  'tallerista': 'Tallerista',
  'aspirante': 'Aspirante',
  'comunicados': 'Comunicados',
  'comunicar': 'Enviar Comunicado',
  'confirmaciones': 'Confirmaciones de Lectura',
  'alumnos': 'Alumnos',
  'hijos': 'Mis Hijos',
  'usuarios': 'Usuarios',
  'turnos': 'Turnos y Reuniones',
  'talleres': 'Talleres',
  'snacks': 'Snacks',
  'documentos': 'Documentos',
  'horarios': 'Horario Semanal',
  'mi-taller': 'Mi Taller',
  'galeria': 'Galería'
};

/**
 * Breadcrumbs - Migas de pan automáticas basadas en la ruta
 */
export function Breadcrumbs() {
  const location = useLocation();

  // Obtener segmentos de la ruta (sin vacíos)
  const pathSegments = location.pathname
    .split('/')
    .filter(segment => segment !== '');

  // Si estamos en root o login, no mostrar breadcrumbs
  if (pathSegments.length === 0 || location.pathname === '/login') {
    return null;
  }

  // Construir breadcrumbs
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const isLast = index === pathSegments.length - 1;
    const name = ROUTE_NAMES[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    return {
      name,
      path,
      isLast
    };
  });

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs__list">
        <li className="breadcrumbs__item">
          <Link to="/" className="breadcrumbs__link">
            Inicio
          </Link>
          <span className="breadcrumbs__separator">›</span>
        </li>
        {breadcrumbs.map((crumb) => (
          <li key={crumb.path} className="breadcrumbs__item">
            {crumb.isLast ? (
              <span className="breadcrumbs__current">{crumb.name}</span>
            ) : (
              <>
                <Link to={crumb.path} className="breadcrumbs__link">
                  {crumb.name}
                </Link>
                <span className="breadcrumbs__separator">›</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
