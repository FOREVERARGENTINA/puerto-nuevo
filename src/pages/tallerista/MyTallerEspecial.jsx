import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { talleresService } from '../../services/talleres.service';
import { useNavigate } from 'react-router-dom';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import Icon from '../../components/ui/Icon';

export function MyTallerEspecial() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [talleres, setTalleres] = useState([]);
  const [selectedTaller, setSelectedTaller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ descripcion: '', horario: '', diasSemana: [], calendario: '' });

  const alertDialog = useDialog();

  function selectTaller(taller) {
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
      diasSemana = taller.diasSemana
        .map(d => d.trim())
        .filter(d => d && !seen.has(d) && (seen.add(d), true))
        .sort((a, b) => (dayOrder[a] || 99) - (dayOrder[b] || 99));
    }

    const horario = taller.horario || (normalizedHorarios.length > 0 ? Array.from(new Set(normalizedHorarios.map(h => h.bloque))).join(', ') : '');
    const calendario = taller.calendario || taller.calendar || '';
    const tallerAug = { ...taller, horarios: normalizedHorarios, diasSemana, horario, calendario };

    setSelectedTaller(tallerAug);
    setFormData({
      descripcion: tallerAug.descripcion || '',
      horario: tallerAug.horario || '',
      diasSemana: tallerAug.diasSemana || [],
      calendario: tallerAug.calendario || ''
    });
    setEditing(false);
  }

  const loadTalleres = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    const result = await talleresService.getTalleresByTallerista(user.uid);
    if (result.success) {
      setTalleres(result.talleres);
      if (result.talleres.length > 0 && !selectedTaller) selectTaller(result.talleres[0]);
    }
    setLoading(false);
  }, [user, selectedTaller]);

  useEffect(() => { loadTalleres(); }, [loadTalleres]);

  const handleInputChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleDaysChange = (day) => { setFormData(prev => ({ ...prev, diasSemana: prev.diasSemana.includes(day) ? prev.diasSemana.filter(d => d !== day) : [...prev.diasSemana, day] })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTaller?.id) return;
    if (!isAdmin) { alertDialog.openDialog({ title: 'Permisos', message: 'Solo admin/coordinación puede editar', type: 'warning' }); return; }
    const result = await talleresService.updateTaller(selectedTaller.id, formData);
    if (result.success) { alertDialog.openDialog({ title: 'Éxito', message: 'Taller actualizado correctamente', type: 'success' }); setEditing(false); loadTalleres(); }
    else { alertDialog.openDialog({ title: 'Error', message: 'Error al actualizar: ' + result.error, type: 'error' }); }
  };

  const handleCancel = () => { setFormData({ descripcion: selectedTaller.descripcion || '', horario: selectedTaller.horario || '', diasSemana: selectedTaller.diasSemana || [], calendario: selectedTaller.calendario || '' }); setEditing(false); };

  const header = (
    <div className="dashboard-header dashboard-header--compact">
      <div>
        <h1 className="dashboard-title">Mis talleres</h1>
        <p className="dashboard-subtitle">Revisá y actualizá la información del taller.</p>
      </div>
      <button onClick={() => navigate(-1)} className="btn btn--outline btn--back">
        <Icon name="chevron-left" size={16} />
        Volver
      </button>
    </div>
  );

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
  if (!talleres || talleres.length === 0) {
    return (
      <div className="container page-container">
        {header}
        <div className="card">
          <div className="card__body">
            <div className="alert alert--warning">
              <strong>No tienes talleres asignados</strong>
              <p>Contacta con la dirección para que te asignen uno o más talleres.</p>
            </div></div>
        </div>
      </div>
    );
  }

  const diasSemanaOptions = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

  return (
    <div className="container page-container">
      {header}
      <div className="card">
        
        <div className="card__body">
          {talleres.length > 1 && (<div style={{ marginBottom: 'var(--spacing-lg)' }}><label htmlFor="taller-select" style={{ display: 'block', marginBottom: 'var(--spacing-xs)', fontWeight: 'bold' }}>Selecciona un taller:</label><select id="taller-select" value={selectedTaller?.id || ''} onChange={(e) => { const t = talleres.find(x => x.id === e.target.value); if (t) selectTaller(t); }} className="form-control" style={{ maxWidth: '400px' }}>{talleres.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>)}

          {selectedTaller && (
            <div>
              <div className="taller-header-row" style={{ marginBottom: 'var(--spacing-md)', paddingBottom: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <h2 className="taller-title">{selectedTaller.nombre}</h2>
                  <p style={{ margin: '6px 0 0', color: 'var(--color-text-secondary)' }}>{selectedTaller.ambiente === 'taller1' ? 'Taller 1' : selectedTaller.ambiente === 'taller2' ? 'Taller 2' : 'No asignado'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}><span className={`badge badge--${selectedTaller.estado === 'activo' ? 'success' : 'danger'}`}>{selectedTaller.estado}</span>{isAdmin && !editing && <button onClick={() => setEditing(true)} className="btn btn--sm btn--primary">Editar</button>}</div>
              </div>

              {!editing ? (
                <div>
                  <h3>Descripción</h3>
                  <p style={{ lineHeight: 1.6, color: 'var(--color-text)' }}>{selectedTaller.descripcion || 'Sin descripción'}</p>
                  <h3>Días y Horarios</h3>
                  {selectedTaller.horarios?.length > 0 ? (<div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>{selectedTaller.horarios.map((h, idx) => <span key={idx} className="chip">{h.dia} • {h.bloque}</span>)}</div>) : selectedTaller.horario ? (<div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>{selectedTaller.horario.split(',').map((s,i) => <span key={i} className="chip">{s.trim()}</span>)}</div>) : <p>No especificado</p>}
                  <h3>Calendario</h3>
                  {selectedTaller.calendario ? (<div><a href={selectedTaller.calendario} target="_blank" rel="noopener noreferrer" className="btn btn--sm btn--primary" style={{ marginRight: 'var(--spacing-sm)' }}>Descargar Calendario</a><p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)', wordBreak: 'break-all' }}>{selectedTaller.calendario}</p></div>) : <p>No hay calendario disponible</p>}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}><label htmlFor="descripcion">Descripción</label><textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows={4} className="form-control" /></div>
                  <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}><label htmlFor="horario">Horario</label><input type="text" id="horario" name="horario" value={formData.horario} onChange={handleInputChange} placeholder="Ej: 14:00 - 16:00" className="form-control" /></div>
                  <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}><label>Días de la semana</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>{diasSemanaOptions.map(day => <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}><input type="checkbox" checked={formData.diasSemana.includes(day)} onChange={() => handleDaysChange(day)} />{day}</label>)}</div></div>
                  <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}><label htmlFor="calendario">URL del Calendario</label><input type="url" id="calendario" name="calendario" value={formData.calendario} onChange={handleInputChange} placeholder="https://ejemplo.com/calendario.ics" className="form-control" /><p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>URL de descarga del calendario (.ics, Google Calendar, etc.)</p></div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}><button type="submit" className="btn btn--primary">Guardar cambios</button><button type="button" onClick={handleCancel} className="btn btn--outline">Cancelar</button></div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
      <AlertDialog isOpen={alertDialog.isOpen} onClose={alertDialog.closeDialog} title={alertDialog.dialogData.title} message={alertDialog.dialogData.message} type={alertDialog.dialogData.type} />
    </div>
  );
}








