import {
  collection,
  deleteDoc,
  deleteField,
  documentId,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import {
  AMBIENTE_ACTIVITY_CATEGORIES,
  resolveCategoryLabel,
  sanitizeCustomCategory
} from '../config/ambienteActivities';
import { fixMojibakeDeep } from '../utils/textEncoding';

const AMBIENTES_VALIDOS = new Set(['taller1', 'taller2']);
const ACTIVITY_MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACTIVITY_BLOCKED_EXTENSIONS = new Set(['zip', 'exe', 'bat']);
const ACTIVITY_ALLOWED_EXTENSIONS = new Set([
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'rtf', 'odt', 'ods', 'odp'
]);
const ACTIVITY_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation'
]);

const CATEGORY_SET = new Set(AMBIENTE_ACTIVITY_CATEGORIES);

const chunkArray = (items, size) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const sanitizeFileName = (name) => String(name || 'archivo')
  .replace(/\s+/g, '_')
  .replace(/[^\w.-]/g, '');

const getFileExtension = (name) => {
  const normalizedName = String(name || '').toLowerCase();
  if (!normalizedName.includes('.')) return '';
  return normalizedName.split('.').pop();
};

const isValidActivityFile = (file) => {
  if (!file) return { valid: false, error: 'Archivo inválido' };

  const extension = getFileExtension(file.name);
  const mimeType = String(file.type || '').toLowerCase();

  if (extension && ACTIVITY_BLOCKED_EXTENSIONS.has(extension)) {
    return { valid: false, error: `Extensión no permitida: .${extension}` };
  }

  if (Number(file.size || 0) > ACTIVITY_MAX_FILE_SIZE) {
    return { valid: false, error: 'Archivo supera el límite de 20MB' };
  }

  const validByExtension = extension && ACTIVITY_ALLOWED_EXTENSIONS.has(extension);
  const validByMimeType = mimeType && ACTIVITY_ALLOWED_MIME_TYPES.has(mimeType);

  if (!validByExtension && !validByMimeType) {
    return { valid: false, error: 'Tipo de archivo no permitido' };
  }

  return { valid: true };
};

const normalizeLinks = (links = []) => {
  const normalized = [];

  (Array.isArray(links) ? links : []).forEach((entry) => {
    const rawUrl = typeof entry === 'string'
      ? entry
      : (typeof entry?.url === 'string' ? entry.url : '');
    const trimmedUrl = rawUrl.trim();
    if (!trimmedUrl) return;

    let parsedUrl;
    try {
      parsedUrl = new URL(trimmedUrl);
    } catch {
      throw new Error(`URL inválida: ${trimmedUrl}`);
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error(`Solo se permiten links http/https: ${trimmedUrl}`);
    }

    const label = typeof entry?.label === 'string' && entry.label.trim()
      ? entry.label.trim()
      : parsedUrl.hostname;

    normalized.push({
      kind: 'link',
      label,
      url: parsedUrl.toString(),
      host: parsedUrl.hostname,
      path: null,
      contentType: null,
      size: null
    });
  });

  return normalized;
};

const toRecipientUid = (rawValue) => {
  if (typeof rawValue === 'string') {
    const uid = rawValue.trim();
    return uid || null;
  }

  if (rawValue && typeof rawValue.uid === 'string') {
    const uid = rawValue.uid.trim();
    return uid || null;
  }

  return null;
};

const extractChildAmbiente = (childData) => {
  const ambiente = String(childData?.ambiente || '').trim();
  return AMBIENTES_VALIDOS.has(ambiente) ? ambiente : null;
};

const getFamilyAmbientesWithFallback = async (familyUid) => {
  if (!familyUid) return [];

  try {
    const userSnapshot = await getDoc(doc(db, 'users', familyUid));
    const userChildrenIds = userSnapshot.exists()
      ? (Array.isArray(userSnapshot.data()?.children) ? userSnapshot.data().children : [])
      : [];

    if (userChildrenIds.length > 0) {
      const childIdChunks = chunkArray(
        Array.from(new Set(userChildrenIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))),
        10
      );

      const ambientesFromUserChildren = new Set();
      for (const chunk of childIdChunks) {
        const childrenByIdQuery = query(
          collection(db, 'children'),
          where(documentId(), 'in', chunk),
          limit(10)
        );
        const childrenByIdSnapshot = await getDocs(childrenByIdQuery);
        childrenByIdSnapshot.forEach((childDoc) => {
          const ambiente = extractChildAmbiente(childDoc.data() || {});
          if (ambiente) ambientesFromUserChildren.add(ambiente);
        });
      }

      if (ambientesFromUserChildren.size > 0) {
        return Array.from(ambientesFromUserChildren);
      }
    }
  } catch {
    // Seguimos con estrategia por responsables para compatibilidad legacy
  }

  const childrenCollection = collection(db, 'children');
  const primaryQuery = query(
    childrenCollection,
    where('responsables', 'array-contains', familyUid),
    limit(80)
  );

  const primarySnapshot = await getDocs(primaryQuery);
  const primaryAmbientes = new Set(
    primarySnapshot.docs
      .map((childDoc) => extractChildAmbiente(childDoc.data() || {}))
      .filter(Boolean)
  );

  if (primaryAmbientes.size === 2) {
    return Array.from(primaryAmbientes);
  }

  const fallbackQuery = query(
    childrenCollection,
    where('ambiente', 'in', ['taller1', 'taller2']),
    limit(240)
  );
  const fallbackSnapshot = await getDocs(fallbackQuery);
  const fallbackAmbientes = new Set(primaryAmbientes);

  fallbackSnapshot.forEach((childDoc) => {
    const childData = childDoc.data() || {};
    const responsables = Array.isArray(childData.responsables) ? childData.responsables : [];
    const isResponsable = responsables.some((entry) => toRecipientUid(entry) === familyUid);
    if (!isResponsable) return;

    const ambiente = extractChildAmbiente(childData);
    if (ambiente) fallbackAmbientes.add(ambiente);
  });

  return Array.from(fallbackAmbientes);
};

const normalizeCategoryPayload = (payload = {}) => {
  const category = String(payload.category || '').trim().toLowerCase();
  if (!CATEGORY_SET.has(category)) {
    return { valid: false, error: 'Categoría inválida' };
  }

  const customCategory = sanitizeCustomCategory(payload.customCategory);
  if (category === 'otra' && !customCategory) {
    return { valid: false, error: 'Debes especificar la categoría cuando seleccionas Otra' };
  }

  return {
    valid: true,
    category,
    customCategory: category === 'otra' ? customCategory : '',
    categoryLabel: resolveCategoryLabel(category, customCategory)
  };
};

export const ambienteActivitiesService = {
  async getFamilyAmbientes(userUid) {
    try {
      const ambientes = await getFamilyAmbientesWithFallback(userUid);
      return { success: true, ambientes };
    } catch (error) {
      return { success: false, error: error.message, ambientes: [] };
    }
  },

  async getActivities({ sinceDays = 30, limit: limitCount = 80, ambientes = [] } = {}) {
    try {
      const activitiesCollection = collection(db, 'ambienteActivities');
      const safeLimit = Math.min(Math.max(Number(limitCount) || 80, 1), 200);
      const sinceDate = Number(sinceDays) > 0
        ? new Date(Date.now() - (Number(sinceDays) * 24 * 60 * 60 * 1000))
        : null;

      const constraints = [];
      if (sinceDate) {
        constraints.push(where('createdAt', '>=', Timestamp.fromDate(sinceDate)));
      }
      constraints.push(orderBy('createdAt', 'desc'));
      constraints.push(limit(safeLimit));

      const q = query(activitiesCollection, ...constraints);
      const snapshot = await getDocs(q);

      const allowedAmbientes = Array.isArray(ambientes)
        ? new Set(ambientes.filter((ambiente) => AMBIENTES_VALIDOS.has(ambiente)))
        : new Set();

      const activities = snapshot.docs
        .map((activityDoc) => ({
          id: activityDoc.id,
          ...fixMojibakeDeep(activityDoc.data())
        }))
        .filter((activity) => (
          allowedAmbientes.size === 0 || allowedAmbientes.has(String(activity?.ambiente || '').trim())
        ));

      return { success: true, activities };
    } catch (error) {
      return { success: false, error: error.message, activities: [] };
    }
  },

  async createActivity(payload = {}) {
    const title = String(payload.title || '').trim();
    const description = String(payload.description || '').trim();
    const createdBy = String(payload.createdBy || '').trim();
    const createdByName = String(payload.createdByName || '').trim();
    const createdByRole = String(payload.createdByRole || '').trim();
    const ambiente = String(payload.ambiente || '').trim();
    const files = Array.isArray(payload.files) ? payload.files : [];

    if (!title) {
      return { success: false, error: 'Título requerido' };
    }

    if (!AMBIENTES_VALIDOS.has(ambiente)) {
      return { success: false, error: 'Ambiente inválido' };
    }

    if (!createdBy) {
      return { success: false, error: 'Usuario creador requerido' };
    }

    if (!['docente', 'coordinacion', 'superadmin'].includes(createdByRole)) {
      return { success: false, error: 'Rol creador inválido' };
    }

    const categoryValidation = normalizeCategoryPayload(payload);
    if (!categoryValidation.valid) {
      return { success: false, error: categoryValidation.error };
    }

    for (const file of files) {
      const validation = isValidActivityFile(file);
      if (!validation.valid) {
        return { success: false, error: `${file?.name || 'Archivo'}: ${validation.error}` };
      }
    }

    let linkItems;
    try {
      linkItems = normalizeLinks(payload.links);
    } catch (error) {
      return { success: false, error: error.message };
    }

    if (files.length === 0 && linkItems.length === 0) {
      return { success: false, error: 'Debes agregar al menos un archivo o link' };
    }

    let dueDate = null;
    if (payload.dueDate) {
      const rawDate = payload.dueDate?.toDate ? payload.dueDate.toDate() : new Date(payload.dueDate);
      if (Number.isNaN(rawDate?.getTime?.())) {
        return { success: false, error: 'Fecha límite inválida' };
      }
      dueDate = Timestamp.fromDate(rawDate);
    }

    try {
      const activitiesCollection = collection(db, 'ambienteActivities');
      const activityRef = doc(activitiesCollection);
      const activityId = activityRef.id;
      const uploadedPaths = [];
      const fileItems = [];
      const timestamp = Date.now();

      try {
        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          const safeName = sanitizeFileName(file.name);
          const fileName = `${timestamp}_${i}_${safeName}`;
          const storagePath = `ambienteActivities/${activityId}/${createdBy}/${fileName}`;
          const storageRef = ref(storage, storagePath);

          await uploadBytes(storageRef, file);
          uploadedPaths.push(storagePath);
          const downloadURL = await getDownloadURL(storageRef);

          fileItems.push({
            kind: 'file',
            label: file.name || fileName,
            url: downloadURL,
            host: 'storage',
            path: storagePath,
            contentType: file.type || null,
            size: Number(file.size || 0)
          });
        }

        const items = [...fileItems, ...linkItems];
        await setDoc(activityRef, {
          ambiente,
          title,
          description,
          ...(dueDate ? { dueDate } : {}),
          category: categoryValidation.category,
          categoryLabel: categoryValidation.categoryLabel,
          customCategory: categoryValidation.customCategory,
          itemCount: items.length,
          items,
          createdBy,
          createdByName,
          createdByRole,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        return { success: true, id: activityId, items };
      } catch (error) {
        for (const path of uploadedPaths) {
          try {
            await deleteObject(ref(storage, path));
          } catch (cleanupError) {
            if (cleanupError?.code !== 'storage/object-not-found') {
              console.error('Error limpiando archivo de actividad:', cleanupError);
            }
          }
        }

        return { success: false, error: error.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateActivityMeta(activityId, payload = {}) {
    try {
      if (!activityId) {
        return { success: false, error: 'activityId es requerido' };
      }

      const updates = {
        updatedAt: serverTimestamp()
      };

      if (payload.title != null) {
        const title = String(payload.title || '').trim();
        if (!title) {
          return { success: false, error: 'Título requerido' };
        }
        updates.title = title;
      }

      if (payload.description != null) {
        updates.description = String(payload.description || '').trim();
      }

      if ('dueDate' in payload) {
        if (!payload.dueDate) {
          updates.dueDate = deleteField();
        } else {
          const dueDate = payload.dueDate?.toDate ? payload.dueDate.toDate() : new Date(payload.dueDate);
          if (Number.isNaN(dueDate?.getTime?.())) {
            return { success: false, error: 'Fecha límite inválida' };
          }
          updates.dueDate = Timestamp.fromDate(dueDate);
        }
      }

      if (payload.category != null || payload.customCategory != null) {
        const categoryValidation = normalizeCategoryPayload(payload);
        if (!categoryValidation.valid) {
          return { success: false, error: categoryValidation.error };
        }

        updates.category = categoryValidation.category;
        updates.customCategory = categoryValidation.customCategory;
        updates.categoryLabel = categoryValidation.categoryLabel;
      }

      await updateDoc(doc(db, 'ambienteActivities', activityId), updates);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteActivity(activityId, items = []) {
    const warnings = [];

    try {
      if (!activityId) {
        return { success: false, error: 'activityId es requerido' };
      }

      const activityItems = Array.isArray(items) ? items : [];
      for (const item of activityItems) {
        const path = typeof item?.path === 'string' ? item.path.trim() : '';
        if (!path || item?.kind !== 'file') continue;

        try {
          await deleteObject(ref(storage, path));
        } catch (storageError) {
          if (storageError?.code !== 'storage/object-not-found') {
            warnings.push(`No se pudo eliminar ${item?.label || path}`);
          }
        }
      }
    } catch (error) {
      warnings.push(error.message);
    }

    try {
      await deleteDoc(doc(db, 'ambienteActivities', activityId));
      return { success: true, warnings };
    } catch (error) {
      return { success: false, error: error.message, warnings };
    }
  }
};
