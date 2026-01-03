/**
 * Funciones auxiliares para manejo de fechas
 * Usadas en el sistema de notificaciones
 */

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
