import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { talleresService } from '../../services/talleres.service';
import { useNavigate } from 'react-router-dom';

export function MyTallerEspecial() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [talleres, setTalleres] = useState([]);
  const [selectedTaller, setSelectedTaller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    descripcion: '',
    horario: '',
    diasSemana: [],
    calendario: ''
  });

  const loadTalleres = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    const result = await talleresService.getTalleresByTallerista(user.uid);

    if (result.success) {
      setTalleres(result.talleres);
      if (result.talleres.length > 0 && !selectedTaller) {
        selectTaller(result.talleres[0]);
      }
    }
    setLoading(false);
  }, [user, selectedTaller]);

  const selectTaller = (taller) => {
    setSelectedTaller(taller);
    setFormData({
      descripcion: taller.descripcion || '',
      horario: taller.horario || '',
      diasSemana: taller.diasSemana || [],
      calendario: taller.calendario || ''
    });
    setEditing(false);
  };

  useEffect(() => {
    loadTalleres();
  }, [loadTalleres]);

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

    if (!selectedTaller?.id) return;

    const result = await talleresService.updateTaller(selectedTaller.id, formData);

    if (result.success) {
      alert('Taller actualizado correctamente');
      setEditing(false);
      loadTalleres();
    } else {
      alert('Error al actualizar: ' + result.error);
    }
  };

  const handleCancel = () => {
    setFormData({
      descripcion: selectedTaller.descripcion || '',
      horario: selectedTaller.horario || '',
      diasSemana: selectedTaller.diasSemana || [],
      calendario: selectedTaller.calendario || ''
    });
    setEditing(false);
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

  if (talleres.length === 0) {
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card__header">
            <h1 className="card__title">Mis Talleres Especiales</h1>
          </div>
          <div className="card__body">
            <div className="alert alert--warning">
              <strong>No tienes talleres asignados</strong>
              <p>Contacta con la dirección para que te asignen uno o más talleres especiales.</p>
            </div>
            <button onClick={() => navigate(-1)} className="btn btn--outline" style={{ marginTop: 'var(--spacing-md)' }}>
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  const diasSemanaOptions = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Mis Talleres Especiales</h1>
          <button onClick={() => navigate(-1)} className="btn btn--sm btn--outline">
            Volver
          </button>
        </div>

        <div className="card__body">
          {talleres.length > 1 && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label htmlFor="taller-select" style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 'bold' }}>
                Selecciona un taller:
              </label>
              <select
                id="taller-select"
                value={selectedTaller?.id || ''}
                onChange={(e) => {
                  const taller = talleres.find(t => t.id === e.target.value);
                  if (taller) selectTaller(taller);
                }}
                className="form-control"
                style={{ maxWidth: '400px' }}
              >
                {talleres.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedTaller && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', paddingBottom: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-color)' }}>
                <h2 style={{ margin: 0 }}>{selectedTaller.nombre}</h2>
                {!editing && (
                  <button onClick={() => setEditing(true)} className="btn btn--sm btn--primary">
                    Editar
                  </button>
                )}
              </div>
              {!editing ? (
                <div>
                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <h3>Descripción</h3>
                    <p>{selectedTaller.descripcion || 'Sin descripción'}</p>
                  </div>

                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <h3>Horario</h3>
                    <p>{selectedTaller.horario || 'No especificado'}</p>
                  </div>

                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <h3>Días de la semana</h3>
                    <p>{selectedTaller.diasSemana?.length > 0 ? selectedTaller.diasSemana.join(', ') : 'No especificado'}</p>
                  </div>

                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <h3>Calendario</h3>
                    {selectedTaller.calendario ? (
                      <div>
                        <a 
                          href={selectedTaller.calendario} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="btn btn--sm btn--primary"
                          style={{ marginRight: 'var(--spacing-sm)' }}
                        >
                          Descargar Calendario
                        </a>
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                          {selectedTaller.calendario}
                        </p>
                      </div>
                    ) : (
                      <p>No hay calendario disponible</p>
                    )}
                  </div>

                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <h3>Estado</h3>
                    <span className={`badge badge--${selectedTaller.estado === 'activo' ? 'success' : 'danger'}`}>
                      {selectedTaller.estado}
                    </span>
                  </div>

                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                    <h3>Ambiente</h3>
                    <p>{selectedTaller.ambiente === 'taller1' ? 'Taller 1 (6-9 años)' : selectedTaller.ambiente === 'taller2' ? 'Taller 2 (9-12 años)' : 'No asignado'}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
              <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  rows={4}
                  className="form-control"
                />
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
                <label htmlFor="calendario">URL del Calendario</label>
                <input
                  type="url"
                  id="calendario"
                  name="calendario"
                  value={formData.calendario}
                  onChange={handleInputChange}
                  placeholder="https://ejemplo.com/calendario.ics"
                  className="form-control"
                />
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>
                  URL de descarga del calendario (.ics, Google Calendar, etc.)
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <button type="submit" className="btn btn--primary">
                  Guardar cambios
                </button>
                <button type="button" onClick={handleCancel} className="btn btn--outline">
                  Cancelar
                </button>
              </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
