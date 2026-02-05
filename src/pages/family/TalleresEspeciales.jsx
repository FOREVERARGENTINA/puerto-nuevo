import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { childrenService } from '../../services/children.service';
import { talleresService } from '../../services/talleres.service';
import { eventsService } from '../../services/events.service';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalHeader, ModalBody } from '../../components/common/Modal';

export function TalleresEspeciales() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(-1);
  const [showLightbox, setShowLightbox] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

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
    setSelectedAlbum(null);
    setGallery([]);
    setSelectedMediaIndex(-1);
    setShowLightbox(false);
    setActiveTab('info');
    setLoadingAlbums(true);
    const result = await talleresService.getAlbums(taller.id);
    if (result.success) {
      setAlbums(result.albums || []);
    } else {
      setAlbums([]);
    }
    setLoadingAlbums(false);

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

      {/* Selector de talleres */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 'var(--spacing-sm)',
        marginBottom: 'var(--spacing-lg)'
      }}>
        {talleres.map(t => (
          <div
            key={t.id}
            onClick={() => selectTaller(t)}
            style={{
              cursor: 'pointer',
              padding: 'var(--spacing-md)',
              background: selectedTaller?.id === t.id
                ? 'var(--color-primary-soft)'
                : 'white',
              border: selectedTaller?.id === t.id
                ? '2px solid var(--color-primary)'
                : '1px solid #D4C4B5',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (selectedTaller?.id !== t.id) {
                e.currentTarget.style.borderColor = '#A89074';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedTaller?.id !== t.id) {
                e.currentTarget.style.borderColor = '#D4C4B5';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {selectedTaller?.id === t.id && (
              <div style={{
                position: 'absolute',
                top: 'var(--spacing-sm)',
                right: 'var(--spacing-sm)',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--color-primary)'
              }} />
            )}
            <h3 style={{
              margin: '0 0 var(--spacing-xs) 0',
              fontSize: 'var(--font-size-sm)',
              fontWeight: '600',
              color: selectedTaller?.id === t.id ? 'var(--color-primary)' : 'var(--color-text)',
              paddingRight: 'var(--spacing-md)'
            }}>
              {t.nombre}
            </h3>
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-text-light)'
            }}>
              {t.ambiente === 'taller1' ? 'Taller 1' : 'Taller 2'}
            </div>
          </div>
        ))}
      </div>

      {/* Contenido del taller seleccionado */}
      {selectedTaller && (
        <div style={{
          background: 'white',
          border: '2px solid #D4C4B5',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {/* Tabs Navigation */}
          <div style={{
            display: 'flex',
            gap: '2px',
            padding: 'var(--spacing-md) var(--spacing-md) 0',
            background: '#F5F2ED'
          }}>
            <button
              onClick={() => setActiveTab('info')}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                background: activeTab === 'info' ? 'white' : 'transparent',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: activeTab === 'info' ? '600' : '500',
                color: activeTab === 'info' ? '#2C6B6F' : '#6B7C7D',
                transition: 'all 0.2s ease'
              }}
            >
              Información
            </button>
            <button
              onClick={() => setActiveTab('eventos')}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                background: activeTab === 'eventos' ? 'white' : 'transparent',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: activeTab === 'eventos' ? '600' : '500',
                color: activeTab === 'eventos' ? '#2C6B6F' : '#6B7C7D',
                transition: 'all 0.2s ease'
              }}
            >
              Eventos
            </button>
            <button
              onClick={() => setActiveTab('galeria')}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                background: activeTab === 'galeria' ? 'white' : 'transparent',
                border: 'none',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: activeTab === 'galeria' ? '600' : '500',
                color: activeTab === 'galeria' ? '#2C6B6F' : '#6B7C7D',
                transition: 'all 0.2s ease'
              }}
            >
              Galería
            </button>
          </div>

          <div style={{ padding: 'var(--spacing-lg)', background: 'white' }}>
            {/* Tab: Info */}
            {activeTab === 'info' && (
              <div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: 'var(--spacing-lg)',
                  marginBottom: selectedTaller.descripcion ? 'var(--spacing-lg)' : '0'
                }}>
                  {/* Horarios Card */}
                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-primary-soft)',
                    border: '1px solid #D4C4B5',
                    borderRadius: '8px'
                  }}>
                    <h3 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-primary)' }}>Horarios</h3>
                    {selectedTaller.horarios?.length > 0 ? (
                      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                        {selectedTaller.horarios.map((h, idx) => (
                          <span key={idx} style={{
                            padding: '6px 12px',
                            background: 'white',
                            color: 'var(--color-primary)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: '500'
                          }}>
                            {h.dia} {h.bloque}
                          </span>
                        ))}
                      </div>
                    ) : selectedTaller.horario ? (
                      <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                        {selectedTaller.horario.split(',').map((s, i) => (
                          <span key={i} style={{
                            padding: '6px 12px',
                            background: 'white',
                            color: 'var(--color-primary)',
                            border: '1px solid var(--color-primary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: '500'
                          }}>{s.trim()}</span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>No especificado</p>
                    )}
                  </div>

                  {/* Calendario Card */}
                  {selectedTaller.calendario && (
                    <div style={{
                      padding: 'var(--spacing-md)',
                      background: '#FFF9F0',
                      border: '1px solid #D4C4B5',
                      borderRadius: '8px'
                    }}>
                      <h3 style={{ margin: '0 0 var(--spacing-sm) 0', fontSize: 'var(--font-size-sm)', fontWeight: '600', color: 'var(--color-accent)' }}>Calendario</h3>
                      <a
                        href={selectedTaller.calendario}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn--primary"
                        style={{ width: '100%' }}
                      >
                        Descargar Calendario
                      </a>
                    </div>
                  )}
                </div>

                {/* Descripción */}
                {selectedTaller.descripcion && (
                  <div style={{
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-background)',
                    border: '1px solid #D4C4B5',
                    borderLeft: '3px solid var(--color-primary)',
                    borderRadius: '6px',
                    marginTop: 'var(--spacing-lg)'
                  }}>
                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', lineHeight: '1.6' }}>
                      {selectedTaller.descripcion}
                    </p>
                  </div>
                )}
              </div>
            )}

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
                      const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      });
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
          </div>
        </div>
      )}

      <GalleryLightbox
        isOpen={showLightbox}
        onClose={closeLightbox}
        items={gallery}
        currentIndex={selectedMediaIndex}
        onPrev={showPrevMedia}
        onNext={showNextMedia}
      />
    </div>
  );
}

// Lightbox modal for gallery
const GalleryLightbox = ({ isOpen, onClose, items, currentIndex, onPrev, onNext }) => {
  const item = items?.[currentIndex];
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrev();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onPrev, onNext]);

  if (!item) return null;

  const handleTouchStart = (event) => {
    if (!event.touches || event.touches.length === 0) return;
    setTouchEndX(null);
    setTouchStartX(event.touches[0].clientX);
  };

  const handleTouchMove = (event) => {
    if (!event.touches || event.touches.length === 0) return;
    setTouchEndX(event.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStartX === null || touchEndX === null) return;
    const delta = touchStartX - touchEndX;
    const minSwipe = 60;
    if (Math.abs(delta) < minSwipe) return;
    if (delta > 0) {
      onNext();
    } else {
      onPrev();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader title="Galería" onClose={onClose} />
      <ModalBody>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          <button className="btn btn--outline btn--sm" onClick={onPrev}>
            Anterior
          </button>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
            {currentIndex + 1} de {items.length}
          </span>
          <button className="btn btn--outline btn--sm" onClick={onNext}>
            Siguiente
          </button>
        </div>
        <div
          style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {item.tipo === 'video' ? (
            <video src={item.url} controls style={{ width: '100%', maxHeight: '70vh' }} />
          ) : (
            <img src={item.url} alt={item.fileName} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};




