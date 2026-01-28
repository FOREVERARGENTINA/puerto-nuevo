import { Link, useLocation } from 'react-router-dom';

const ROUTE_NAMES = {
  '': 'Inicio',
  'admin': 'Administración',
  'familia': 'Familia',
  'docente': 'Docente',
  'tallerista': 'Tallerista',
  'aspirante': 'Aspirante',
  'comunicados': 'Comunicados',
  'comunicar': 'Comunicados',
  'confirmaciones': 'Historial',
  'conversaciones': 'Conversaciones',
  'nuevo': 'Nuevo Mensaje',
  'nueva': 'Nueva Consulta',
  'alumnos': 'Alumnos',
  'hijos': 'Mis Hijos',
  'usuarios': 'Usuarios',
  'turnos': 'Reuniones',
  'talleres': 'Talleres',
  'snacks': 'Snacks',
  'documentos': 'Documentos',
  'horarios': 'Horario Semanal',
  'mi-taller': 'Mi Taller',
  'galeria': 'Galería',
  'eventos': 'Eventos'
};

// Detecta si un segmento parece ser un ID de documento (Firebase genera IDs alfanuméricos de 20 chars)
const isDocumentId = (segment) => {
  return /^[a-zA-Z0-9]{15,}$/.test(segment);
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

  // Construir breadcrumbs, omitiendo IDs de documentos del texto visible
  const breadcrumbs = pathSegments
    .filter(segment => !isDocumentId(segment)) // No mostrar IDs en breadcrumbs
    .map((segment, index, filtered) => {
      // Reconstruir el path hasta este segmento
      const originalIndex = pathSegments.indexOf(segment);
      const path = '/' + pathSegments.slice(0, originalIndex + 1).join('/');
      const isLast = index === filtered.length - 1;
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
