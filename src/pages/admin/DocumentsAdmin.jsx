import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentUploader } from '../../components/documents/DocumentUploader';
import { DocumentViewer } from '../../components/documents/DocumentViewer';
import Icon from '../../components/ui/Icon';
import './DocumentsAdmin.css';

export function DocumentsAdmin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ver');

  return (
    <div className="container page-container documents-admin-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Documentos</h1>
          <p className="dashboard-subtitle">Gestión de documentos institucionales</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <button onClick={() => navigate(-1)} className="btn btn--outline btn--back">
            <Icon name="chevron-left" size={16} />
            Volver
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          <div className="documents-admin-tabs">
            <button
              onClick={() => setActiveTab('ver')}
              className={`btn ${activeTab === 'ver' ? 'btn--primary' : 'btn--outline'} documents-admin-tab`}
            >
              Ver Documentos
            </button>
            <button
              onClick={() => setActiveTab('subir')}
              className={`btn ${activeTab === 'subir' ? 'btn--primary' : 'btn--outline'} documents-admin-tab`}
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
