/**
 * @typedef {Object} SocialContact
 * @property {string} whatsapp
 * @property {string} email
 * @property {string} telefono
 * @property {string} instagram
 * @property {string} ocupacion
 * @property {string} otros
 */

/**
 * @typedef {Object} SocialContactVisibility
 * @property {boolean} whatsapp
 * @property {boolean} email
 * @property {boolean} telefono
 * @property {boolean} instagram
 * @property {boolean} ocupacion
 * @property {boolean} otros
 */

/**
 * @typedef {Object} SocialNode
 * @property {string} id
 * @property {'family'|'child'|'staff'} type
 * @property {string[]} rolesVisual
 * @property {string} displayName
 * @property {string|null} [ambiente]
 * @property {string|null} [photoUrl]
 * @property {Partial<SocialContact>} [contact]
 */

/**
 * @typedef {Object} SocialLink
 * @property {string} id
 * @property {string} source
 * @property {string} target
 * @property {'family-child'|'docente-child'|'tallerista-child'} type
 * @property {string|null} [ambiente]
 */

/**
 * @typedef {Object} SocialProfile
 * @property {string} [photoUrl]
 * @property {SocialContact} contact
 * @property {SocialContactVisibility} contactVisibility
 * @property {unknown} [updatedAt]
 */

/**
 * @typedef {Object} ChildSocialProfile
 * @property {string} childId
 * @property {string} familyUid
 * @property {string} [photoUrl]
 * @property {unknown} [updatedAt]
 */

export const SOCIAL_NODE_TYPES = {
  FAMILY: 'family',
  CHILD: 'child',
  STAFF: 'staff'
};

export const SOCIAL_LINK_TYPES = {
  FAMILY_CHILD: 'family-child',
  DOCENTE_CHILD: 'docente-child',
  TALLERISTA_CHILD: 'tallerista-child'
};

export const EMPTY_SOCIAL_CONTACT = {
  whatsapp: '',
  email: '',
  telefono: '',
  instagram: '',
  ocupacion: '',
  otros: ''
};

export const EMPTY_SOCIAL_CONTACT_VISIBILITY = {
  whatsapp: false,
  email: false,
  telefono: false,
  instagram: false,
  ocupacion: false,
  otros: false
};
