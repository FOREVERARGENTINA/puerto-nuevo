// Constantes para validación de archivos
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

export const ALLOWED_EXTENSIONS = new Set([
  // Imágenes
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
  // Videos
  'mp4', 'mov', 'webm', 'ogv',
  // Documentos
  'pdf'
]);

export const BLOCKED_EXTENSIONS = new Set([
  'zip', 'exe', 'bat', 'cmd', 'sh', 'dll'
]);

export const ALLOWED_MIME_PREFIXES = [
  'image/',
  'video/',
  'application/pdf'
];

export const HEIC_EXTENSIONS = new Set(['heic', 'heif']);

const getFileExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase() || '';

export const isHeicFile = (file) => {
  if (!file) return false;
  const extension = getFileExtension(file.name || '');
  if (HEIC_EXTENSIONS.has(extension)) return true;
  const mime = (file.type || '').toLowerCase();
  return mime.includes('heic') || mime.includes('heif');
};

/**
 * Crea un thumbnail de una imagen usando Canvas API
 * @param {File} file - Archivo de imagen
 * @param {number} maxSize - Tamaño máximo del lado más largo
 * @param {number} quality - Calidad JPEG (0-1)
 * @returns {Promise<Blob|null>} - Blob del thumbnail o null si falla
 */
export const createImageThumbnail = async (file, maxSize = 480, quality = 0.8) => {
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
    console.error('Error creating thumbnail:', error);
    return null;
  }
};

/**
 * Valida archivos antes de subirlos
 * @param {File[]} files - Array de archivos a validar
 * @returns {Object} - { valid: File[], errors: string[] }
 */
export const validateGalleryFiles = (files) => {
  const valid = [];
  const errors = [];

  if (!files || files.length === 0) {
    errors.push('No se seleccionaron archivos');
    return { valid, errors };
  }

  for (const file of files) {
    // Validar tamaño
    if (file.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`${file.name}: Tamaño máximo 20MB`);
      continue;
    }

    // Validar extensión
    const extension = getFileExtension(file.name);
    if (!extension) {
      errors.push(`${file.name}: Sin extensión válida`);
      continue;
    }

    // Bloquear extensiones peligrosas
    if (BLOCKED_EXTENSIONS.has(extension)) {
      errors.push(`${file.name}: Tipo de archivo no permitido (.${extension})`);
      continue;
    }

    // Validar extensión permitida
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      errors.push(`${file.name}: Solo se permiten imágenes, videos y PDFs`);
      continue;
    }

    // Validar MIME type
    const mime = (file.type || '').toLowerCase();
    const mimeValid = ALLOWED_MIME_PREFIXES.some(prefix =>
      mime.startsWith(prefix)
    );
    const allowByExtension = HEIC_EXTENSIONS.has(extension) && (mime === '' || mime === 'application/octet-stream');
    if (!mimeValid) {
      if (!allowByExtension) {
        errors.push(`${file.name}: Tipo MIME no válido`);
        continue;
      }
    }

    valid.push(file);
  }

  return { valid, errors };
};

/**
 * Sanitiza nombre de archivo para storage
 * @param {string} fileName - Nombre original del archivo
 * @returns {string} - Nombre sanitizado
 */
export const sanitizeFileName = (fileName) => {
  // Reemplazar caracteres especiales excepto punto y guión
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Reemplazar caracteres especiales
    .replace(/_{2,}/g, '_'); // Reducir múltiples guiones bajos
};

/**
 * Determina el tipo de medio basado en el archivo
 * @param {File} file - Archivo
 * @returns {string} - "imagen", "video", o "pdf"
 */
export const getMediaType = (file) => {
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('image/')) return 'imagen';
  if (file.type === 'application/pdf') return 'pdf';
  return 'archivo';
};

/**
 * Comprime una imagen antes de subirla
 * @param {File} file - Archivo de imagen
 * @returns {Promise<File>} - Archivo comprimido
 */
export const compressImage = async (file, options = {}) => {
  // Importación dinámica para evitar cargar la librería si no es necesario
  const imageCompression = (await import('browser-image-compression')).default;

  const defaultOptions = {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.85,
    ...options
  };

  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Si falla la compresión, devolver el archivo original
    return file;
  }
};

let heicConverterPromise = null;

const loadHeicConverter = async () => {
  if (!heicConverterPromise) {
    heicConverterPromise = import('heic2any').then((module) => module.default || module);
  }
  return heicConverterPromise;
};

export const convertHeicToJpeg = async (file, quality = 0.9) => {
  try {
    const heic2any = await loadHeicConverter();

    const converted = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality
    });

    const blob = Array.isArray(converted) ? converted[0] : converted;
    if (!(blob instanceof Blob)) {
      throw new Error('Conversión HEIC inválida');
    }

    const originalName = file.name || 'imagen.heic';
    const safeName = originalName.replace(/\.(heic|heif)$/i, '.jpg');
    return new File([blob], safeName, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  } catch (error) {
    console.error('Error converting HEIC:', error);
    throw error;
  }
};

/**
 * Comprime imágenes específicamente para portadas de categorías
 * Optimización más agresiva para carga rápida
 */
export const compressCategoryCover = async (file) => {
  return compressImage(file, {
    maxSizeMB: 0.5,           // Máximo 500KB (muy rápido de cargar)
    maxWidthOrHeight: 1200,   // Suficiente para pantallas grandes
    initialQuality: 0.80,     // Calidad buena pero optimizada
    fileType: 'image/webp'    // WebP es más eficiente que JPEG
  });
};

/**
 * Obtiene la duración de un video
 * @param {File} file - Archivo de video
 * @returns {Promise<number>} - Duración en segundos
 */
export const getVideoDuration = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('No se pudo leer el video'));
    };

    video.src = URL.createObjectURL(file);
  });
};

/**
 * Valida un archivo de video por duración y tamaño
 * @param {File} file - Archivo de video
 * @param {number} maxDurationSeconds - Duración máxima en segundos (default: 120)
 * @param {number} maxSizeBytes - Tamaño máximo en bytes (default: 20MB)
 * @returns {Promise<Object>} - { valid, error, duration?, size? }
 */
export const validateVideoFile = async (file, maxDurationSeconds = 120, maxSizeBytes = 20 * 1024 * 1024) => {
  try {
    const duration = await getVideoDuration(file);

    if (duration > maxDurationSeconds) {
      return {
        valid: false,
        error: 'duration',
        duration: Math.round(duration),
        maxDuration: maxDurationSeconds
      };
    }

    if (file.size > maxSizeBytes) {
      return {
        valid: false,
        error: 'size',
        size: file.size,
        maxSize: maxSizeBytes
      };
    }

    return { valid: true, duration: Math.round(duration) };
  } catch (error) {
    console.error('Error validating video:', error);
    return {
      valid: false,
      error: 'invalid',
      message: 'No se pudo leer el video'
    };
  }
};

/**
 * Valida y extrae información de una URL de YouTube
 * @param {string} url - URL de YouTube
 * @returns {Object|null} - { valid, videoId, provider } o null
 */
export const parseYouTubeUrl = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        valid: true,
        videoId: match[1],
        provider: 'youtube',
        embedUrl: `https://www.youtube.com/embed/${match[1]}`
      };
    }
  }

  return null;
};

const checkImageExists = (url, timeout = 3000) => new Promise(resolve => {
  const img = new Image();
  const timer = setTimeout(() => {
    img.src = ''; // Cancelar carga
    resolve(false);
  }, timeout);

  img.onload = () => {
    clearTimeout(timer);
    // Verificar que la imagen tenga dimensiones razonables (no es un placeholder 1x1)
    resolve(img.naturalWidth > 100 && img.naturalHeight > 100);
  };
  img.onerror = () => {
    clearTimeout(timer);
    resolve(false);
  };
  img.src = url;
});

export const getBestYouTubeThumbnailUrl = async (videoId) => {
  if (!videoId) return null;

  // Intentar maxresdefault primero (mejor calidad)
  const maxRes = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const hasMaxRes = await checkImageExists(maxRes);
  if (hasMaxRes) {
    console.log(`YouTube thumbnail (maxres): ${maxRes}`);
    return maxRes;
  }

  // Fallback a hqdefault (calidad media-alta)
  const hq = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const hasHq = await checkImageExists(hq);
  if (hasHq) {
    console.log(`YouTube thumbnail (hq): ${hq}`);
    return hq;
  }

  // Último fallback a mqdefault (siempre existe para videos públicos)
  const mq = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  console.log(`YouTube thumbnail (mq fallback): ${mq}`);
  return mq;
};

/**
 * Valida y extrae información de una URL de Vimeo
 * @param {string} url - URL de Vimeo
 * @returns {Object|null} - { valid, videoId, provider } o null
 */
export const parseVimeoUrl = (url) => {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return {
        valid: true,
        videoId: match[1],
        provider: 'vimeo',
        embedUrl: `https://player.vimeo.com/video/${match[1]}`,
        // Nota: Vimeo requiere API call para thumbnail, lo manejamos después
        thumbnailUrl: null
      };
    }
  }

  return null;
};

/**
 * Valida cualquier URL de video externa (YouTube o Vimeo)
 * @param {string} url - URL del video
 * @returns {Object} - { valid, provider?, videoId?, error? }
 */
export const parseVideoUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL inválida' };
  }

  const trimmedUrl = url.trim();

  // Intentar YouTube
  const youtubeData = parseYouTubeUrl(trimmedUrl);
  if (youtubeData) {
    return youtubeData;
  }

  // Intentar Vimeo
  const vimeoData = parseVimeoUrl(trimmedUrl);
  if (vimeoData) {
    return vimeoData;
  }

  return {
    valid: false,
    error: 'Solo se aceptan URLs de YouTube o Vimeo'
  };
};

/**
 * Obtiene el thumbnail de un video de Vimeo usando su API oEmbed
 * @param {string} videoId - ID del video de Vimeo
 * @returns {Promise<string|null>} - URL del thumbnail o null
 */
export const getVimeoThumbnailUrl = async (videoId) => {
  if (!videoId) return null;

  try {
    // Usar oEmbed API con width para obtener mejor calidad
    const oEmbedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}&width=640`;
    console.log('Obteniendo thumbnail de Vimeo desde:', oEmbedUrl);

    const response = await fetch(oEmbedUrl);

    if (!response.ok) {
      console.error('Error en respuesta de Vimeo oEmbed:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('Datos de Vimeo oEmbed:', data);

    const thumbnailUrl = data.thumbnail_url;

    if (thumbnailUrl) {
      console.log('Thumbnail de Vimeo obtenido:', thumbnailUrl);
      return thumbnailUrl;
    }

    console.warn('No se encontró thumbnail_url en la respuesta de Vimeo');
    return null;
  } catch (error) {
    console.error('Error fetching Vimeo thumbnail:', error);
    return null;
  }
};

export const parseVideoUrlWithThumbnail = async (url) => {
  const parsed = parseVideoUrl(url);
  if (!parsed.valid) return parsed;

  if (parsed.provider === 'youtube') {
    const thumbnailUrl = await getBestYouTubeThumbnailUrl(parsed.videoId);
    return { ...parsed, thumbnailUrl };
  }

  if (parsed.provider === 'vimeo') {
    const thumbnailUrl = await getVimeoThumbnailUrl(parsed.videoId);
    return { ...parsed, thumbnailUrl };
  }

  return parsed;
};

