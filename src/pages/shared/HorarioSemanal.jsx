import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

function hexToRgb(hexColor = '') {
  const cleanHex = hexColor.trim().replace(/^#/, '');

  if (!/^[0-9a-fA-F]{6}$/.test(cleanHex)) {
    return [25, 118, 210];
  }

  return [
    parseInt(cleanHex.slice(0, 2), 16),
    parseInt(cleanHex.slice(2, 4), 16),
    parseInt(cleanHex.slice(4, 6), 16)
  ];
}

function toSoftBackground([r, g, b], mixRatio = 0.88) {
  return [
    Math.round(r + (255 - r) * mixRatio),
    Math.round(g + (255 - g) * mixRatio),
    Math.round(b + (255 - b) * mixRatio)
  ];
}

export const HorarioSemanal = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [talleres, setTalleres] = useState([]);
  const [talleristas, setTalleristas] = useState([]);
  const [loading, setLoading] = useState(true);

  const canExportPdf = pathname.startsWith('/portal/');

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

  const buildPdfRows = useCallback(
    (ambiente) => {
      const rows = [];
      const slotMeta = [];

      BLOQUES_HORARIOS.forEach((bloque) => {
        const row = [bloque.label];
        const metaByDay = [];

        DIAS_SEMANA.forEach((dia) => {
          const taller = getTallerForSlot(ambiente, dia, bloque.id);

          if (!taller) {
            row.push('Ambiente');
            metaByDay.push({ occupied: false });
            return;
          }

          const slotColor = getTallerColor(taller.nombre);
          row.push(`${taller.nombre}\n${getTalleristaName(taller.talleristaId)}`);
          metaByDay.push({
            occupied: true,
            fillColor: toSoftBackground(hexToRgb(slotColor))
          });
        });

        rows.push(row);
        slotMeta.push(metaByDay);
      });

      return { rows, slotMeta };
    },
    [getTallerColor, getTallerForSlot, getTalleristaName]
  );

  const handleExportPdf = useCallback(
    (ambiente, titulo) => {
      const filename = buildFileName(titulo);
      const generatedAt = new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      try {
        const { rows, slotMeta } = buildPdfRows(ambiente);
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        const title = `${titulo} - Horario semanal`;
        const tableLeft = 12;
        const tableRight = 12;
        const availableWidth = 297 - tableLeft - tableRight;
        const timeColumnWidth = 30;
        const dayColumnWidth = (availableWidth - timeColumnWidth) / DIAS_SEMANA.length;

        const columnStyles = {
          0: {
            cellWidth: timeColumnWidth,
            halign: 'left',
            fontStyle: 'bold'
          }
        };

        DIAS_SEMANA.forEach((_, index) => {
          columnStyles[index + 1] = { cellWidth: dayColumnWidth };
        });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(30, 77, 80);
        doc.text(title, tableLeft, 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(107, 124, 125);
        doc.text(`Generado el ${generatedAt}`, tableLeft, 20);

        autoTable(doc, {
          startY: 24,
          margin: {
            left: tableLeft,
            right: tableRight,
            bottom: 12
          },
          head: [['Horario', ...DIAS_SEMANA]],
          body: rows,
          theme: 'grid',
          styles: {
            font: 'helvetica',
            fontSize: 9,
            textColor: [30, 77, 80],
            lineWidth: 0.2,
            lineColor: [212, 196, 181],
            cellPadding: {
              top: 1.7,
              right: 1.6,
              bottom: 1.7,
              left: 1.6
            },
            halign: 'center',
            valign: 'middle',
            overflow: 'linebreak'
          },
          headStyles: {
            fillColor: [229, 242, 243],
            textColor: [30, 77, 80],
            fontStyle: 'bold',
            lineWidth: 0.2,
            lineColor: [212, 196, 181]
          },
          bodyStyles: {
            minCellHeight: 14
          },
          columnStyles,
          didParseCell: (hookData) => {
            const { section, row, column, cell } = hookData;

            if (section === 'head' && column.index === 0) {
              cell.styles.halign = 'left';
            }

            if (section !== 'body') {
              return;
            }

            if (column.index === 0) {
              cell.styles.fillColor = [255, 255, 255];
              cell.styles.textColor = [30, 77, 80];
              cell.styles.fontStyle = 'bold';
              return;
            }

            const dayMeta = slotMeta[row.index]?.[column.index - 1];
            if (!dayMeta?.occupied) {
              cell.styles.fillColor = [255, 255, 255];
              cell.styles.textColor = [141, 152, 160];
              return;
            }

            cell.styles.fillColor = dayMeta.fillColor;
            cell.styles.textColor = [30, 77, 80];
          }
        });

        const totalPages = doc.getNumberOfPages();
        for (let page = 1; page <= totalPages; page += 1) {
          doc.setPage(page);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(107, 124, 125);
          doc.text(
            'Puerto Nuevo Montessori - Agenda semanal vigente',
            tableLeft,
            doc.internal.pageSize.getHeight() - 6
          );
        }

        doc.save(filename);
      } catch (_error) {
        window.alert('No se pudo generar el PDF en este navegador.');
      }
    },
    [buildPdfRows]
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

