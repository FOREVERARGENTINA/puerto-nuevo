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

  const header = (
    <div className="dashboard-header dashboard-header--compact">
      <div>
        <h1 className="dashboard-title">Talleres</h1>
        <p className="dashboard-subtitle">Información y materiales de los talleres.</p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
        <button onClick={() => navigate(-1)} className="btn btn--outline">
          Volver
        </button>
      </div>
    </div>
  );
  const selectTaller = async (taller) => {
    // Normalización de horarios igual que en MyTallerEspecial
    const dayOrder = { Lunes: 1, Martes: 2, 'Miércoles': 3, Miercoles: 3, Jueves: 4, Viernes: 5 };
    let normalizedHorarios = [];
    
    if (Array.isArray(taller.horarios)) {
      const map = new Map();
      taller.horarios.forEach(h => {
        const dia = (h.dia || '').trim();
        const bloque = (h.bloque || '').trim();
        if (!dia || !bloque) return;
        const key = `${dia}|${bloque}`;
        if (!map.has(key)) {
          const start = (bloque.split('-')[0] || '').trim();
          const parts = start.split(':');
          const minutes = parts.length === 2 ? (parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)) : 0;
          map.set(key, { dia, bloque, startMinutes: minutes });
        }
      });
      normalizedHorarios = Array.from(map.values()).sort((a, b) => {
        const da = dayOrder[a.dia] || 99;
        const db = dayOrder[b.dia] || 99;
        if (da !== db) return da - db;
        return a.startMinutes - b.startMinutes;
      });
    }

    let diasSemana = Array.from(new Set(normalizedHorarios.map(h => h.dia)));
    if (diasSemana.length === 0 && Array.isArray(taller.diasSemana) && taller.diasSemana.length > 0) {
      const seen = new Set();
      diasSemana = taller.diasSemana.map(d => d.trim()).filter(d => d && !seen.has(d) && (seen.add(d), true)).sort((a, b) => (dayOrder[a] || 99) - (dayOrder[b] || 99));
    }

    const horario = taller.horario || (normalizedHorarios.length > 0 ? Array.from(new Set(normalizedHorarios.map(h => h.bloque))).join(', ') : '');
    const calendario = taller.calendario || taller.calendar || '';
    const tallerAug = { ...taller, horarios: normalizedHorarios, diasSemana, horario, calendario };
    
    setSelectedTaller(tallerAug);
    setLoadingGallery(true);
    const result = await talleresService.getGallery(taller.id);
    if (result.success) {
      setGallery(result.items);
    }
    setLoadingGallery(false);
  };

  
  async function loadData() {
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
  }

  useEffect(() => {
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="container page-container">
      {header}
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
      <div className="container page-container">
      {header}
        <div className="card">
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
      <div className="container page-container">
      {header}
        <div className="card">
          <div className="card__body">
            <div className="alert alert--info">
              <p>Aún no hay talleres asignados para el ambiente de sus hijos.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-container">
      {header}
      <div className="card">

        <div className="card__body">
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <p style={{ marginBottom: 'var(--spacing-md)' }}>
              Sus hijos asisten a los siguientes talleres:
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
                  {selectedTaller.ambiente === 'taller1' ? 'Taller 1' : 'Taller 2'}
                </span>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3>Descripción</h3>
                <p style={{ lineHeight: 1.6, color: 'var(--color-text)' }}>{selectedTaller.descripcion || 'Sin descripción disponible'}</p>
              </div>

              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3>Días y Horarios</h3>
                {selectedTaller.horarios?.length > 0 ? (
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                    {selectedTaller.horarios.map((h, idx) => (
                      <span key={idx} className="chip">{h.dia} • {h.bloque}</span>
                    ))}
                  </div>
                ) : selectedTaller.horario ? (
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                    {selectedTaller.horario.split(',').map((s, i) => (
                      <span key={i} className="chip">{s.trim()}</span>
                    ))}
                  </div>
                ) : (
                  <p>No especificado</p>
                )}
              </div>

              {selectedTaller.calendario && (
                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                  <h3>Calendario</h3>
                  <a 
                    href={selectedTaller.calendario} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn--sm btn--primary"
                    style={{ marginRight: 'var(--spacing-sm)' }}
                  >
                    Descargar Calendario
                  </a>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)', wordBreak: 'break-all' }}>
                    {selectedTaller.calendario}
                  </p>
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




