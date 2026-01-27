import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentUploader } from '../../components/documents/DocumentUploader';
import { DocumentViewer } from '../../components/documents/DocumentViewer';

export function DocumentManager() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ver');

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Gestión de documentos</h1>
          <p className="dashboard-subtitle">Administrá y compartí documentos del taller.</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn btn--outline">
          Volver
        </button>
      </div>

      <div className="card">
        <div className="card__body">
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--border-color)' }}>
            <button
              onClick={() => setActiveTab('ver')}
              className={activeTab === 'ver' ? 'btn btn--primary' : 'btn btn--outline'}
              style={{ borderRadius: '4px 4px 0 0', borderBottom: activeTab === 'ver' ? '2px solid var(--primary-color)' : 'none' }}
            >
              Ver Documentos
            </button>
            <button
              onClick={() => setActiveTab('subir')}
              className={activeTab === 'subir' ? 'btn btn--primary' : 'btn btn--outline'}
              style={{ borderRadius: '4px 4px 0 0', borderBottom: activeTab === 'subir' ? '2px solid var(--primary-color)' : 'none' }}
            >
              Subir Documento
            </button>
          </div>

          {activeTab === 'ver' ? (
            <DocumentViewer showUpload={false} isAdmin={false} />
          ) : (
            <div>
              <div className="alert alert--info" style={{ marginBottom: 'var(--spacing-md)' }}>
                <strong>Nota:</strong> Los documentos que subas serÃ¡n visibles Ãºnicamente para los roles que selecciones.
              </div>
              <DocumentUploader onUploadSuccess={() => setActiveTab('ver')} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

