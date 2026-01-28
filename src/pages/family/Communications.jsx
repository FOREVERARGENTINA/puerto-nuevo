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

      <div className="container page-container communications-page">
        <div className="dashboard-header dashboard-header--compact communications-header">
          <div>
            <h1 className="dashboard-title">Comunicados</h1>
            <p className="dashboard-subtitle">Mensajes y avisos de la escuela.</p>
          </div>
          <div className="communications-summary">
            <span className="badge badge--info">
              {filteredCommunications.length} {filteredCommunications.length === 1 ? 'mensaje' : 'mensajes'}
            </span>
          </div>
        </div>

        <div className="card communications-filters">
          <div className="card__body">
            <div className="communications-filters__row">
              <div className="communications-search">
                <label className="form-label" htmlFor="comm-search">Buscar</label>
                <div className="communications-search__field">
                  <Icon name="search" size={16} className="icon icon--muted" />
                  <input
                    id="comm-search"
                    className="form-input"
                    placeholder="Buscar por título..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="communications-select">
                <label className="form-label" htmlFor="comm-sender">Remitente</label>
                <select id="comm-sender" value={senderFilter} onChange={(e) => setSenderFilter(e.target.value)} className="form-input">
                  <option value="all">Todos los remitentes</option>
                  {senders.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="communications-select">
                <label className="form-label" htmlFor="comm-date">Fecha</label>
                <select id="comm-date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="form-input">
                  <option value="all">Todas las fechas</option>
                  <option value="this_month">Este mes</option>
                  <option value="last_3_months">Últimos 3 meses</option>
                </select>
              </div>

              <div className="communications-filters__actions">
                <button
                  className="btn btn--outline btn--sm"
                  onClick={() => { setSenderFilter('all'); setDateFilter('all'); setSearchTerm(''); }}
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </div>
        {filteredCommunications.length === 0 ? (
          <div className="empty-state communications-empty">
            <p>No hay comunicados que coincidan con los filtros.</p>
          </div>
        ) : (
          <div className="communications-list">
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


