import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useDirectMessages } from '../../hooks/useDirectMessages';
import { formatShortRelativeTime } from '../../utils/dateHelpers';
import Avatar from '../../components/ui/Avatar';

function threadTimestamp(thread) {
  const raw = thread.lastMessageAt || thread.updatedAt || thread.createdAt;
  if (!raw) return null;
  if (typeof raw?.toDate === 'function') return raw.toDate();
  return null;
}

export function DirectMessagesList() {
  const { user } = useAuth();
  const { threads, loading, error } = useDirectMessages(user?.uid);
  const navigate = useNavigate();
  const [photoByUid, setPhotoByUid] = useState(new Map());

  useEffect(() => {
    const uids = [...new Set(threads.map((t) => t.otherUid).filter(Boolean))];
    if (uids.length === 0) return;

    Promise.all(
      uids.map((uid) =>
        getDoc(doc(db, 'socialProfiles', uid))
          .then((snap) => [uid, snap.exists() ? (snap.data().photoUrl || null) : null])
          .catch(() => [uid, null])
      )
    ).then((entries) => {
      setPhotoByUid(new Map(entries.filter(([, url]) => Boolean(url))));
    });
  }, [threads]);

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Mensajes</h1>
          <p className="dashboard-subtitle">Conversaciones con otras familias</p>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="card__body" style={{ padding: 'var(--spacing-xl)' }}>
            <div className="documents-loading-state documents-loading-state--inline" role="status" aria-live="polite">
              <span className="documents-loading-state__icon" aria-hidden="true">...</span>
              <div className="documents-loading-state__body">
                <p className="documents-loading-state__title">Cargando conversaciones</p>
                <p className="documents-loading-state__hint">Buscando tus mensajes directos.</p>
              </div>
              <span className="documents-loading-state__bar" aria-hidden="true" />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-sm)' }}>
              No se pudieron cargar las conversaciones.
            </p>
            <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>{error}</p>
          </div>
        </div>
      ) : threads.length === 0 ? (
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              No tienes mensajes todavia. Podes escribirle a otra familia desde el Mapa Social.
            </p>
          </div>
        </div>
      ) : (
        <div className="card dm-thread-list">
          <ul className="dm-thread-list__ul">
            {threads.map((thread) => {
              const otherName = thread.otherName || 'Familia';
              const unread = typeof thread.unreadCount === 'number' ? thread.unreadCount : 0;
              const ts = threadTimestamp(thread);
              const isBlocked = thread.status === 'blocked';

              return (
                <li
                  key={thread.id}
                  className={`dm-thread-item${unread > 0 ? ' dm-thread-item--unread' : ''}${isBlocked ? ' dm-thread-item--blocked' : ''}`}
                  onClick={() => navigate(`/portal/familia/mensajes/${thread.id}`)}
                >
                  <Avatar
                    name={otherName}
                    photoUrl={photoByUid.get(thread.otherUid) || null}
                    size={44}
                  />
                  <div className="dm-thread-item__body">
                    <div className="dm-thread-item__row">
                      <span className="dm-thread-item__name">{otherName}</span>
                      {ts && (
                        <span className="dm-thread-item__time">{formatShortRelativeTime(ts)}</span>
                      )}
                    </div>
                    <div className="dm-thread-item__row">
                      <span className="dm-thread-item__preview">
                        {isBlocked ? 'Conversacion bloqueada' : (thread.lastMessageText || '')}
                      </span>
                      {unread > 0 && (
                        <span className="sidebar__badge dm-thread-item__badge">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
