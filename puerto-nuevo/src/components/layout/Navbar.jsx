import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { authService } from '../../services/auth.service';
import { NotificationDropdown } from './NotificationDropdown';
import { ThemeToggle } from '../ui/ThemeToggle';
import Icon from '../ui/Icon';
import { readReceiptsService } from '../../services/readReceipts.service';
import { ROLE_DASHBOARDS } from '../../config/constants';

/**
 * Navbar - Barra de navegación global sticky
 * FASE 1: Badge con contador de notificaciones
 * FASE 3: Dropdown con lista de notificaciones
 */
export function Navbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, totalCount } = useNotifications();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const handleGoHome = () => {
    const homePath = ROLE_DASHBOARDS[user?.role] || '/';
    navigate(homePath);
  };

  // Click fuera del dropdown lo cierra
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
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

  return (
    <nav className="navbar">
      <div className="navbar__logo">
        <img src="/logo-login.png" alt="Puerto Nuevo" />
      </div>
      <div className="navbar__actions">
        <button className="btn btn--ghost btn--sm" onClick={handleGoHome}>
          Inicio
        </button>
        <ThemeToggle />
        <div style={{ position: 'relative' }}>
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
            <div ref={dropdownRef} className="notification-dropdown-container">
              <NotificationDropdown
                notifications={notifications}
                onClose={() => setShowDropdown(false)}
              />
            </div>
          )}
        </div>
        <button className="btn btn--outline btn--sm" onClick={handleLogout}>
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}
