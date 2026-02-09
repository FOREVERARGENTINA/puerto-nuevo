import { useState, useEffect } from 'react';
import { documentReadReceiptsService } from '../../services/documentReadReceipts.service';
import Icon from '../ui/Icon';

/**
 * Componente para mostrar el estado de confirmaciones de lectura de un documento
 * Solo para admin
 */
export function DocumentReadReceiptsPanel({ documentId, documentTitle: _documentTitle }) {
  const [receipts, setReceipts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReceipts, setShowReceipts] = useState(false);

  const loadReceipts = async () => {
    setLoading(true);
    const result = await documentReadReceiptsService.getDocumentReceipts(documentId);

    if (result.success) {
      setReceipts(result.receipts);
      setStats(result.stats);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadReceipts();
  }, [documentId]);

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

  const panelContentId = `document-receipts-${documentId}`;
  const pendingReceipts = receipts.filter((receipt) => receipt.status === 'pending');
  const readReceipts = receipts.filter((receipt) => receipt.status === 'read');

  return (
    <div
      className="card card--compact"
      style={{
        marginTop: 'var(--spacing-sm)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        background: 'linear-gradient(135deg, var(--color-background-alt) 0%, var(--color-background-warm) 100%)',
        borderLeft: '3px solid var(--color-primary)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', minWidth: 0 }}>
          <Icon name="check-square" size={16} style={{ color: 'var(--color-primary)' }} />
          <h4 style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.2 }}>Confirmaciones de lectura</h4>
        </div>

        <button
          onClick={() => setShowReceipts((prev) => !prev)}
          className="btn btn--sm btn--outline"
          aria-expanded={showReceipts}
          aria-controls={panelContentId}
          style={{ padding: '6px 10px' }}
        >
          {showReceipts ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {showReceipts && (
        <div id={panelContentId} style={{ marginTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-sm)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-success)', lineHeight: 1 }}>
                {stats.read}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                Confirmadas
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-warning)', lineHeight: 1 }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                Pendientes
              </div>
            </div>

            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1 }}>
                {stats.percentage}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                Completado
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
            {readReceipts.length > 0 && (
              <div>
                <h5 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: '6px', color: 'var(--color-success)', fontSize: '0.85rem' }}>
                  <Icon name="check-circle" size={14} />
                  Leído ({readReceipts.length})
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {readReceipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)',
                        flexWrap: 'wrap',
                        padding: '6px 8px',
                        background: 'var(--color-background-alt)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <span style={{ flex: '1 1 200px', minWidth: 0, overflowWrap: 'anywhere' }}>{receipt.userEmail}</span>
                      <span style={{ color: 'var(--color-text-light)', flex: '0 0 auto', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                        {receipt.readAt?.toDate?.().toLocaleString('es-AR') || 'Fecha desconocida'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingReceipts.length > 0 && (
              <div>
                <h5 style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: '6px', color: 'var(--color-warning)', fontSize: '0.85rem' }}>
                  <Icon name="clock" size={14} />
                  Pendiente ({pendingReceipts.length})
                </h5>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {pendingReceipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 'var(--spacing-xs)',
                        flexWrap: 'wrap',
                        padding: '6px 8px',
                        background: 'var(--color-background-alt)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem'
                      }}
                    >
                      <span style={{ flex: '1 1 200px', minWidth: 0, overflowWrap: 'anywhere' }}>{receipt.userEmail}</span>
                      <span className="badge badge--warning" style={{ fontSize: '0.65rem', padding: '2px 6px', flex: '0 0 auto' }}>
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
