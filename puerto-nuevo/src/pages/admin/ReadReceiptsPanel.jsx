import { useState, useEffect } from 'react';
import { communicationsService } from '../../services/communications.service';
import { readReceiptsService } from '../../services/readReceipts.service';
import { usersService } from '../../services/users.service';

export function ReadReceiptsPanel() {
  const [communications, setCommunications] = useState([]);
  const [selectedComm, setSelectedComm] = useState(null);
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCommunications();
  }, []);

  const loadCommunications = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await communicationsService.getAllCommunications();
      if (result.success) {
        const withRequiredRead = result.communications.filter(
          comm => comm.requiereLecturaObligatoria
        );
        setCommunications(withRequiredRead);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStatsForCommunication = async (commId, destinatarios) => {
    try {
      const statsResult = await readReceiptsService.getReadStats(commId, destinatarios);
      if (statsResult.success) {
        setStats(statsResult.stats);
      }

      const pendingResult = await readReceiptsService.getPendingUsers(commId, destinatarios);
      if (pendingResult.success) {
        const pendingUIDs = pendingResult.pendingUserIds;
        
        const usersPromises = pendingUIDs.map(uid => usersService.getUserById(uid));
        const usersResults = await Promise.all(usersPromises);
        
        const users = usersResults
          .filter(r => r.success)
          .map(r => r.user);
        
        setPendingUsers(users);
      }
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    }
  };

  const handleSelectCommunication = (comm) => {
    setSelectedComm(comm);
    setStats(null);
    setPendingUsers([]);
    
    if (comm.destinatarios && comm.destinatarios.length > 0) {
      loadStatsForCommunication(comm.id, comm.destinatarios);
    } else {
      setStats({ total: 0, leidos: 0, pendientes: 0, porcentaje: 0 });
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
    <div style={{ padding: 'var(--spacing-lg)' }}>
      <h1>Panel de Confirmaciones de Lectura</h1>
      
      {communications.length === 0 ? (
        <div className="alert alert--info">
          No hay comunicados con lectura obligatoria.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
          <div>
            <h2>Comunicados con Lectura Obligatoria</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {communications.map(comm => (
                <div
                  key={comm.id}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    border: selectedComm?.id === comm.id ? '2px solid var(--color-primary)' : undefined
                  }}
                  onClick={() => handleSelectCommunication(comm)}
                >
                  <h3 className="card__title">{comm.title}</h3>
                  {comm.createdAt && (
                    <p className="card__subtitle">
                      {new Date(comm.createdAt.toDate()).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            {selectedComm ? (
              <>
                <h2>Estadísticas de Lectura</h2>
                
                {stats && (
                  <div className="card">
                    <h3 className="card__title">{selectedComm.title}</h3>
                    
                    <div style={{ marginTop: 'var(--spacing-md)' }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-md)'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold' }}>
                            {stats.total}
                          </div>
                          <div style={{ color: 'var(--color-text-light)' }}>Total</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-success)' }}>
                            {stats.leidos}
                          </div>
                          <div style={{ color: 'var(--color-text-light)' }}>Leídos</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'bold', color: 'var(--color-error)' }}>
                            {stats.pendientes}
                          </div>
                          <div style={{ color: 'var(--color-text-light)' }}>Pendientes</div>
                        </div>
                      </div>

                      <div style={{ 
                        width: '100%', 
                        height: '30px', 
                        backgroundColor: 'var(--color-border)', 
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${stats.porcentaje}%`,
                          height: '100%',
                          backgroundColor: 'var(--color-success)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{ textAlign: 'center', marginTop: 'var(--spacing-xs)' }}>
                        {stats.porcentaje}% leído
                      </div>
                    </div>
                  </div>
                )}

                {pendingUsers.length > 0 && (
                  <div className="card" style={{ marginTop: 'var(--spacing-md)' }}>
                    <h3 className="card__title">Usuarios Pendientes</h3>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Rol</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingUsers.map(user => (
                          <tr key={user.id}>
                            <td>{user.displayName || 'Sin nombre'}</td>
                            <td>{user.email}</td>
                            <td><span className="badge">{user.role}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : (
              <div className="alert alert--info">
                Selecciona un comunicado para ver sus estadísticas
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
