import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useTheme } from '../../hooks/useTheme';
import { useAdminSummary } from '../../hooks/useAdminSummary';
import { authService } from '../../services/auth.service';
import { NotificationDropdown } from './NotificationDropdown';
import { ThemeToggle } from '../ui/ThemeToggle';
import Icon from '../ui/Icon';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';
import { ROUTES } from '../../config/constants';

/**
 * Navbar - Barra de navegación global sticky
 * FASE 1: Badge con contador de notificaciones
 * FASE 3: Dropdown con lista de notificaciones
 */
export function Navbar({ onToggleSidebar, isSidebarOpen }) {
  const { user, isAdmin } = useAuth();
  const { notifications, totalCount } = useNotifications();
  const { canInstall, shouldShowIosInstall, promptInstall } = usePwaInstall();
  const { theme } = useTheme();
  const { summary, loading: summaryLoading } = useAdminSummary(isAdmin); // Hook en tiempo real
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const userLabel = user?.displayName || user?.email;

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/login';
  };

  // Click fuera del dropdown lo cierra
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toggle dropdown de notificaciones
  const handleToggleDropdown = () => {
    setShowDropdown(!showDropdown);
    // NO marcar como leído aquí - los comunicados se marcan como leídos
    // cuando el usuario realmente los abre en la página de detalle
  };

  const handleInstallClick = async () => {
    if (canInstall) {
      await promptInstall();
      setShowUserMenu(false);
      return;
    }
    if (shouldShowIosInstall) {
      setShowInstallHelp(true);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar__left">
        <button
          className="navbar__menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Menu"
          aria-expanded={isSidebarOpen ? 'true' : 'false'}
        >
          <Icon name="menu" size={20} />
        </button>
        <div className="navbar__logo">
          <img src="/logo-login.png" alt="Puerto Nuevo" />
        </div>
      </div>
      {isAdmin && (
        <div className="navbar__summary" aria-label="Resumen diario">
          <Link to={ROUTES.EVENTS_MANAGER} className="navbar__summary-item">
            <span className="navbar__summary-label">Próximos 7 días</span>
            <span className="navbar__summary-value">
              {summaryLoading
                ? '...'
                : `${summary.todayEvents} ${summary.todayEvents === 1 ? 'evento' : 'eventos'}`}
            </span>
          </Link>
          <Link to="/admin/snacks" className="navbar__summary-item navbar__summary-item--action">
            <span className="navbar__summary-label">Proxima semana</span>
            <span className="navbar__summary-value">
              {summaryLoading
                ? '...'
                : `${summary.nextWeekUnassigned} ${summary.nextWeekUnassigned === 1 ? 'snack sin asignar' : 'snacks sin asignar'}`}
            </span>
          </Link>
          <Link to={ROUTES.ADMIN_CONVERSATIONS} className="navbar__summary-item">
            <span className="navbar__summary-label">Conversaciones</span>
            <span className="navbar__summary-value">
              {summaryLoading
                ? '...'
                : `${summary.unreadConversations} ${summary.unreadConversations === 1 ? 'sin leer' : 'sin leer'}`}
            </span>
          </Link>
        </div>
      )}
      <div className="navbar__actions">
        <div ref={dropdownRef} className="notification-wrapper">
          <button
            className="notification-bell"
            onClick={handleToggleDropdown}
            aria-label={`${totalCount} notificaciones`}
            title="Notificaciones"
          >
            <Icon name="bell" size={20} className="notification-icon" />
            {totalCount > 0 && <span className="badge badge--danger">{totalCount}</span>}
          </button>
          {showDropdown && (
            <div className="notification-dropdown-container">
              <NotificationDropdown
                notifications={notifications}
                onClose={() => setShowDropdown(false)}
              />
            </div>
          )}
        </div>
        <div ref={userMenuRef} className="user-menu">
          <button
            className="user-menu__button"
            onClick={() => setShowUserMenu((prev) => !prev)}
            aria-label="Usuario"
            title={userLabel || 'Usuario'}
          >
            <Icon name="user" size={20} />
            {userLabel && <span className="user-menu__name">{userLabel}</span>}
          </button>
          {showUserMenu && (
            <div className="user-menu__dropdown">
              {userLabel && (
                <div className="user-menu__header">
                  <span className="user-menu__label">Sesión</span>
                  <strong className="user-menu__user">{userLabel}</strong>
                </div>
              )}
              <div className="user-menu__item">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span>{theme === 'dark' ? 'Tema oscuro' : 'Tema claro'}</span>
                  <span className="muted-text" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
                  </span>
                </div>
                <ThemeToggle />
              </div>
              {(canInstall || shouldShowIosInstall) && (
                <button type="button" className="user-menu__item user-menu__install" onClick={handleInstallClick}>
                  Instalar app
                </button>
              )}
              <button className="btn btn--outline btn--sm user-menu__logout" onClick={handleLogout}>
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} size="sm">
        <ModalHeader title="Instalar app" onClose={() => setShowInstallHelp(false)} />
        <ModalBody>
          <p>En iPhone o iPad:</p>
          <ol className="install-help-list">
            <li>Tap en Compartir (cuadrado con flecha).</li>
            <li>Elegí "Agregar a inicio".</li>
          </ol>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn--primary btn--full" onClick={() => setShowInstallHelp(false)}>
            Entendido
          </button>
        </ModalFooter>
      </Modal>
    </nav>
  );
}
