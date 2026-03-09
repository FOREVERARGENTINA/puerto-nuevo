import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { readReceiptsService } from '../../services/readReceipts.service';
import { usersService } from '../../services/users.service';

export function ReadReceiptsSection({ communicationId, destinatarios, sentBy }) {
  const { user, canSendCommunications, isAdmin } = useAuth();
  const canViewReceipts = canSendCommunications && (isAdmin || user?.uid === sentBy);

  const [stats, setStats] = useState(null);
  const [readList, setReadList] = useState(null);
  const [pendingList, setPendingList] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingRead, setLoadingRead] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [showRead, setShowRead] = useState(false);
  const [showPending, setShowPending] = useState(false);

  useEffect(() => {
    if (!canViewReceipts) return;

    let mounted = true;
    setLoadingStats(true);
    readReceiptsService.getReadStats(communicationId, destinatarios).then(res => {
      if (mounted && res.success) setStats(res.stats);
      if (mounted) setLoadingStats(false);
    });

    return () => { mounted = false; };
  }, [communicationId, destinatarios, canViewReceipts]);

  const handleShowRead = async () => {
    if (showRead) { setShowRead(false); return; }
    setShowRead(true);
    if (readList !== null) return;
    setLoadingRead(true);
    const res = await readReceiptsService.getReadReceipts(communicationId);
    if (res.success) setReadList(res.lecturas);
    setLoadingRead(false);
  };

  const handleShowPending = async () => {
    if (showPending) { setShowPending(false); return; }
    setShowPending(true);
    if (pendingList !== null) return;
    setLoadingPending(true);
    const res = await readReceiptsService.getPendingUsers(communicationId, destinatarios);
    if (res.success) {
      const names = await Promise.all(
        res.pendingUserIds.map(async uid => {
          const u = await usersService.getUserById(uid);
          return {
            uid,
            displayName: u.success ? (u.user.displayName || u.user.email || uid) : uid
          };
        })
      );
      setPendingList(names);
    }
    setLoadingPending(false);
  };

  if (!canViewReceipts) return null;

  return (
    <div style={{ borderTop: '1px solid var(--color-border)', marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)' }}>
      {loadingStats ? (
        <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Cargando estado de lectura...</p>
      ) : stats ? (
        <>
          <p style={{ margin: '0 0 var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
            Leido: {stats.leidos} de {stats.total} {stats.total === 1 ? 'familia' : 'familias'} ({stats.porcentaje}%)
          </p>

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            <button
              className="btn btn--outline"
              onClick={handleShowRead}
              disabled={stats.leidos === 0}
              style={{ fontSize: 'var(--font-size-sm)', padding: '4px 12px' }}
            >
              {showRead ? 'Ocultar' : `Ver quienes leyeron (${stats.leidos})`}
            </button>
            <button
              className="btn btn--outline"
              onClick={handleShowPending}
              disabled={stats.pendientes === 0}
              style={{ fontSize: 'var(--font-size-sm)', padding: '4px 12px' }}
            >
              {showPending ? 'Ocultar' : `Ver pendientes (${stats.pendientes})`}
            </button>
          </div>

          {showRead && (
            <div style={{ marginTop: 'var(--spacing-sm)' }}>
              {loadingRead ? (
                <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Cargando...</p>
              ) : readList && readList.length > 0 ? (
                <ul style={{ margin: 0, padding: '0 0 0 var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                  {readList.map(r => (
                    <li key={r.userId}>
                      {r.userDisplayName}
                      {r.leidoAt?.toDate && (
                        <span style={{ color: 'var(--color-text-light)', marginLeft: '6px' }}>
                          &mdash;{' '}
                          {new Date(r.leidoAt.toDate()).toLocaleDateString('es-AR', { day: 'numeric', month: 'numeric' })}
                          {' '}
                          {new Date(r.leidoAt.toDate()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Nadie ha leido este comunicado aun.</p>
              )}
            </div>
          )}

          {showPending && (
            <div style={{ marginTop: 'var(--spacing-sm)' }}>
              {loadingPending ? (
                <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Cargando...</p>
              ) : pendingList && pendingList.length > 0 ? (
                <ul style={{ margin: 0, padding: '0 0 0 var(--spacing-md)', fontSize: 'var(--font-size-sm)' }}>
                  {pendingList.map(p => (
                    <li key={p.uid}>{p.displayName}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Todos leyeron el comunicado.</p>
              )}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
