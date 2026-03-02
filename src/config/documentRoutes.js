import { ROLES } from './constants';

export const getDocumentListRouteByRole = (role) => {
  switch (role) {
    case ROLES.FAMILY:
      return '/portal/familia/documentos';
    case ROLES.DOCENTE:
      return '/portal/docente/documentos';
    case ROLES.TALLERISTA:
      return '/portal/tallerista/documentos';
    case ROLES.ASPIRANTE:
      return '/portal/aspirante/documentos';
    case ROLES.SUPERADMIN:
    case ROLES.COORDINACION:
      return '/portal/admin/documentos';
    case ROLES.FACTURACION:
      return '/portal/admin';
    default:
      return '/portal/documentos';
  }
};

export const getDocumentDetailRouteByRole = (role, documentId = ':documentId') => {
  const listPath = getDocumentListRouteByRole(role);
  return `${listPath}/${documentId}`;
};

export const getSharedDocumentDetailRoute = (documentId = ':documentId') => `/portal/documentos/${documentId}`;
