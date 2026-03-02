import app, { auth } from '../config/firebase';

const PROJECT_ID = app?.options?.projectId || 'puerto-nuevo-montessori';
const DEFAULT_FUNCTIONS_BASE_URL = `https://us-central1-${PROJECT_ID}.cloudfunctions.net`;

function resolveFunctionsBaseUrl() {
  const envBaseUrl = typeof import.meta !== 'undefined'
    ? (import.meta.env.VITE_FUNCTIONS_BASE_URL || '').trim()
    : '';

  return envBaseUrl || DEFAULT_FUNCTIONS_BASE_URL;
}

export const documentAccessService = {
  async getDocumentAccessUrl(documentId, mode = 'view') {
    try {
      const normalizedDocumentId = typeof documentId === 'string' ? documentId.trim() : '';
      const normalizedMode = mode === 'download' ? 'download' : 'view';

      if (!normalizedDocumentId) {
        return { success: false, error: 'documentId es obligatorio' };
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        return { success: false, error: 'Usuario no autenticado' };
      }

      const token = await currentUser.getIdToken();
      const endpoint = `${resolveFunctionsBaseUrl()}/getDocumentAccessUrl`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          documentId: normalizedDocumentId,
          mode: normalizedMode
        })
      });

      const payload = await response.json().catch(() => ({}));
      const payloadSizeBytes = Number(payload?.sizeBytes);
      const sizeBytes = Number.isFinite(payloadSizeBytes) && payloadSizeBytes > 0
        ? payloadSizeBytes
        : null;

      if (!response.ok || !payload?.success || !payload?.url) {
        return {
          success: false,
          error: payload?.error || 'No se pudo obtener acceso temporal al documento'
        };
      }

      return {
        success: true,
        url: payload.url,
        expiresAt: payload.expiresAt || null,
        sizeBytes
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'No se pudo obtener acceso temporal al documento'
      };
    }
  }
};
