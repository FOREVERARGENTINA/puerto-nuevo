import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../../utils/dateHelpers';
import { readReceiptsService } from '../../services/readReceipts.service';
import { conversationsService } from '../../services/conversations.service';
import { useAuth } from '../../hooks/useAuth';
import { ROLES, ADMIN_ROLES } from '../../config/constants';
import Icon from '../ui/Icon';

export function NotificationDropdown({ notifications, onClose }) {
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const handleNotificationClick = async (notification) => {
    // Si es un comunicado, marcarlo como leído antes de navegar
    if (notification.type === 'comunicado' && notification.metadata?.commId && user) {
      try {
        await readReceiptsService.markAsRead(notification.metadata.commId, user.uid, user.displayName || user.email);
      } catch (err) {
        console.error('Error marking notification as read', err);
      }
    }

    // Si es una conversación, marcar mensajes como leídos
    if (notification.type === 'conversacion' && notification.metadata?.conversationId && user) {
      try {
        const isFamily = role === ROLES.FAMILY;
        await conversationsService.markMessagesAsRead(
          notification.metadata.conversationId,
          isFamily ? 'familia' : 'escuela'
        );
      } catch (err) {
        console.error('Error marking conversation as read', err);
      }
    }

    navigate(notification.actionUrl);
    onClose();
  };

  if (notifications.length === 0) {
    return (
      <div className="notification-dropdown">
        <div className="notification-empty">
          <span className="icon icon--large icon--muted" aria-hidden="true">
            <Icon name="check-circle" size={48} />
          </span>
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
