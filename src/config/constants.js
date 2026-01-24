// Roles del sistema
export const ROLES = {
  SUPERADMIN: 'superadmin',      // Emilse + otra persona
  COORDINACION: 'coordinacion',  // Emilse, Camila, Rosana
  DOCENTE: 'docente',            // Emilse, Camila, Rosana, Vanesa, Gise, Javi
  TALLERISTA: 'tallerista',      // Camila como nexo, NO envían mensajes
  FAMILY: 'family',
  ASPIRANTE: 'aspirante'
};

// PERMISOS GRANULARES del sistema
export const PERMISSIONS = {
  // Administración general
  MANAGE_USERS: 'manage_users',
  MANAGE_CHILDREN: 'manage_children',
  MANAGE_ROLES: 'manage_roles',

  // Comunicados
  SEND_COMMUNICATIONS: 'send_communications',
  APPROVE_COMMUNICATIONS: 'approve_communications',
  DELETE_COMMUNICATIONS: 'delete_communications',

  // Información médica
  VIEW_MEDICAL_INFO: 'view_medical_info',
  EDIT_MEDICAL_INFO: 'edit_medical_info',

  // Turnos
  MANAGE_APPOINTMENTS: 'manage_appointments',
  CREATE_APPOINTMENT_SLOTS: 'create_appointment_slots',

  // Documentos
  UPLOAD_DOCUMENTS: 'upload_documents',
  MANAGE_DOCUMENTS: 'manage_documents',

  // Talleres
  MANAGE_TALLERES: 'manage_talleres',
  EDIT_TALLER_INFO: 'edit_taller_info',

  // Aspirantes
  MANAGE_ASPIRANTES: 'manage_aspirantes'
};

// Mapeo de roles a permisos (basado en documento de Emilse)
export const ROLE_PERMISSIONS = {
  [ROLES.SUPERADMIN]: [
    // SuperAdmin tiene TODOS los permisos
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_CHILDREN,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.SEND_COMMUNICATIONS,
    PERMISSIONS.APPROVE_COMMUNICATIONS,
    PERMISSIONS.DELETE_COMMUNICATIONS,
    PERMISSIONS.VIEW_MEDICAL_INFO,
    PERMISSIONS.EDIT_MEDICAL_INFO,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.CREATE_APPOINTMENT_SLOTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.MANAGE_DOCUMENTS,
    PERMISSIONS.MANAGE_TALLERES,
    PERMISSIONS.MANAGE_ASPIRANTES
  ],

  [ROLES.COORDINACION]: [
    // Emilse, Camila, Rosana
    PERMISSIONS.MANAGE_CHILDREN,
    PERMISSIONS.SEND_COMMUNICATIONS,
    PERMISSIONS.APPROVE_COMMUNICATIONS,  // Pueden aprobar comunicaciones oficiales
    PERMISSIONS.VIEW_MEDICAL_INFO,        // Ven información médica completa
    PERMISSIONS.MANAGE_APPOINTMENTS,      // Administran turnos
    PERMISSIONS.CREATE_APPOINTMENT_SLOTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.MANAGE_TALLERES
  ],

  [ROLES.DOCENTE]: [
    // Emilse, Camila, Rosana, Vanesa, Gise, Javi
    PERMISSIONS.SEND_COMMUNICATIONS,      // Pueden enviar comunicados
    PERMISSIONS.VIEW_MEDICAL_INFO,        // Vanesa y Gise ven info médica
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.EDIT_TALLER_INFO
  ],

  [ROLES.TALLERISTA]: [
    // Camila como nexo - NO ENVÍAN MENSAJES (esto es clave)
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.EDIT_TALLER_INFO
  ],

  [ROLES.FAMILY]: [
    // Familias - permisos básicos
  ],

  [ROLES.ASPIRANTE]: [
    // Aspirantes - permisos muy limitados
  ]
};

// Jerarquía de roles (para permisos)
export const ROLE_HIERARCHY = {
  [ROLES.SUPERADMIN]: 6,
  [ROLES.COORDINACION]: 5,
  [ROLES.DOCENTE]: 4,
  [ROLES.TALLERISTA]: 3,
  [ROLES.FAMILY]: 2,
  [ROLES.ASPIRANTE]: 1
};

// Roles con permisos administrativos (SUPERADMIN y COORDINACION)
export const ADMIN_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.COORDINACION
];

// Roles que pueden enviar comunicados (NO incluye talleristas)
export const CAN_SEND_COMMUNICATIONS = [
  ROLES.SUPERADMIN,
  ROLES.COORDINACION,
  ROLES.DOCENTE
];

// Roles que pueden aprobar comunicaciones (Emilse, Camila, Rosana)
export const CAN_APPROVE_COMMUNICATIONS = [
  ROLES.SUPERADMIN,
  ROLES.COORDINACION
];

// Roles que pueden ver información médica completa
export const CAN_VIEW_MEDICAL_INFO = [
  ROLES.SUPERADMIN,
  ROLES.COORDINACION,
  ROLES.DOCENTE  // Algunos docentes (Vanesa, Gise)
];

// Roles que pueden administrar turnos (Emilse, Camila, Rosana)
export const CAN_MANAGE_APPOINTMENTS = [
  ROLES.SUPERADMIN,
  ROLES.COORDINACION
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
  TALLERES_MANAGER: '/admin/talleres',
  ADMIN_DOCUMENTS: '/admin/documentos',
  EVENTS_MANAGER: '/admin/eventos',

  // Family
  FAMILY_DASHBOARD: '/familia',
  MY_CHILDREN: '/familia/hijos',
  COMMUNICATIONS: '/familia/comunicados',
  APPOINTMENTS: '/familia/turnos',
  DOCUMENTS: '/familia/documentos',

  // Teacher
  TEACHER_DASHBOARD: '/docente',
  MY_TALLER: '/docente/mi-taller',
  TEACHER_DOCUMENTS: '/docente/documentos',

  // Tallerista
  TALLERISTA_DASHBOARD: '/tallerista',
  MY_TALLER_ESPECIAL: '/tallerista/mi-taller',
  TALLER_GALLERY: '/tallerista/galeria',
  TALLER_DOCUMENTS: '/tallerista/documentos',

  // Aspirante
  ASPIRANTE_DASHBOARD: '/aspirante',
  ASPIRANTE_DOCUMENTS: '/aspirante/documentos'
};

// Mapeo de roles a rutas de dashboard
export const ROLE_DASHBOARDS = {
  [ROLES.SUPERADMIN]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.COORDINACION]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.DOCENTE]: ROUTES.TEACHER_DASHBOARD,
  [ROLES.TALLERISTA]: ROUTES.TALLERISTA_DASHBOARD,
  [ROLES.FAMILY]: ROUTES.FAMILY_DASHBOARD,
  [ROLES.ASPIRANTE]: ROUTES.ASPIRANTE_DASHBOARD
};

// Helper: Verificar si un usuario tiene un permiso específico
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
};

// Helper: Obtener todos los permisos de un rol
export const getRolePermissions = (userRole) => {
  return ROLE_PERMISSIONS[userRole] || [];
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
