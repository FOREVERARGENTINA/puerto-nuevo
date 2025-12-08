import { useState, useEffect, useCallback } from 'react';
import { documentsService } from '../../services/documents.service';
import { useAuth } from '../../hooks/useAuth';

export function DocumentViewer({ isAdmin = false }) {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategoria, setFilterCategoria] = useState('all');

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
    }
    setLoading(false);
  }, [isAdmin, user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDocuments();
  }, [loadDocuments]);

  const handleDelete = async (doc) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${doc.titulo}"?`)) return;

    const result = await documentsService.deleteDocument(doc.id, doc.categoria, doc.archivoNombre);

    if (result.success) {
      alert('Documento eliminado correctamente');
      loadDocuments();
    } else {
      alert('Error al eliminar: ' + result.error);
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
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    return '📎';
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
          {filteredDocuments.map(doc => (
            <div key={doc.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                    <span style={{ fontSize: '1.5rem' }}>{getFileIcon(doc.archivoNombre)}</span>
                    <h3 style={{ margin: 0 }}>{doc.titulo}</h3>
                    <span className="badge badge--info" style={{ fontSize: '0.75rem' }}>
                      {categorias.find(c => c.value === doc.categoria)?.label || doc.categoria}
                    </span>
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
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                  <a
                    href={doc.archivoURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn--sm btn--primary"
                  >
                    Descargar
                  </a>
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
          ))}
        </div>
      )}
    </div>
  );
}
