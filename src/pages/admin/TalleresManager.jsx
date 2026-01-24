import { useState, useEffect } from 'react';
import { talleresService } from '../../services/talleres.service';
import { usersService } from '../../services/users.service';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';

const TalleresManager = () => {
  const navigate = useNavigate();
  const [talleres, setTalleres] = useState([]);
  const [talleristas, setTalleristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTaller, setEditingTaller] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    talleristaId: '',
    horarios: [], // Array de { dia, bloque }
    ambiente: ''
  });

  const confirmDialog = useDialog();
  const alertDialog = useDialog();

  const loadTalleres = async () => {
    setLoading(true);
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
    setLoading(false);
  };

  const loadTalleristas = async () => {
    const result = await usersService.getUsersByRole('tallerista');
    if (result.success) {
      setTalleristas(result.users);
    }
  };

  const loadData = async () => {
    await Promise.all([loadTalleres(), loadTalleristas()]);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      talleristaId: '',
      horarios: [],
      ambiente: ''
    });
    setEditingTaller(null);
    setShowForm(false);
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (taller) => {
    setEditingTaller(taller);
    const talleristaId = Array.isArray(taller.talleristaId) ? taller.talleristaId[0] : (taller.talleristaId || '');
    setFormData({
      nombre: taller.nombre || '',
      descripcion: taller.descripcion || '',
      talleristaId,
      horarios: taller.horarios || [],
      ambiente: taller.ambiente || ''
    });
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      // Si cambia el ambiente, limpiar horarios seleccionados para evitar conflictos
      if (name === 'ambiente' && prev.ambiente !== value) {
        return {
          ...prev,
          [name]: value,
          horarios: []
        };
      }
      return {
        ...prev,
        [name]: value
      };
    });
  };

  const handleHorarioToggle = (dia, bloque) => {
    setFormData(prev => {
      const horarioKey = `${dia}|${bloque}`;
      const exists = prev.horarios.some(h => `${h.dia}|${h.bloque}` === horarioKey);

      if (exists) {
        return {
          ...prev,
          horarios: prev.horarios.filter(h => `${h.dia}|${h.bloque}` !== horarioKey)
        };
      } else {
        return {
          ...prev,
          horarios: [...prev.horarios, { dia, bloque }]
        };
      }
    });
  };

  const isHorarioSelected = (dia, bloque) => {
    return formData.horarios.some(h => h.dia === dia && h.bloque === bloque);
  };

  const getHorarioOcupado = (dia, bloque) => {
    if (!formData.ambiente) return null;

    // Buscar talleres que ocupan este horario en el mismo ambiente (excluyendo el que estamos editando)
    return talleres.find(t =>
      t.ambiente === formData.ambiente &&
      t.id !== editingTaller?.id &&
      t.horarios?.some(h => h.dia === dia && h.bloque === bloque)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      alertDialog.openDialog({
        title: 'Campo Requerido',
        message: 'El nombre del taller es obligatorio',
        type: 'warning'
      });
      return;
    }

    if (!formData.talleristaId) {
      alertDialog.openDialog({
        title: 'Campo Requerido',
        message: 'Debes asignar un tallerista',
        type: 'warning'
      });
      return;
    }

    if (!formData.ambiente) {
      alertDialog.openDialog({
        title: 'Campo Requerido',
        message: 'Debes seleccionar un ambiente (Taller 1 o Taller 2)',
        type: 'warning'
      });
      return;
    }

    if (!formData.horarios || formData.horarios.length === 0) {
      alertDialog.openDialog({
        title: 'Campo Requerido',
        message: 'Debes seleccionar al menos un horario para el taller',
        type: 'warning'
      });
      return;
    }

    // Validar que no haya conflictos de horario
    const conflictos = formData.horarios.filter(horario => {
      const tallerConflicto = talleres.find(t =>
        t.ambiente === formData.ambiente &&
        t.id !== editingTaller?.id &&
        t.horarios?.some(h => h.dia === horario.dia && h.bloque === horario.bloque)
      );
      return tallerConflicto;
    });

    if (conflictos.length > 0) {
      alertDialog.openDialog({
        title: 'Conflicto de Horarios',
        message: 'Algunos horarios ya están ocupados por otros talleres. Por favor, revisa la matriz de horarios.',
        type: 'error'
      });
      return;
    }

    let result;
    if (editingTaller) {
      result = await talleresService.updateTaller(editingTaller.id, formData);
    } else {
      result = await talleresService.createTaller(formData);
    }

    if (result.success) {
      alertDialog.openDialog({
        title: 'Éxito',
        message: editingTaller ? 'Taller actualizado correctamente' : 'Taller creado correctamente',
        type: 'success'
      });
      resetForm();
      loadData();
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: 'Error: ' + result.error,
        type: 'error'
      });
    }
  };

  const handleDelete = async (tallerId) => {
    confirmDialog.openDialog({
      title: 'Eliminar Taller',
      message: '¿Estás seguro de eliminar este taller? Esta acción no se puede deshacer.',
      type: 'danger',
      onConfirm: async () => {
        const result = await talleresService.deleteTaller(tallerId);
        if (result.success) {
          alertDialog.openDialog({
            title: 'Éxito',
            message: 'Taller eliminado correctamente',
            type: 'success'
          });
          loadData();
        } else {
          alertDialog.openDialog({
            title: 'Error',
            message: 'Error al eliminar: ' + result.error,
            type: 'error'
          });
        }
      }
    });
  };

  const getTalleristaName = (talleristaUid) => {
    const tallerista = talleristas.find(t => t.id === talleristaUid);
    return tallerista?.email || 'No asignado';
  };

  const diasSemanaOptions = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  const bloquesHorariosOptions = [
    { id: '08:30-09:30', label: '08:30 - 09:30' },
    { id: '09:30-10:30', label: '09:30 - 10:30' },
    { id: '10:30-11:30', label: '10:30 - 11:30' },
    { id: '11:30-12:30', label: '11:30 - 12:30' },
    { id: '13:30-14:30', label: '13:30 - 14:30' },
    { id: '14:30-15:30', label: '14:30 - 15:30' }
  ];

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card__body">
            <p>Cargando talleres...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div className={showForm ? 'card card--compact' : 'card'}>
        <div className={showForm ? 'card__header card__header--compact' : 'card__header'}>
          <div>
            <h1 className="card__title">Gestión de Talleres</h1>
            <p className="card__subtitle">Crea talleres y asigna horarios.</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            {!showForm && (
              <button onClick={handleCreate} className="btn btn--primary">
                Crear taller
              </button>
            )}
            <button onClick={() => navigate(-1)} className="btn btn--outline">
              Volver
            </button>
          </div>
        </div>

        <div className="card__body">
          {showForm ? (
            <div>
              <div className="talleres-form__intro">
                <h2>
                  {editingTaller ? 'Editar taller' : 'Nuevo taller'}
                </h2>
                <p className="card__subtitle">
                  Define datos, tallerista y horarios.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="talleres-form talleres-form--compact">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                  <div className="form-group">
                    <label htmlFor="nombre">Nombre del taller *</label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="Robótica, Yoga, Teatro"
                      required
                    />
                    <p className="form-help">Se verá en el calendario y en los paneles de familias y talleristas.</p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="talleristaId">Tallerista asignado *</label>
                    <select
                      id="talleristaId"
                      name="talleristaId"
                      value={formData.talleristaId}
                      onChange={handleInputChange}
                      className="form-select"
                      required
                    >
                      <option value="">Seleccionar tallerista...</option>
                      {talleristas.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.email}
                        </option>
                      ))}
                    </select>
                    <p className="form-help">La persona asignada podrá editar la ficha y la galería del taller.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    rows={2}
                    className="form-textarea"
                    placeholder="Breve resumen de objetivos y dinámica."
                  />
                  <p className="form-help">Visible para familias y talleristas.</p>
                </div>

                <div className="form-group">
                  <label htmlFor="ambiente">Ambiente *</label>
                  <select
                    id="ambiente"
                    name="ambiente"
                    value={formData.ambiente}
                    onChange={handleInputChange}
                    className="form-select"
                    required
                    style={{ maxWidth: '300px' }}
                  >
                    <option value="">Seleccionar ambiente...</option>
                    <option value="taller1">Taller 1</option>
                    <option value="taller2">Taller 2</option>
                  </select>
                  <p className="form-help">Define el grupo que asiste. Los horarios se bloquean por ambiente.</p>
                </div>

                <div className="form-group">
                  <label>Horarios del taller *</label>
                  <p className="form-help" style={{ marginBottom: 'var(--spacing-xs)' }}>
                    Marca los bloques disponibles. Los ocupados aparecen en rojo.
                  </p>
                  {!formData.ambiente && (
                    <div className="alert alert--warning">
                      <strong>Selecciona un ambiente para habilitar la grilla.</strong>
                      <span style={{ display: 'block', marginTop: '2px', fontSize: 'var(--font-size-xs)' }}>
                        Así evitamos cruces entre talleres del mismo grupo.
                      </span>
                    </div>
                  )}
                  <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-sm)' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderBottom: '2px solid var(--color-border)', backgroundColor: 'var(--color-primary-soft)', fontWeight: '600', textAlign: 'left', color: 'var(--color-text)' }}>
                            Horario
                          </th>
                          {diasSemanaOptions.map(dia => (
                            <th key={dia} style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderBottom: '2px solid var(--color-border)', borderLeft: '1px solid var(--color-border)', backgroundColor: 'var(--color-primary-soft)', fontWeight: '600', textAlign: 'center', minWidth: '90px', color: 'var(--color-text)' }}>
                              {dia.substring(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bloquesHorariosOptions.map((bloque, index) => (
                          <tr key={bloque.id} style={{ backgroundColor: index % 2 === 0 ? 'var(--color-background)' : 'var(--color-background-alt)' }}>
                            <td style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', borderRight: '2px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', fontWeight: '600', whiteSpace: 'nowrap', color: 'var(--color-text)' }}>
                              {bloque.label}
                            </td>
                            {diasSemanaOptions.map(dia => {
                              const tallerOcupado = getHorarioOcupado(dia, bloque.id);
                              const seleccionado = isHorarioSelected(dia, bloque.id);

                              return (
                                <td key={dia} style={{
                                  padding: 'var(--spacing-xs)',
                                  borderLeft: '1px solid var(--color-border)',
                                  borderBottom: '1px solid var(--color-border)',
                                  textAlign: 'center',
                                  backgroundColor: tallerOcupado ? '#fee' : (seleccionado ? 'var(--color-primary-soft)' : 'transparent'),
                                  position: 'relative',
                                  minHeight: '40px'
                                }}>
                                  {tallerOcupado ? (
                                    <div style={{ fontSize: 'var(--font-size-xs)', padding: 'var(--spacing-xs)' }} title={`Ocupado por: ${tallerOcupado.nombre}`}>
                                      <div style={{ fontWeight: '700', marginBottom: '4px', fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>Ocupado</div>
                                      <div style={{ fontSize: '10px', fontWeight: '600', color: '#666' }}>{tallerOcupado.nombre}</div>
                                    </div>
                                  ) : (
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: formData.ambiente ? 'pointer' : 'not-allowed', minHeight: '32px' }}>
                                      <input
                                        type="checkbox"
                                        checked={seleccionado}
                                        onChange={() => handleHorarioToggle(dia, bloque.id)}
                                        disabled={!formData.ambiente}
                                        style={{ cursor: formData.ambiente ? 'pointer' : 'not-allowed', width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                                        title={!formData.ambiente ? 'Primero selecciona un ambiente' : 'Marcar este horario'}
                                      />
                                    </label>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {formData.horarios.length > 0 && (
                    <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-xs)', backgroundColor: 'var(--color-primary-soft)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary)' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: '600' }}>
                        Total: {formData.horarios.length} horario{formData.horarios.length !== 1 ? 's' : ''} seleccionado{formData.horarios.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
                  <button type="submit" className="btn btn--primary">
                    {editingTaller ? 'Actualizar' : 'Crear'}
                  </button>
                  <button type="button" onClick={resetForm} className="btn btn--outline">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div>
              {talleres.length === 0 ? (
                <div className="alert alert--info">
                  <p>Aún no hay talleres creados. Crea el primero para comenzar.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                  {talleres.map(taller => (
                    <div key={taller.id} className="card" style={{ padding: 'var(--spacing-md)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--font-size-md)' }}>{taller.nombre}</h3>
                            <span className={`badge badge--${taller.estado === 'activo' ? 'success' : 'danger'}`}>
                              {taller.estado}
                            </span>
                          </div>
                          {taller.descripcion && (
                            <p style={{ color: 'var(--color-text-light)', margin: 'var(--spacing-xs) 0', fontSize: 'var(--font-size-sm)' }}>
                              {taller.descripcion}
                            </p>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-xs) var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                            <div>
                              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Ambiente:</span>{' '}
                              {taller.ambiente === 'taller1' ? 'Taller 1' : taller.ambiente === 'taller2' ? 'Taller 2' : 'No asignado'}
                            </div>
                            <div>
                              <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Tallerista:</span>{' '}
                              {getTalleristaName(Array.isArray(taller.talleristaId) ? taller.talleristaId[0] : taller.talleristaId)}
                            </div>
                            {taller.horarios?.length > 0 && (
                              <div title={taller.horarios.map(h => `${h.dia} ${h.bloque.replace('-', ' - ')}`).join(', ')}>
                                <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>Horarios:</span>{' '}
                                {taller.horarios.length} bloque{taller.horarios.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => handleEdit(taller)}
                            className="btn btn--sm btn--primary"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(taller.id)}
                            className="btn btn--sm btn--danger"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.closeDialog}
        onConfirm={confirmDialog.dialogData.onConfirm}
        title={confirmDialog.dialogData.title}
        message={confirmDialog.dialogData.message}
        type={confirmDialog.dialogData.type}
      />

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

export default TalleresManager;
