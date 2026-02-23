import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommunications } from '../../hooks/useCommunications';
import { readReceiptsService } from '../../services/readReceipts.service';
import { useAuth } from '../../hooks/useAuth';
import { CommunicationCard } from '../../components/communications/CommunicationCard';
import Icon from '../../components/ui/Icon';

export function Communications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { communications, unreadRequired, loading, error, hasUnreadRequired } = useCommunications();
  const [readStatus, setReadStatus] = useState({});
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
    navigate(`/portal/familia/comunicados/${comm.id}`);
  };

  const handleOpenFirstUnread = () => {
    if (unreadRequired.length > 0) {
      navigate(`/portal/familia/comunicados/${unreadRequired[0].id}`);
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

      {hasUnreadRequired && (
        <div className="alert alert--warning" style={{ marginBottom: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
            <div>
              <strong>Comunicado pendiente de lectura obligatoria</strong>
              <p style={{ margin: '0.25rem 0 0 0' }}>
                Tenés {unreadRequired.length} {unreadRequired.length === 1 ? 'comunicado que requiere' : 'comunicados que requieren'} tu confirmación de lectura.
              </p>
            </div>
            <button
              className="btn btn--primary btn--sm"
              onClick={handleOpenFirstUnread}
              style={{ flexShrink: 0 }}
            >
              Leer ahora
            </button>
          </div>
        </div>
      )}

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
              onView={openCommunication}
            />
          ))}
        </div>
      )}
    </div>
  );
}


