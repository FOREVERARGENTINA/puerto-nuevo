const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('node:crypto');

const ADMIN_ROLES = new Set(['superadmin', 'coordinacion']);
const ALLOWED_ORIGINS = new Set([
  'https://montessoripuertonuevo.com.ar',
  'https://www.montessoripuertonuevo.com.ar',
]);
// eslint-disable-next-line security/detect-unsafe-regex -- anchored regex, no catastrophic backtracking possible
const LOCALHOST_ORIGIN_REGEX = /^https?:\/\/localhost(:\d{1,5})?$/i;
const SIGNED_URL_TTL_MS = 10 * 60 * 1000;

function normalizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeRole(value) {
  const role = normalizeString(value).toLowerCase();
  if (role === 'teacher' || role === 'teachers' || role === 'doeente') return 'docente';
  return role;
}

function normalizeScope(rawValue) {
  const value = normalizeString(rawValue).toLowerCase();
  if (!value || value === 'todos' || value === 'all') return 'global';
  if (value === 'global') return 'global';
  if (value === 'taller1') return 'taller1';
  if (value === 'taller2') return 'taller2';
  return 'global';
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  return LOCALHOST_ORIGIN_REGEX.test(origin);
}

function applyCorsHeaders(req, res, allowedMethods = 'POST, OPTIONS') {
  const origin = normalizeString(req.get('origin'));

  if (origin && isAllowedOrigin(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
  }

  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Range');
  res.set('Access-Control-Allow-Methods', allowedMethods);
  res.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Length, Content-Range, Content-Type');

  if (!isAllowedOrigin(origin)) {
    res.status(403).json({ success: false, error: 'Origen no permitido' });
    return true;
  }

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }

  return false;
}

function extractBearerToken(req) {
  const authHeader = normalizeString(req.get('authorization'));
  if (!authHeader.toLowerCase().startsWith('bearer ')) return '';
  return authHeader.slice(7).trim();
}

function parseRequestBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

function decodeStoragePathFromUrl(rawUrl) {
  const urlValue = normalizeString(rawUrl);
  if (!urlValue) return '';

  if (urlValue.startsWith('gs://')) {
    const segments = urlValue.split('/');
    if (segments.length >= 4) {
      return segments.slice(3).join('/');
    }
    return '';
  }

  try {
    const parsed = new URL(urlValue);
    const marker = '/o/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return '';

    const encodedPath = parsed.pathname.slice(markerIndex + marker.length);
    return decodeURIComponent(encodedPath).replace(/^\/+/, '');
  } catch {
    return '';
  }
}

function decodeStorageBucketFromUrl(rawUrl) {
  const urlValue = normalizeString(rawUrl);
  if (!urlValue) return '';

  if (urlValue.startsWith('gs://')) {
    const withoutScheme = urlValue.slice(5);
    const slashIndex = withoutScheme.indexOf('/');
    if (slashIndex <= 0) return '';
    return withoutScheme.slice(0, slashIndex);
  }

  try {
    const parsed = new URL(urlValue);
    const match = parsed.pathname.match(/\/b\/([^/]+)\/o\//i);
    return match?.[1] ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
}

function resolveStoragePath(documentData) {
  const explicit = normalizeString(documentData?.storagePath).replace(/^\/+/, '');
  if (explicit) return explicit;

  const categoria = normalizeString(documentData?.categoria);
  const fileName = normalizeString(documentData?.archivoNombre);
  if (categoria && fileName) {
    return `documents/${categoria}/${fileName}`;
  }

  return decodeStoragePathFromUrl(documentData?.archivoURL);
}

function resolveStorageBucket(documentData) {
  const explicit = normalizeString(documentData?.storageBucket || documentData?.bucket);
  if (explicit) return explicit;
  return decodeStorageBucketFromUrl(documentData?.archivoURL);
}

function sanitizeFileName(fileName) {
  const raw = normalizeString(fileName);
  if (!raw) return 'documento';
  return raw.replace(/[\\/\r\n\t\0]/g, '').slice(0, 160) || 'documento';
}

function isPdfDocument(documentData = {}) {
  const explicitType = normalizeString(documentData?.contentType || documentData?.mimeType).toLowerCase();
  if (explicitType === 'application/pdf') return true;

  const fileName = normalizeString(documentData?.archivoNombre).toLowerCase();
  return fileName.endsWith('.pdf');
}

function buildResponseDisposition(mode, fileName) {
  const safeFileName = sanitizeFileName(fileName);
  const escapedName = safeFileName.replace(/"/g, '');

  if (mode === 'download') {
    return `attachment; filename="${escapedName}"`;
  }

  return `inline; filename="${escapedName}"`;
}

function buildLegacyAccessUrl(rawUrl, mode, fileName) {
  const baseUrl = normalizeString(rawUrl);
  if (!baseUrl) return '';

  const disposition = buildResponseDisposition(mode, fileName);

  try {
    const parsed = new URL(baseUrl);
    parsed.searchParams.set('response-content-disposition', disposition);
    if (mode === 'view' && normalizeString(fileName).toLowerCase().endsWith('.pdf')) {
      parsed.searchParams.set('response-content-type', 'application/pdf');
    }
    return parsed.toString();
  } catch {
    return baseUrl;
  }
}

function buildProtectedPreviewUrl(req, previewToken) {
  const forwardedProtocol = normalizeString(req.get('x-forwarded-proto'));
  const protocol = forwardedProtocol === 'http' ? 'http' : 'https';
  const host = normalizeString(req.get('host'));
  const originalPath = normalizeString(req.originalUrl || req.path).split('?')[0];
  // En Functions v2, req.originalUrl puede llegar como `/` aunque la función
  // se haya invocado por su nombre. Conservamos el prefijo del emulador si lo
  // hubiera y siempre fijamos explícitamente el endpoint de streaming.
  const pathPrefix = originalPath.replace(/\/[^/]*$/, '');
  const previewPath = `${pathPrefix}/getProtectedDocumentPreview`;

  return `${protocol}://${host}${previewPath}?token=${encodeURIComponent(previewToken)}`;
}

function parseByteRange(rangeHeader, totalSize) {
  const rawRange = normalizeString(rangeHeader);
  if (!rawRange) return null;

  const match = /^bytes=(\d*)-(\d*)$/i.exec(rawRange);
  if (!match) return { invalid: true };

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return { invalid: true };

  let start;
  let end;

  if (!rawStart) {
    const suffixLength = Number(rawEnd);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return { invalid: true };
    start = Math.max(totalSize - suffixLength, 0);
    end = totalSize - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : totalSize - 1;
  }

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= totalSize || end < start) {
    return { invalid: true };
  }

  return { start, end: Math.min(end, totalSize - 1) };
}

function matchesResponsable(entry, uid) {
  if (typeof entry === 'string') {
    return entry.trim() === uid;
  }

  if (entry && typeof entry.uid === 'string') {
    return entry.uid.trim() === uid;
  }

  return false;
}

async function getUserRole(uid, tokenRole) {
  const normalizedTokenRole = normalizeRole(tokenRole);
  if (normalizedTokenRole) return normalizedTokenRole;

  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!userDoc.exists) return '';
  return normalizeRole(userDoc.data()?.role);
}

async function getFamilyAmbientes(uid) {
  const ambientes = new Set();
  const db = admin.firestore();

  const directSnapshot = await db
    .collection('children')
    .where('responsables', 'array-contains', uid)
    .limit(120)
    .get();

  directSnapshot.forEach((childDoc) => {
    const ambiente = normalizeScope(childDoc.data()?.ambiente);
    if (ambiente === 'taller1' || ambiente === 'taller2') {
      ambientes.add(ambiente);
    }
  });

  if (ambientes.size === 2) {
    return ambientes;
  }

  const fallbackSnapshot = await db
    .collection('children')
    .where('ambiente', 'in', ['taller1', 'taller2'])
    .limit(300)
    .get();

  fallbackSnapshot.forEach((childDoc) => {
    const childData = childDoc.data() || {};
    const responsables = Array.isArray(childData.responsables) ? childData.responsables : [];
    const isResponsible = responsables.some((entry) => matchesResponsable(entry, uid));
    if (!isResponsible) return;

    const ambiente = normalizeScope(childData.ambiente);
    if (ambiente === 'taller1' || ambiente === 'taller2') {
      ambientes.add(ambiente);
    }
  });

  return ambientes;
}

async function canUserAccessDocument(user, documentData) {
  const userRole = normalizeRole(user.role);
  if (!userRole) return false;

  if (ADMIN_ROLES.has(userRole)) {
    return true;
  }

  const documentRoles = Array.isArray(documentData?.roles)
    ? documentData.roles.map(normalizeRole).filter(Boolean)
    : [];

  if (!documentRoles.includes(userRole)) {
    return false;
  }

  if (userRole !== 'family') {
    return true;
  }

  const documentScope = normalizeScope(documentData?.ambiente);
  if (documentScope === 'global') {
    return true;
  }

  const familyAmbientes = await getFamilyAmbientes(user.uid);
  return familyAmbientes.has(documentScope);
}

exports.getDocumentAccessUrl = onRequest(async (req, res) => {
  if (applyCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Metodo no permitido' });
    return;
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: 'Token de autorizacion requerido' });
    return;
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(token);
  } catch {
    res.status(401).json({ success: false, error: 'Token invalido' });
    return;
  }

  const payload = parseRequestBody(req);
  const documentId = normalizeString(payload?.documentId);
  const requestedMode = normalizeString(payload?.mode).toLowerCase();
  const mode = requestedMode === 'download'
    ? 'download'
    : requestedMode === 'preview'
      ? 'preview'
      : 'view';

  if (!documentId) {
    res.status(400).json({ success: false, error: 'documentId es obligatorio' });
    return;
  }

  try {
    const db = admin.firestore();
    const user = {
      uid: decodedToken.uid,
      role: await getUserRole(decodedToken.uid, decodedToken.role),
    };

    if (!user.role) {
      res.status(403).json({ success: false, error: 'No se pudo resolver el rol del usuario' });
      return;
    }

    const documentRef = await db.collection('documents').doc(documentId).get();
    if (!documentRef.exists) {
      res.status(404).json({ success: false, error: 'Documento no encontrado' });
      return;
    }

    const documentData = documentRef.data() || {};
    const hasAccess = await canUserAccessDocument(user, documentData);

    if (!hasAccess) {
      res.status(403).json({ success: false, error: 'No tienes permisos para acceder a este documento' });
      return;
    }

    const storagePath = resolveStoragePath(documentData);
    if (!storagePath) {
      res.status(422).json({ success: false, error: 'No se pudo resolver la ruta del archivo' });
      return;
    }

    const storageBucket = resolveStorageBucket(documentData);
    const bucket = storageBucket ? admin.storage().bucket(storageBucket) : admin.storage().bucket();
    const fileRef = bucket.file(storagePath);
    const [exists] = await fileRef.exists();
    let sizeBytes = Number(documentData?.archivoTamanoBytes);

    if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
      sizeBytes = null;
    }

    if (!exists) {
      const legacyUrl = buildLegacyAccessUrl(documentData?.archivoURL, mode, documentData?.archivoNombre);
      if (legacyUrl) {
        res.status(200).json({
          success: true,
          url: legacyUrl,
          expiresAt: null,
          sizeBytes,
        });
        return;
      }

      res.status(404).json({ success: false, error: 'El archivo ya no esta disponible' });
      return;
    }

    try {
      const [metadata] = await fileRef.getMetadata();
      const metadataSize = Number(metadata?.size);
      if (Number.isFinite(metadataSize) && metadataSize > 0) {
        sizeBytes = metadataSize;
      }
    } catch (metadataError) {
      console.warn('[getDocumentAccessUrl] No se pudo leer metadata de tamano:', metadataError?.message || metadataError);
    }

    if (mode === 'preview') {
      if (!isPdfDocument(documentData)) {
        res.status(422).json({ success: false, error: 'La vista previa protegida solo admite PDF' });
        return;
      }

      const previewToken = crypto.randomBytes(32).toString('base64url');
      const expiresAt = Date.now() + SIGNED_URL_TTL_MS;
      await db.collection('protectedDocumentPreviewTokens').doc(previewToken).set({
        documentId,
        storagePath,
        storageBucket: storageBucket || null,
        expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        success: true,
        url: buildProtectedPreviewUrl(req, previewToken),
        expiresAt,
        sizeBytes,
      });
      return;
    }

    const expiresAt = Date.now() + SIGNED_URL_TTL_MS;
    let url = '';
    const shouldForcePdfResponseType = mode === 'view' && isPdfDocument(documentData);

    try {
      [url] = await fileRef.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiresAt,
        responseDisposition: buildResponseDisposition(mode, documentData?.archivoNombre),
        ...(shouldForcePdfResponseType ? { responseType: 'application/pdf' } : {}),
      });
    } catch (signError) {
      const legacyUrl = buildLegacyAccessUrl(documentData?.archivoURL, mode, documentData?.archivoNombre);
      if (legacyUrl) {
        console.warn('[getDocumentAccessUrl] Fallback a archivoURL por error en signed URL:', signError?.message || signError);
        res.status(200).json({
          success: true,
          url: legacyUrl,
          expiresAt: null,
          sizeBytes,
        });
        return;
      }

      throw signError;
    }

    res.status(200).json({
      success: true,
      url,
      expiresAt,
      sizeBytes,
    });
  } catch (error) {
    console.error('[getDocumentAccessUrl] Error generando URL firmada:', error);
    res.status(500).json({ success: false, error: 'No se pudo generar acceso temporal al documento' });
  }
});

// El token temporal es la credencial de esta URL. El endpoint debe admitir
// invocaciones públicas para que PDF.js pueda pedir los rangos del archivo;
// la autorización de Firebase ya se verificó al crear el token.
exports.getProtectedDocumentPreview = onRequest({ invoker: 'public' }, async (req, res) => {
  if (applyCorsHeaders(req, res, 'GET, HEAD, OPTIONS')) return;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ success: false, error: 'Metodo no permitido' });
    return;
  }

  const previewToken = normalizeString(req.query?.token);
  if (!/^[A-Za-z0-9_-]{43}$/.test(previewToken)) {
    res.status(400).json({ success: false, error: 'Token de vista previa invalido' });
    return;
  }

  try {
    const tokenRef = admin.firestore().collection('protectedDocumentPreviewTokens').doc(previewToken);
    const tokenSnapshot = await tokenRef.get();
    const preview = tokenSnapshot.data();
    const expiresAt = Number(preview?.expiresAt);

    if (!tokenSnapshot.exists || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      if (tokenSnapshot.exists) await tokenRef.delete();
      res.status(403).json({ success: false, error: 'La vista previa expiro' });
      return;
    }

    const storagePath = normalizeString(preview?.storagePath).replace(/^\/+/, '');
    if (!storagePath) {
      res.status(404).json({ success: false, error: 'Archivo no disponible' });
      return;
    }

    const storageBucket = normalizeString(preview?.storageBucket);
    const bucket = storageBucket ? admin.storage().bucket(storageBucket) : admin.storage().bucket();
    const fileRef = bucket.file(storagePath);
    const [metadata] = await fileRef.getMetadata();
    const totalSize = Number(metadata?.size);

    if (!Number.isSafeInteger(totalSize) || totalSize <= 0) {
      res.status(404).json({ success: false, error: 'Archivo no disponible' });
      return;
    }

    const byteRange = parseByteRange(req.get('range'), totalSize);
    if (byteRange?.invalid) {
      res.set('Content-Range', `bytes */${totalSize}`);
      res.status(416).end();
      return;
    }

    const start = byteRange?.start ?? 0;
    const end = byteRange?.end ?? (totalSize - 1);
    const contentLength = end - start + 1;
    const partial = Boolean(byteRange);

    res.status(partial ? 206 : 200);
    res.set({
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store, max-age=0',
      'Content-Disposition': 'inline',
      'Content-Length': String(contentLength),
      'Content-Type': 'application/pdf',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    });
    if (partial) {
      res.set('Content-Range', `bytes ${start}-${end}/${totalSize}`);
    }

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fileRef.createReadStream({ start, end });
    stream.on('error', (error) => {
      console.error('[getProtectedDocumentPreview] Error transmitiendo PDF:', error);
      res.destroy(error);
    });
    stream.pipe(res);
  } catch (error) {
    console.error('[getProtectedDocumentPreview] Error preparando PDF:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'No se pudo cargar la vista previa protegida' });
    } else {
      res.destroy(error);
    }
  }
});
