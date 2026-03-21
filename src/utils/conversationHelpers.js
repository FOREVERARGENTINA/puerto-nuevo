import { CONVERSATION_CATEGORIES, CONVERSATION_STATUS, ESCUELA_AREAS, ROLES } from '../config/constants';

const toMillis = (value) => {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date ? date.getTime() : 0;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const getAreaLabel = (area) => {
  switch (area) {
    case ESCUELA_AREAS.COORDINACION:
      return 'Coordinación';
    case ESCUELA_AREAS.ADMINISTRACION:
      return 'Facturación';
    case ESCUELA_AREAS.DIRECCION:
      return 'Dirección';
    default:
      return 'Escuela';
  }
};

export const getCategoryLabel = (value) => {
  const match = CONVERSATION_CATEGORIES.find((c) => c.value === value);
  return match ? match.label : value || 'General';
};

export const getConversationStatusLabel = (status, role) => {
  if (role === ROLES.FAMILY) {
    if (status === CONVERSATION_STATUS.PENDIENTE) return 'Respuesta pendiente';
    if (status === CONVERSATION_STATUS.RESPONDIDA) return 'Respondida';
    if (status === CONVERSATION_STATUS.ACTIVA) return 'Activa';
    if (status === CONVERSATION_STATUS.CERRADA) return 'Cerrada';
  }
  if (status === CONVERSATION_STATUS.PENDIENTE) return 'Sin responder';
  if (status === CONVERSATION_STATUS.RESPONDIDA) return 'Respondida';
  if (status === CONVERSATION_STATUS.ACTIVA) return 'Activa';
  if (status === CONVERSATION_STATUS.CERRADA) return 'Cerrada';
  return status || 'Sin estado';
};

export const getConversationStatusBadge = (status) => {
  if (status === CONVERSATION_STATUS.PENDIENTE) return 'badge badge--error';
  if (status === CONVERSATION_STATUS.RESPONDIDA) return 'badge badge--warning';
  if (status === CONVERSATION_STATUS.ACTIVA) return 'badge badge--success';
  if (status === CONVERSATION_STATUS.CERRADA) return 'badge badge--info';
  return 'badge';
};

export const getConversationActivityTime = (conversation) => (
  toMillis(conversation?.ultimoMensajeAt)
  || toMillis(conversation?.creadoAt)
);

export const getConversationActivityDate = (conversation) => {
  const millis = getConversationActivityTime(conversation);
  return millis > 0 ? new Date(millis) : null;
};

export const sortConversationsByLatestMessage = (conversations = []) => (
  [...conversations].sort((a, b) => getConversationActivityTime(b) - getConversationActivityTime(a))
);
