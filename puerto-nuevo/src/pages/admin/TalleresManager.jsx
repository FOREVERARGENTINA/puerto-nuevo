import { useState, useEffect } from 'react';
import { talleresService } from '../../services/talleres.service';
import { usersService } from '../../services/users.service';
import { useNavigate } from 'react-router-dom';

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
    horario: '',
    diasSemana: [],
    ambiente: ''
  });

  const loadTalleres = async () => {
    setLoading(true);
    const result = await talleresService.getAllTalleres();
    if (result.success) {
      setTalleres(result.talleres);
    } else {
      alert('Error al cargar talleres: ' + result.error);
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
      horario: '',
      diasSemana: [],
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
      horario: taller.horario || '',
      diasSemana: taller.diasSemana || [],
      ambiente: taller.ambiente || ''
    });
    setShowForm(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDaysChange = (day) => {
    setFormData(prev => ({
      ...prev,
      diasSemana: prev.diasSemana.includes(day)
        ? prev.diasSemana.filter(d => d !== day)
        : [...prev.diasSemana, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      alert('El nombre del taller es obligatorio');
      return;
    }

    if (!formData.talleristaId) {
      alert('Debes asignar un tallerista');
      return;
    }

    if (!formData.ambiente) {
      alert('Debes seleccionar un ambiente (Taller 1 o Taller 2)');
      return;
    }

    let result;
    if (editingTaller) {
      result = await talleresService.updateTaller(editingTaller.id, formData);
    } else {
      result = await talleresService.createTaller(formData);
    }

    if (result.success) {
      alert(editingTaller ? 'Taller actualizado exitosamente' : 'Taller creado exitosamente');
      resetForm();
      loadData();
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleDelete = async (tallerId) => {
    if (!window.confirm('¿Estás seguro de eliminar este taller? Esta acción no se puede deshacer.')) {
      return;
    }

    const result = await talleresService.deleteTaller(tallerId);
    if (result.success) {
      alert('Taller eliminado exitosamente');
      loadData();
    } else {
      alert('Error al eliminar: ' + result.error);
    }
  };

  const getTalleristaName = (talleristaUid) => {
    const tallerista = talleristas.find(t => t.id === talleristaUid);
    return tallerista?.email || 'No asignado';
  };

  const diasSemanaOptions = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

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
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Gestión de Talleres Especiales</h1>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            {!showForm && (
              <button onClick={handleCreate} className="btn btn--primary">
                Crear Taller
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
              <h2>{editingTaller ? 'Editar Taller' : 'Crear Nuevo Taller'}</h2>
              <form onSubmit={handleSubmit} style={{ marginTop: 'var(--spacing-md)' }}>
                <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <label htmlFor="nombre">Nombre del Taller *</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <label htmlFor="descripcion">Descripción</label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    rows={3}
                    className="form-control"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <label htmlFor="talleristaId">Tallerista Asignado *</label>
                  <select
                    id="talleristaId"
                    name="talleristaId"
                    value={formData.talleristaId}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  >
                    <option value="">Seleccionar tallerista...</option>
                    {talleristas.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <label htmlFor="horario">Horario</label>
                  <input
                    type="text"
                    id="horario"
                    name="horario"
                    value={formData.horario}
                    onChange={handleInputChange}
                    placeholder="Ej: 14:00 - 16:00"
                    className="form-control"
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <label>Días de la semana</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                    {diasSemanaOptions.map(day => (
                      <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                        <input
                          type="checkbox"
                          checked={formData.diasSemana.includes(day)}
                          onChange={() => handleDaysChange(day)}
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                  <label htmlFor="ambiente">Ambiente *</label>
                  <select
                    id="ambiente"
                    name="ambiente"
                    value={formData.ambiente}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  >
                    <option value="">Seleccionar ambiente...</option>
                    <option value="taller1">Taller 1 (6-9 años)</option>
                    <option value="taller2">Taller 2 (9-12 años)</option>
                  </select>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                    Este taller es para alumnos del Taller 1 o Taller 2
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
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
                  <p>No hay talleres creados. ¡Crea el primer taller!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                  {talleres.map(taller => (
                    <div key={taller.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ marginBottom: 'var(--spacing-xs)' }}>{taller.nombre}</h3>
                          {taller.descripcion && (
                            <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--spacing-sm)' }}>
                              {taller.descripcion}
                            </p>
                          )}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-sm)' }}>
                            <div>
                              <strong>Ambiente:</strong> {taller.ambiente === 'taller1' ? 'Taller 1 (6-9)' : taller.ambiente === 'taller2' ? 'Taller 2 (9-12)' : 'No asignado'}
                            </div>
                            <div>
                              <strong>Tallerista:</strong> {getTalleristaName(Array.isArray(taller.talleristaId) ? taller.talleristaId[0] : taller.talleristaId)}
                            </div>
                            {taller.horario && (
                              <div>
                                <strong>Horario:</strong> {taller.horario}
                              </div>
                            )}
                            {taller.diasSemana?.length > 0 && (
                              <div>
                                <strong>Días:</strong> {taller.diasSemana.join(', ')}
                              </div>
                            )}
                            <div>
                              <strong>Estado:</strong>{' '}
                              <span className={`badge badge--${taller.estado === 'activo' ? 'success' : 'danger'}`}>
                                {taller.estado}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
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
    </div>
  );
};

export default TalleresManager;
