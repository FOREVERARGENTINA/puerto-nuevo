// Roles del sistema
export const ROLES = {
  DIRECCION: 'direccion',
  COORDINACION: 'coordinacion',
  ADMIN: 'admin',
  TEACHER: 'teacher',
  TALLERISTA: 'tallerista',
  FAMILY: 'family',
  ASPIRANTE: 'aspirante'
};

// Jerarquía de roles (para permisos)
export const ROLE_HIERARCHY = {
  [ROLES.DIRECCION]: 7,
  [ROLES.COORDINACION]: 6,
  [ROLES.ADMIN]: 5,
  [ROLES.TEACHER]: 4,
  [ROLES.TALLERISTA]: 3,
  [ROLES.FAMILY]: 2,
  [ROLES.ASPIRANTE]: 1
};

// Roles con permisos administrativos
export const ADMIN_ROLES = [
  ROLES.DIRECCION,
  ROLES.COORDINACION,
  ROLES.ADMIN
];

// Roles que pueden enviar comunicados
export const CAN_SEND_COMMUNICATIONS = [
  ROLES.DIRECCION,
  ROLES.COORDINACION,
  ROLES.ADMIN,
  ROLES.TEACHER,
  ROLES.TALLERISTA
];

// Ambientes (Talleres)
export const AMBIENTES = {
  TALLER_1: 'taller1',
  TALLER_2: 'taller2'
};

// Tipos de comunicación
export const COMMUNICATION_TYPES = {
  GLOBAL: 'global',
  AMBIENTE: 'ambiente',
  TALLER: 'taller',
  INDIVIDUAL: 'individual'
};

// Rutas de la aplicación
export const ROUTES = {
  LOGIN: '/login',
  HOME: '/',

  // Admin
  ADMIN_DASHBOARD: '/admin',
  USER_MANAGEMENT: '/admin/usuarios',
  SEND_COMMUNICATION: '/admin/comunicar',
  READ_RECEIPTS: '/admin/confirmaciones',

  // Family
  FAMILY_DASHBOARD: '/familia',
  MY_CHILDREN: '/familia/hijos',
  COMMUNICATIONS: '/familia/comunicados',
  APPOINTMENTS: '/familia/turnos',
  DOCUMENTS: '/familia/documentos',

  // Teacher
  TEACHER_DASHBOARD: '/docente',
  MY_TALLER: '/docente/mi-taller',

  // Tallerista
  TALLERISTA_DASHBOARD: '/tallerista',
  MY_TALLER_ESPECIAL: '/tallerista/mi-taller',

  // Aspirante
  ASPIRANTE_DASHBOARD: '/aspirante',
  ASPIRANTE_DOCUMENTS: '/aspirante/documentos'
};

// Mapeo de roles a rutas de dashboard
export const ROLE_DASHBOARDS = {
  [ROLES.DIRECCION]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.COORDINACION]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.ADMIN]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.TEACHER]: ROUTES.TEACHER_DASHBOARD,
  [ROLES.TALLERISTA]: ROUTES.TALLERISTA_DASHBOARD,
  [ROLES.FAMILY]: ROUTES.FAMILY_DASHBOARD,
  [ROLES.ASPIRANTE]: ROUTES.ASPIRANTE_DASHBOARD
};

// Estados de turnos
export const APPOINTMENT_STATUS = {
  LIBRE: 'libre',
  RESERVADO: 'reservado',
  CANCELADO: 'cancelado',
  ASISTIO: 'asistio'
};

// Etapas de aspirantes
export const ASPIRANTE_STAGES = {
  INTERESADO: 'interesado',
  ENTREVISTA: 'entrevista',
  DOCUMENTACION: 'documentacion',
  ACEPTADO: 'aceptado',
  RECHAZADO: 'rechazado'
};
