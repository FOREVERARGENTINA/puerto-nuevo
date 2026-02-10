import { useNavigate } from 'react-router-dom';
import { DocumentViewer } from '../../components/documents/DocumentViewer';
import Icon from '../../components/ui/Icon';

export function DocumentManager() {
  const navigate = useNavigate();

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Documentos</h1>
          <p className="dashboard-subtitle">Consulta de documentos institucionales.</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn btn--outline btn--back">
          <Icon name="chevron-left" size={16} />
          Volver
        </button>
      </div>

      <div className="card">
        <div className="card__body">
          <div className="alert alert--info" style={{ marginBottom: 'var(--spacing-md)' }}>
            Este rol solo tiene acceso de lectura de documentos.
          </div>
          <DocumentViewer showUpload={false} isAdmin={false} />
        </div>
      </div>
    </div>
  );
}
