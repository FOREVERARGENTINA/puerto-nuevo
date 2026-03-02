import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Icon from '../ui/Icon';

const ROUTE_NAMES = {
  '': 'Inicio',
  portal: 'Portal',
  admin: 'Administracion',
  familia: 'Familia',
  docente: 'Docente',
  tallerista: 'Tallerista',
  aspirante: 'Aspirante',
  comunicados: 'Comunicados',
  comunicar: 'Comunicados',
  confirmaciones: 'Historial',
  conversaciones: 'Conversaciones',
  nuevo: 'Nuevo Mensaje',
  nueva: 'Nueva Consulta',
  alumnos: 'Alumnos',
  hijos: 'Fichas de Alumnos',
  usuarios: 'Usuarios',
  turnos: 'Reuniones',
  talleres: 'Talleres',
  snacks: 'Snacks',
  documentos: 'Documentos',
  horarios: 'Horario Semanal',
  'mi-taller': 'Mi Taller',
  galeria: 'Galeria',
  'galeria-institucional': 'Galeria Institucional',
  eventos: 'Eventos',
  social: 'Social'
};

const ROOT_ROLE_SEGMENTS = new Set(['admin', 'familia', 'docente', 'tallerista', 'aspirante']);
const isDocumentId = (segment) => /^[a-zA-Z0-9]{15,}$/.test(segment);

const resolveRoleRootPath = (role) => {
  switch (role) {
    case 'superadmin':
    case 'coordinacion':
    case 'facturacion':
      return '/portal/admin';
    case 'docente':
      return '/portal/docente';
    case 'tallerista':
      return '/portal/tallerista';
    case 'family':
      return '/portal/familia';
    case 'aspirante':
      return '/portal/aspirante';
    default:
      return '/';
  }
};

/**
 * Breadcrumbs - Migas de pan automaticas basadas en la ruta
 */
export function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const pathSegments = location.pathname
    .split('/')
    .filter((segment) => segment !== '');

  if (pathSegments.length === 0 || location.pathname === '/portal/login') {
    return null;
  }

  const isPortalRoute = pathSegments[0] === 'portal';
  const roleSegmentIndex = isPortalRoute ? 1 : 0;
  const roleSegment = pathSegments[roleSegmentIndex];
  const isRoleRootRoute = ROOT_ROLE_SEGMENTS.has(roleSegment);
  const isSharedDocumentsRoute = isPortalRoute && roleSegment === 'documentos';

  const visibleSegments = pathSegments
    .map((segment, originalIndex) => ({ segment, originalIndex }))
    .filter(({ segment, originalIndex }) => {
      if (isDocumentId(segment)) return false;
      if (segment === 'portal') return false;
      if (originalIndex === roleSegmentIndex && ROOT_ROLE_SEGMENTS.has(segment)) return false;
      return true;
    });

  const breadcrumbs = visibleSegments.map(({ segment, originalIndex }, index) => {
    const path = '/' + pathSegments.slice(0, originalIndex + 1).join('/');
    const isLast = index === visibleSegments.length - 1;
    const name = ROUTE_NAMES[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    return {
      name,
      path,
      isLast
    };
  });

  if (isRoleRootRoute && breadcrumbs.length === 0) {
    return null;
  }

  const roleRootPath = isRoleRootRoute
    ? (isPortalRoute ? `/portal/${roleSegment}` : `/${roleSegment}`)
    : (isSharedDocumentsRoute ? resolveRoleRootPath(role) : '/');

  const mobileBackPath = breadcrumbs.length > 1
    ? breadcrumbs[breadcrumbs.length - 2].path
    : roleRootPath;
  const isDocumentDetailRoute = pathSegments[pathSegments.length - 2] === 'documentos'
    && isDocumentId(pathSegments[pathSegments.length - 1] || '');

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <div className="breadcrumbs__inner">
        <ol className="breadcrumbs__list">
          <li className="breadcrumbs__item">
            <Link to={roleRootPath} className="breadcrumbs__link">
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

        <button
          type="button"
          className="breadcrumbs__back-mobile"
          onClick={() => {
            if (isDocumentDetailRoute) {
              navigate(-1);
              return;
            }
            navigate(mobileBackPath);
          }}
          aria-label="Volver"
        >
          <Icon name="chevron-left" size={14} />
          Volver
        </button>
      </div>
    </nav>
  );
}
