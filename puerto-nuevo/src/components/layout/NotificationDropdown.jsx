import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../../utils/dateHelpers';

export function NotificationDropdown({ notifications, onClose }) {
  const navigate = useNavigate();

  const handleNotificationClick = (notification) => {
    navigate(notification.actionUrl);
    onClose();
  };

  if (notifications.length === 0) {
    return (
      <div className="notification-dropdown">
        <div className="notification-empty">
          <span className="icon">✅</span>
          <p>No tenés notificaciones pendientes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notificaciones</h3>
        <span className="notification-count">{notifications.length}</span>
      </div>

      <div className="notification-list">
        {notifications.slice(0, 10).map(notif => (
          <div
            key={notif.id}
            className={`notification-item ${notif.urgent ? 'notification-item--urgent' : ''}`}
            onClick={() => handleNotificationClick(notif)}
          >
            <div className="notification-content">
              <h4>{notif.title}</h4>
              <p>{notif.message}</p>
              <span className="notification-time">
                {formatRelativeTime(notif.timestamp)}
              </span>
            </div>
            {notif.urgent && <span className="urgent-badge">Urgente</span>}
          </div>
        ))}
      </div>

      {notifications.length > 10 && (
        <div className="notification-footer">
          Mostrando 10 de {notifications.length} notificaciones
        </div>
      )}
    </div>
  );
}
