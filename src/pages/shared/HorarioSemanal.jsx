import { useState, useEffect } from 'react';
import { talleresService } from '../../services/talleres.service';
import { usersService } from '../../services/users.service';
import { useNavigate } from 'react-router-dom';

export const HorarioSemanal = () => {
  const navigate = useNavigate();
  const [talleres, setTalleres] = useState([]);
  const [talleristas, setTalleristas] = useState([]);
  const [loading, setLoading] = useState(true);

  const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const bloquesHorarios = [
    { id: '08:30-09:30', label: '08:30 - 09:30' },
    { id: '09:30-10:30', label: '09:30 - 10:30' },
    { id: '10:30-11:30', label: '10:30 - 11:30' },
    { id: '11:30-12:30', label: '11:30 - 12:30' },
    { id: '13:30-14:30', label: '13:30 - 14:30' },
    { id: '14:30-15:30', label: '14:30 - 15:30' }
  ];
  async function loadData() {
    setLoading(true);
    const [talleresResult, talleristasResult] = await Promise.all([
      talleresService.getAllTalleres(),
      usersService.getUsersByRole('tallerista')
    ]);

    if (talleresResult.success) {
      setTalleres(talleresResult.talleres.filter(t => t.estado === 'activo'));
    }

    if (talleristasResult.success) {
      setTalleristas(talleristasResult.users);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  
  const header = (
    <div className="dashboard-header dashboard-header--compact">
      <div>
        <h1 className="dashboard-title">Horario semanal</h1>
        <p className="dashboard-subtitle">Talleres y ambientes organizados por día y horario.</p>
      </div>
      <button onClick={() => navigate(-1)} className="btn btn--outline">
        Volver
      </button>
    </div>
  );


  const getTalleristaName = (talleristaId) => {
    const id = Array.isArray(talleristaId) ? talleristaId[0] : talleristaId;
    const tallerista = talleristas.find(t => t.id === id);
    return tallerista?.displayName || tallerista?.email || 'Tallerista';
  };

  const getTallerForSlot = (ambiente, dia, bloque) => {
    return talleres.find(taller =>
      taller.ambiente === ambiente &&
      taller.horarios?.some(h => h.dia === dia && h.bloque === bloque)
    );
  };

  const getTallerColor = (nombreTaller) => {
    const colors = {
      'yoga': '#9c27b0',
      'teatro': '#e91e63',
      'educación física': '#ff9800',
      'ed. física': '#ff9800',
      'música': '#2196f3',
      'arte': '#4caf50',
      'inglés': '#00bcd4',
      'computación': '#607d8b'
    };

    const nombre = nombreTaller.toLowerCase();
    for (const [key, color] of Object.entries(colors)) {
      if (nombre.includes(key)) {
        return color;
      }
    }
    return '#1976d2'; // Color por defecto
  };

  const renderCalendar = (ambiente, titulo) => {
    return (
      <div style={{ marginBottom: 'var(--spacing-xl)' }}>
        <h2 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-primary)' }}>{titulo}</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{
                  padding: 'var(--spacing-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-primary-soft)',
                  fontWeight: '600',
                  width: '120px',
                  color: 'var(--color-text)',
                  fontSize: 'var(--font-size-sm)',
                  textAlign: 'left',
                  borderBottom: '2px solid var(--color-primary)'
                }}>
                  Horario
                </th>
                {diasSemana.map(dia => (
                  <th key={dia} style={{
                    padding: 'var(--spacing-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-primary-soft)',
                    fontWeight: '600',
                    color: 'var(--color-text)',
                    fontSize: 'var(--font-size-sm)',
                    textAlign: 'center',
                    borderBottom: '2px solid var(--color-primary)'
                  }}>
                    {dia}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloquesHorarios.map(bloque => (
                <tr key={bloque.id}>
                  <td style={{
                    padding: 'var(--spacing-sm)',
                    border: '1px solid var(--color-border)',
                    fontWeight: '600',
                    backgroundColor: 'var(--color-background-alt)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text)',
                    borderRight: '2px solid var(--color-border)',
                    whiteSpace: 'nowrap'
                  }}>
                    {bloque.label}
                  </td>
                  {diasSemana.map(dia => {
                    const taller = getTallerForSlot(ambiente, dia, bloque.id);

                    if (taller) {
                      return (
                        <td key={dia} style={{
                          padding: 'var(--spacing-sm)',
                          border: '1px solid var(--color-border)',
                          backgroundColor: getTallerColor(taller.nombre) + '15',
                          borderLeft: `4px solid ${getTallerColor(taller.nombre)}`,
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 'var(--font-size-sm)' }}>
                            <div style={{ fontWeight: '600', marginBottom: 'var(--spacing-xs)', color: getTallerColor(taller.nombre) }}>
                              {taller.nombre}
                            </div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: '#666', fontWeight: '500' }}>
                              {getTalleristaName(taller.talleristaId)}
                            </div>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={dia} style={{
                        padding: 'var(--spacing-sm)',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-background-alt)',
                        textAlign: 'center',
                        color: '#999',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: '500'
                      }}>
                        Ambiente
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container page-container">
        {header}
        <div className="card">
          <div className="card__body">
            <p>Cargando horarios...</p>
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
          {renderCalendar('taller1', 'Taller 1')}
          {renderCalendar('taller2', 'Taller 2')}

          <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-sm)', fontSize: 'var(--font-size-md)' }}>Leyenda</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: 'var(--color-background-alt)', border: '1px solid var(--color-border)' }}></div>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Ambiente (clase regular)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                <div style={{ width: '20px', height: '20px', backgroundColor: 'var(--color-primary-soft)', borderLeft: '4px solid var(--color-primary)' }}></div>
                <span style={{ fontSize: 'var(--font-size-sm)' }}>Taller especial</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};




