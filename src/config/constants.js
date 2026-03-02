// Roles del sistema
export const ROLES = {
  SUPERADMIN: 'superadmin',      // Emilse + otra persona
  COORDINACION: 'coordinacion',  // Emilse, Camila, Rosana
  DOCENTE: 'docente',            // Emilse, Camila, Rosana, Vanesa, Gise, Javi
  FACTURACION: 'facturacion',    // Rol administrativo - gestiona comunicados y conversaciones
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
    // SuperAdmin tiene todos los permisos
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
    PERMISSIONS.MANAGE_CHILDREN,
    PERMISSIONS.SEND_COMMUNICATIONS,
    PERMISSIONS.APPROVE_COMMUNICATIONS,
    PERMISSIONS.VIEW_MEDICAL_INFO,
    PERMISSIONS.MANAGE_APPOINTMENTS,
    PERMISSIONS.CREATE_APPOINTMENT_SLOTS,
    PERMISSIONS.UPLOAD_DOCUMENTS,
    PERMISSIONS.MANAGE_TALLERES
  ],

  [ROLES.DOCENTE]: [
    PERMISSIONS.SEND_COMMUNICATIONS,
    PERMISSIONS.VIEW_MEDICAL_INFO,
    PERMISSIONS.EDIT_TALLER_INFO
  ],

  [ROLES.FACTURACION]: [
    PERMISSIONS.SEND_COMMUNICATIONS
  ],

  [ROLES.TALLERISTA]: [
    // Tallerista sin permiso de carga documental institucional
    PERMISSIONS.EDIT_TALLER_INFO
  ],

  [ROLES.FAMILY]: [],

  [ROLES.ASPIRANTE]: []
};

// Jerarquía de roles (para permisos)
export const ROLE_HIERARCHY = {
  [ROLES.SUPERADMIN]: 6,
  [ROLES.COORDINACION]: 5,
  [ROLES.DOCENTE]: 4,
  [ROLES.FACTURACION]: 4,
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
  ROLES.DOCENTE,
  ROLES.FACTURACION
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

// Áreas escolares para conversaciones privadas
export const ESCUELA_AREAS = {
  COORDINACION: 'coordinacion',
  ADMINISTRACION: 'administracion',  // Gestionada por rol FACTURACION
  DIRECCION: 'direccion'
};

// Estados de conversaciones privadas
export const CONVERSATION_STATUS = {
  PENDIENTE: 'pendiente',
  RESPONDIDA: 'respondida',
  ACTIVA: 'activa',
  CERRADA: 'cerrada'
};

// Categorías de conversaciones privadas (todas)
export const CONVERSATION_CATEGORIES = [
  { value: 'entrevista', label: 'Solicitud de entrevista' },
  { value: 'administrativa', label: 'Consulta administrativa' },
  { value: 'pedagogica', label: 'Consulta pedagógica' },
  { value: 'autorizacion', label: 'Autorizaciones' },
  { value: 'documentacion', label: 'Documentación' },
  { value: 'medica', label: 'Información médica' },
  { value: 'pagos', label: 'Consulta sobre pagos' },
  { value: 'otro', label: 'Otro' }
];

// Categorías por área (filtradas según destinatario)
export const CATEGORIES_BY_AREA = {
  [ESCUELA_AREAS.DIRECCION]: [
    { value: 'entrevista', label: 'Solicitud de entrevista' },
    { value: 'administrativa', label: 'Consulta administrativa' },
    { value: 'pedagogica', label: 'Consulta pedagógica' },
    { value: 'autorizacion', label: 'Autorizaciones' },
    { value: 'medica', label: 'Información médica' },
    { value: 'otro', label: 'Otro' }
  ],
  [ESCUELA_AREAS.COORDINACION]: [
    { value: 'entrevista', label: 'Solicitud de entrevista' },
    { value: 'pedagogica', label: 'Consulta pedagógica' },
    { value: 'administrativa', label: 'Consulta administrativa' },
    { value: 'autorizacion', label: 'Autorizaciones' },
    { value: 'medica', label: 'Información médica' },
    { value: 'otro', label: 'Otro' }
  ],
  [ESCUELA_AREAS.ADMINISTRACION]: [
    { value: 'administrativa', label: 'Consulta administrativa' },
    { value: 'pagos', label: 'Consulta sobre pagos' },
    { value: 'documentacion', label: 'Documentación' },
    { value: 'otro', label: 'Otro' }
  ]
};

// Rutas de la aplicación
export const ROUTES = {
  LOGIN: '/portal/login',
  HOME: '/',

  // Admin
  ADMIN_DASHBOARD: '/portal/admin',
  USER_MANAGEMENT: '/portal/admin/usuarios',
  SEND_COMMUNICATION: '/portal/admin/comunicar',
  READ_RECEIPTS: '/portal/admin/confirmaciones',
  TALLERES_MANAGER: '/portal/admin/talleres',
  ADMIN_DOCUMENTS: '/portal/admin/documentos',
  EVENTS_MANAGER: '/portal/admin/eventos',
  ADMIN_CONVERSATIONS: '/portal/admin/conversaciones',
  ADMIN_CONVERSATION_NEW: '/portal/admin/conversaciones/nuevo',
  ADMIN_SNACKS_LISTS: '/portal/admin/snacks/listas',
  ADMIN_ACTIVITIES: '/portal/admin/actividades',
  ADMIN_SOCIAL: '/portal/admin/social',
  INSTITUTIONAL_GALLERY_ADMIN: '/portal/admin/galeria-institucional',

  // Family
  FAMILY_DASHBOARD: '/portal/familia',
  MY_CHILDREN: '/portal/familia/hijos',
  COMMUNICATIONS: '/portal/familia/comunicados',
  APPOINTMENTS: '/portal/familia/turnos',
  DOCUMENTS: '/portal/familia/documentos',
  FAMILY_CONVERSATIONS: '/portal/familia/conversaciones',
  FAMILY_CONVERSATION_NEW: '/portal/familia/conversaciones/nueva',
  INSTITUTIONAL_GALLERY_FAMILY: '/portal/familia/galeria',
  FAMILY_ACTIVITIES: '/portal/familia/actividades',
  FAMILY_SOCIAL: '/portal/familia/social',

  // Teacher
  TEACHER_DASHBOARD: '/portal/docente',
  MY_TALLER: '/portal/docente/mi-taller',
  TEACHER_DOCUMENTS: '/portal/docente/documentos',
  INSTITUTIONAL_GALLERY_TEACHER: '/portal/docente/galeria',
  TEACHER_ACTIVITIES: '/portal/docente/actividades',
  TEACHER_SOCIAL: '/portal/docente/social',

  // Tallerista
  TALLERISTA_DASHBOARD: '/portal/tallerista',
  MY_TALLER_ESPECIAL: '/portal/tallerista/mi-taller',
  TALLER_GALLERY: '/portal/tallerista/galeria',
  TALLER_DOCUMENTS: '/portal/tallerista/documentos',
  TALLERISTA_SOCIAL: '/portal/tallerista/social',
  INSTITUTIONAL_GALLERY_TALLERISTA: '/portal/tallerista/galeria-institucional',

  // Aspirante
  ASPIRANTE_DASHBOARD: '/portal/aspirante',
  ASPIRANTE_DOCUMENTS: '/portal/aspirante/documentos',
  INSTITUTIONAL_GALLERY_ASPIRANTE: '/portal/aspirante/galeria'
};

// Mapeo de roles a rutas de dashboard
export const ROLE_DASHBOARDS = {
  [ROLES.SUPERADMIN]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.COORDINACION]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.DOCENTE]: ROUTES.TEACHER_DASHBOARD,
  [ROLES.FACTURACION]: ROUTES.ADMIN_DASHBOARD,
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

// Categorías de galería institucional
export const GALLERY_CATEGORIES = {
  CLASES: {
    slug: 'clases',
    name: 'Clases',
    allowedRoles: ['family', 'docente', 'coordinacion', 'superadmin'],
    displayOrder: 1
  },
  RECORRIDO: {
    slug: 'recorrido-aula',
    name: 'Recorrido por el aula',
    allowedRoles: ['family', 'aspirante', 'docente', 'coordinacion', 'superadmin'],
    displayOrder: 2
  },
  CLASES_VIRTUALES: {
    slug: 'clases-virtuales',
    name: 'Clases virtuales',
    allowedRoles: ['family', 'docente', 'coordinacion', 'superadmin'],
    displayOrder: 3
  },
  INFO_ASPIRANTES: {
    slug: 'info-aspirantes',
    name: 'Info para aspirantes',
    allowedRoles: ['aspirante', 'family', 'docente', 'coordinacion', 'superadmin'],
    displayOrder: 4
  },
  RECUERDOS: {
    slug: 'recuerdos',
    name: 'Recuerdos',
    allowedRoles: ['family', 'docente', 'coordinacion', 'superadmin', 'tallerista'],
    displayOrder: 5
  },
  FIESTAS: {
    slug: 'fiestas',
    name: 'Fiestas',
    allowedRoles: ['family', 'docente', 'coordinacion', 'superadmin', 'tallerista'],
    displayOrder: 6
  }
};

// Roles que pueden subir contenido a la galería institucional
export const CAN_UPLOAD_TO_GALLERY = [
  ROLES.SUPERADMIN,
  ROLES.COORDINACION,
  ROLES.DOCENTE
];
