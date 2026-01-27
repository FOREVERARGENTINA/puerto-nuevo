import { useState, useEffect, useMemo } from 'react';
import { useCommunications } from '../../hooks/useCommunications';
import { readReceiptsService } from '../../services/readReceipts.service';
import { useAuth } from '../../hooks/useAuth';
import { ReadConfirmationModal } from '../../components/communications/ReadConfirmationModal';
import { CommunicationCard } from '../../components/communications/CommunicationCard';
import { ViewCommunicationModal } from '../../components/communications/ViewCommunicationModal';
import Icon from '../../components/ui/Icon';

export function Communications() {
  const { user } = useAuth();
  const { communications, unreadRequired, loading, error, markAsRead, hasUnreadRequired } = useCommunications();
  const [readStatus, setReadStatus] = useState({});
  const [selectedComm, setSelectedComm] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [senderFilter, setSenderFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const senders = useMemo(() => {
    const map = new Map();
    communications.forEach(comm => {
      const key = comm.sentBy || `name:${comm.sentByDisplayName || '—'}`;
      const name = comm.sentByDisplayName || comm.sentBy || '—';
      if (!map.has(key)) map.set(key, name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [communications]);

  const filteredCommunications = useMemo(() => {
    const now = new Date();
    const filtered = communications.filter(comm => {
      // search by title
      if (searchTerm.trim() !== '') {
        if (!comm.title || !comm.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      }

      // sender filter
      if (senderFilter !== 'all') {
        if (senderFilter.startsWith('name:')) {
          const name = senderFilter.replace('name:', '');
          if ((comm.sentByDisplayName || '—') !== name) return false;
        } else {
          if ((comm.sentBy || '') !== senderFilter) return false;
        }
      }

      // date filter
      if (dateFilter !== 'all') {
        const created = comm.createdAt ? comm.createdAt.toDate() : new Date();
        if (dateFilter === 'this_month') {
          if (created.getMonth() !== now.getMonth() || created.getFullYear() !== now.getFullYear()) return false;
        } else if (dateFilter === 'last_3_months') {
          const monthsDiff = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth());
          if (monthsDiff > 2) return false;
        }
      }

      return true;
    });

    // ensure descending by date
    return filtered.sort((a, b) => (b.createdAt?.toDate() || new Date()) - (a.createdAt?.toDate() || new Date()));
  }, [communications, senderFilter, dateFilter, searchTerm]);

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

  const openCommunication = (comm) => {
    setSelectedComm(comm);
    setShowViewModal(true);
  };

  const closeCommunication = () => {
    setShowViewModal(false);
    setSelectedComm(null);
  };

  const handleMarkAsRead = async (commId) => {
    const result = await markAsRead(commId);
    if (result.success) {
      setReadStatus(prev => ({ ...prev, [commId]: true }));
      if (selectedComm && selectedComm.id === commId) {
        // update selectedComm read state
        setSelectedComm(prev => ({ ...prev }));
      }
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

      <div className="container page-container">
        <div className="dashboard-header dashboard-header--compact">
          <div>
            <h1 className="dashboard-title">Comunicados</h1>
            <p className="dashboard-subtitle">Mensajes y avisos de la escuela.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            <label style={{ color: 'var(--color-text-light)', marginRight: '0.5rem' }}>Buscar</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-background-warm)', padding: '0.25rem 0.5rem', borderRadius: '6px' }}>
                <Icon name="search" size={16} className="icon icon--muted" />
                <input
                  className="form-input"
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ marginLeft: '0.5rem', minWidth: '220px' }}
                />
              </div>

              <select value={senderFilter} onChange={(e) => setSenderFilter(e.target.value)} className="form-input">
                <option value="all">Todos los remitentes</option>
                {senders.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="form-input">
                <option value="all">Todas las fechas</option>
                <option value="this_month">Este mes</option>
                <option value="last_3_months">Últimos 3 meses</option>
              </select>
            </div>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn--link" onClick={() => { setSenderFilter('all'); setDateFilter('all'); setSearchTerm(''); }}>Limpiar filtros</button>
          </div>
        </div>

        {filteredCommunications.length === 0 ? (
          <div className="alert alert--info">No hay comunicados que coincidan con los filtros.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {filteredCommunications.map(comm => (
              <CommunicationCard
                key={comm.id}
                communication={comm}
                hasRead={readStatus[comm.id]}
                onMarkAsRead={handleMarkAsRead}
                onView={openCommunication}
              />
            ))}
          </div>
        )}

        {/* Modal de visualización */}
        {showViewModal && selectedComm && (
          <ViewCommunicationModal
            communication={selectedComm}
            onClose={closeCommunication}
            onMarkAsRead={handleMarkAsRead}
            hasRead={readStatus[selectedComm.id]}
          />
        )}
      </div>
    </>
  );
}
