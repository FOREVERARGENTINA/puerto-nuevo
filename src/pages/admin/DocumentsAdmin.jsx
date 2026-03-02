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
              type="button"
              onClick={() => setActiveTab('ver')}
              className={`documents-admin-tab ${activeTab === 'ver' ? 'is-active' : ''}`}
              aria-pressed={activeTab === 'ver'}
            >
              <span className="documents-admin-tab__icon" aria-hidden="true">
                <Icon name="eye" size={15} />
              </span>
              <span>Ver Documentos</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subir')}
              className={`documents-admin-tab ${activeTab === 'subir' ? 'is-active' : ''}`}
              aria-pressed={activeTab === 'subir'}
            >
              <span className="documents-admin-tab__icon" aria-hidden="true">
                <Icon name="edit" size={15} />
              </span>
              <span>Subir Documentos</span>
            </button>
          </div>

          {activeTab === 'ver' ? (
            <DocumentViewer isAdmin={true} />
          ) : (
            <DocumentUploader onUploadSuccess={() => setActiveTab('ver')} />
          )}
        </div>
      </div>
    </div>
  );
}

