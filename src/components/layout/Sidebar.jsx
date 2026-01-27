import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../config/constants';
import Icon from '../ui/Icon';
import { EventCalendar } from './EventCalendar';

/**
 * Sidebar - Menú lateral de navegación según rol
 */
export function Sidebar({ isOpen = false, onNavigate }) {
  const { role } = useAuth();

  // Definir menús según rol
  const menuItems = {
    [ROLES.SUPERADMIN]: [
      { path: '/admin', icon: 'home', label: 'Inicio' },
      { path: '/admin/usuarios', icon: 'users', label: 'Usuarios' },
      { path: '/admin/comunicar', icon: 'send', label: 'Comunicados' },
      { path: '/admin/conversaciones', icon: 'chat', label: 'Conversaciones' },
      { path: '/admin/alumnos', icon: 'user', label: 'Alumnos' },
      { path: '/admin/turnos', icon: 'calendar', label: 'Turnos' },
      { path: '/admin/talleres', icon: 'book', label: 'Talleres' },
      { path: '/admin/snacks', icon: 'snack', label: 'Snacks' },
      { path: '/admin/eventos', icon: 'event', label: 'Eventos' },
      { path: '/admin/documentos', icon: 'file', label: 'Documentos' }
    ],
    [ROLES.COORDINACION]: [
      { path: '/admin', icon: 'home', label: 'Inicio' },
      { path: '/admin/usuarios', icon: 'users', label: 'Usuarios' },
      { path: '/admin/comunicar', icon: 'send', label: 'Comunicados' },
      { path: '/admin/conversaciones', icon: 'chat', label: 'Conversaciones' },
      { path: '/admin/alumnos', icon: 'user', label: 'Alumnos' },
      { path: '/admin/turnos', icon: 'calendar', label: 'Turnos' },
      { path: '/admin/talleres', icon: 'book', label: 'Talleres' },
      { path: '/admin/snacks', icon: 'snack', label: 'Snacks' },
      { path: '/admin/eventos', icon: 'event', label: 'Eventos' },
      { path: '/admin/documentos', icon: 'file', label: 'Documentos' }
    ],
    [ROLES.DOCENTE]: [
      { path: '/docente', icon: 'home', label: 'Inicio' },
      { path: '/docente/documentos', icon: 'file', label: 'Documentos' },
      { path: '/docente/horarios', icon: 'calendar', label: 'Horarios' }
    ],
    [ROLES.TALLERISTA]: [
      { path: '/tallerista', icon: 'home', label: 'Inicio' },
      { path: '/tallerista/mi-taller', icon: 'book', label: 'Mi Taller' },
      { path: '/tallerista/galeria', icon: 'image', label: 'Galería' },
      { path: '/tallerista/documentos', icon: 'file', label: 'Documentos' },
      { path: '/tallerista/horarios', icon: 'calendar', label: 'Horarios' }
    ],
    [ROLES.FAMILY]: [
      { path: '/familia', icon: 'home', label: 'Inicio' },
      { path: '/familia/comunicados', icon: 'bell', label: 'Comunicados' },
      { path: '/familia/conversaciones', icon: 'chat', label: 'Conversaciones' },
      { path: '/familia/hijos', icon: 'user', label: 'Mis Hijos' },
      { path: '/familia/turnos', icon: 'calendar', label: 'Turnos' },
      { path: '/familia/talleres', icon: 'book', label: 'Talleres' },
      { path: '/familia/snacks', icon: 'snack', label: 'Snacks' },
      { path: '/familia/documentos', icon: 'file', label: 'Documentos' },
      { path: '/familia/horarios', icon: 'calendar', label: 'Horarios' }
    ],
    [ROLES.ASPIRANTE]: [
      { path: '/aspirante', icon: 'home', label: 'Inicio' },
      { path: '/aspirante/documentos', icon: 'file', label: 'Documentos' }
    ]
  };

  const items = menuItems[role] || [];

  if (items.length === 0) {
    return null;
  }

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
      <nav className="sidebar__nav">
        <ul className="sidebar__menu">
          {items.map((item) => (
            <li key={item.path} className="sidebar__item">
              <NavLink
                to={item.path}
                end={item.path === '/admin' || item.path === '/familia' || item.path === '/docente' || item.path === '/tallerista' || item.path === '/aspirante'}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
                title={item.label}
                onClick={() => onNavigate && onNavigate()}
              >
                <Icon name={item.icon} size={20} className="sidebar__icon" />
                <span className="sidebar__label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Calendario de eventos */}
      <div className="sidebar__calendar">
        <EventCalendar />
      </div>
    </aside>
  );
}
