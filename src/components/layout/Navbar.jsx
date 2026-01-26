import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { authService } from '../../services/auth.service';
import { NotificationDropdown } from './NotificationDropdown';
import { ThemeToggle } from '../ui/ThemeToggle';
import Icon from '../ui/Icon';
import { readReceiptsService } from '../../services/readReceipts.service';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';

/**
 * Navbar - Barra de navegación global sticky
 * FASE 1: Badge con contador de notificaciones
 * FASE 3: Dropdown con lista de notificaciones
 */
export function Navbar({ onToggleSidebar, isSidebarOpen }) {
  const { user } = useAuth();
  const { notifications, totalCount } = useNotifications();
  const { canInstall, shouldShowIosInstall, promptInstall } = usePwaInstall();
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

  // Al abrir el dropdown, marcar comunicados como leídos para quitar el badge
  const handleToggleDropdown = async () => {
    const willOpen = !showDropdown;
    setShowDropdown(willOpen);
    if (willOpen && user) {
      // Marcar solo comunicados (type: 'comunicado') como leídos
      const commNotifs = notifications.filter(n => n.type === 'comunicado' && n.metadata && n.metadata.commId);
      if (commNotifs.length === 0) return;
      try {
        await Promise.all(commNotifs.map(n =>
          readReceiptsService.markAsRead(n.metadata.commId, user.uid, user.displayName || user.email)
        ));
      } catch (err) {
        // no bloquear la UI si falla
        console.error('Error marking notifications read:', err);
      }
    }
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
                <span>Tema</span>
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
