import { ROLES } from '../config/constants';

function normalizeUidList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

/**
 * Determina si un usuario puede acceder a los DMs familia-familia.
 * Solo rol family, nunca docentes ni coordinacion.
 * Mientras enabled == false, solo los UIDs del piloto tienen acceso.
 */
export function canAccessDMs({ role, uid, config }) {
  if (role !== ROLES.FAMILY) return false;
  if (!uid) return false;

  const enabled = Boolean(config?.enabled);
  if (enabled) return true;

  const pilotUids = normalizeUidList(config?.pilotFamilyUids);
  return pilotUids.includes(String(uid));
}
