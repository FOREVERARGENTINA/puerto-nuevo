import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { talleresService } from '../../services/talleres.service';
import { usersService } from '../../services/users.service';
import Icon from '../../components/ui/Icon';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes'];
const BLOQUES_HORARIOS = [
  { id: '08:30-09:30', label: '08:30 - 09:30' },
  { id: '09:30-10:30', label: '09:30 - 10:30' },
  { id: '10:30-11:30', label: '10:30 - 11:30' },
  { id: '11:30-12:30', label: '11:30 - 12:30' },
  { id: '13:30-14:30', label: '13:30 - 14:30' },
  { id: '14:30-15:30', label: '14:30 - 15:30' }
];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildFileName(label) {
  const normalized = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  const today = new Date().toLocaleDateString('sv-SE');
  return `horarios-${normalized || 'taller'}-${today}.pdf`;
}

export const HorarioSemanal = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [talleres, setTalleres] = useState([]);
  const [talleristas, setTalleristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const printFrameRef = useRef(null);
  const printCleanupTimerRef = useRef(null);

  const canExportPdf = pathname.startsWith('/admin/') || pathname.startsWith('/familia/');

  const ambientes = useMemo(
    () => [
      { id: 'taller1', label: 'Taller 1' },
      { id: 'taller2', label: 'Taller 2' }
    ],
    []
  );

  const talleristasById = useMemo(() => {
    const map = new Map();
    talleristas.forEach((tallerista) => {
      map.set(tallerista.id, tallerista);
    });
    return map;
  }, [talleristas]);

  const getTalleristaName = useCallback(
    (talleristaId) => {
      const id = Array.isArray(talleristaId) ? talleristaId[0] : talleristaId;
      const tallerista = id ? talleristasById.get(id) : null;
      return tallerista?.displayName || tallerista?.email || 'Tallerista';
    },
    [talleristasById]
  );

  const getTallerColor = useCallback((nombreTaller = '') => {
    const colors = {
      yoga: '#9c27b0',
      teatro: '#e91e63',
      'educaci\u00f3n f\u00edsica': '#ff9800',
      'ed. f\u00edsica': '#ff9800',
      'm\u00fasica': '#2196f3',
      arte: '#4caf50',
      'ingl\u00e9s': '#00bcd4',
      'computaci\u00f3n': '#607d8b'
    };

    const nombre = nombreTaller.toLowerCase();
    for (const [key, color] of Object.entries(colors)) {
      if (nombre.includes(key)) {
        return color;
      }
    }
    return '#1976d2';
  }, []);

  const getTallerForSlot = useCallback(
    (ambiente, dia, bloque) => {
      return talleres.find(
        (taller) =>
          taller.ambiente === ambiente &&
          taller.horarios?.some((h) => h.dia === dia && h.bloque === bloque)
      );
    },
    [talleres]
  );

  const buildPrintableTable = useCallback(
    (ambiente, titulo) => {
      const generatedAt = new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const headerCells = DIAS_SEMANA.map((dia) => `<th>${escapeHtml(dia)}</th>`).join('');

      const rows = BLOQUES_HORARIOS.map((bloque) => {
        const cells = DIAS_SEMANA.map((dia) => {
          const taller = getTallerForSlot(ambiente, dia, bloque.id);

          if (!taller) {
            return '<td class="is-empty">Ambiente</td>';
          }

          const color = getTallerColor(taller.nombre);
          const bgColor = `${color}1a`;

          return `
            <td class="is-occupied" style="--slot-color:${color}; --slot-bg:${bgColor};">
              <div class="slot-name">${escapeHtml(taller.nombre)}</div>
              <div class="slot-teacher">${escapeHtml(getTalleristaName(taller.talleristaId))}</div>
            </td>
          `;
        }).join('');

        return `
          <tr>
            <td class="time-cell">${escapeHtml(bloque.label)}</td>
            ${cells}
          </tr>
        `;
      }).join('');

      return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(buildFileName(titulo).replace(/\.pdf$/i, ''))}</title>
  <style>
    :root {
      --primary: #2C6B6F;
      --primary-dark: #1E4D50;
      --border: #D4C4B5;
      --bg: #F5F2ED;
      --bg-alt: #FFFFFF;
      --text: #1E4D50;
      --text-light: #6B7C7D;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--text);
      background: var(--bg);
    }
    .report {
      background: var(--bg-alt);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
    }
    .report__header {
      padding: 18px 20px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(135deg, #ffffff 0%, #fff9f0 100%);
    }
    .report__title {
      margin: 0;
      font-size: 22px;
      color: var(--primary-dark);
    }
    .report__subtitle {
      margin: 6px 0 0;
      font-size: 13px;
      color: var(--text-light);
    }
    .report__table-wrap {
      padding: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 13px;
    }
    th, td {
      border: 1px solid var(--border);
      padding: 10px 8px;
      text-align: center;
      vertical-align: middle;
      height: 82px;
    }
    th {
      background: #e5f2f3;
      color: var(--text);
      font-weight: 600;
      height: 44px;
    }
    .time-head, .time-cell {
      width: 128px;
      text-align: left;
      font-weight: 600;
      white-space: nowrap;
    }
    .time-cell {
      background: #fff;
      color: var(--text);
      border-right: 2px solid var(--border);
      height: 82px;
    }
    .is-empty {
      color: #8d98a0;
      background: #fff;
      font-weight: 500;
    }
    .is-occupied {
      background: var(--slot-bg, #eef6f5);
      border-left: 4px solid var(--slot-color, var(--primary));
    }
    .slot-name {
      font-weight: 600;
      color: var(--slot-color, var(--primary));
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .slot-teacher {
      color: var(--text-light);
      font-size: 12px;
      line-height: 1.2;
      font-weight: 500;
    }
    .report__footer {
      padding: 12px 16px;
      border-top: 1px solid var(--border);
      color: var(--text-light);
      font-size: 12px;
    }
    @page {
      size: landscape;
      margin: 12mm;
    }
    @media print {
      body {
        padding: 0;
        background: #fff;
      }
      .report {
        border: none;
        border-radius: 0;
      }
      th, td {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <article class="report">
    <header class="report__header">
      <h1 class="report__title">${escapeHtml(titulo)} - Horario semanal</h1>
      <p class="report__subtitle">Generado el ${escapeHtml(generatedAt)}</p>
    </header>
    <div class="report__table-wrap">
      <table>
        <thead>
          <tr>
            <th class="time-head">Horario</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
    <footer class="report__footer">Puerto Nuevo Montessori - Agenda semanal vigente</footer>
  </article>
</body>
</html>
      `;
    },
    [getTallerColor, getTallerForSlot, getTalleristaName]
  );

  const cleanupPrintFrame = useCallback(() => {
    if (printCleanupTimerRef.current) {
      window.clearTimeout(printCleanupTimerRef.current);
      printCleanupTimerRef.current = null;
    }

    if (printFrameRef.current) {
      printFrameRef.current.remove();
      printFrameRef.current = null;
    }
  }, []);

  const handleExportPdf = useCallback(
    (ambiente, titulo) => {
      cleanupPrintFrame();

      const printableHtml = buildPrintableTable(ambiente, titulo);
      const filename = buildFileName(titulo);

      const frame = document.createElement('iframe');
      frame.setAttribute('title', `Exportar ${titulo}`);
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.right = '0';
      frame.style.bottom = '0';
      frame.style.width = '0';
      frame.style.height = '0';
      frame.style.border = '0';
      frame.style.opacity = '0';
      frame.style.pointerEvents = 'none';
      frame.style.visibility = 'hidden';

      document.body.appendChild(frame);
      printFrameRef.current = frame;

      const printWindow = frame.contentWindow;
      if (!printWindow) {
        cleanupPrintFrame();
        window.alert('No se pudo iniciar la exportación en este navegador.');
        return;
      }

      let started = false;

      const triggerPrint = () => {
        if (started) {
          return;
        }

        started = true;

        try {
          if (printWindow.document) {
            printWindow.document.title = filename.replace(/\.pdf$/i, '');
          }

          printWindow.focus();
          printWindow.onafterprint = cleanupPrintFrame;
          printWindow.print();
          printCleanupTimerRef.current = window.setTimeout(cleanupPrintFrame, 60000);
        } catch (error) {
          cleanupPrintFrame();
          window.alert('No se pudo abrir el diálogo para guardar el PDF.');
        }
      };

      frame.onload = () => window.setTimeout(triggerPrint, 120);
      printWindow.document.open();
      printWindow.document.write(printableHtml);
      printWindow.document.close();
      window.setTimeout(triggerPrint, 260);
    },
    [buildPrintableTable, cleanupPrintFrame]
  );

  const loadData = useCallback(async () => {
    setLoading(true);

    const [talleresResult, talleristasResult] = await Promise.all([
      talleresService.getAllTalleres(),
      usersService.getUsersByRole('tallerista')
    ]);

    if (talleresResult.success) {
      setTalleres(talleresResult.talleres.filter((t) => t.estado === 'activo'));
    }

    if (talleristasResult.success) {
      setTalleristas(talleristasResult.users);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => cleanupPrintFrame, [cleanupPrintFrame]);

  const header = (
    <div className="dashboard-header dashboard-header--compact">
      <div>
        <h1 className="dashboard-title">Horario semanal</h1>
        <p className="dashboard-subtitle">Talleres y ambientes organizados por d\u00eda y horario.</p>
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
        <div className="card__body horario-semanal">
          {ambientes.map((ambiente) => (
            <section key={ambiente.id} className="horario-semanal__section">
              <div className="horario-semanal__section-header">
                <h2 className="horario-semanal__section-title">{ambiente.label}</h2>
                {canExportPdf && (
                  <button
                    type="button"
                    className="btn btn--outline btn--sm horario-semanal__export"
                    onClick={() => handleExportPdf(ambiente.id, ambiente.label)}
                  >
                    <Icon name="file" size={14} />
                    Guardar PDF
                  </button>
                )}
              </div>

              <div className="horario-semanal__table-wrap">
                <table className="horario-grid">
                  <thead>
                    <tr>
                      <th className="horario-grid__head-cell horario-grid__head-cell--time">Horario</th>
                      {DIAS_SEMANA.map((dia) => (
                        <th key={dia} className="horario-grid__head-cell">
                          {dia}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {BLOQUES_HORARIOS.map((bloque) => (
                      <tr key={bloque.id}>
                        <td className="horario-grid__time-cell">{bloque.label}</td>
                        {DIAS_SEMANA.map((dia) => {
                          const taller = getTallerForSlot(ambiente.id, dia, bloque.id);

                          if (!taller) {
                            return (
                              <td key={dia} className="horario-grid__cell horario-grid__cell--empty">
                                <span className="horario-slot__empty">Ambiente</span>
                              </td>
                            );
                          }

                          const slotColor = getTallerColor(taller.nombre);

                          return (
                            <td
                              key={dia}
                              className="horario-grid__cell horario-grid__cell--occupied"
                              style={{
                                '--slot-color': slotColor,
                                '--slot-bg': `${slotColor}15`
                              }}
                            >
                              <div className="horario-slot">
                                <div className="horario-slot__title">{taller.nombre}</div>
                                <div className="horario-slot__teacher">{getTalleristaName(taller.talleristaId)}</div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <div className="horario-semanal__legend">
            <h3 className="horario-semanal__legend-title">Leyenda</h3>
            <div className="horario-semanal__legend-items">
              <div className="horario-semanal__legend-item">
                <div className="horario-semanal__legend-box horario-semanal__legend-box--regular" />
                <span>Ambiente (clase regular)</span>
              </div>
              <div className="horario-semanal__legend-item">
                <div className="horario-semanal__legend-box horario-semanal__legend-box--special" />
                <span>Taller especial</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
