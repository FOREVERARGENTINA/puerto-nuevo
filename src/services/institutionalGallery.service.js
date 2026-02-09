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
import { CAN_UPLOAD_TO_GALLERY } from '../config/constants';
import {
  createImageThumbnail,
  sanitizeFileName,
  getMediaType,
  compressCategoryCover
} from '../utils/galleryHelpers';

const categoriesCollection = collection(db, 'gallery-categories');
const albumsCollection = collection(db, 'gallery-albums');
const mediaCollection = collection(db, 'gallery-media');
const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;
const categoriesByRoleCache = new Map();
const preloadedCategoryCovers = new Set();

const clearCategoriesByRoleCache = () => {
  categoriesByRoleCache.clear();
};

const preloadCategoryCoverImages = (categories) => {
  categories.forEach((category) => {
    if (!category?.coverUrl || preloadedCategoryCovers.has(category.coverUrl)) {
      return;
    }
    preloadedCategoryCovers.add(category.coverUrl);
    const image = new Image();
    image.decoding = 'async';
    image.src = category.coverUrl;
  });
};

export const institutionalGalleryService = {
  // ==================== CATEGORÍAS ====================

  /**
   * Obtener todas las categorías activas (más reciente primero)
   */
  async getAllCategories() {
    try {
      const q = query(
        categoriesCollection,
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const categories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return { success: true, categories };
    } catch (error) {
      console.error('Error getting categories:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener categorías filtradas por rol del usuario
   */
  async getCategoriesByRole(userRole) {
    try {
      const cacheKey = userRole || 'unknown';
      const cached = categoriesByRoleCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CATEGORY_CACHE_TTL_MS) {
        return { success: true, categories: cached.categories };
      }

      const result = await this.getAllCategories();
      if (!result.success) return result;

      const filtered = result.categories.filter(cat =>
        cat.allowedRoles && cat.allowedRoles.includes(userRole)
      );

      categoriesByRoleCache.set(cacheKey, {
        timestamp: Date.now(),
        categories: filtered
      });
      preloadCategoryCoverImages(filtered);

      return { success: true, categories: filtered };
    } catch (error) {
      console.error('Error getting categories by role:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener categoría por slug
   */
  async getCategoryBySlug(slug) {
    try {
      const q = query(categoriesCollection, where('slug', '==', slug));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: false, error: 'Categoría no encontrada' };
      }

      const category = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      return { success: true, category };
    } catch (error) {
      console.error('Error getting category by slug:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener categoría por ID
   */
  async getCategoryById(categoryId) {
    try {
      const docRef = doc(categoriesCollection, categoryId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return { success: false, error: 'Categoría no encontrada' };
      }

      const category = { id: docSnap.id, ...docSnap.data() };
      return { success: true, category };
    } catch (error) {
      console.error('Error getting category:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Crear nueva categoría (más reciente aparece primero)
   */
  async createCategory(data, createdBy) {
    try {
      const docRef = await addDoc(categoriesCollection, {
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        allowedRoles: data.allowedRoles || [],
        coverUrl: data.coverUrl || null,
        coverPath: data.coverPath || null,
        isActive: true,
        createdAt: serverTimestamp(),
        createdBy,
        updatedAt: serverTimestamp()
      });
      clearCategoriesByRoleCache();
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating category:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Actualizar categoría
   */
  async updateCategory(categoryId, data) {
    try {
      const docRef = doc(categoriesCollection, categoryId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
      clearCategoriesByRoleCache();
      return { success: true };
    } catch (error) {
      console.error('Error updating category:', error);
      return { success: false, error: error.message };
    }
  },

  async uploadCategoryCover(categorySlug, file) {
    try {
      if (!file) {
        return { success: false, error: 'Archivo inválido' };
      }

      const timestamp = Date.now();
      const sanitized = sanitizeFileName(file.name);
      const fileName = `cover_${timestamp}_${sanitized}`;
      const storagePath = `institutional-gallery/${categorySlug}/category/${fileName}`;

      // Usar compresión optimizada para portadas de categorías
      const uploadFile = (file.type || '').startsWith('image/')
        ? await compressCategoryCover(file)
        : file;

      console.log(`Portada optimizada: ${(file.size / (1024 * 1024)).toFixed(2)}MB → ${(uploadFile.size / (1024 * 1024)).toFixed(2)}MB`);

      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, uploadFile, {
        contentType: uploadFile.type || 'image/webp',
        cacheControl: 'public,max-age=31536000,immutable'
      });
      const coverUrl = await getDownloadURL(storageRef);

      return { success: true, coverUrl, coverPath: storagePath };
    } catch (error) {
      console.error('Error uploading category cover:', error);
      return { success: false, error: error.message };
    }
  },

  async deleteStorageFile(path) {
    try {
      if (!path) return { success: true };
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting storage file:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Eliminar categoría (soft delete)
   */
  async deleteCategory(categoryId) {
    try {
      // Verificar si tiene álbumes
      const albumsResult = await this.getAlbumsByCategory(categoryId);
      if (albumsResult.success && albumsResult.albums.length > 0) {
        return {
          success: false,
          error: 'No se puede eliminar una categoría con álbumes. Elimine los álbumes primero.'
        };
      }

      const docRef = doc(categoriesCollection, categoryId);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
      clearCategoriesByRoleCache();
      return { success: true };
    } catch (error) {
      console.error('Error deleting category:', error);
      return { success: false, error: error.message };
    }
  },

  // ==================== ÁLBUMES ====================

  /**
   * Obtener álbumes de una categoría
   */
  async getAlbumsByCategory(categoryId) {
    try {
      const q = query(
        albumsCollection,
        where('categoryId', '==', categoryId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const albums = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Reparar thumbnails rotos o faltantes en segundo plano
      // Esto se ejecuta sin bloquear la UI
      albums.forEach(album => {
        if (!album.thumbUrl) {
          this.repairAlbumThumbnailIfNeeded(album.id).catch(err =>
            console.debug('No se pudo reparar thumbnail:', err.message)
          );
        }
      });

      return { success: true, albums };
    } catch (error) {
      console.error('Error getting albums:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Obtener álbum por ID
   */
  async getAlbumById(albumId) {
    try {
      const docRef = doc(albumsCollection, albumId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return { success: false, error: 'Álbum no encontrado' };
      }

      const album = { id: docSnap.id, ...docSnap.data() };
      return { success: true, album };
    } catch (error) {
      console.error('Error getting album:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Crear nuevo álbum
   */
  async createAlbum(categoryId, data, createdBy) {
    try {
      const docRef = await addDoc(albumsCollection, {
        categoryId,
        name: data.name,
        description: data.description || '',
        createdBy,
        createdAt: serverTimestamp(),
        thumbUrl: null,
        thumbPath: null
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error('Error creating album:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Actualizar álbum
   */
  async updateAlbum(albumId, data) {
    try {
      const docRef = doc(albumsCollection, albumId);
      await updateDoc(docRef, data);
      return { success: true };
    } catch (error) {
      console.error('Error updating album:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Eliminar álbum
   */
  async deleteAlbum(albumId) {
    try {
      // Verificar si tiene media
      const mediaResult = await this.getAlbumMedia(albumId);
      if (mediaResult.success && mediaResult.media.length > 0) {
        return {
          success: false,
          error: 'No se puede eliminar un álbum con archivos. Elimine los archivos primero.'
        };
      }

      // Eliminar álbum
      const docRef = doc(albumsCollection, albumId);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting album:', error);
      return { success: false, error: error.message };
    }
  },

  // ==================== MEDIA ====================

  /**
   * Obtener archivos multimedia de un álbum
   */
  async getAlbumMedia(albumId) {
    try {
      const q = query(
        mediaCollection,
        where('albumId', '==', albumId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const media = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Auto-reparar thumbnail del álbum si no tiene o si puede estar roto
      await this.autoRepairAlbumThumbnail(albumId, media);

      return { success: true, media };
    } catch (error) {
      console.error('Error getting album media:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Repara automáticamente el thumbnail del álbum usando el primer archivo disponible
   */
  async autoRepairAlbumThumbnail(albumId, media) {
    try {
      // Buscar el primer archivo con thumbnail
      const firstWithThumb = media.find(item => item.thumbUrl);

      if (!firstWithThumb) {
        return; // No hay archivos con thumbnail
      }

      // Obtener el álbum actual
      const albumResult = await this.getAlbumById(albumId);
      if (!albumResult.success) return;

      const album = albumResult.album;

      // Si el álbum no tiene thumbnail o si es diferente al primero disponible,
      // actualizar con el del primer archivo
      if (!album.thumbUrl || album.thumbUrl !== firstWithThumb.thumbUrl) {
        console.log('Auto-reparando thumbnail del álbum con:', firstWithThumb.thumbUrl);
        await this.updateAlbum(albumId, {
          thumbUrl: firstWithThumb.thumbUrl,
          thumbPath: firstWithThumb.thumbPath || null
        });
      }
    } catch (error) {
      console.error('Error auto-repairing album thumbnail:', error);
      // No fallar silenciosamente - esto es solo una mejora
    }
  },

  /**
   * Repara el thumbnail de un álbum si es necesario (versión que obtiene los medios)
   */
  async repairAlbumThumbnailIfNeeded(albumId) {
    try {
      // Obtener los medios del álbum
      const q = query(
        mediaCollection,
        where('albumId', '==', albumId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const media = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Reparar usando los medios obtenidos
      await this.autoRepairAlbumThumbnail(albumId, media);
    } catch (error) {
      throw new Error('No se pudo reparar: ' + error.message);
    }
  },

  /**
   * Subir archivos multimedia a un álbum
   */
  async uploadAlbumMedia(categoryId, categorySlug, albumId, files, uploadedBy) {
    try {
      const results = [];
      const errors = [];
      let albumHasThumb = false;
      const albumResult = await this.getAlbumById(albumId);
      if (albumResult.success && albumResult.album.thumbUrl) {
        albumHasThumb = true;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Date.now();
        const sanitized = sanitizeFileName(file.name);
        const fileName = `${timestamp}_${i}_${sanitized}`;
        const storagePath = `institutional-gallery/${categorySlug}/albums/${albumId}/${fileName}`;

        try {
          // Subir archivo original
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);

          // Crear thumbnail si es imagen
          let thumbUrl = null;
          let thumbPath = null;
          if (file.type.startsWith('image/')) {
            const thumbBlob = await createImageThumbnail(file);
            if (thumbBlob) {
              const thumbFileName = `thumb_${timestamp}_${i}.jpg`;
              const thumbStoragePath = `institutional-gallery/${categorySlug}/albums/${albumId}/${thumbFileName}`;
              const thumbRef = ref(storage, thumbStoragePath);
              await uploadBytes(thumbRef, thumbBlob);
              thumbUrl = await getDownloadURL(thumbRef);
              thumbPath = thumbStoragePath;
            }
          }

          // Guardar documento en Firestore
          const mediaDoc = await addDoc(mediaCollection, {
            categoryId,
            albumId,
            url: downloadURL,
            path: storagePath,
            fileName: file.name,
            tipo: getMediaType(file),
            uploadedBy,
            size: file.size,
            contentType: file.type,
            createdAt: serverTimestamp(),
            thumbUrl,
            thumbPath
          });

          results.push({ id: mediaDoc.id, fileName: file.name });

          // Actualizar thumbnail del álbum con la primera imagen que tenga thumbnail
          // Esto sobrescribe thumbnails rotos o inexistentes
          if (!albumHasThumb && thumbUrl) {
            console.log('Actualizando thumbnail del álbum con imagen:', thumbUrl);
            await this.updateAlbum(albumId, { thumbUrl, thumbPath });
            albumHasThumb = true;
          }
        } catch (fileError) {
          console.error(`Error uploading ${file.name}:`, fileError);
          errors.push({ fileName: file.name, error: fileError.message });
        }
      }

      return {
        success: true,
        results,
        errors: errors.length > 0 ? errors : null
      };
    } catch (error) {
      console.error('Error in uploadAlbumMedia:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Guardar video externo (YouTube/Vimeo)
   */
  async saveExternalVideo(categoryId, albumId, videoData, uploadedBy) {
    try {
      console.log('Guardando video externo:', {
        provider: videoData.provider,
        videoId: videoData.videoId,
        thumbnailUrl: videoData.thumbnailUrl
      });

      const mediaDoc = await addDoc(mediaCollection, {
        categoryId,
        albumId,
        url: videoData.originalUrl,
        path: null,
        fileName: `${videoData.provider}-${videoData.videoId}`,
        tipo: 'video-externo',
        provider: videoData.provider,
        videoId: videoData.videoId,
        embedUrl: videoData.embedUrl,
        thumbUrl: videoData.thumbnailUrl,
        thumbPath: null,
        uploadedBy,
        size: null,
        contentType: null,
        createdAt: serverTimestamp()
      });

      // Siempre actualizar thumbnail del álbum si el video tiene thumbnail
      // Esto sobrescribe thumbnails rotos o inexistentes
      if (videoData.thumbnailUrl) {
        console.log('Actualizando thumbnail del álbum con:', videoData.thumbnailUrl);
        await this.updateAlbum(albumId, { thumbUrl: videoData.thumbnailUrl, thumbPath: null });
      } else {
        console.warn('Video externo guardado sin thumbnail URL');
      }

      return { success: true, id: mediaDoc.id };
    } catch (error) {
      console.error('Error saving external video:', error);
      return { success: false, error: error.message };
    }
  },
  /**
   * Eliminar archivo multimedia
   */
  async deleteAlbumMedia(mediaItem) {
    try {
      // Solo eliminar de Storage si tiene path (no es video externo)
      if (mediaItem.path) {
        const storageRef = ref(storage, mediaItem.path);
        await deleteObject(storageRef);
      }

      // Eliminar thumbnail si existe
      if (mediaItem.thumbPath) {
        const thumbRef = ref(storage, mediaItem.thumbPath);
        await deleteObject(thumbRef);
      }

      // Eliminar documento de Firestore
      const docRef = doc(mediaCollection, mediaItem.id);
      await deleteDoc(docRef);

      return { success: true };
    } catch (error) {
      console.error('Error deleting media:', error);
      return { success: false, error: error.message };
    }
  },

  // ==================== HELPERS ====================

  /**
   * Verificar si un usuario puede ver una categoría
   */
  canUserViewCategory(userRole, category) {
    return category.allowedRoles && category.allowedRoles.includes(userRole);
  },

  /**
   * Verificar si un usuario puede subir a la galería
   */
  canUserUploadToGallery(userRole) {
    return CAN_UPLOAD_TO_GALLERY.includes(userRole);
  }
};




