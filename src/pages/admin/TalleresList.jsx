import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { talleresService } from '../../services/talleres.service';
import { usersService } from '../../services/users.service';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import Icon from '../../components/ui/Icon';

const TalleresList = () => {
  const navigate = useNavigate();
  const alertDialog = useDialog();
  const [talleres, setTalleres] = useState([]);
  const [talleristas, setTalleristas] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTalleres = async () => {
    const result = await talleresService.getAllTalleres();
    if (result.success) {
      setTalleres(result.talleres);
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: 'Error al cargar talleres: ' + result.error,
        type: 'error'
      });
    }
  };

  const loadTalleristas = async () => {
    const result = await usersService.getUsersByRole('tallerista');
    if (result.success) {
      setTalleristas(result.users);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadTalleres(), loadTalleristas()]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getTalleristaName = (talleristaUid) => {
    const tallerista = talleristas.find(t => t.id === talleristaUid);
    return tallerista?.email || 'No asignado';
  };



  const header = (
    <div className="dashboard-header dashboard-header--compact">
      <div>
        <h1 className="dashboard-title">Talleres</h1>
        <p className="dashboard-subtitle">Listado y acceso a la configuración de cada taller.</p>
      </div>
      <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
        <button onClick={() => navigate('/portal/admin/talleres/nuevo')} className="btn btn--primary">
          Crear taller
        </button>
        <button onClick={() => navigate(-1)} className="btn btn--outline btn--back">
          <Icon name="chevron-left" size={16} />
          Volver
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container page-container">
        {header}
        <div className="card">
          <div className="card__body">
            <p>Cargando talleres...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-container">
      {header}
      <div className="card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Talleres creados</h2>
            <p className="card__subtitle">Selecciona un taller para ver configuración, eventos y galería.</p>
          </div>
        </div>
        <div className="card__body">
          {talleres.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 'var(--spacing-xl)',
              background: 'var(--color-background)',
              borderRadius: '8px',
              border: '1px dashed #C4B5A0'
            }}>
              <p style={{ margin: 0, color: 'var(--color-text-light)' }}>
                Aún no hay talleres creados. Crea el primero para comenzar.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 'var(--spacing-sm)'
            }}>
              {talleres.map(taller => {
                return (
                  <div
                    key={taller.id}
                    onClick={() => navigate(`/portal/admin/talleres/${taller.id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/portal/admin/talleres/${taller.id}`);
                      }
                    }}
                    style={{
                      padding: 'var(--spacing-sm)',
                      background: 'white',
                      border: '1px solid #D4C4B5',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#A89074';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#D4C4B5';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Header con título y estado */}
                    <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-xs)' }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: 'var(--font-size-sm)',
                          fontWeight: '600',
                          color: 'var(--color-text)',
                          flex: 1
                        }}>
                          {taller.nombre}
                        </h3>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          background: taller.estado === 'activo' ? 'var(--color-success)' : 'var(--color-error)',
                          color: 'white',
                          whiteSpace: 'nowrap'
                        }}>
                          {taller.estado === 'activo' ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>

                    {/* Metadata: Ambiente y Tallerista */}
                    <div style={{ marginBottom: 'var(--spacing-xs)', display: 'grid', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--color-text-light)',
                          fontWeight: '500',
                          minWidth: '60px'
                        }}>
                          Ambiente:
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--color-text)',
                          fontWeight: '600',
                          padding: '2px 6px',
                          background: 'var(--color-background)',
                          borderRadius: '4px'
                        }}>
                          {taller.ambiente === 'taller1' ? 'Taller 1' : taller.ambiente === 'taller2' ? 'Taller 2' : 'No asignado'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--color-text-light)',
                          fontWeight: '500',
                          minWidth: '60px'
                        }}>
                          Tallerista:
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--color-text)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {getTalleristaName(Array.isArray(taller.talleristaId) ? taller.talleristaId[0] : taller.talleristaId)}
                        </span>
                      </div>
                    </div>

                    {/* Descripción */}
                    {taller.descripcion && (
                      <p style={{
                        color: 'var(--color-text-light)',
                        margin: '0 0 var(--spacing-xs) 0',
                        fontSize: '11px',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {taller.descripcion}
                      </p>
                    )}

                    {/* Horarios */}
                    {taller.horarios?.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: '10px',
                          color: 'var(--color-text-light)',
                          marginBottom: '4px',
                          fontWeight: '500',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Horarios ({taller.horarios.length})
                        </div>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px'
                        }}>
                          {taller.horarios.slice(0, 5).map((h, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '10px',
                                padding: '2px 5px',
                                backgroundColor: 'var(--color-primary-soft)',
                                borderRadius: '3px',
                                color: 'var(--color-primary)',
                                fontWeight: '600',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {h.dia.substring(0, 3)} {h.bloque.substring(0, 5)}
                            </span>
                          ))}
                          {taller.horarios.length > 5 && (
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 5px',
                              color: 'var(--color-text-light)',
                              fontWeight: '600'
                            }}>
                              +{taller.horarios.length - 5}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={alertDialog.closeDialog}
        title={alertDialog.dialogData.title}
        message={alertDialog.dialogData.message}
        type={alertDialog.dialogData.type}
      />
    </div>
  );
};

export default TalleresList;

