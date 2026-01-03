import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { authService } from '../../services/auth.service';
import { NotificationDropdown } from './NotificationDropdown';

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

  return (
    <nav className="navbar">
      <div className="navbar__logo">
        <img src="/logo-login.png" alt="Puerto Nuevo" />
      </div>
      <div className="navbar__actions">
        <div style={{ position: 'relative' }}>
          <button
            className="notification-bell"
            onClick={() => setShowDropdown(!showDropdown)}
            aria-label={`${totalCount} notificaciones`}
          >
            🔔
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
