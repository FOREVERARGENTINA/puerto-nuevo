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
  const reminderTypes = new Set(['turno', 'turno-asignado', 'snack', 'snack-asignado']);
  const regularNotifications = notifications.filter((notification) => !reminderTypes.has(notification.type));
  const reminderNotifications = notifications.filter((notification) => reminderTypes.has(notification.type));
  const visibleNotifications = [...regularNotifications, ...reminderNotifications].slice(0, 10);
  const visibleIds = new Set(visibleNotifications.map((notification) => notification.id));
  const visibleRegularNotifications = regularNotifications.filter((notification) => visibleIds.has(notification.id));
  const visibleReminderNotifications = reminderNotifications.filter((notification) => visibleIds.has(notification.id));

  const handleNotificationClick = async (notification) => {
    if (typeof onNotificationClick === 'function') {
      onNotificationClick(notification);
    }

    if (!notification?.actionUrl) {
      onClose();
      return;
    }

    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    navigate(notification.actionUrl);
    onClose();
  };

  const handleNotificationKeyDown = (event, notification) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    void handleNotificationClick(notification);
  };

  const handleSummaryClick = (item) => {
    if (!item?.route) return;
    navigate(item.route);
    onClose();
  };

  const renderNotificationItem = (notif) => (
    <div
      key={notif.id}
      className={`notification-item ${notif.urgent ? 'notification-item--urgent' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => handleNotificationClick(notif)}
      onKeyDown={(event) => handleNotificationKeyDown(event, notif)}
    >
      <div className="notification-content">
        <h4>{notif.title}</h4>
        <p>{notif.message}</p>
        {!reminderTypes.has(notif.type) && notif.actionLabel && (
          <span className="notification-action">{notif.actionLabel}</span>
        )}
        {!reminderTypes.has(notif.type) && (
          <span className="notification-time">
            {formatRelativeTime(notif.timestamp)}
          </span>
        )}
      </div>
      <div className="notification-item__aside">
        {notif.urgent && <span className="urgent-badge">Importante</span>}
        <span className="notification-item__arrow" aria-hidden="true">
          <Icon name="chevron-right" size={16} />
        </span>
      </div>
    </div>
  );

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
            {visibleRegularNotifications.length > 0 && (
              <div className="notification-section">
                {visibleReminderNotifications.length > 0 && (
                  <div className="notification-section__header">Nuevas</div>
                )}
                {visibleRegularNotifications.map(renderNotificationItem)}
              </div>
            )}

            {visibleReminderNotifications.length > 0 && (
              <div className="notification-section">
                {visibleRegularNotifications.length > 0 && (
                  <div className="notification-section__header">Recordatorios</div>
                )}
                {visibleReminderNotifications.map(renderNotificationItem)}
              </div>
            )}
          </div>

          {notifications.length > visibleNotifications.length && (
            <div className="notification-footer">
              Mostrando {visibleNotifications.length} de {notifications.length} notificaciones
            </div>
          )}
        </>
      )}
    </div>
  );
}
