import { ROLES } from '../config/constants';

const SOCIAL_OPEN_ROLES = [ROLES.FAMILY, ROLES.DOCENTE, ROLES.TALLERISTA];
const SOCIAL_ADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.COORDINACION];

function normalizeUidList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

export function canAccessSocial({ role, uid, config }) {
  if (!role) return false;

  if (SOCIAL_ADMIN_ROLES.includes(role)) {
    return true;
  }

  const enabled = Boolean(config?.enabled);
  if (enabled && SOCIAL_OPEN_ROLES.includes(role)) {
    return true;
  }

  const pilotUids = normalizeUidList(config?.pilotFamilyUids);
  if (role === ROLES.FAMILY && uid && pilotUids.includes(String(uid))) {
    return true;
  }

  return false;
}

