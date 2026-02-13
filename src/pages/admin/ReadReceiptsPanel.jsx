import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import { communicationsService } from '../../services/communications.service';
import { readReceiptsService } from '../../services/readReceipts.service';
import { usersService } from '../../services/users.service';
import { ROLES } from '../../config/constants';

export function ReadReceiptsPanel() {
  const navigate = useNavigate();
  const [communications, setCommunications] = useState([]);
  const [selectedComm, setSelectedComm] = useState(null);
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Nuevos estados para tabla profesional
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [communicationsWithStats, setCommunicationsWithStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Nuevos estados para filtro por familia
  const [allFamilies, setAllFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState('all');
  const [loadingFamilies, setLoadingFamilies] = useState(false);

  // Filtros adicionales
  const [filterType, setFilterType] = useState('all');
  const [filterAmbiente, setFilterAmbiente] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadCommunications();
    loadFamilies();
  }, []);

  const loadFamilies = async () => {
    setLoadingFamilies(true);
    try {
      const result = await usersService.getUsersByRole(ROLES.FAMILY);
      if (result.success) {
        setAllFamilies(result.users);
      }
    } catch (err) {
      console.error('Error cargando familias:', err);
    } finally {
      setLoadingFamilies(false);
    }
  };

  const loadCommunications = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await communicationsService.getAllCommunications(200);
      if (result.success) {
        // Mostrar todos los comunicados (no solo los que requieren lectura obligatoria)
        setCommunications(result.communications);
        loadAllStats(result.communications);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllStats = async (comms) => {
    setLoadingStats(true);
    try {
      const statsPromises = comms.map(async (comm) => {
        if (!comm.destinatarios || comm.destinatarios.length === 0) {
          return {
            ...comm,
            statsData: { total: 0, leidos: 0, pendientes: 0, porcentaje: 0 },
            familyStats: {}
          };
        }

        // Obtener usuarios y filtrar solo familias
        const usersPromises = comm.destinatarios.map(uid => usersService.getUserById(uid));
        const usersResults = await Promise.all(usersPromises);
        const allUsers = usersResults.filter(r => r.success).map(r => r.user);
        const familyUsers = allUsers.filter(u => u.role === 'family');
        const familyUIDs = familyUsers.map(u => u.id);

        if (familyUIDs.length === 0) {
          return {
            ...comm,
            statsData: { total: 0, leidos: 0, pendientes: 0, porcentaje: 0 },
            familyStats: {}
          };
        }

        // Obtener estadísticas generales
        const statsResult = await readReceiptsService.getReadStats(comm.id, familyUIDs);

        // Obtener quién leyó (para estadísticas por familia)
        const pendingResult = await readReceiptsService.getPendingUsers(comm.id, familyUIDs);
        const pendingUIDs = pendingResult.success ? pendingResult.pendingUserIds : [];

        // Crear mapa de estadísticas por familia
        const familyStats = {};
        familyUIDs.forEach(uid => {
          familyStats[uid] = !pendingUIDs.includes(uid);
        });

        return {
          ...comm,
          statsData: statsResult.success ? statsResult.stats : { total: 0, leidos: 0, pendientes: 0, porcentaje: 0 },
          familyStats
        };
      });

      const commsWithStats = await Promise.all(statsPromises);
      setCommunicationsWithStats(commsWithStats);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadDetailForCommunication = async (comm) => {
    setSelectedComm(comm);
    setStats(comm.statsData);
    setPendingUsers([]);
    setShowDetailModal(true);

    // Si no tenemos el nombre del remitente, intentar cargarlo desde usuarios
    if (!comm.sentByDisplayName && comm.sentBy) {
      try {
        const senderRes = await usersService.getUserById(comm.sentBy);
        if (senderRes.success) {
          setSelectedComm(prev => ({ ...prev, sentByDisplayName: senderRes.user.displayName || senderRes.user.email || '-' }));
        } else {
          setSelectedComm(prev => ({ ...prev, sentByDisplayName: '-' }));
        }
      } catch (err) {
        console.error('Error cargando remitente:', err);
      }
    }

    if (!comm.destinatarios || comm.destinatarios.length === 0) {
      return;
    }

    try {
      // Cargar usuarios pendientes
      const usersPromises = comm.destinatarios.map(uid => usersService.getUserById(uid));
      const usersResults = await Promise.all(usersPromises);
      const allUsers = usersResults.filter(r => r.success).map(r => r.user);
      const familyUsers = allUsers.filter(u => u.role === 'family');
      const familyUIDs = familyUsers.map(u => u.id);

      const pendingResult = await readReceiptsService.getPendingUsers(comm.id, familyUIDs);
      if (pendingResult.success) {
        const pendingUIDs = pendingResult.pendingUserIds;
        const pendingFamilies = familyUsers.filter(u => pendingUIDs.includes(u.id));
        setPendingUsers(pendingFamilies);
      }
    } catch (err) {
      console.error('Error cargando usuarios pendientes:', err);
    }
  };

  // Filtrado por búsqueda y familia
  const filteredCommunications = useMemo(() => {
    let filtered = communicationsWithStats.filter(comm =>
      comm.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filtrar por familia seleccionada
    if (selectedFamilyId !== 'all') {
      filtered = filtered.filter(comm => {
        // Solo mostrar comunicados donde esta familia es destinataria
        return comm.destinatarios && comm.destinatarios.includes(selectedFamilyId);
      });
    }

    // Filtrar por tipo
    if (filterType !== 'all') {
      filtered = filtered.filter(comm => comm.type === filterType);
    }

    // Filtrar por ambiente/taller
    if (filterAmbiente !== 'all') {
      filtered = filtered.filter(comm => comm.ambiente === filterAmbiente);
    }

    // Filtrar por estado de lectura
    if (filterStatus !== 'all') {
      filtered = filtered.filter(comm => {
        const stats = getStatsForFamily(comm);
        const percentage = stats?.porcentaje || 0;
        
        if (filterStatus === 'complete') return percentage === 100;
        if (filterStatus === 'progress') return percentage > 0 && percentage < 100;
        if (filterStatus === 'pending') return percentage === 0;
        return true;
      });
    }

    return filtered;
  }, [communicationsWithStats, searchTerm, selectedFamilyId, filterType, filterAmbiente, filterStatus]);

  // Ordenamiento
  const sortedCommunications = useMemo(() => {
    const sorted = [...filteredCommunications];
    sorted.sort((a, b) => {
      let compareA, compareB;

      switch (sortBy) {
        case 'title':
          compareA = a.title.toLowerCase();
          compareB = b.title.toLowerCase();
          break;
        case 'createdAt':
          compareA = a.createdAt?.toDate() || new Date(0);
          compareB = b.createdAt?.toDate() || new Date(0);
          break;
        case 'type':
          compareA = a.type || '';
          compareB = b.type || '';
          break;
        case 'percentage':
          // Si hay familia seleccionada, ordenar por estado de lectura de esa familia
          if (selectedFamilyId !== 'all') {
            compareA = a.familyStats?.[selectedFamilyId] ? 100 : 0;
            compareB = b.familyStats?.[selectedFamilyId] ? 100 : 0;
          } else {
            compareA = a.statsData?.porcentaje || 0;
            compareB = b.statsData?.porcentaje || 0;
          }
          break;
        case 'pendientes':
          compareA = a.statsData?.pendientes || 0;
          compareB = b.statsData?.pendientes || 0;
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredCommunications, sortBy, sortOrder, selectedFamilyId]);

  // Paginación
  const totalPages = Math.ceil(sortedCommunications.length / itemsPerPage);
  const paginatedCommunications = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedCommunications.slice(start, start + itemsPerPage);
  }, [sortedCommunications, currentPage, itemsPerPage]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFamilyChange = (e) => {
    setSelectedFamilyId(e.target.value);
    setCurrentPage(1); // Resetear a primera página
  };

  const getTypeLabel = (type) => {
    const labels = {
      'global': 'Global',
      'ambiente': 'Ambiente',
      'taller': 'Taller',
      'individual': 'Individual'
    };
    return labels[type] || type;
  };

  const getTypeBadgeClass = (type) => {
    const classes = {
      'global': 'badge--info',
      'ambiente': 'badge--warning',
      'taller': 'badge--success',
      'individual': 'badge--primary'
    };
    return `badge ${classes[type] || ''}`;
  };

  const getStatusBadge = (percentage) => {
    if (percentage === 100) return <span className="badge badge--success">Completo</span>;
    if (percentage >= 50) return <span className="badge badge--warning">En progreso</span>;
    return <span className="badge badge--error">Pendiente</span>;
  };

  // Obtener estadísticas para familia seleccionada
  function getStatsForFamily(comm) {
    if (selectedFamilyId === 'all') {
      return comm.statsData;
    }

    // Stats individuales de la familia
    const hasRead = comm.familyStats?.[selectedFamilyId];
    return {
      total: 1,
      leidos: hasRead ? 1 : 0,
      pendientes: hasRead ? 0 : 1,
      porcentaje: hasRead ? 100 : 0
    };
  }

  if (loading) {
    return (
      <div className="container page-container">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <div className="spinner spinner--lg"></div>
          <p style={{ marginTop: 'var(--spacing-md)' }}>Cargando comunicados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container page-container">
        <div className="alert alert--error">Error: {error}</div>
      </div>
    );
  }

  const hasFilters = searchTerm !== '' || filterType !== 'all' || filterAmbiente !== 'all' || filterStatus !== 'all' || selectedFamilyId !== 'all';

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('all');
    setFilterAmbiente('all');
    setFilterStatus('all');
    setSelectedFamilyId('all');
    setCurrentPage(1);
  };

  const selectedFamily = allFamilies.find(f => f.id === selectedFamilyId);

  return (
    <>
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Comunicados</h1>
          <p className="dashboard-subtitle">Confirmaciones de lectura y detalle por familia</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <span className="badge badge--info">{communications.length} comunicados</span>
          <button className="btn btn--primary" onClick={() => navigate('/portal/admin/comunicar/nuevo')}>
            Crear comunicado
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          {communications.length === 0 ? (
            <div className="alert alert--info">
              No hay comunicados aún.
            </div>
          ) : (
            <>
              {/* Filtros Toolbar */}
              <div className="user-toolbar">
                <div className="user-toolbar__left">
                  <div className="user-toolbar__summary">
                    <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: 'var(--font-size-sm)', flexWrap: 'wrap' }}>
                      <strong>Total:</strong> {filteredCommunications.length}
                      {filteredCommunications.length === 1 ? ' resultado' : ' resultados'}
                      {selectedFamilyId !== 'all' && selectedFamily && (
                        <>
                          <span style={{ color: 'var(--color-text-light)' }}>·</span>
                          <span>Mostrando para <strong>{selectedFamily.displayName || selectedFamily.email}</strong></span>
                        </>
                      )}
                      {loadingStats && (
                        <>
                          <span style={{ color: 'var(--color-text-light)' }}>·</span>
                          <span className="text-spin" style={{ color: 'var(--color-text-light)' }}>Cargando estadísticas...</span>
                        </>
                      )}
                    </p>
                    <input
                      id="search"
                      type="text"
                      className="form-input form-input--sm"
                      placeholder="Buscar por título..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      style={{ width: 240 }}
                    />
                  </div>

                  <div className="user-filter">
                    <label htmlFor="type-filter">Tipo</label>
                    <select
                      id="type-filter"
                      className="form-input form-input--sm"
                      value={filterType}
                      onChange={(e) => {
                        setFilterType(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">Todos</option>
                      <option value="global">Global</option>
                      <option value="ambiente">Ambiente</option>
                      <option value="individual">Individual</option>
                    </select>
                  </div>

                  <div className="user-filter">
                    <label htmlFor="ambiente-filter">Taller</label>
                    <select
                      id="ambiente-filter"
                      className="form-input form-input--sm"
                      value={filterAmbiente}
                      onChange={(e) => {
                        setFilterAmbiente(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">Todos</option>
                      <option value="taller1">Taller 1</option>
                      <option value="taller2">Taller 2</option>
                    </select>
                  </div>

                  <div className="user-filter">
                    <label htmlFor="status-filter">Estado</label>
                    <select
                      id="status-filter"
                      className="form-input form-input--sm"
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="all">Todos</option>
                      <option value="complete">Completo</option>
                      <option value="progress">En progreso</option>
                      <option value="pending">Pendiente</option>
                    </select>
                  </div>

                  <div className="user-filter">
                    <label htmlFor="family-filter">Familia</label>
                    <select
                      id="family-filter"
                      className="form-input form-input--sm"
                      value={selectedFamilyId}
                      onChange={handleFamilyChange}
                      disabled={loadingFamilies}
                      style={{ maxWidth: 180 }}
                    >
                      <option value="all">Todas</option>
                      {allFamilies.map(family => (
                        <option key={family.id} value={family.id}>
                          {family.displayName || family.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {hasFilters && (
                    <button type="button" className="btn btn--sm btn--outline" onClick={handleClearFilters}>
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Tabla */}
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th
                        onClick={() => handleSort('title')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        Título {sortBy === 'title' && (sortOrder === 'asc' ? 'ASC' : 'DESC')}
                      </th>
                      <th
                        onClick={() => handleSort('createdAt')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        Fecha {sortBy === 'createdAt' && (sortOrder === 'asc' ? 'ASC' : 'DESC')}
                      </th>
                      <th
                        onClick={() => handleSort('type')}
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                      >
                        Tipo {sortBy === 'type' && (sortOrder === 'asc' ? 'ASC' : 'DESC')}
                      </th>
                      {selectedFamilyId === 'all' && (
                        <>
                          <th style={{ textAlign: 'center' }}>Total</th>
                          <th style={{ textAlign: 'center' }}>Leídos</th>
                          <th
                            onClick={() => handleSort('pendientes')}
                            style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                          >
                            Pendientes {sortBy === 'pendientes' && (sortOrder === 'asc' ? 'ASC' : 'DESC')}
                          </th>
                        </>
                      )}
                      <th
                        onClick={() => handleSort('percentage')}
                        style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}
                      >
                        {selectedFamilyId === 'all' ? 'Progreso' : 'Estado'} {sortBy === 'percentage' && (sortOrder === 'asc' ? 'ASC' : 'DESC')}
                      </th>
                      {selectedFamilyId === 'all' && <th style={{ textAlign: 'center' }}>Estado</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCommunications.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
                          No se encontraron comunicados
                        </td>
                      </tr>
                    ) : (
                      paginatedCommunications.map(comm => {
                        const displayStats = getStatsForFamily(comm);
                        return (
                          <tr
                            key={comm.id}
                            onClick={() => loadDetailForCommunication(comm)}
                            style={{ cursor: 'pointer' }}
                            className="table-row-hoverable"
                          >
                            <td>
                              <strong>{comm.title}</strong>
                            </td>
                            <td>
                              {comm.createdAt ? new Date(comm.createdAt.toDate()).toLocaleDateString('es-AR') : '-'}
                            </td>
                            <td>
                              <span className={getTypeBadgeClass(comm.type)}>
                                {getTypeLabel(comm.type)}
                              </span>
                            </td>
                            {selectedFamilyId === 'all' && (
                              <>
                                <td style={{ textAlign: 'center' }}>
                                  {displayStats.total || 0}
                                </td>
                                <td style={{ textAlign: 'center', color: 'var(--color-success)' }}>
                                  {displayStats.leidos || 0}
                                </td>
                                <td style={{ textAlign: 'center', color: 'var(--color-error)' }}>
                                  {displayStats.pendientes || 0}
                                </td>
                              </>
                            )}
                            <td style={{ textAlign: 'center' }}>
                              {selectedFamilyId === 'all' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                                  <div style={{
                                    flex: 1,
                                    height: '8px',
                                    backgroundColor: 'var(--color-border)',
                                    borderRadius: 'var(--radius-full)',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      width: `${displayStats.porcentaje || 0}%`,
                                      height: '100%',
                                      backgroundColor: displayStats.porcentaje === 100
                                        ? 'var(--color-success)'
                                        : displayStats.porcentaje >= 50
                                        ? 'var(--color-warning)'
                                        : 'var(--color-error)',
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </div>
                                  <span style={{ fontSize: 'var(--font-size-sm)', minWidth: '40px' }}>
                                    {displayStats.porcentaje || 0}%
                                  </span>
                                </div>
                              ) : (
                                displayStats.porcentaje === 100
                                  ? <span className="badge badge--success">Leído</span>
                                  : <span className="badge badge--error">Pendiente</span>
                              )}
                            </td>
                            {selectedFamilyId === 'all' && (
                              <td style={{ textAlign: 'center' }}>
                                {getStatusBadge(displayStats.porcentaje || 0)}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  marginTop: 'var(--spacing-lg)',
                  flexWrap: 'wrap'
                }}>
                  <button
                    className="btn btn--sm btn--outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </button>

                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                      ) {
                        return (
                          <button
                            key={page}
                            className={`btn btn--sm ${page === currentPage ? 'btn--primary' : 'btn--outline'}`}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 3 || page === currentPage + 3) {
                        return <span key={page} style={{ padding: '0 var(--spacing-xs)' }}>...</span>;
                      }
                      return null;
                    })}
                  </div>

                  <button
                    className="btn btn--sm btn--outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal de Detalle */}
      {showDetailModal && selectedComm && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2>{selectedComm.title}</h2>
              <button
                className="modal-close"
                onClick={() => setShowDetailModal(false)}
                aria-label="Cerrar"
              >
                X
              </button>
            </div>

            <div className="modal-body">
              {/* Contenido del comunicado */}
              <div style={{
                backgroundColor: 'var(--color-background-warm)',
                padding: 'var(--spacing-sm) var(--spacing-md)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-md)',
                borderLeft: '4px solid var(--color-primary)'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-xs)', fontSize: 'var(--font-size-md)' }}>
                  Contenido del Comunicado
                </h3>
                <p style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 'var(--line-height-relaxed)',
                  margin: 0,
                  fontSize: 'var(--font-size-sm)'
                }}>
                  {selectedComm.body}
                </p>

                {selectedComm.attachments && selectedComm.attachments.length > 0 && (
                  <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
                    <strong style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>Archivos adjuntos:</strong>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {selectedComm.attachments.map((att, idx) => (
                        <li key={idx} style={{ marginBottom: 'var(--spacing-xs)' }}>
                          <a
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn--text"
                            style={{ padding: 'var(--spacing-xs) 0' }}
                            title={att.name || `Archivo adjunto ${idx + 1}`}
                          >
                            <Icon name="file" size={16} />
                            {`Archivo adjunto ${idx + 1}`}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{
                  marginTop: 'var(--spacing-sm)',
                  paddingTop: 'var(--spacing-sm)',
                  borderTop: '1px solid var(--color-border)',
                  display: 'flex',
                  gap: 'var(--spacing-sm)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-light)'
                }}>
                  <span className={getTypeBadgeClass(selectedComm.type)}>
                    {getTypeLabel(selectedComm.type)}
                  </span>
                  {selectedComm.createdAt && (
                    <span>
                      Enviado: {new Date(selectedComm.createdAt.toDate()).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                      <span style={{ marginLeft: '0.5rem', fontWeight: 500, color: 'var(--color-text-light)' }}>
                        - Enviado por {selectedComm.sentByDisplayName || selectedComm.sentBy || '-' }
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Estadísticas */}
              {stats && (
                <>
                  <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)' }}>
                    Estadísticas de Lectura
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-sm)', backgroundColor: 'var(--color-background-warm)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold' }}>
                        {stats.total}
                      </div>
                      <div style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-xs)' }}>Total</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-sm)', backgroundColor: '#f0fdf4', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--color-success)' }}>
                        {stats.leidos}
                      </div>
                      <div style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-xs)' }}>Leídos</div>
                    </div>
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-sm)', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'bold', color: 'var(--color-error)' }}>
                        {stats.pendientes}
                      </div>
                      <div style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-xs)' }}>Pendientes</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <div style={{
                      width: '100%',
                      height: '24px',
                      backgroundColor: 'var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${stats.porcentaje}%`,
                        height: '100%',
                        backgroundColor: stats.porcentaje === 100
                          ? 'var(--color-success)'
                          : stats.porcentaje >= 50
                          ? 'var(--color-warning)'
                          : 'var(--color-error)',
                        transition: 'width 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: 'var(--font-size-xs)'
                      }}>
                        {stats.porcentaje > 10 && `${stats.porcentaje}%`}
                      </div>
                    </div>
                    {stats.porcentaje <= 10 && (
                      <div style={{ textAlign: 'center', marginTop: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)' }}>
                        {stats.porcentaje}% leído
                      </div>
                    )}
                  </div>
                </>
              )}

              {pendingUsers.length > 0 && (
                <>
                  <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)' }}>
                    Familias Pendientes ({pendingUsers.length})
                  </h3>
                  <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingUsers.map(user => (
                          <tr key={user.id}>
                            <td>{user.displayName || 'Sin nombre'}</td>
                            <td>{user.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {pendingUsers.length === 0 && stats?.pendientes === 0 && (
                <div className="alert alert--success">
                  Todas las familias han leído este comunicado
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn--outline"
                onClick={() => setShowDetailModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}


