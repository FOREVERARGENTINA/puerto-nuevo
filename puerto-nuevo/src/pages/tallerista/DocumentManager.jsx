import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentUploader } from '../../components/documents/DocumentUploader';
import { DocumentViewer } from '../../components/documents/DocumentViewer';

export function DocumentManager() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ver');

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Gestión de Documentos</h1>
          <button onClick={() => navigate(-1)} className="btn btn--sm btn--outline">
            Volver
          </button>
        </div>

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
                <strong>Nota:</strong> Los documentos que subas serán visibles únicamente para los roles que selecciones.
              </div>
              <DocumentUploader onUploadSuccess={() => setActiveTab('ver')} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
