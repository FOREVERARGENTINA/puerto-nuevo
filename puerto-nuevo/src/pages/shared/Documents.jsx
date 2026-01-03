import { useNavigate } from 'react-router-dom';
import { DocumentViewer } from '../../components/documents/DocumentViewer';
import { useAuth } from '../../hooks/useAuth';

export function Documents() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getTitle = () => {
    switch (user?.role) {
      case 'teacher':
        return 'Documentos para Guías';
      case 'family':
        return 'Documentos Institucionales';
      case 'aspirante':
        return 'Documentos para Aspirantes';
      default:
        return 'Documentos';
    }
  };

  const getDescription = () => {
    switch (user?.role) {
      case 'teacher':
        return 'Documentos pedagógicos, administrativos e institucionales para guías.';
      case 'family':
        return 'Documentos institucionales, comunicados importantes y material informativo para familias.';
      case 'aspirante':
        return 'Documentos del proceso de admisión y información institucional.';
      default:
        return 'Documentos disponibles para tu rol.';
    }
  };

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">{getTitle()}</h1>
          <button onClick={() => navigate(-1)} className="btn btn--sm btn--outline">
            Volver
          </button>
        </div>

        <div className="card__body">
          <div className="alert alert--info" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <p>{getDescription()}</p>
          </div>

          <DocumentViewer isAdmin={false} />
        </div>
      </div>
    </div>
  );
}