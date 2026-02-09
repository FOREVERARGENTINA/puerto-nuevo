import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../../utils/dateHelpers';
import Icon from '../ui/Icon';

export function NotificationDropdown({
  notifications,
  onClose,
  onNotificationClick,
  adminSummaryItems = []
}) {
  const navigate = useNavigate();
  const hasAdminSummary = Array.isArray(adminSummaryItems) && adminSummaryItems.length > 0;

  const handleNotificationClick = async (notification) => {
    if (typeof onNotificationClick === 'function') {
      onNotificationClick(notification);
    }

    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    navigate(notification.actionUrl);
    onClose();
  };

  const handleSummaryClick = (item) => {
    if (!item?.route) return;
    navigate(item.route);
    onClose();
  };

  return (
    <div className="notification-dropdown">
      <div className="notification-header">
        <h3>Notificaciones</h3>
        <span className="notification-count">{notifications.length}</span>
      </div>

      {hasAdminSummary && (
        <div className="notification-admin-summary" aria-label="Resumen admin movil">
          {adminSummaryItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`notification-admin-summary__item ${item.isAction ? 'notification-admin-summary__item--action' : ''}`}
              onClick={() => handleSummaryClick(item)}
            >
              <span className="notification-admin-summary__label">{item.label}</span>
              <span className="notification-admin-summary__value">{item.value}</span>
            </button>
          ))}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="notification-empty">
          <span className="icon icon--large icon--muted" aria-hidden="true">
            <Icon name="check-circle" size={48} />
          </span>
          <p>No tenes notificaciones pendientes</p>
        </div>
      ) : (
        <>
          <div className="notification-list">
            {notifications.slice(0, 10).map((notif) => (
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
                {notif.urgent && <span className="urgent-badge">Importante</span>}
              </div>
            ))}
          </div>

          {notifications.length > 10 && (
            <div className="notification-footer">
              Mostrando 10 de {notifications.length} notificaciones
            </div>
          )}
        </>
      )}
    </div>
  );
}
