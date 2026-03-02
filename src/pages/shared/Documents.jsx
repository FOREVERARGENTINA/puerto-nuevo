import { useNavigate } from 'react-router-dom';
import { DocumentViewer } from '../../components/documents/DocumentViewer';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../config/constants';
import Icon from '../../components/ui/Icon';

export function Documents() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getTitle = () => {
    switch (user?.role) {
      case ROLES.DOCENTE:
        return 'Documentos para Guias';
      case ROLES.FAMILY:
        return 'Documentos Institucionales';
      case ROLES.ASPIRANTE:
        return 'Documentos para Aspirantes';
      default:
        return 'Documentos';
    }
  };

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">{getTitle()}</h1>
          <p className="dashboard-subtitle">Accede a la documentacion disponible.</p>
        </div>
        <button onClick={() => navigate(-1)} className="btn btn--outline btn--back">
          <Icon name="chevron-left" size={16} />
          Volver
        </button>
      </div>

      <div className="card">
        <div className="card__body">
          <DocumentViewer isAdmin={false} />
        </div>
      </div>
    </div>
  );
}
