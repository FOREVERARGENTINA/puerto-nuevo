import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { childrenService } from '../../services/children.service';
import { talleresService } from '../../services/talleres.service';
import { eventsService } from '../../services/events.service';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { InstitutionalLightbox } from '../../components/gallery/shared/InstitutionalLightbox';

function parseTimeToMinutes(value) {
  const [hours, minutes] = String(value || '').trim().split(':');
  const hh = Number.parseInt(hours, 10);
  const mm = Number.parseInt(minutes, 10);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return (hh * 60) + mm;
}

function formatMinutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getMergedHorariosByDay(horarios = []) {
  const byDay = new Map();

  horarios.forEach((item) => {
    const dia = String(item?.dia || '').trim();
    const bloque = String(item?.bloque || '').replace(/\s+/g, '');
    if (!dia || !bloque.includes('-')) return;

    const [startRaw, endRaw] = bloque.split('-');
    const startMinutes = parseTimeToMinutes(startRaw);
    const endMinutes = parseTimeToMinutes(endRaw);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) return;

    if (!byDay.has(dia)) byDay.set(dia, []);
    byDay.get(dia).push({ startMinutes, endMinutes });
  });

  const merged = [];
  byDay.forEach((ranges, dia) => {
    const ordered = [...ranges].sort((a, b) => a.startMinutes - b.startMinutes);
    if (ordered.length === 0) return;

    const compacted = [ordered[0]];
    for (let i = 1; i < ordered.length; i += 1) {
      const current = ordered[i];
      const last = compacted[compacted.length - 1];

      if (current.startMinutes <= last.endMinutes) {
        last.endMinutes = Math.max(last.endMinutes, current.endMinutes);
      } else {
        compacted.push({ ...current });
      }
    }

    compacted.forEach((range) => {
      merged.push({
        dia,
        startMinutes: range.startMinutes,
        bloque: `${formatMinutesToTime(range.startMinutes)}-${formatMinutesToTime(range.endMinutes)}`
      });
    });
  });

  return merged.sort((a, b) => {
    const dayOrder = { Lunes: 1, Martes: 2, 'Miércoles': 3, Miercoles: 3, Jueves: 4, Viernes: 5 };
    const dayA = dayOrder[a.dia] || 99;
    const dayB = dayOrder[b.dia] || 99;
    if (dayA !== dayB) return dayA - dayB;
    return a.startMinutes - b.startMinutes;
  });
}

export function TalleresEspeciales() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [children, setChildren] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [selectedTaller, setSelectedTaller] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingGallery, setLoadingGallery] = useState(false);
  const [tallerEvents, setTallerEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [resourcePosts, setResourcePosts] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(-1);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activeTab, setActiveTab] = useState('galeria');

  const deepLinkConfig = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      tallerId: params.get('tallerId') || '',
      forceResourcesTab: params.get('tab') === 'recursos'
    };
  }, [location.search]);

  const header = (
    <div className="dashboard-header dashboard-header--compact family-talleres-header">
      <div>
        <h1 className="dashboard-title">Talleres</h1>
        <p className="dashboard-subtitle">Información y materiales de los talleres.</p>
      </div>
      <div className="family-talleres-header__actions">
        <button onClick={() => navigate(-1)} className="btn btn--outline btn--back">
          <Icon name="chevron-left" size={16} />
          Volver
        </button>
      </div>
    </div>
  );

  const selectTaller = async (taller, options = {}) => {
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
    const horariosCompactados = getMergedHorariosByDay(normalizedHorarios);
    const tallerAug = {
      ...taller,
      horarios: normalizedHorarios,
      horariosCompactados,
      diasSemana,
      horario,
      calendario
    };
    
    setSelectedTaller(tallerAug);
    setSelectedAlbum(null);
    setGallery([]);
    setSelectedMediaIndex(-1);
    setShowLightbox(false);
    setActiveTab(options.preserveResourcesTab ? 'recursos' : 'galeria');
    setLoadingAlbums(true);
    const result = await talleresService.getAlbums(taller.id);
    if (result.success) {
      setAlbums(result.albums || []);
    } else {
      setAlbums([]);
    }
    setLoadingAlbums(false);

    setLoadingResources(true);
    const resourcesResult = await talleresService.getResourcePosts(taller.id);
    if (resourcesResult.success) {
      setResourcePosts(resourcesResult.posts || []);
    } else {
      setResourcePosts([]);
    }
    setLoadingResources(false);

    setLoadingEvents(true);
    const now = new Date();
    const start = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const end = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0, 23, 59, 59);
    const eventsResult = await eventsService.getEventsByRange(start, end);
    if (eventsResult.success) {
      const filtered = (eventsResult.events || []).filter(event => (
        event.source === 'taller' &&
        event.tallerId === taller.id &&
        (event.scope === 'publico' || event.scope === 'taller')
      ));
      filtered.sort((a, b) => {
        const dateA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const dateB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return dateB - dateA;
      });
      setTallerEvents(filtered);
    } else {
      setTallerEvents([]);
    }
    setLoadingEvents(false);
  };

  const openLightbox = (index) => {
    setSelectedMediaIndex(index);
    setShowLightbox(true);
  };

  const closeLightbox = () => {
    setShowLightbox(false);
    setSelectedMediaIndex(-1);
  };

  const openAlbum = async (album) => {
    if (!selectedTaller?.id || !album?.id) return;
    setSelectedAlbum(album);
    setSelectedMediaIndex(-1);
    setShowLightbox(false);
    setLoadingGallery(true);
    const result = await talleresService.getAlbumMedia(selectedTaller.id, album.id);
    if (result.success) {
      setGallery(result.items || []);
    } else {
      setGallery([]);
    }
    setLoadingGallery(false);
  };

  const backToAlbums = () => {
    setSelectedAlbum(null);
    setGallery([]);
  };

  const showPrevMedia = () => {
    if (!gallery.length) return;
    setSelectedMediaIndex((current) => (current - 1 + gallery.length) % gallery.length);
  };

  const showNextMedia = () => {
    if (!gallery.length) return;
    setSelectedMediaIndex((current) => (current + 1) % gallery.length);
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
          const preselected = deepLinkConfig.tallerId
            ? talleresFiltrados.find((t) => t.id === deepLinkConfig.tallerId)
            : null;
          const initialTaller = preselected || talleresFiltrados[0];
          await selectTaller(initialTaller, {
            preserveResourcesTab: deepLinkConfig.forceResourcesTab
          });
        }
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, [user, deepLinkConfig.forceResourcesTab, deepLinkConfig.tallerId]);

  if (loading) {
    return (
      <div className="container page-container family-talleres-page">
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
      <div className="container page-container family-talleres-page">
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
      <div className="container page-container family-talleres-page">
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
    <div className="container page-container family-talleres-page">
      {header}

      {/* Selector de talleres */}
      <div className="card family-talleres-selector">
        <div className="card__body">
          <div className="family-talleres-selector__row">
            <div className="family-talleres-selector__control-wrap">
              <label htmlFor="family-taller-select" className="family-talleres-selector__label">
                Taller
              </label>
              <select
                id="family-taller-select"
                className="form-control form-select family-talleres-selector__control"
                value={selectedTaller?.id || ''}
                onChange={(event) => {
                  const nextTaller = talleres.find((t) => t.id === event.target.value);
                  if (nextTaller && nextTaller.id !== selectedTaller?.id) {
                    void selectTaller(nextTaller, {
                      preserveResourcesTab: deepLinkConfig.forceResourcesTab
                    });
                  }
                }}
              >
                {talleres.map((taller) => (
                  <option key={taller.id} value={taller.id}>
                    {taller.nombre}
                  </option>
                ))}
              </select>
            </div>
            {selectedTaller && (
              <div className="family-talleres-selector__details">
                {(selectedTaller.horariosCompactados?.length > 0 || selectedTaller.horario) && (
                  <div className="family-talleres-selector__meta-row">
                    <span className="family-talleres-selector__meta-label">Horarios</span>
                    <div className="family-talleres-selector__pills">
                      {selectedTaller.horariosCompactados?.length > 0
                        ? selectedTaller.horariosCompactados.map((horario, index) => (
                          <span key={`${horario.dia}-${horario.bloque}-${index}`} className="family-talleres-selector__pill">
                            {horario.dia} {horario.bloque}
                          </span>
                        ))
                        : selectedTaller.horario.split(',').map((slot, index) => (
                          <span key={`${slot.trim()}-${index}`} className="family-talleres-selector__pill">
                            {slot.trim()}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
                {selectedTaller.descripcion && (
                  <p className="family-talleres-selector__description">{selectedTaller.descripcion}</p>
                )}
                {selectedTaller.calendario && (
                  <a
                    href={selectedTaller.calendario}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="family-talleres-selector__calendar-link"
                  >
                    Ver calendario del taller
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido del taller seleccionado */}
      {selectedTaller && (
        <div className="family-talleres-content-card">
          {/* Tabs Navigation */}
          <div className="family-talleres-content-tabs">
            <button
              onClick={() => setActiveTab('galeria')}
              className={`family-talleres-content-tab ${activeTab === 'galeria' ? 'is-active' : ''}`}
            >
              Galería
            </button>
            <button
              onClick={() => setActiveTab('recursos')}
              className={`family-talleres-content-tab ${activeTab === 'recursos' ? 'is-active' : ''}`}
            >
              Recursos
            </button>
            <button
              onClick={() => setActiveTab('eventos')}
              className={`family-talleres-content-tab ${activeTab === 'eventos' ? 'is-active' : ''}`}
            >
              Eventos
            </button>
          </div>

          <div className="family-talleres-content-panel">
            {/* Tab: Eventos */}
            {activeTab === 'eventos' && (
              <div>
                {loadingEvents ? (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                    <p style={{ color: 'var(--color-text-light)' }}>Cargando eventos...</p>
                  </div>
                ) : tallerEvents.length > 0 ? (
                  <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {tallerEvents.map(event => {
                      const date = event.fecha?.toDate ? event.fecha.toDate() : new Date(event.fecha);
                      return (
                        <div
                          key={event.id}
                          style={{
                            padding: 'var(--spacing-md)',
                            background: 'white',
                            border: '1px solid #D4C4B5',
                            borderLeft: '3px solid var(--color-accent)',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                            e.currentTarget.style.borderColor = '#A89074';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = '#D4C4B5';
                          }}
                        >
                          <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'flex-start' }}>
                            <div style={{
                              minWidth: '60px',
                              textAlign: 'center',
                              padding: 'var(--spacing-sm)',
                              background: 'var(--color-accent-soft)',
                              borderRadius: '8px'
                            }}>
                              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-accent)', lineHeight: '1' }}>
                                {date.getDate()}
                              </div>
                              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', textTransform: 'uppercase', marginTop: '4px' }}>
                                {date.toLocaleDateString('es-AR', { month: 'short' })}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ margin: '0 0 var(--spacing-xs) 0', fontSize: 'var(--font-size-md)', fontWeight: '600' }}>
                                {event.titulo}
                              </h4>
                              {event.hora && (
                                <span style={{
                                  display: 'inline-block',
                                  fontSize: 'var(--font-size-sm)',
                                  color: 'var(--color-text-light)',
                                  marginBottom: 'var(--spacing-xs)'
                                }}>
                                  {event.hora}
                                </span>
                              )}
                              {event.descripcion && (
                                <p style={{ margin: 'var(--spacing-sm) 0 0 0', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                  {event.descripcion}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: 'var(--spacing-xl)',
                    background: 'var(--color-background)',
                    borderRadius: '8px',
                    border: '1px dashed #C4B5A0'
                  }}>
                    <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
                      Aún no hay eventos programados para este taller
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Galería */}
            {activeTab === 'galeria' && (
              <div>
                {selectedAlbum ? (
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 'var(--spacing-sm)',
                      marginBottom: 'var(--spacing-lg)',
                      padding: 'var(--spacing-md)',
                      background: 'var(--color-background)',
                      borderRadius: '8px',
                      border: '1px solid #D4C4B5'
                    }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: 'var(--font-size-md)', fontWeight: '600' }}>
                          {selectedAlbum.name}
                        </h3>
                        <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
                          {gallery.length} {gallery.length === 1 ? 'archivo' : 'archivos'}
                        </p>
                      </div>
                      <button type="button" className="btn btn--outline" onClick={backToAlbums}>
                        Volver
                      </button>
                    </div>

                    {loadingGallery ? (
                      <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                        <p style={{ color: 'var(--color-text-light)' }}>Cargando álbum...</p>
                      </div>
                    ) : gallery.length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 'var(--spacing-md)'
                      }}>
                        {gallery.map((item, index) => (
                          <div
                            key={item.id}
                            style={{
                              position: 'relative',
                              border: '1px solid #D4C4B5',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              backgroundColor: 'white',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => openLightbox(index)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                              e.currentTarget.style.borderColor = '#A89074';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = 'none';
                              e.currentTarget.style.borderColor = '#D4C4B5';
                            }}
                          >
                            {item.tipo === 'imagen' ? (
                              <>
                                <img
                                  src={item.url}
                                  alt={item.fileName}
                                  style={{
                                    width: '100%',
                                    height: '180px',
                                    objectFit: 'cover',
                                    display: 'block'
                                  }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  top: 'var(--spacing-sm)',
                                  right: 'var(--spacing-sm)',
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: 'var(--font-size-xs)',
                                  fontWeight: '600'
                                }}>
                                  Foto
                                </div>
                              </>
                            ) : (
                              <>
                                <video
                                  src={item.url}
                                  style={{
                                    width: '100%',
                                    height: '180px',
                                    objectFit: 'cover',
                                    display: 'block'
                                  }}
                                />
                                <div style={{
                                  position: 'absolute',
                                  top: 'var(--spacing-sm)',
                                  right: 'var(--spacing-sm)',
                                  backgroundColor: 'rgba(0,0,0,0.7)',
                                  color: 'white',
                                  padding: '4px 8px',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: 'var(--font-size-xs)',
                                  fontWeight: '600'
                                }}>
                                  Video
                                </div>
                              </>
                            )}
                            <div style={{
                              padding: 'var(--spacing-sm)',
                              backgroundColor: 'white',
                              borderTop: '1px solid var(--border-color)'
                            }}>
                              <p style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--color-text-light)',
                                margin: 0,
                                textAlign: 'center'
                              }}>
                                {new Date(item.createdAt?.toDate ? item.createdAt.toDate() : item.createdAt).toLocaleDateString('es-AR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-xl)',
                        background: 'var(--color-background)',
                        borderRadius: '8px',
                        border: '1px dashed #C4B5A0'
                      }}>
                        <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
                          Este álbum aún no tiene archivos
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {loadingAlbums ? (
                      <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                        <p style={{ color: 'var(--color-text-light)' }}>Cargando álbumes...</p>
                      </div>
                    ) : albums.length > 0 ? (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: 'var(--spacing-lg)'
                      }}>
                        {albums.map(album => {
                          const createdAt = album.createdAt?.toDate ? album.createdAt.toDate() : new Date(album.createdAt);
                          const createdLabel = Number.isNaN(createdAt.getTime()) ? '' : createdAt.toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          });
                          return (
                            <div
                              key={album.id}
                              onClick={() => openAlbum(album)}
                              style={{
                                cursor: 'pointer',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                border: '1px solid #D4C4B5',
                                background: 'white',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                e.currentTarget.style.borderColor = '#A89074';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = 'none';
                                e.currentTarget.style.borderColor = '#D4C4B5';
                              }}
                            >
                              <div
                                style={{
                                  height: '160px',
                                  background: album.thumbUrl
                                    ? `url(${album.thumbUrl}) center/cover`
                                    : 'linear-gradient(135deg, var(--color-primary-soft) 0%, var(--color-accent-soft) 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  position: 'relative'
                                }}
                              />
                              <div style={{ padding: 'var(--spacing-md)' }}>
                                <h4 style={{
                                  margin: '0 0 var(--spacing-xs) 0',
                                  fontSize: 'var(--font-size-md)',
                                  fontWeight: '600',
                                  color: 'var(--color-text)'
                                }}>
                                  {album.name}
                                </h4>
                                {createdLabel && (
                                  <p style={{
                                    margin: 0,
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--color-text-light)'
                                  }}>
                                    {createdLabel}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: 'var(--spacing-xl)',
                        background: 'var(--color-background)',
                        borderRadius: '8px',
                        border: '1px dashed #C4B5A0'
                      }}>
                        <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
                          Aún no hay álbumes disponibles para este taller
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recursos' && (
              <div>
                {loadingResources ? (
                  <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                    <p style={{ color: 'var(--color-text-light)' }}>Cargando recursos...</p>
                  </div>
                ) : resourcePosts.length > 0 ? (
                  <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                    {resourcePosts.map((post) => {
                      const createdAt = post.createdAt?.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
                      const createdLabel = Number.isNaN(createdAt?.getTime?.()) ? '' : createdAt.toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });
                      const items = Array.isArray(post.items) ? post.items : [];

                      return (
                        <div
                          key={post.id}
                          style={{
                            padding: 'var(--spacing-md)',
                            border: '1px solid #D4C4B5',
                            borderLeft: '3px solid var(--color-primary)',
                            borderRadius: '8px',
                            background: 'white'
                          }}
                        >
                          <h4 style={{ margin: '0 0 var(--spacing-xs) 0' }}>{post.title}</h4>
                          {createdLabel && (
                            <p style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)' }}>
                              Publicado el {createdLabel}
                            </p>
                          )}
                          {post.description && (
                            <p style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: 'var(--font-size-sm)' }}>{post.description}</p>
                          )}

                          {items.length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 'var(--spacing-xs)' }}>
                              {items.map((item, index) => (
                                <li key={`${item.url || item.path || index}`}>
                                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                                    {item.kind === 'link' ? 'Link' : 'Archivo'}: {item.label || item.url}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
                              Sin elementos adjuntos.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: 'var(--spacing-xl)',
                    background: 'var(--color-background)',
                    borderRadius: '8px',
                    border: '1px dashed #C4B5A0'
                  }}>
                    <p style={{ margin: 0, color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
                      Aún no hay recursos publicados para este taller
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <InstitutionalLightbox
        isOpen={showLightbox}
        items={gallery}
        loading={loadingGallery}
        currentIndex={selectedMediaIndex}
        onPrev={showPrevMedia}
        onNext={showNextMedia}
        onClose={closeLightbox}
        title={selectedAlbum?.name || 'Galería'}
      />
    </div>
  );
}





