import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentUploader } from '../../components/documents/DocumentUploader';
import { DocumentViewer } from '../../components/documents/DocumentViewer';

export function DocumentsAdmin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ver');

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Documentos</h1>
          <p className="dashboard-subtitle">Gestión de documentos institucionales</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button onClick={() => navigate(-1)} className="btn btn--outline">
            Volver
          </button>
        </div>
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
            <DocumentViewer isAdmin={true} />
          ) : (
            <div>
              <div className="alert alert--info" style={{ marginBottom: 'var(--spacing-md)' }}>
                <strong>Panel Administrativo:</strong> Puedes ver y gestionar todos los documentos de la institución.
              </div>
              <DocumentUploader onUploadSuccess={() => setActiveTab('ver')} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
