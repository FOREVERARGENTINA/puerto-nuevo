import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import {
  EMPTY_SOCIAL_CONTACT,
  EMPTY_SOCIAL_CONTACT_VISIBILITY,
  SOCIAL_LINK_TYPES,
  SOCIAL_NODE_TYPES
} from '../types/social.types';

const usersCollection = collection(db, 'users');
const childrenCollection = collection(db, 'children');
const talleresCollection = collection(db, 'talleres');
const socialProfilesCollection = collection(db, 'socialProfiles');
const childSocialProfilesCollection = collection(db, 'childSocialProfiles');

const SOCIAL_CONFIG_PATH = ['appConfig', 'social'];
const MAX_SOCIAL_IMAGE_SIZE = 8 * 1024 * 1024;
const SOCIAL_USER_ROLES = ['family', 'docente', 'tallerista', 'coordinacion', 'superadmin', 'facturacion'];
const SOCIAL_STAFF_ROLES = ['docente', 'tallerista', 'coordinacion', 'superadmin', 'facturacion'];

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeContact(contact = {}) {
  return {
    whatsapp: normalizeString(contact.whatsapp),
    email: normalizeString(contact.email),
    telefono: normalizeString(contact.telefono),
    instagram: normalizeString(contact.instagram),
    ocupacion: normalizeString(contact.ocupacion),
    otros: normalizeString(contact.otros)
  };
}

function normalizeContactVisibility(visibility = {}) {
  return {
    whatsapp: Boolean(visibility.whatsapp),
    email: Boolean(visibility.email),
    telefono: Boolean(visibility.telefono),
    instagram: Boolean(visibility.instagram),
    ocupacion: Boolean(visibility.ocupacion),
    otros: Boolean(visibility.otros)
  };
}

function getPhotoUrl(source = {}) {
  return (
    normalizeString(source.photoUrl) ||
    normalizeString(source.photoURL) ||
    normalizeString(source.avatarUrl) ||
    ''
  );
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  const parsed = new Date(value);
  const time = parsed.getTime();
  return Number.isFinite(time) ? time : 0;
}

function toUidList(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => normalizeString(item)).filter(Boolean);
  }
  if (typeof rawValue === 'string') {
    const uid = normalizeString(rawValue);
    return uid ? [uid] : [];
  }
  return [];
}

function toAmbienteList(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((item) => normalizeString(item)).filter(Boolean);
  }
  if (typeof rawValue === 'string') {
    const ambiente = normalizeString(rawValue);
    return ambiente ? [ambiente] : [];
  }
  return [];
}

function getRoleListForStaff(user, hasTalleristaAssignments) {
  const role = normalizeString(user?.role);
  const roles = [];
  if (role === 'docente') roles.push('docente');
  if (role === 'tallerista' || hasTalleristaAssignments) roles.push('tallerista');
  if (role === 'coordinacion') roles.push('coordinacion');
  if (role === 'superadmin') roles.push('superadmin');
  if (role === 'facturacion') roles.push('facturacion');

  if (roles.length === 0 && role && role !== 'family' && role !== 'aspirante') {
    roles.push(role);
  }
  return roles;
}

function buildPublicContact(contact = EMPTY_SOCIAL_CONTACT, visibility = EMPTY_SOCIAL_CONTACT_VISIBILITY) {
  const normalizedContact = normalizeContact(contact);
  const normalizedVisibility = normalizeContactVisibility(visibility);

  return Object.fromEntries(
    Object.keys(normalizedContact).map((key) => [
      key,
      normalizedVisibility[key] ? normalizedContact[key] : ''
    ])
  );
}

function buildFamilyNode(userDoc, socialProfile) {
  const uid = userDoc.id;
  const displayName = normalizeString(userDoc.displayName) || normalizeString(userDoc.email) || 'Familia';
  const photoUrl = getPhotoUrl(socialProfile) || getPhotoUrl(userDoc) || null;

  return {
    id: `family:${uid}`,
    type: SOCIAL_NODE_TYPES.FAMILY,
    rolesVisual: ['family'],
    uid,
    childId: null,
    displayName,
    ambiente: null,
    photoUrl,
    contact: buildPublicContact(
      socialProfile?.contact || EMPTY_SOCIAL_CONTACT,
      socialProfile?.contactVisibility || EMPTY_SOCIAL_CONTACT_VISIBILITY
    )
  };
}

function buildChildNode(childDoc, photoUrl) {
  const displayName = normalizeString(childDoc.nombreCompleto) || 'Alumno';
  const ambiente = normalizeString(childDoc.ambiente) || null;

  return {
    id: `child:${childDoc.id}`,
    type: SOCIAL_NODE_TYPES.CHILD,
    rolesVisual: ['child'],
    uid: null,
    childId: childDoc.id,
    displayName,
    ambiente,
    photoUrl: photoUrl || null,
    contact: {}
  };
}

function buildStaffNode(userDoc, socialProfile, talleristaAmbientes) {
  const uid = userDoc.id;
  const isAssignedAsTallerista = (talleristaAmbientes.get(uid)?.size || 0) > 0;
  const rolesVisual = getRoleListForStaff(userDoc, isAssignedAsTallerista);
  if (rolesVisual.length === 0) return null;

  const docenteAmbientes = toAmbienteList(userDoc.tallerAsignado);
  const singleDocenteAmbiente = docenteAmbientes.length === 1 ? docenteAmbientes[0] : null;
  const talleristaSet = talleristaAmbientes.get(uid) || new Set();
  const singleTalleristaAmbiente = talleristaSet.size === 1 ? Array.from(talleristaSet)[0] : null;
  const ambiente = singleDocenteAmbiente || singleTalleristaAmbiente || null;

  const displayName = normalizeString(userDoc.displayName) || normalizeString(userDoc.email) || 'Staff';
  const photoUrl = getPhotoUrl(socialProfile) || getPhotoUrl(userDoc) || null;

  return {
    id: `staff:${uid}`,
    type: SOCIAL_NODE_TYPES.STAFF,
    rolesVisual,
    uid,
    childId: null,
    displayName,
    ambiente,
    photoUrl,
    contact: {}
  };
}

function createLink(linkMap, type, source, target, ambiente = null) {
  if (!source || !target) return;
  const id = `${type}:${source}->${target}`;
  if (linkMap.has(id)) return;
  linkMap.set(id, { id, source, target, type, ambiente });
}

function sanitizeImageFileName(name) {
  return String(name || 'foto')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '');
}

function validateImageFile(file) {
  if (!file) throw new Error('Archivo no seleccionado');
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Solo se permiten imágenes');
  }
  if (Number(file.size || 0) > MAX_SOCIAL_IMAGE_SIZE) {
    throw new Error('La imagen supera el máximo de 8MB');
  }
}

export const socialService = {
  async getSocialModuleConfig() {
    const [collectionName, docId] = SOCIAL_CONFIG_PATH;
    const configRef = doc(db, collectionName, docId);
    const snapshot = await getDoc(configRef);
    if (!snapshot.exists()) {
      return { enabled: false, pilotFamilyUids: [] };
    }
    const data = snapshot.data() || {};
    const rawPilotUids = Array.isArray(data.pilotFamilyUids)
      ? data.pilotFamilyUids
      : (Array.isArray(data.previewUids) ? data.previewUids : []);

    return {
      enabled: Boolean(data.enabled),
      pilotFamilyUids: rawPilotUids
        .map((item) => normalizeString(item))
        .filter(Boolean)
    };
  },

  async getSocialGraphData() {
    const usersQuery = query(usersCollection, where('role', 'in', SOCIAL_USER_ROLES));
    const [usersSnap, childrenSnap, talleresSnap, socialProfilesSnap, childProfilesSnap] = await Promise.all([
      getDocs(usersQuery),
      getDocs(childrenCollection),
      getDocs(talleresCollection),
      getDocs(socialProfilesCollection),
      getDocs(childSocialProfilesCollection)
    ]);

    const users = usersSnap.docs.map((userDoc) => ({ id: userDoc.id, ...(userDoc.data() || {}) }));
    const children = childrenSnap.docs.map((childDoc) => ({ id: childDoc.id, ...(childDoc.data() || {}) }));
    const talleres = talleresSnap.docs.map((tallerDoc) => ({ id: tallerDoc.id, ...(tallerDoc.data() || {}) }));

    const socialProfiles = new Map(
      socialProfilesSnap.docs.map((profileDoc) => [profileDoc.id, profileDoc.data() || {}])
    );

    const childPhotoByChildId = new Map();
    childProfilesSnap.docs.forEach((profileDoc) => {
      const profile = profileDoc.data() || {};
      const childId = normalizeString(profile.childId);
      if (!childId) return;

      const photoUrl = getPhotoUrl(profile);
      if (!photoUrl) return;

      const nextUpdatedAt = timestampToMillis(profile.updatedAt);
      const prev = childPhotoByChildId.get(childId);
      if (!prev || nextUpdatedAt >= prev.updatedAt) {
        childPhotoByChildId.set(childId, { photoUrl, updatedAt: nextUpdatedAt });
      }
    });

    const familyUsers = users.filter((user) => user.role === 'family');
    const staffUsers = users.filter((user) => SOCIAL_STAFF_ROLES.includes(user.role));

    const talleristaAmbientes = new Map();
    talleres.forEach((taller) => {
      const ambiente = normalizeString(taller.ambiente);
      if (!ambiente) return;
      const uidList = toUidList(taller.talleristaId);
      uidList.forEach((uid) => {
        if (!talleristaAmbientes.has(uid)) {
          talleristaAmbientes.set(uid, new Set());
        }
        talleristaAmbientes.get(uid).add(ambiente);
      });
    });

    const nodeMap = new Map();

    familyUsers.forEach((familyUser) => {
      const node = buildFamilyNode(familyUser, socialProfiles.get(familyUser.id));
      nodeMap.set(node.id, node);
    });

    staffUsers.forEach((staffUser) => {
      const node = buildStaffNode(staffUser, socialProfiles.get(staffUser.id), talleristaAmbientes);
      if (node) nodeMap.set(node.id, node);
    });

    children.forEach((child) => {
      const photoInfo = childPhotoByChildId.get(child.id);
      const node = buildChildNode(child, photoInfo?.photoUrl || null);
      nodeMap.set(node.id, node);
    });

    const linkMap = new Map();

    children.forEach((child) => {
      const childNodeId = `child:${child.id}`;
      const ambiente = normalizeString(child.ambiente) || null;
      const responsables = toUidList(child.responsables);

      responsables.forEach((familyUid) => {
        const sourceId = `family:${familyUid}`;
        if (nodeMap.has(sourceId) && nodeMap.has(childNodeId)) {
          createLink(linkMap, SOCIAL_LINK_TYPES.FAMILY_CHILD, sourceId, childNodeId, ambiente);
        }
      });

      staffUsers.forEach((staffUser) => {
        const staffNodeId = `staff:${staffUser.id}`;
        if (!nodeMap.has(staffNodeId) || !nodeMap.has(childNodeId)) return;

        const docenteAmbientes = toAmbienteList(staffUser.tallerAsignado);
        if (staffUser.role === 'docente' && ambiente && docenteAmbientes.includes(ambiente)) {
          createLink(linkMap, SOCIAL_LINK_TYPES.DOCENTE_CHILD, staffNodeId, childNodeId, ambiente);
        }
      });

      talleristaAmbientes.forEach((ambientesSet, uid) => {
        const staffNodeId = `staff:${uid}`;
        if (!nodeMap.has(staffNodeId) || !nodeMap.has(childNodeId)) return;
        if (!ambiente || !ambientesSet.has(ambiente)) return;
        createLink(linkMap, SOCIAL_LINK_TYPES.TALLERISTA_CHILD, staffNodeId, childNodeId, ambiente);
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      links: Array.from(linkMap.values())
    };
  },

  async getMySocialProfile(uid) {
    const safeUid = normalizeString(uid);
    if (!safeUid) {
      return {
        success: false,
        error: 'uid requerido',
        profile: null
      };
    }

    const profileRef = doc(socialProfilesCollection, safeUid);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      return {
        success: true,
        profile: {
          photoUrl: '',
          contact: { ...EMPTY_SOCIAL_CONTACT },
          contactVisibility: { ...EMPTY_SOCIAL_CONTACT_VISIBILITY }
        }
      };
    }

    const data = profileSnap.data() || {};
    return {
      success: true,
      profile: {
        photoUrl: getPhotoUrl(data),
        contact: normalizeContact(data.contact || EMPTY_SOCIAL_CONTACT),
        contactVisibility: normalizeContactVisibility(
          data.contactVisibility || EMPTY_SOCIAL_CONTACT_VISIBILITY
        )
      }
    };
  },

  async saveMySocialProfile(uid, payload = {}) {
    const safeUid = normalizeString(uid);
    if (!safeUid) return { success: false, error: 'uid requerido' };

    const profileRef = doc(socialProfilesCollection, safeUid);
    await setDoc(
      profileRef,
      {
        photoUrl: getPhotoUrl(payload),
        contact: normalizeContact(payload.contact || EMPTY_SOCIAL_CONTACT),
        contactVisibility: normalizeContactVisibility(
          payload.contactVisibility || EMPTY_SOCIAL_CONTACT_VISIBILITY
        ),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return { success: true };
  },

  async saveChildSocialPhoto({ childId, familyUid, photoUrl }) {
    const safeChildId = normalizeString(childId);
    const safeFamilyUid = normalizeString(familyUid);
    const safePhotoUrl = getPhotoUrl({ photoUrl });
    if (!safeChildId || !safeFamilyUid) {
      return { success: false, error: 'childId y familyUid son requeridos' };
    }
    if (!safePhotoUrl) {
      return { success: false, error: 'photoUrl es requerido' };
    }

    const docId = `${safeChildId}_${safeFamilyUid}`;
    const profileRef = doc(childSocialProfilesCollection, docId);
    await setDoc(
      profileRef,
      {
        childId: safeChildId,
        familyUid: safeFamilyUid,
        photoUrl: safePhotoUrl,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    return { success: true };
  },

  async deleteChildSocialPhoto({ childId, familyUid }) {
    const safeChildId = normalizeString(childId);
    const safeFamilyUid = normalizeString(familyUid);
    if (!safeChildId || !safeFamilyUid) {
      return { success: false, error: 'childId y familyUid son requeridos' };
    }

    const profileRef = doc(childSocialProfilesCollection, `${safeChildId}_${safeFamilyUid}`);
    await deleteDoc(profileRef);
    return { success: true };
  },

  async getFamilyChildren(familyUid) {
    const safeFamilyUid = normalizeString(familyUid);
    if (!safeFamilyUid) return { success: false, children: [], error: 'familyUid requerido' };

    const childrenQuery = query(childrenCollection, where('responsables', 'array-contains', safeFamilyUid));
    const snapshot = await getDocs(childrenQuery);
    const children = snapshot.docs.map((item) => ({ id: item.id, ...(item.data() || {}) }));
    return { success: true, children };
  },

  async uploadFamilyProfilePhoto(uid, file) {
    const safeUid = normalizeString(uid);
    if (!safeUid) return { success: false, error: 'uid requerido' };
    validateImageFile(file);

    const fileName = `${Date.now()}-${sanitizeImageFileName(file.name)}`;
    const storageRef = ref(storage, `public/social/families/${safeUid}/profile/${fileName}`);
    await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
    const photoUrl = await getDownloadURL(storageRef);
    return { success: true, photoUrl };
  },

  async uploadChildPhoto(childId, familyUid, file) {
    const safeChildId = normalizeString(childId);
    const safeFamilyUid = normalizeString(familyUid);
    if (!safeChildId || !safeFamilyUid) {
      return { success: false, error: 'childId y familyUid son requeridos' };
    }
    validateImageFile(file);

    const fileName = `${Date.now()}-${sanitizeImageFileName(file.name)}`;
    const storageRef = ref(storage, `public/social/children/${safeChildId}/${safeFamilyUid}/${fileName}`);
    await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
    const photoUrl = await getDownloadURL(storageRef);
    return { success: true, photoUrl };
  }
};
