import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { fixMojibakeDeep } from '../utils/textEncoding';
import { documentReadReceiptsService } from './documentReadReceipts.service';

const documentsCollection = collection(db, 'documents');
const usersCollection = collection(db, 'users');
const childrenCollection = collection(db, 'children');

const ROLE_ALIASES = {
  docente: ['docente', 'teacher']
};

const KNOWN_ROLES = ['superadmin', 'coordinacion', 'docente', 'facturacion', 'tallerista', 'family', 'aspirante'];

const normalizeAmbiente = (value) => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!normalized || normalized === 'todos' || normalized === 'all') return 'global';
  if (normalized === 'global') return 'global';
  if (normalized === 'taller1') return 'taller1';
  if (normalized === 'taller2') return 'taller2';
  return 'global';
};

const toRecipientUid = (entry) => {
  if (typeof entry === 'string') {
    const uid = entry.trim();
    return uid || null;
  }

  if (entry && typeof entry.uid === 'string') {
    const uid = entry.uid.trim();
    return uid || null;
  }

  return null;
};

const normalizeRoles = (roles) => {
  if (!Array.isArray(roles)) return [];
  const set = new Set();

  roles.forEach((rawRole) => {
    const role = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : '';
    if (!role) return;

    if (role === 'teacher') {
      set.add('docente');
      return;
    }

    if (KNOWN_ROLES.includes(role)) {
      set.add(role);
    }
  });

  return Array.from(set);
};

const isValidFamilyAmbiente = (value) => value === 'taller1' || value === 'taller2';

const extractFamilyAmbiente = (childData) => {
  const ambiente = normalizeAmbiente(childData?.ambiente);
  return isValidFamilyAmbiente(ambiente) ? ambiente : null;
};

const matchesResponsable = (entry, uid) => toRecipientUid(entry) === uid;

export const documentsService = {
  async getAllDocuments() {
    try {
      const q = query(documentsCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map((docRef) => ({
        id: docRef.id,
        ...fixMojibakeDeep(docRef.data())
      }));
      return { success: true, documents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getDocumentsByRole(role, options = {}) {
    try {
      const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : '';
      const userId = typeof options?.userId === 'string' ? options.userId.trim() : '';
      if (!normalizedRole) {
        return { success: true, documents: [] };
      }

      const aliases = ROLE_ALIASES[normalizedRole] || [normalizedRole];
      const snapshots = await Promise.all(
        aliases.map((alias) => getDocs(
          query(
            documentsCollection,
            where('roles', 'array-contains', alias),
            orderBy('createdAt', 'desc')
          )
        ))
      );

      const documentsMap = new Map();
      snapshots.forEach((snapshot) => {
        snapshot.docs.forEach((docRef) => {
          documentsMap.set(docRef.id, {
            id: docRef.id,
            ...fixMojibakeDeep(docRef.data())
          });
        });
      });

      let documents = Array.from(documentsMap.values()).sort((a, b) => {
        const aDate = a.createdAt?.toMillis?.() || 0;
        const bDate = b.createdAt?.toMillis?.() || 0;
        return bDate - aDate;
      });

      if (normalizedRole === 'family') {
        const familyAmbientes = await this.getFamilyAmbientesForUser(userId);
        documents = this.filterDocumentsByFamilyAmbiente(documents, familyAmbientes);
      }

      return { success: true, documents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getFamilyAmbientesForUser(userId) {
    if (!userId) return [];

    try {
      const primaryQuery = query(
        childrenCollection,
        where('responsables', 'array-contains', userId),
        limit(120)
      );

      const primarySnapshot = await getDocs(primaryQuery);
      const ambientes = new Set(
        primarySnapshot.docs
          .map((childDoc) => extractFamilyAmbiente(childDoc.data() || {}))
          .filter(Boolean)
      );

      if (ambientes.size === 2) {
        return Array.from(ambientes);
      }

      const fallbackQuery = query(
        childrenCollection,
        where('ambiente', 'in', ['taller1', 'taller2']),
        limit(320)
      );

      const fallbackSnapshot = await getDocs(fallbackQuery);
      fallbackSnapshot.docs.forEach((childDoc) => {
        const childData = childDoc.data() || {};
        const responsables = Array.isArray(childData.responsables) ? childData.responsables : [];
        const isResponsible = responsables.some((entry) => matchesResponsable(entry, userId));
        if (!isResponsible) return;

        const ambiente = extractFamilyAmbiente(childData);
        if (ambiente) ambientes.add(ambiente);
      });

      return Array.from(ambientes);
    } catch (error) {
      console.error('Error obteniendo ambientes de familia para documentos:', error);
      return [];
    }
  },

  filterDocumentsByFamilyAmbiente(documents = [], familyAmbientes = []) {
    const allowedAmbientes = new Set(
      (Array.isArray(familyAmbientes) ? familyAmbientes : [])
        .map((ambiente) => normalizeAmbiente(ambiente))
        .filter((ambiente) => isValidFamilyAmbiente(ambiente))
    );

    return (Array.isArray(documents) ? documents : []).filter((documentItem) => {
      const scope = normalizeAmbiente(documentItem?.ambiente);
      if (scope === 'global') return true;
      return allowedAmbientes.has(scope);
    });
  },

  async getDocumentsByCategory(categoria) {
    try {
      const q = query(
        documentsCollection,
        where('categoria', '==', categoria),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const documents = snapshot.docs.map((docRef) => ({
        id: docRef.id,
        ...fixMojibakeDeep(docRef.data())
      }));
      return { success: true, documents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getDocumentById(docId) {
    try {
      const docRef = await getDoc(doc(documentsCollection, docId));
      if (docRef.exists()) {
        return { success: true, document: { id: docRef.id, ...fixMojibakeDeep(docRef.data()) } };
      }
      return { success: false, error: 'Documento no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async uploadDocument(file, metadata) {
    try {
      const roles = normalizeRoles(metadata.roles);
      const includesFamily = roles.includes('family');
      const ambiente = includesFamily ? normalizeAmbiente(metadata.ambiente) : null;
      const storagePath = `documents/${metadata.categoria}/${file.name}`;

      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      const docData = {
        ...metadata,
        roles,
        ambiente,
        requiereLectura: !!metadata.requiereLectura,
        archivoURL: downloadURL,
        archivoNombre: file.name,
        archivoTamanoBytes: file.size,
        storagePath,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(documentsCollection, docData);

      const destinatarios = await this.getDestinatariosForDocument({
        roles,
        ambiente,
        uploadedBy: metadata.uploadedBy
      });

      if (destinatarios.length > 0) {
        await documentReadReceiptsService.createPendingReceipts(docRef.id, destinatarios);
      }

      return { success: true, id: docRef.id, url: downloadURL };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getUsersByRoles(roles) {
    const roleList = normalizeRoles(roles).filter((role) => role !== 'family');
    if (roleList.length === 0) return [];

    const uniqueUsers = new Map();
    const chunks = [];

    for (let i = 0; i < roleList.length; i += 10) {
      chunks.push(roleList.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const roleQuery = query(usersCollection, where('role', 'in', chunk));
      const usersSnapshot = await getDocs(roleQuery);

      usersSnapshot.docs.forEach((userDoc) => {
        const userData = userDoc.data() || {};
        if (userData.disabled === true) return;

        uniqueUsers.set(userDoc.id, {
          uid: userDoc.id,
          email: userData.email || '',
          role: userData.role || '',
          ambiente: null
        });
      });
    }

    return Array.from(uniqueUsers.values());
  },

  async getDestinatariosForDocument(metadata = {}) {
    const targetRoles = normalizeRoles(metadata.roles);
    const destinatariosMap = new Map();

    if (targetRoles.includes('family')) {
      const familyRecipients = await this.getDestinatariosByAmbiente(metadata.ambiente || 'global');
      familyRecipients.forEach((recipient) => {
        destinatariosMap.set(recipient.uid, recipient);
      });
    }

    const usersByRole = await this.getUsersByRoles(targetRoles);
    usersByRole.forEach((recipient) => {
      destinatariosMap.set(recipient.uid, recipient);
    });

    if (metadata.uploadedBy && destinatariosMap.has(metadata.uploadedBy)) {
      destinatariosMap.delete(metadata.uploadedBy);
    }

    return Array.from(destinatariosMap.values());
  },

  /**
   * Obtiene lista de destinatarios familias segun alcance.
   * @param {string} ambiente - 'global', 'taller1', 'taller2' (legacy: 'todos')
   */
  async getDestinatariosByAmbiente(ambiente) {
    try {
      const normalizedAmbiente = normalizeAmbiente(ambiente);
      const destinatarios = [];

      if (normalizedAmbiente === 'global') {
        const familyQuery = query(usersCollection, where('role', '==', 'family'));
        const snapshot = await getDocs(familyQuery);

        snapshot.docs.forEach((userDoc) => {
          const userData = userDoc.data() || {};
          if (userData.disabled === true) return;

          destinatarios.push({
            uid: userDoc.id,
            email: userData.email || '',
            role: 'family',
            ambiente: 'global'
          });
        });

        return destinatarios;
      }

      const childrenQuery = query(childrenCollection, where('ambiente', '==', normalizedAmbiente));
      const childrenSnapshot = await getDocs(childrenQuery);

      const responsableUids = new Set();
      childrenSnapshot.docs.forEach((childDoc) => {
        const childData = childDoc.data() || {};
        const responsables = Array.isArray(childData.responsables) ? childData.responsables : [];
        responsables.forEach((entry) => {
          const uid = toRecipientUid(entry);
          if (uid) responsableUids.add(uid);
        });
      });

      if (responsableUids.size === 0) {
        return [];
      }

      const uidArray = Array.from(responsableUids);
      const chunks = [];
      for (let i = 0; i < uidArray.length; i += 10) {
        chunks.push(uidArray.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        const usersQuery = query(usersCollection, where('__name__', 'in', chunk));
        const usersSnapshot = await getDocs(usersQuery);

        usersSnapshot.docs.forEach((userDoc) => {
          const userData = userDoc.data() || {};
          if (userData.disabled === true) return;
          if (userData.role !== 'family') return;

          destinatarios.push({
            uid: userDoc.id,
            email: userData.email || '',
            role: 'family',
            ambiente: normalizedAmbiente
          });
        });
      }

      return destinatarios;
    } catch (error) {
      console.error('Error obteniendo destinatarios:', error);
      return [];
    }
  },

  async updateDocument(docId, data) {
    try {
      await updateDoc(doc(documentsCollection, docId), {
        ...data,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteDocument(docId, categoria, fileName) {
    try {
      await deleteDoc(doc(documentsCollection, docId));
      const storageRef = ref(storage, `documents/${categoria}/${fileName}`);
      await deleteObject(storageRef);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
