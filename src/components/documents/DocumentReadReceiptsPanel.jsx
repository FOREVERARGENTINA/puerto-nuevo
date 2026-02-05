import { useState, useEffect } from 'react';
import { documentReadReceiptsService } from '../../services/documentReadReceipts.service';
import Icon from '../ui/Icon';

/**
 * Componente para mostrar el estado de confirmaciones de lectura de un documento
 * Solo para admin
 */
export function DocumentReadReceiptsPanel({ documentId, documentTitle }) {
  const [receipts, setReceipts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadReceipts();
  }, [documentId]);

  const loadReceipts = async () => {
    setLoading(true);
    const result = await documentReadReceiptsService.getDocumentReceipts(documentId);
    
    if (result.success) {
      setReceipts(result.receipts);
      setStats(result.stats);
    }
    
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="alert alert--info" style={{ fontSize: '0.875rem' }}>
        <p style={{ margin: 0 }}>Cargando estado de confirmaciones...</p>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return null;
  }

  const pendingReceipts = receipts.filter(r => r.status === 'pending');
  const readReceipts = receipts.filter(r => r.status === 'read');

  return (
    <div 
      className="card" 
      style={{ 
        marginTop: 'var(--spacing-md)', 
        background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.03), rgba(var(--color-primary-rgb), 0.01))',
        borderLeft: '4px solid var(--color-primary)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
            <Icon name="check-square" size={20} style={{ color: 'var(--color-primary)' }} />
            <h4 style={{ margin: 0 }}>Confirmaciones de Lectura</h4>
          </div>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginTop: 'var(--spacing-sm)' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-success)' }}>
                {stats.read}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                Confirmadas
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                Pendientes
              </div>
            </div>
            
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {stats.percentage}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                Completado
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="btn btn--sm btn--outline"
        >
          {showDetails ? 'Ocultar detalles' : 'Ver detalles'}
        </button>
      </div>

      {showDetails && (
        <div style={{ marginTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-md)' }}>
          <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
            {readReceipts.length > 0 && (
              <div>
                <h5 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-success)' }}>
                  <Icon name="check-circle" size={16} />
                  Le\u00eddo ({readReceipts.length})
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                  {readReceipts.map(receipt => (
                    <div 
                      key={receipt.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: 'var(--spacing-xs) var(--spacing-sm)', 
                        background: 'var(--color-bg-secondary)', 
                        borderRadius: 'var(--border-radius)',
                        fontSize: '0.875rem'
                      }}
                    >
                      <span>{receipt.userEmail}</span>
                      <span style={{ color: 'var(--color-text-light)' }}>
                        {receipt.readAt?.toDate?.().toLocaleString('es-AR') || 'Fecha desconocida'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingReceipts.length > 0 && (
              <div>
                <h5 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-warning)' }}>
                  <Icon name="clock" size={16} />
                  Pendiente ({pendingReceipts.length})
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                  {pendingReceipts.map(receipt => (
                    <div 
                      key={receipt.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        padding: 'var(--spacing-xs) var(--spacing-sm)', 
                        background: 'var(--color-bg-secondary)', 
                        borderRadius: 'var(--border-radius)',
                        fontSize: '0.875rem'
                      }}
                    >
                      <span>{receipt.userEmail}</span>
                      <span className="badge badge--warning" style={{ fontSize: '0.7rem' }}>
                        Sin leer
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
