import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useTheme } from '../../hooks/useTheme';
import { useAdminSummary } from '../../hooks/useAdminSummary';
import { authService } from '../../services/auth.service';
import { NotificationDropdown } from './NotificationDropdown';
import { ThemeToggle } from '../ui/ThemeToggle';
import Icon from '../ui/Icon';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';
import { ROUTES } from '../../config/constants';

/**
 * Navbar - Barra de navegacion global sticky
 * FASE 1: Badge con contador de notificaciones
 * FASE 3: Dropdown con lista de notificaciones
 */
export function Navbar({ onToggleSidebar, onCloseSidebar, isSidebarOpen }) {
  const { user, isAdmin } = useAuth();
  const { notifications, totalCount, dismissNotification } = useNotifications();
  const { canInstall, shouldShowIosInstall, promptInstall } = usePwaInstall();
  const {
    shouldOfferPush,
    isPushEnabled,
    isActivatingPush,
    iosNeedsInstall,
    enablePush
  } = usePushNotifications(user);
  const { theme } = useTheme();
  const { summary, loading: summaryLoading } = useAdminSummary(isAdmin);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const dropdownRef = useRef(null);
  const userMenuRef = useRef(null);
  const userLabel = user?.displayName || user?.email;

  const adminSummaryItems = isAdmin
    ? [
        {
          id: 'events',
          label: 'Proximos 7 dias',
          value: summaryLoading
            ? '...'
            : `${summary.todayEvents} ${summary.todayEvents === 1 ? 'evento' : 'eventos'}`,
          route: ROUTES.EVENTS_MANAGER
        },
        {
          id: 'snacks',
          label: 'Proxima semana',
          value: summaryLoading
            ? '...'
            : `${summary.nextWeekUnassigned} ${summary.nextWeekUnassigned === 1 ? 'snack sin asignar' : 'snacks sin asignar'}`,
          route: '/portal/admin/snacks',
          isAction: true
        },
        {
          id: 'conversations',
          label: 'Conversaciones',
          value: summaryLoading
            ? '...'
            : `${summary.unreadConversations} sin leer`,
          route: ROUTES.ADMIN_CONVERSATIONS
        }
      ]
    : [];

  const handleLogout = async () => {
    await authService.logout();
    window.location.href = '/portal/login';
  };

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

  const handleToggleDropdown = () => {
    if (isSidebarOpen && typeof onCloseSidebar === 'function') {
      onCloseSidebar();
      setShowDropdown(true);
      setShowUserMenu(false);
      return;
    }
    setShowDropdown(!showDropdown);
    setShowUserMenu(false);
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

  const handleEnablePush = async () => {
    if (iosNeedsInstall) {
      setShowInstallHelp(true);
      return;
    }

    const enabled = await enablePush();
    if (enabled) {
      localStorage.setItem('push-permission-status', 'enabled');
      setShowUserMenu(false);
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
          {adminSummaryItems.map((item) => (
            <Link
              key={item.id}
              to={item.route}
              className={`navbar__summary-item ${item.isAction ? 'navbar__summary-item--action' : ''}`}
            >
              <span className="navbar__summary-label">{item.label}</span>
              <span className="navbar__summary-value">{item.value}</span>
            </Link>
          ))}
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
                onNotificationClick={dismissNotification}
                onClose={() => setShowDropdown(false)}
                adminSummaryItems={adminSummaryItems}
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
                  <span className="user-menu__label">Sesion</span>
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
              {user?.uid && (shouldOfferPush || isPushEnabled || iosNeedsInstall) && (
                <>
                  {isPushEnabled && !iosNeedsInstall ? (
                    <div className="user-menu__status user-menu__status--success" aria-live="polite">
                      Notificaciones activas en este navegador
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="user-menu__item user-menu__install"
                      onClick={handleEnablePush}
                      disabled={isActivatingPush}
                    >
                      {iosNeedsInstall
                        ? 'Instalar para notificaciones'
                        : isActivatingPush
                          ? 'Activando notificaciones...'
                          : 'Activar notificaciones'}
                    </button>
                  )}
                </>
              )}
              <button className="btn btn--outline btn--sm user-menu__logout" onClick={handleLogout}>
                Cerrar Sesion
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showInstallHelp}
        onClose={() => setShowInstallHelp(false)}
        size="sm"
        className="pwa-install-modal"
      >
        <ModalHeader title="Instalar app" onClose={() => setShowInstallHelp(false)} />
        <ModalBody>
          <p>En iPhone o iPad:</p>
          <ol className="install-help-list">
            <li>Tap en Compartir (cuadrado con flecha).</li>
            <li>Elegi "Agregar a inicio".</li>
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

