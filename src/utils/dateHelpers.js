/**
 * Funciones auxiliares para manejo de fechas
 * Usadas en el sistema de notificaciones
 */
const BUENOS_AIRES_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/**
 * Verifica si una fecha está dentro de las próximas 24 horas
 * @param {Date|Timestamp} date - Fecha a verificar
 * @returns {boolean}
 */
export function isNext24Hours(date) {
  const now = new Date();
  const target = date instanceof Date ? date : date.toDate();
  const diff = target - now;
  return diff > 0 && diff <= 24 * 60 * 60 * 1000;
}

/**
 * Verifica si una fecha está dentro de las próximas 48 horas
 * @param {Date|Timestamp} date - Fecha a verificar
 * @returns {boolean}
 */
export function isNext48Hours(date) {
  const now = new Date();
  const target = date instanceof Date ? date : date.toDate();
  const diff = target - now;
  return diff > 0 && diff <= 48 * 60 * 60 * 1000;
}

/**
 * Formatea una fecha como tiempo relativo
 * @param {Date|Timestamp} date - Fecha a formatear
 * @returns {string} - Ej: "Hace 2 horas", "Ayer", "Hace 3 días"
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const target = date instanceof Date ? date : date.toDate();
  const diff = Math.abs(now - target);
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(hours / 24);

  if (hours < 1) return 'Hace menos de 1 hora';
  if (hours < 24) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}

/**
 * Verifica si una fecha es futura
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean}
 */
export function isFutureDate(date) {
  const now = new Date();
  const target = typeof date === 'string' ? new Date(date) : date;
  return target > now;
}

/**
 * Formatea una fecha ISO a formato legible español
 * @param {string} isoDate - Fecha en formato ISO (YYYY-MM-DD)
 * @returns {string} - Ej: "15 de enero"
 */
export function formatISODate(isoDate) {
  const date = new Date(isoDate + 'T12:00:00'); // Agregar hora para evitar timezone issues
  const options = { day: 'numeric', month: 'long' };
  return date.toLocaleDateString('es-AR', options);
}

/**
 * Formatea fecha y hora en zona horaria de Buenos Aires (UTC-3) y formato 24h.
 * @param {Date|Timestamp|string|number} dateValue - Fecha a formatear
 * @param {Intl.DateTimeFormatOptions} [options] - Opciones extra de formato
 * @returns {string}
 */
export function formatDateTimeBuenosAires(dateValue, options = {}) {
  if (!dateValue) return '';

  const date = dateValue instanceof Date
    ? dateValue
    : typeof dateValue?.toDate === 'function'
      ? dateValue.toDate()
      : new Date(dateValue);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('es-AR', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: BUENOS_AIRES_TIME_ZONE,
    ...options
  });
}
