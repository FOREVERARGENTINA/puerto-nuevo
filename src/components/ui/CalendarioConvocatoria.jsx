import { useState, useMemo } from 'react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
const DAY_NAMES = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const toDayKey = (date) => {
  const d = date?.toDate ? date.toDate() : new Date(date);
  if (!d || Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const getInitialMonth = (dias) => {
  if (!dias?.length) return new Date();
  const dates = dias
    .map((d) => (d.fecha?.toDate ? d.fecha.toDate() : new Date(d.fecha)))
    .filter((d) => d && !Number.isNaN(d.getTime()));
  if (!dates.length) return new Date();
  dates.sort((a, b) => a - b);
  return new Date(dates[0].getFullYear(), dates[0].getMonth(), 1);
};

const getDaysInMonth = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const days = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  return days;
};

/**
 * CalendarioConvocatoria — grid mensual reutilizable para Clases Abiertas.
 *
 * Props:
 *   dias         — array de días de la convocatoria (cada uno con .id y .fecha Timestamp)
 *   selectedDiaId — id del día seleccionado actualmente
 *   onSelectDia  — fn(dia | null) llamada al clickear un día con evento; null al deseleccionar
 *   marcadores   — Map<diaId, 'inscripto' | 'completo' | 'disponible'> (opcional)
 */
export default function CalendarioConvocatoria({ dias = [], selectedDiaId, onSelectDia, marcadores }) {
  const [currentDate, setCurrentDate] = useState(() => getInitialMonth(dias));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const diasDelMes = useMemo(() => {
    const map = new Map();
    dias.forEach((dia) => {
      const key = toDayKey(dia.fecha);
      if (!key) return;
      const d = dia.fecha?.toDate ? dia.fecha.toDate() : new Date(dia.fecha);
      if (d.getFullYear() === year && d.getMonth() === month) {
        map.set(d.getDate(), dia);
      }
    });
    return map;
  }, [dias, year, month]);

  const cells = getDaysInMonth(year, month);
  const today = new Date();
  const isToday = (day) =>
    day && today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

  const getMarker = (dia) => {
    if (!dia || !marcadores) return null;
    return marcadores.get(dia.id) || null;
  };

  const selectedDia = dias.find((d) => d.id === selectedDiaId) || null;

  const handleClick = (day) => {
    if (!day) return;
    const dia = diasDelMes.get(day);
    if (!dia) return;
    if (dia.id === selectedDiaId) { onSelectDia(null); return; }
    onSelectDia(dia);
  };

  return (
    <div className="event-calendar">
      <div className="event-calendar__header">
        <button
          className="event-calendar__nav-btn"
          aria-label="Mes anterior"
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
        >
          ‹
        </button>
        <div className="event-calendar__month">{MONTH_NAMES[month]} {year}</div>
        <div className="event-calendar__actions">
          <button
            className="event-calendar__nav-btn"
            aria-label="Mes siguiente"
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            ›
          </button>
          <button
            className="event-calendar__today-btn"
            type="button"
            onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}
          >
            Hoy
          </button>
        </div>
      </div>

      <div className="event-calendar__weekdays">
        {DAY_NAMES.map((n, i) => (
          <div key={i} className="event-calendar__weekday">{n}</div>
        ))}
      </div>

      <div className="event-calendar__days">
        {cells.map((day, idx) => {
          const dia = day ? diasDelMes.get(day) : null;
          const marker = getMarker(dia);
          const isSelected = dia && dia.id === selectedDiaId;
          const hasDia = Boolean(dia);

          const classes = [
            'event-calendar__day',
            day ? 'event-calendar__day--active' : 'event-calendar__day--empty',
            hasDia ? 'event-calendar__day--has-event' : '',
            marker === 'inscripto' ? 'event-calendar__day--has-upcoming-event' : '',
            marker === 'completo' ? 'event-calendar__day--has-past-event' : '',
            marker === 'disponible' ? 'event-calendar__day--has-upcoming-event' : '',
            isSelected ? 'event-calendar__day--selected' : '',
            isToday(day) ? 'event-calendar__day--today' : ''
          ].filter(Boolean).join(' ');

          return (
            <div
              key={idx}
              className={classes}
              style={hasDia ? { cursor: 'pointer' } : undefined}
              onClick={() => handleClick(day)}
            >
              {day}
            </div>
          );
        })}
      </div>

      {selectedDia && (
        <div style={{ marginTop: 'var(--spacing-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-light)', textAlign: 'center' }}>
          {(() => {
            const d = selectedDia.fecha?.toDate ? selectedDia.fecha.toDate() : new Date(selectedDia.fecha);
            return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
          })()}
          {selectedDia.horario && ` · ${selectedDia.horario}`}
        </div>
      )}
    </div>
  );
}
