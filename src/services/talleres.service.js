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
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { fixMojibakeDeep } from '../utils/textEncoding';

const talleresCollection = collection(db, 'talleres');

const createImageThumbnail = async (file, maxSize = 480, quality = 0.8) => {
  if (!file) return null;
  const isImage = (file.type || '').startsWith('image/');
  if (!isImage) return null;

  const loadImage = () => new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });

  try {
    const source = 'createImageBitmap' in window
      ? await createImageBitmap(file)
      : await loadImage();

    const sourceWidth = source.width || source.naturalWidth;
    const sourceHeight = source.height || source.naturalHeight;
    if (!sourceWidth || !sourceHeight) return null;

    const maxDimension = Math.max(sourceWidth, sourceHeight);
    const scale = maxDimension > maxSize ? maxSize / maxDimension : 1;
    const targetWidth = Math.round(sourceWidth * scale);
    const targetHeight = Math.round(sourceHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (source.close) {
      source.close();
    }

    if (!blob) return null;
    return blob;
  } catch (error) {
    return null;
  }
};

export const talleresService = {
  async getAllTalleres() {
    try {
      const q = query(talleresCollection, orderBy('nombre', 'asc'));
      const snapshot = await getDocs(q);
      const talleres = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, talleres };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getTallerById(tallerId) {
    try {
      const tallerDoc = await getDoc(doc(talleresCollection, tallerId));
      if (tallerDoc.exists()) {
        return { success: true, taller: { id: tallerDoc.id, ...fixMojibakeDeep(tallerDoc.data()) } };
      }
      return { success: false, error: 'Taller no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getTalleresByTallerista(talleristaUid) {
    try {
      // Buscar tanto en caso de que `talleristaId` sea un array (array-contains)
      // como en caso de que por compatibilidad retroactiva esté guardado como string.
      const qArray = query(
        talleresCollection,
        where('talleristaId', 'array-contains', talleristaUid)
      );

      const qString = query(
        talleresCollection,
        where('talleristaId', '==', talleristaUid)
      );

      const [snapArray, snapString] = await Promise.all([getDocs(qArray), getDocs(qString)]);

      // Unir resultados sin duplicados (por id)
      const map = new Map();
      [...snapArray.docs, ...snapString.docs].forEach(d => {
        map.set(d.id, { id: d.id, ...fixMojibakeDeep(d.data()) });
      });

      const talleres = Array.from(map.values()).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

      return { success: true, talleres };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createTaller(data) {
    try {
      let talleristaId = data.talleristaId;
      if (talleristaId && !Array.isArray(talleristaId)) {
        talleristaId = [talleristaId];
      }
      const docRef = await addDoc(talleresCollection, {
        ...data,
        talleristaId,
        estado: 'activo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateTaller(tallerId, data) {
    try {
      const updatedData = { ...data };
      if (updatedData.talleristaId && !Array.isArray(updatedData.talleristaId)) {
        updatedData.talleristaId = [updatedData.talleristaId];
      }
      await updateDoc(doc(talleresCollection, tallerId), {
        ...updatedData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteTaller(tallerId) {
    try {
      await deleteDoc(doc(talleresCollection, tallerId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getGallery(tallerId) {
    try {
      const galleryCollection = collection(db, `talleres/${tallerId}/gallery`);
      const q = query(galleryCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async addGalleryItem(tallerId, data) {
    try {
      const galleryCollection = collection(db, `talleres/${tallerId}/gallery`);
      const docRef = await addDoc(galleryCollection, {
        ...data,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async uploadGalleryMedia(tallerId, files, uploadedBy) {
    try {
      const uploads = [];
      const timestamp = Date.now();

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const safeName = String(file.name || 'archivo')
          .replace(/\s+/g, '_')
          .replace(/[^\w.\-]/g, '');
        const fileName = `${timestamp}_${i}_${safeName}`;
        const storagePath = `talleres/${tallerId}/gallery/${fileName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const tipo = (file.type || '').startsWith('video/') ? 'video' : 'imagen';
        const payload = {
          url: downloadURL,
          path: storagePath,
          fileName: file.name || fileName,
          tipo,
          uploadedBy: uploadedBy || '',
          size: file.size || 0,
          contentType: file.type || ''
        };

        const result = await this.addGalleryItem(tallerId, payload);
        if (result.success) {
          uploads.push({ id: result.id, ...payload });
        }
      }

      return { success: true, items: uploads };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteGalleryItem(tallerId, itemId) {
    try {
      const itemDoc = doc(db, `talleres/${tallerId}/gallery`, itemId);
      await deleteDoc(itemDoc);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteGalleryMedia(tallerId, item) {
    try {
      if (!item) return { success: false, error: 'Elemento no válido' };

      const storagePath = item.path
        || (item.fileName ? `talleres/${tallerId}/gallery/${item.fileName}` : null);

      if (storagePath) {
        const storageRef = ref(storage, storagePath);
        try {
          await deleteObject(storageRef);
        } catch (storageError) {
          if (storageError?.code !== 'storage/object-not-found') {
            throw storageError;
          }
        }
      }

      if (item.id) {
        await this.deleteGalleryItem(tallerId, item.id);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAlbums(tallerId) {
    try {
      const albumsCollection = collection(db, `talleres/${tallerId}/albums`);
      const q = query(albumsCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const albums = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, albums };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createAlbum(tallerId, name, createdBy) {
    try {
      const albumName = (name || '').trim();
      if (!albumName) {
        return { success: false, error: 'Nombre de album requerido' };
      }
      const albumsCollection = collection(db, `talleres/${tallerId}/albums`);
      const docRef = await addDoc(albumsCollection, {
        name: albumName,
        createdBy: createdBy || '',
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getAlbumMedia(tallerId, albumId) {
    try {
      const mediaCollection = collection(db, `talleres/${tallerId}/albums/${albumId}/media`);
      const q = query(mediaCollection, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...fixMojibakeDeep(doc.data())
      }));
      return { success: true, items };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async uploadAlbumMedia(tallerId, albumId, files, uploadedBy) {
    try {
      const uploads = [];
      const timestamp = Date.now();
      const mediaCollection = collection(db, `talleres/${tallerId}/albums/${albumId}/media`);
      const albumDoc = doc(db, `talleres/${tallerId}/albums`, albumId);
      const albumSnap = await getDoc(albumDoc);
      const albumData = albumSnap.exists() ? albumSnap.data() : {};
      let shouldSetThumb = !albumData?.thumbUrl;

      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        const safeName = String(file.name || 'archivo')
          .replace(/\s+/g, '_')
          .replace(/[^\w.\-]/g, '');
        const fileName = `${timestamp}_${i}_${safeName}`;
        const storagePath = `talleres/${tallerId}/albums/${albumId}/${fileName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        const tipo = (file.type || '').startsWith('video/') ? 'video' : 'imagen';
        const payload = {
          url: downloadURL,
          path: storagePath,
          fileName: file.name || fileName,
          tipo,
          uploadedBy: uploadedBy || '',
          size: file.size || 0,
          contentType: file.type || '',
          createdAt: serverTimestamp()
        };

        const result = await addDoc(mediaCollection, payload);
        uploads.push({ id: result.id, ...payload });

        if (shouldSetThumb && (file.type || '').startsWith('image/')) {
          const thumbBlob = await createImageThumbnail(file);
          if (thumbBlob) {
            const thumbFileName = `thumb_${timestamp}_${i}.jpg`;
            const thumbPath = `talleres/${tallerId}/albums/${albumId}/${thumbFileName}`;
            const thumbRef = ref(storage, thumbPath);
            await uploadBytes(thumbRef, thumbBlob, { contentType: 'image/jpeg' });
            const thumbUrl = await getDownloadURL(thumbRef);
            await updateDoc(albumDoc, {
              thumbUrl,
              thumbPath,
              thumbUpdatedAt: serverTimestamp()
            });
            shouldSetThumb = false;
          }
        }
      }

      return { success: true, items: uploads };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async saveExternalVideo(tallerId, albumId, videoData, uploadedBy) {
    try {
      const mediaCollection = collection(db, `talleres/${tallerId}/albums/${albumId}/media`);

      const mediaDoc = await addDoc(mediaCollection, {
        url: videoData.originalUrl,
        path: null,
        fileName: `${videoData.provider}-${videoData.videoId}`,
        tipo: 'video-externo',
        provider: videoData.provider,
        videoId: videoData.videoId,
        embedUrl: videoData.embedUrl,
        thumbUrl: videoData.thumbnailUrl,
        thumbPath: null,
        uploadedBy: uploadedBy || '',
        size: null,
        contentType: null,
        createdAt: serverTimestamp()
      });

      if (videoData.thumbnailUrl) {
        const albumDoc = doc(db, `talleres/${tallerId}/albums`, albumId);
        const albumSnap = await getDoc(albumDoc);
        const albumData = albumSnap.exists() ? albumSnap.data() : null;
        if (!albumData?.thumbUrl) {
          await updateDoc(albumDoc, {
            thumbUrl: videoData.thumbnailUrl,
            thumbPath: null,
            thumbUpdatedAt: serverTimestamp()
          });
        }
      }

      return { success: true, id: mediaDoc.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteAlbumMedia(tallerId, albumId, item) {
    try {
      if (!item) return { success: false, error: 'Elemento invalido' };

      // Solo eliminar de Storage si tiene path (no es video externo)
      const storagePath = item.path
        || (item.fileName && item.tipo !== 'video-externo' ? `talleres/${tallerId}/albums/${albumId}/${item.fileName}` : null);

      if (storagePath) {
        const storageRef = ref(storage, storagePath);
        try {
          await deleteObject(storageRef);
        } catch (storageError) {
          if (storageError?.code !== 'storage/object-not-found') {
            throw storageError;
          }
        }
      }

      if (item.id) {
        const itemDoc = doc(db, `talleres/${tallerId}/albums/${albumId}/media`, item.id);
        await deleteDoc(itemDoc);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteAlbum(tallerId, albumId) {
    try {
      const albumDoc = doc(db, `talleres/${tallerId}/albums`, albumId);
      await deleteDoc(albumDoc);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getLegacyGallery(tallerId) {
    return this.getGallery(tallerId);
  },

  async deleteLegacyGalleryMedia(tallerId, item) {
    return this.deleteGalleryMedia(tallerId, item);
  },

  async deleteLegacyGalleryAll(tallerId) {
    try {
      const legacy = await this.getLegacyGallery(tallerId);
      if (!legacy.success) {
        return { success: false, error: legacy.error };
      }
      for (const item of legacy.items || []) {
        await this.deleteLegacyGalleryMedia(tallerId, item);
      }
      return { success: true, count: (legacy.items || []).length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

