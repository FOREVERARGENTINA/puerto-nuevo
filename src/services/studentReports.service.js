import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';
import { deleteObject, getBlob, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { fixMojibakeDeep } from '../utils/textEncoding';

const MAX_REPORT_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_REPORT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
]);

const ALLOWED_REPORT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']);

const normalizeFileName = (fileName = 'informe') => (
  String(fileName)
    .trim()
    .replace(/[\\/#?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 120) || 'informe'
);

const getFileExtension = (fileName = '') => {
  const parts = String(fileName).toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const validateReportFile = (file) => {
  if (!file) return 'Debes seleccionar un archivo';
  if (file.size > MAX_REPORT_FILE_SIZE) return 'El archivo no puede superar los 10 MB';

  const extension = getFileExtension(file.name);
  const hasValidType = ALLOWED_REPORT_TYPES.has(file.type);
  const hasValidExtension = ALLOWED_REPORT_EXTENSIONS.has(extension);

  if (!hasValidType || !hasValidExtension) {
    return 'Solo se permiten PDF, Word e imagenes JPG o PNG';
  }

  return null;
};

export const studentReportsService = {
  validateReportFile,

  async getReportsByChild(childId) {
    try {
      if (!childId) return { success: true, reports: [] };

      const reportsCollection = collection(db, 'children', childId, 'reports');
      const snapshot = await getDocs(reportsCollection);
      const reports = snapshot.docs
        .map((reportDoc) => ({
          id: reportDoc.id,
          ...fixMojibakeDeep(reportDoc.data())
        }))
        .sort((a, b) => {
          const yearDiff = Number(b.anio || 0) - Number(a.anio || 0);
          if (yearDiff !== 0) return yearDiff;
          return timestampToMillis(b.createdAt) - timestampToMillis(a.createdAt);
        });

      return { success: true, reports };
    } catch (error) {
      return { success: false, reports: [], error: error.message };
    }
  },

  async uploadReport(childId, file, metadata = {}) {
    let uploadedStoragePath = '';

    try {
      const fileError = validateReportFile(file);
      if (fileError) return { success: false, error: fileError };

      const periodo = String(metadata.periodo || '').trim();
      const anio = Number(metadata.anio);
      const uploadedBy = String(metadata.uploadedBy || '').trim();

      if (!childId) return { success: false, error: 'Alumno requerido' };
      if (!periodo) return { success: false, error: 'Periodo requerido' };
      if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
        return { success: false, error: 'Año inválido' };
      }
      if (!uploadedBy) return { success: false, error: 'Usuario requerido' };

      const reportRef = doc(collection(db, 'children', childId, 'reports'));
      const safeFileName = normalizeFileName(file.name);
      const storagePath = `private/children/${childId}/reports/${reportRef.id}/${Date.now()}-${safeFileName}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file, {
        contentType: file.type || 'application/octet-stream'
      });
      uploadedStoragePath = storagePath;

      await setDoc(reportRef, {
        childId,
        periodo,
        anio,
        archivoNombre: file.name,
        archivoTamanoBytes: file.size,
        archivoTipo: file.type || '',
        storagePath,
        uploadedBy,
        uploadedByEmail: metadata.uploadedByEmail || '',
        createdAt: serverTimestamp()
      });

      return { success: true, id: reportRef.id };
    } catch (error) {
      if (uploadedStoragePath) {
        try {
          await deleteObject(ref(storage, uploadedStoragePath));
        } catch {
          // Best-effort cleanup: the Firestore document was not created, so the file
          // is not visible to families under Storage rules.
        }
      }
      return { success: false, error: error.message };
    }
  },

  async downloadReport(report) {
    try {
      if (!report?.storagePath) {
        return { success: false, error: 'Archivo no disponible' };
      }

      const blob = await getBlob(ref(storage, report.storagePath));
      return {
        success: true,
        blob,
        fileName: report.archivoNombre || 'informe'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteReport(childId, reportId, storagePath) {
    try {
      if (!childId || !reportId) {
        return { success: false, error: 'Informe requerido' };
      }

      if (storagePath) {
        try {
          await deleteObject(ref(storage, storagePath));
        } catch (storageError) {
          if (storageError?.code !== 'storage/object-not-found') {
            throw storageError;
          }
        }
      }

      await deleteDoc(doc(db, 'children', childId, 'reports', reportId));

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
