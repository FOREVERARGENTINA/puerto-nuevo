import { ROLES } from '../config/constants';

export const normalizeRole = (value) => {
  if (typeof value !== 'string') return '';

  const role = value.trim().toLowerCase();

  if (role === 'teacher' || role === 'teachers' || role === 'doeente') {
    return ROLES.DOCENTE;
  }

  return role;
};
