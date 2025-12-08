import { useState, useEffect } from 'react';
import { useCommunications } from '../../hooks/useCommunications';
import { readReceiptsService } from '../../services/readReceipts.service';
import { useAuth } from '../../hooks/useAuth';
import { ReadConfirmationModal } from '../../components/communications/ReadConfirmationModal';
import { CommunicationCard } from '../../components/communications/CommunicationCard';

export function Communications() {
  const { user } = useAuth();
  const { communications, unreadRequired, loading, error, markAsRead, hasUnreadRequired } = useCommunications();
  const [readStatus, setReadStatus] = useState({});

  const checkReadStatus = async () => {
    const statusPromises = communications.map(async (comm) => {
      const result = await readReceiptsService.hasUserRead(comm.id, user.uid);
      return [comm.id, result.success ? result.hasRead : false];
    });

    const statuses = await Promise.all(statusPromises);
    const statusMap = Object.fromEntries(statuses);
    setReadStatus(statusMap);
  };

  useEffect(() => {
    if (user && communications.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
      checkReadStatus();
    }
  }, [communications, user]);

  const handleMarkAsRead = async (commId) => {
    const result = await markAsRead(commId);
    if (result.success) {
      setReadStatus(prev => ({ ...prev, [commId]: true }));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
        <div className="spinner spinner--lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <div className="alert alert--error">Error: {error}</div>
      </div>
    );
  }

  return (
    <>
      {hasUnreadRequired && (
        <ReadConfirmationModal
          communication={unreadRequired[0]}
          onConfirm={handleMarkAsRead}
          blocking={true}
        />
      )}

      <div style={{ padding: 'var(--spacing-lg)', maxWidth: '1000px', margin: '0 auto' }}>
        <h1>Comunicados</h1>
        
        {communications.length === 0 ? (
          <div className="alert alert--info">
            No hay comunicados disponibles.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {communications.map(comm => (
              <CommunicationCard
                key={comm.id}
                communication={comm}
                hasRead={readStatus[comm.id]}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
