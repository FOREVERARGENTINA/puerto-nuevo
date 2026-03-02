import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentUnreadCount } from '../../hooks/useDocumentUnreadCount';
import { ROLES } from '../../config/constants';
import Icon from '../ui/Icon';
import { EventCalendar } from './EventCalendar';
import { socialService } from '../../services/social.service';
import { canAccessSocial } from '../../utils/socialAccess';

/**
 * Sidebar - Menú lateral de navegación según rol
 */
export function Sidebar({ isOpen = false, onNavigate }) {
  const { role, user } = useAuth();
  const { count: unreadDocuments } = useDocumentUnreadCount(user?.uid);
  const [socialConfig, setSocialConfig] = useState({ enabled: false, pilotFamilyUids: [] });

  // Definir menús según rol
  const menuItems = useMemo(() => ({
    [ROLES.SUPERADMIN]: [
      { path: '/portal/admin', icon: 'home', label: 'Inicio' },
      { path: '/portal/admin/usuarios', icon: 'users', label: 'Usuarios' },
      { path: '/portal/admin/comunicar', icon: 'send', label: 'Comunicados' },
      { path: '/portal/admin/conversaciones', icon: 'chat', label: 'Conversaciones' },
      { path: '/portal/admin/alumnos', icon: 'user', label: 'Alumnos' },
      { path: '/portal/admin/turnos', icon: 'calendar', label: 'Reuniones' },
      { path: '/portal/admin/talleres', icon: 'book', label: 'Talleres' },
      { path: '/portal/admin/snacks', icon: 'snack', label: 'Snacks' },
      { path: '/portal/admin/actividades', icon: 'edit', label: 'Actividades' },
      { path: '/portal/admin/eventos', icon: 'event', label: 'Eventos' },
      { path: '/portal/admin/documentos', icon: 'file', label: 'Documentos' },
      { path: '/portal/admin/galeria-institucional', icon: 'image', label: 'Galería' }
    ],
    [ROLES.COORDINACION]: [
      { path: '/portal/admin', icon: 'home', label: 'Inicio' },
      { path: '/portal/admin/usuarios', icon: 'users', label: 'Usuarios' },
      { path: '/portal/admin/comunicar', icon: 'send', label: 'Comunicados' },
      { path: '/portal/admin/conversaciones', icon: 'chat', label: 'Conversaciones' },
      { path: '/portal/admin/alumnos', icon: 'user', label: 'Alumnos' },
      { path: '/portal/admin/turnos', icon: 'calendar', label: 'Reuniones' },
      { path: '/portal/admin/talleres', icon: 'book', label: 'Talleres' },
      { path: '/portal/admin/snacks', icon: 'snack', label: 'Snacks' },
      { path: '/portal/admin/actividades', icon: 'edit', label: 'Actividades' },
      { path: '/portal/admin/eventos', icon: 'event', label: 'Eventos' },
      { path: '/portal/admin/documentos', icon: 'file', label: 'Documentos' },
      { path: '/portal/admin/galeria-institucional', icon: 'image', label: 'Galería' }
    ],
    [ROLES.DOCENTE]: [
      { path: '/portal/docente', icon: 'home', label: 'Inicio' },
      { path: '/portal/docente/eventos', icon: 'event', label: 'Eventos' },
      { path: '/portal/docente/actividades', icon: 'edit', label: 'Actividades' },
      { path: '/portal/docente/documentos', icon: 'file', label: 'Documentos' },
      { path: '/portal/docente/horarios', icon: 'calendar', label: 'Horarios' },
      { path: '/portal/docente/galeria', icon: 'image', label: 'Galería' }
    ],
    [ROLES.TALLERISTA]: [
      { path: '/portal/tallerista', icon: 'home', label: 'Inicio' },
      { path: '/portal/tallerista/mi-taller', icon: 'book', label: 'Mi Taller' },
      { path: '/portal/tallerista/galeria', icon: 'image', label: 'Galería Taller' },
      { path: '/portal/tallerista/galeria-institucional', icon: 'image', label: 'Galería Escuela' },
      { path: '/portal/tallerista/eventos', icon: 'event', label: 'Eventos' },
      { path: '/portal/tallerista/documentos', icon: 'file', label: 'Documentos' },
      { path: '/portal/tallerista/horarios', icon: 'calendar', label: 'Horarios' }
    ],
    [ROLES.FAMILY]: [
      { path: '/portal/familia', icon: 'home', label: 'Inicio' },
      { path: '/portal/familia/comunicados', icon: 'bell', label: 'Comunicados' },
      { path: '/portal/familia/conversaciones', icon: 'chat', label: 'Conversaciones' },
      { path: '/portal/familia/hijos', icon: 'user', label: 'Fichas de Alumnos' },
      { path: '/portal/familia/turnos', icon: 'calendar', label: 'Reuniones' },
      { path: '/portal/familia/talleres', icon: 'book', label: 'Talleres' },
      { path: '/portal/familia/actividades', icon: 'edit', label: 'Actividades' },
      { path: '/portal/familia/eventos', icon: 'event', label: 'Eventos' },
      { path: '/portal/familia/snacks', icon: 'snack', label: 'Snacks' },
      { path: '/portal/familia/documentos', icon: 'file', label: 'Documentos' },
      { path: '/portal/familia/horarios', icon: 'calendar', label: 'Horarios' },
      { path: '/portal/familia/galeria', icon: 'image', label: 'Galería' }
    ],
    [ROLES.ASPIRANTE]: [
      { path: '/portal/aspirante', icon: 'home', label: 'Inicio' },
      { path: '/portal/aspirante/documentos', icon: 'file', label: 'Documentos' },
      { path: '/portal/aspirante/galeria', icon: 'image', label: 'Galería' }
    ]
  }), []);

  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      try {
        const config = await socialService.getSocialModuleConfig();
        if (!isMounted) return;
        setSocialConfig(config);
      } catch {
        if (!isMounted) return;
        setSocialConfig({ enabled: false, pilotFamilyUids: [] });
      }
    };

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  const isSocialVisible = useMemo(() => {
    return canAccessSocial({ role, uid: user?.uid, config: socialConfig });
  }, [role, socialConfig, user?.uid]);

  const items = useMemo(() => {
    const baseItems = menuItems[role] || [];
    if (!isSocialVisible) return baseItems;

    const socialByRole = {
      [ROLES.SUPERADMIN]: '/portal/admin/social',
      [ROLES.COORDINACION]: '/portal/admin/social',
      [ROLES.FAMILY]: '/portal/familia/social',
      [ROLES.DOCENTE]: '/portal/docente/social',
      [ROLES.TALLERISTA]: '/portal/tallerista/social'
    };

    const socialPath = socialByRole[role];
    if (!socialPath || baseItems.some((item) => item.path === socialPath)) {
      return baseItems;
    }

    return [
      ...baseItems,
      { path: socialPath, icon: 'users', label: 'Social' }
    ];
  }, [isSocialVisible, menuItems, role]);

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
                end={item.path === '/portal/admin' || item.path === '/portal/familia' || item.path === '/portal/docente' || item.path === '/portal/tallerista' || item.path === '/portal/aspirante'}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                }
                title={item.label}
                onClick={() => onNavigate && onNavigate()}
              >
                <Icon name={item.icon} size={16} className="sidebar__icon" />
                <span className="sidebar__label">{item.label}</span>
                {item.path.includes('/documentos') && unreadDocuments > 0 && (
                  <span className="sidebar__badge" aria-label={`${unreadDocuments} documentos pendientes`}>
                    {unreadDocuments > 99 ? '99+' : unreadDocuments}
                  </span>
                )}
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

