import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { childrenService } from '../../services/children.service';
import { talleresService } from '../../services/talleres.service';
import { useNavigate } from 'react-router-dom';

export function TalleresEspeciales() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [selectedTaller, setSelectedTaller] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingGallery, setLoadingGallery] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.uid) return;

    setLoading(true);
    const childrenResult = await childrenService.getChildrenByResponsable(user.uid);
    
    if (childrenResult.success && childrenResult.children.length > 0) {
      setChildren(childrenResult.children);
      
      const ambientes = [...new Set(childrenResult.children.map(c => c.ambiente).filter(Boolean))];
      
      const talleresResult = await talleresService.getAllTalleres();
      if (talleresResult.success) {
        const talleresFiltrados = talleresResult.talleres.filter(t => 
          ambientes.includes(t.ambiente)
        );
        setTalleres(talleresFiltrados);
        
        if (talleresFiltrados.length > 0) {
          selectTaller(talleresFiltrados[0]);
        }
      }
    }
    setLoading(false);
  };

  const selectTaller = async (taller) => {
    setSelectedTaller(taller);
    setLoadingGallery(true);
    const result = await talleresService.getGallery(taller.id);
    if (result.success) {
      setGallery(result.items);
    }
    setLoadingGallery(false);
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card__body">
            <p>Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card__header">
            <h1 className="card__title">Talleres Especiales</h1>
            <button onClick={() => navigate(-1)} className="btn btn--sm btn--outline">
              Volver
            </button>
          </div>
          <div className="card__body">
            <div className="alert alert--info">
              <p>No hay hijos registrados en su cuenta.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (talleres.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card__header">
            <h1 className="card__title">Talleres Especiales</h1>
            <button onClick={() => navigate(-1)} className="btn btn--sm btn--outline">
              Volver
            </button>
          </div>
          <div className="card__body">
            <div className="alert alert--info">
              <p>Aún no hay talleres especiales asignados para el ambiente de sus hijos.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Talleres Especiales</h1>
          <button onClick={() => navigate(-1)} className="btn btn--sm btn--outline">
            Volver
          </button>
        </div>

        <div className="card__body">
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <p style={{ marginBottom: 'var(--spacing-md)' }}>
              Sus hijos asisten a los siguientes talleres especiales:
            </p>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              {talleres.map(t => (
                <button
                  key={t.id}
                  onClick={() => selectTaller(t)}
                  className={`btn ${selectedTaller?.id === t.id ? 'btn--primary' : 'btn--outline'}`}
                  style={{ minWidth: '150px' }}
                >
                  {t.nombre}
                </button>
              ))}
            </div>
          </div>

          {selectedTaller && (
            <div style={{ marginTop: 'var(--spacing-xl)' }}>
              <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <h2 style={{ margin: 0 }}>{selectedTaller.nombre}</h2>
                <span className="badge badge--info" style={{ marginTop: 'var(--spacing-xs)' }}>
                  {selectedTaller.ambiente === 'taller1' ? 'Taller 1 (6-9 años)' : 'Taller 2 (9-12 años)'}
                </span>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3>Descripción</h3>
                <p>{selectedTaller.descripcion || 'Sin descripción disponible'}</p>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3>Horario</h3>
                <p>{selectedTaller.horario || 'No especificado'}</p>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3>Días de la semana</h3>
                <p>{selectedTaller.diasSemana?.length > 0 ? selectedTaller.diasSemana.join(', ') : 'No especificado'}</p>
              </div>

              {selectedTaller.calendario && (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <h3>Calendario de Actividades</h3>
                  <a 
                    href={selectedTaller.calendario} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn--sm btn--primary"
                  >
                    Descargar Calendario
                  </a>
                </div>
              )}

              <div style={{ marginTop: 'var(--spacing-xl)' }}>
                <h3>Galería de Fotos y Videos</h3>
                {loadingGallery ? (
                  <p>Cargando galería...</p>
                ) : gallery.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
                    {gallery.map(item => (
                      <div key={item.id} style={{ 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--border-radius-md)',
                        overflow: 'hidden',
                        backgroundColor: 'var(--color-background-secondary)'
                      }}>
                        {item.tipo === 'imagen' ? (
                          <img 
                            src={item.url} 
                            alt={item.fileName}
                            style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                          />
                        ) : (
                          <video 
                            src={item.url}
                            controls
                            style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                          />
                        )}
                        <div style={{ padding: 'var(--spacing-sm)' }}>
                          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                            {new Date(item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginTop: 'var(--spacing-sm)', color: 'var(--color-text-secondary)' }}>
                    Aún no hay contenido en la galería de este taller.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
