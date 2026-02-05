import { useState, useEffect, useCallback } from 'react';
import { documentsService } from '../../services/documents.service';
import { documentReadReceiptsService } from '../../services/documentReadReceipts.service';
import { useAuth } from '../../hooks/useAuth';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { AlertDialog } from '../common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import { DocumentMandatoryReadModal } from './DocumentMandatoryReadModal';
import { DocumentReadReceiptsPanel } from './DocumentReadReceiptsPanel';
import Icon from '../ui/Icon';

export function DocumentViewer({ isAdmin = false }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoria, setFilterCategoria] = useState('all');
  const [receipts, setReceipts] = useState({});
  const [selectedDocForRead, setSelectedDocForRead] = useState(null);

  const confirmDialog = useDialog();
  const alertDialog = useDialog();

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    let result;

    if (isAdmin) {
      result = await documentsService.getAllDocuments();
    } else if (user?.role) {
      result = await documentsService.getDocumentsByRole(user.role);
    } else {
      setLoading(false);
      return;
    }

    if (result.success) {
      setDocuments(result.documents);
      
      if (user.role === 'family' && user.uid) {
        const receiptsMap = {};
        const docs = result.success ? result.documents : [];
        for (const doc of docs) {
          if (doc.requiereLectura) {
            const receiptResult = await documentReadReceiptsService.getUserReceipt(doc.id, user.uid);
            if (receiptResult.success && receiptResult.receipt) {
              receiptsMap[doc.id] = receiptResult.receipt;
            }
          }
        }
        setReceipts(receiptsMap);
      }
    }
    setLoading(false);
  }, [isAdmin, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async (doc) => {
    confirmDialog.openDialog({
      title: 'Eliminar Documento',
      message: `¿Estás seguro de eliminar "${doc.titulo}"?`,
      type: 'danger',
      onConfirm: async () => {
        const result = await documentsService.deleteDocument(doc.id, doc.categoria, doc.archivoNombre);

        if (result.success) {
          alertDialog.openDialog({
            title: 'Éxito',
            message: 'Documento eliminado correctamente',
            type: 'success'
          });
          loadDocuments();
        } else {
          alertDialog.openDialog({
            title: 'Error',
            message: 'Error al eliminar: ' + result.error,
            type: 'error'
          });
        }
      }
    });
  };

  const handleOpenDocument = (doc) => {
    if (!isAdmin && user?.role === 'family' && doc.requiereLectura) {
      const receipt = receipts[doc.id];
      if (!receipt || receipt.status === 'pending') {
        setSelectedDocForRead(doc);
        return;
      }
    }
    window.open(doc.archivoURL, '_blank', 'noopener,noreferrer');
  };

  const handleConfirmRead = async (documentId) => {
    if (!user?.uid) return;

    // Solo registrar la lectura, NO abrir documento (ya hay botón separado para eso)
    const result = await documentReadReceiptsService.markAsRead(documentId, user.uid);
    
    if (result.success) {
      setReceipts(prev => ({
        ...prev,
        [documentId]: { ...prev[documentId], status: 'read', readAt: new Date() }
      }));
      setSelectedDocForRead(null);
      alertDialog.openDialog({ 
        title: 'Confirmado', 
        message: 'Tu lectura ha sido registrada correctamente', 
        type: 'success' 
      });
    } else {
      alertDialog.openDialog({ 
        title: 'Error', 
        message: 'Error al registrar la lectura: ' + result.error, 
        type: 'error' 
      });
    }
  };

  const filteredDocuments = filterCategoria === 'all'
    ? documents
    : documents.filter(doc => doc.categoria === filterCategoria);

  const categorias = [
    { value: 'all', label: 'Todas' },
    { value: 'institucional', label: 'Institucional' },
    { value: 'pedagogico', label: 'Pedagógico' },
    { value: 'administrativo', label: 'Administrativo' },
    { value: 'taller', label: 'Taller Especial' }
  ];

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'IMG';
    if (['pdf'].includes(ext)) return 'PDF';
    if (['doc', 'docx'].includes(ext)) return 'DOC';
    if (['xls', 'xlsx'].includes(ext)) return 'XLS';
    return 'FILE';
  };

  if (loading) {
    return (
      <div className="alert alert--info">
        <p>Cargando documentos...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
        <div className="form-group" style={{ marginBottom: 0, flex: '0 1 250px' }}>
          <label htmlFor="filter-categoria" style={{ marginBottom: 'var(--spacing-xs)' }}>Filtrar por categoría</label>
          <select
            id="filter-categoria"
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
            className="form-control"
          >
            {categorias.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="alert alert--info">
          <p>No hay documentos disponibles{filterCategoria !== 'all' ? ' en esta categoría' : ''}.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
          {filteredDocuments.map(doc => {
            const receipt = receipts[doc.id];
            const isPending = doc.requiereLectura && (!receipt || receipt.status === 'pending');
            const isRead = receipt?.status === 'read';
            
            return (
            <div key={doc.id} className="card" style={{ borderLeft: isPending ? '4px solid var(--color-warning)' : isRead ? '4px solid var(--color-success)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                    <span style={{ fontSize: '1.5rem' }}>{getFileIcon(doc.archivoNombre)}</span>
                    <h3 style={{ margin: 0 }}>{doc.titulo}</h3>
                    <span className="badge badge--info" style={{ fontSize: '0.75rem' }}>
                      {categorias.find(c => c.value === doc.categoria)?.label || doc.categoria}
                    </span>
                    {doc.requiereLectura && !isAdmin && (isPending ? <span className="badge badge--warning" style={{fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}><Icon name="alert-circle" size={14} />Lectura obligatoria</span> : isRead ? <span className="badge badge--success" style={{fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)'}}><Icon name="check-circle" size={14} />Leído</span> : null)}
                  </div>

                  {doc.descripcion && (
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                      {doc.descripcion}
                    </p>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
                    {doc.roles?.map(role => (
                      <span key={role} className="badge badge--secondary" style={{ fontSize: '0.75rem' }}>
                        {role}
                      </span>
                    ))}
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Subido por: {doc.uploadedByEmail} •{' '}
                    {doc.createdAt?.toDate?.().toLocaleDateString?.('es-AR') || 'Fecha desconocida'}
                  </p>
                  
                  {isAdmin && doc.requiereLectura && <DocumentReadReceiptsPanel documentId={doc.id} documentTitle={doc.titulo} />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                  <button 
                    onClick={() => handleOpenDocument(doc)} 
                    className="btn btn--sm btn--primary"
                  >
                    {isAdmin ? 'Abrir' : (isPending ? 'Abrir y confirmar' : 'Abrir')}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(doc)}
                      className="btn btn--sm btn--danger"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {selectedDocForRead && (
        <DocumentMandatoryReadModal
          document={selectedDocForRead}
          onConfirm={handleConfirmRead}
          onClose={() => setSelectedDocForRead(null)}
        />
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.closeDialog}
        onConfirm={confirmDialog.dialogData.onConfirm}
        title={confirmDialog.dialogData.title}
        message={confirmDialog.dialogData.message}
        type={confirmDialog.dialogData.type}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={alertDialog.closeDialog}
        title={alertDialog.dialogData.title}
        message={alertDialog.dialogData.message}
        type={alertDialog.dialogData.type}
      />
    </div>
  );
}
