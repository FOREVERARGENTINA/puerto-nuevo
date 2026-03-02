import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { documentsService } from '../../services/documents.service';
import { documentReadReceiptsService } from '../../services/documentReadReceipts.service';
import { documentAccessService } from '../../services/documentAccess.service';
import {
  getSharedDocumentDetailRoute
} from '../../config/documentRoutes';
import Icon from '../../components/ui/Icon';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';

const toLocalDate = (value) => {
  if (!value) return null;
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date?.getTime?.()) ? null : date;
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const normalizeSizeBytes = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveDocumentSizeBytes = (documentItem) => {
  const candidates = [
    documentItem?.archivoTamanoBytes,
    documentItem?.sizeBytes,
    documentItem?.fileSizeBytes,
    documentItem?.archivoTamano
  ];

  for (const candidate of candidates) {
    const normalized = normalizeSizeBytes(candidate);
    if (normalized) return normalized;
  }

  return null;
};

const resolveDocumentAccessUrl = async (documentId, mode = 'view') => {
  if (!documentId) {
    return { success: false, error: 'Documento no valido' };
  }
  return documentAccessService.getDocumentAccessUrl(documentId, mode);
};

const VIEWER_LOAD_TIMEOUT_MS = 4500;

const detectMobileClient = () => {
  if (typeof navigator === 'undefined') return false;

  if (typeof navigator.userAgentData?.mobile === 'boolean') {
    return navigator.userAgentData.mobile;
  }

  const userAgent = navigator.userAgent || '';
  return /android|iphone|ipad|ipod|mobile|iemobile|opera mini|silk|kindle/i.test(userAgent);
};

export function DocumentDetail() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const alertDialog = useDialog();

  const [loading, setLoading] = useState(true);
  const [documentItem, setDocumentItem] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState('');

  const [viewerUrl, setViewerUrl] = useState('');
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState('');
  const [viewerFrameLoaded, setViewerFrameLoaded] = useState(false);
  const [viewerEmbedFallbackError, setViewerEmbedFallbackError] = useState('');
  const [isLikelyMobileDevice] = useState(() => detectMobileClient());
  const [allowMobileEmbeddedPreview, setAllowMobileEmbeddedPreview] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const [autoMarked, setAutoMarked] = useState(false);
  const [resolvedFileSizeBytes, setResolvedFileSizeBytes] = useState(null);

  const sharePath = getSharedDocumentDetailRoute(documentId || '');

  const isPdf = useMemo(() => {
    const fileName = documentItem?.archivoNombre || '';
    return fileName.toLowerCase().endsWith('.pdf');
  }, [documentItem?.archivoNombre]);

  const isImage = useMemo(() => {
    const fileName = (documentItem?.archivoNombre || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp)$/i.test(fileName);
  }, [documentItem?.archivoNombre]);

  const isRead = receipt?.status === 'read';
  const isPending = !isRead;
  const canTrackRead = Boolean(receipt) || user?.role === 'family';
  const showUnreadBadge = canTrackRead && !isRead;
  const showStatusBadges = Boolean(documentItem?.requiereLectura || showUnreadBadge);

  const updateReceiptAsRead = () => {
    if (!documentItem?.id || !user?.uid) return;
    setReceipt((prev) => ({
      ...(prev || {}),
      status: 'read',
      readAt: new Date(),
      documentId: documentItem.id,
      userId: user.uid
    }));
  };

  useEffect(() => {
    let cancelled = false;

    const loadDocumentData = async () => {
      if (!documentId) {
        if (!cancelled) {
          setError('Documento no valido.');
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError('');
        setViewerUrl('');
        setViewerError('');
        setViewerFrameLoaded(false);
        setViewerEmbedFallbackError('');
        setAllowMobileEmbeddedPreview(false);
        setAutoMarked(false);
        setResolvedFileSizeBytes(null);
      }

      const documentResult = await documentsService.getDocumentById(documentId);
      if (!documentResult.success) {
        if (!cancelled) {
          setError(documentResult.error || 'No se pudo cargar el documento');
          setDocumentItem(null);
          setReceipt(null);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setDocumentItem(documentResult.document);
        setResolvedFileSizeBytes(resolveDocumentSizeBytes(documentResult.document));
      }

      if (user?.uid) {
        const receiptResult = await documentReadReceiptsService.getUserReceipt(documentId, user.uid);
        if (!cancelled) {
          if (receiptResult.success) {
            setReceipt(receiptResult.receipt || null);
          } else {
            setReceipt(null);
          }
        }
      } else if (!cancelled) {
        setReceipt(null);
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    void loadDocumentData();

    return () => {
      cancelled = true;
    };
  }, [documentId, user?.uid]);

  useEffect(() => {
    const canEmbedPreview = isPdf || isImage;
    const shouldLoadEmbeddedViewer = Boolean(documentItem?.id && canEmbedPreview && user?.uid)
      && (!(isPdf && isLikelyMobileDevice) || allowMobileEmbeddedPreview);

    if (!shouldLoadEmbeddedViewer) return;

    let cancelled = false;

    const loadViewer = async () => {
      setViewerLoading(true);
      setViewerFrameLoaded(false);
      setViewerEmbedFallbackError('');
      const result = await resolveDocumentAccessUrl(documentItem.id, 'view');

      if (cancelled) return;

      if (result.success && result.url) {
        setViewerUrl(result.url);
        setViewerError('');
        const sizeBytes = normalizeSizeBytes(result.sizeBytes);
        if (sizeBytes) {
          setResolvedFileSizeBytes(sizeBytes);
        }
      } else {
        setViewerUrl('');
        setViewerError(result.error || 'No se pudo cargar la vista embebida.');
      }

      setViewerLoading(false);
    };

    void loadViewer();

    return () => {
      cancelled = true;
    };
  }, [allowMobileEmbeddedPreview, documentItem?.id, isLikelyMobileDevice, isPdf, isImage, user?.uid]);

  useEffect(() => {
    if (!isPdf || !viewerUrl || viewerLoading || viewerFrameLoaded || viewerEmbedFallbackError) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setViewerEmbedFallbackError('La vista previa no respondio en este dispositivo.');
    }, VIEWER_LOAD_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isPdf, viewerUrl, viewerLoading, viewerFrameLoaded, viewerEmbedFallbackError]);

  useEffect(() => {
    if (!documentItem?.id || !user?.uid) return;
    if (isPdf) return;
    if (resolvedFileSizeBytes) return;

    let cancelled = false;

    const loadSizeFromAccess = async () => {
      const result = await resolveDocumentAccessUrl(documentItem.id, 'view');
      if (cancelled) return;

      const sizeBytes = normalizeSizeBytes(result?.sizeBytes);
      if (sizeBytes) {
        setResolvedFileSizeBytes(sizeBytes);
      }
    };

    void loadSizeFromAccess();

    return () => {
      cancelled = true;
    };
  }, [documentItem?.id, isPdf, resolvedFileSizeBytes, user?.uid]);

  useEffect(() => {
    if (!documentItem?.id || !user?.uid) return;
    if (documentItem.requiereLectura) return;
    if (isRead || autoMarked || markingAsRead) return;
    if (!canTrackRead) return;

    let cancelled = false;

    const autoMarkRead = async () => {
      setMarkingAsRead(true);
      const result = await documentReadReceiptsService.markAsRead(documentItem.id, user.uid);

      if (cancelled) return;

      setMarkingAsRead(false);
      if (result.success) {
        updateReceiptAsRead();
        setAutoMarked(true);
      }
    };

    void autoMarkRead();

    return () => {
      cancelled = true;
    };
  }, [
    autoMarked,
    canTrackRead,
    documentItem?.id,
    documentItem?.requiereLectura,
    isRead,
    markingAsRead,
    user?.uid
  ]);

  const requestAccessUrl = async (mode = 'view') => {
    if (!documentItem?.id) return null;

    setRequestingAccess(true);
    const result = await resolveDocumentAccessUrl(documentItem.id, mode);
    setRequestingAccess(false);

    if (!result.success || !result.url) {
      alertDialog.openDialog({
        title: 'Error de acceso',
        message: result.error || 'No se pudo generar acceso temporal al archivo',
        type: 'error'
      });
      return null;
    }

    const sizeBytes = normalizeSizeBytes(result.sizeBytes);
    if (sizeBytes) {
      setResolvedFileSizeBytes(sizeBytes);
    }

    return result.url;
  };

  const handleOpenExternal = async () => {
    const url = await requestAccessUrl('view');
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = async () => {
    const url = await requestAccessUrl('download');
    if (url) {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_self';
      anchor.rel = 'noopener noreferrer';
      anchor.download = documentItem?.archivoNombre || 'documento';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    }
  };

  const handleCopyLink = async () => {
    const fullUrl = `${window.location.origin}${sharePath}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      alertDialog.openDialog({
        title: 'Enlace copiado',
        message: 'Se copio el enlace interno del documento.',
        type: 'success'
      });
    } catch {
      alertDialog.openDialog({
        title: 'No se pudo copiar',
        message: fullUrl,
        type: 'info'
      });
    }
  };

  const handleConfirmMandatoryRead = async () => {
    if (!documentItem?.id || !user?.uid || markingAsRead) return;
    if (!canTrackRead) return;

    setMarkingAsRead(true);
    const result = await documentReadReceiptsService.markAsRead(documentItem.id, user.uid);
    setMarkingAsRead(false);

    if (!result.success) {
      alertDialog.openDialog({
        title: 'Error',
        message: result.error || 'No se pudo registrar lectura',
        type: 'error'
      });
      return;
    }

    updateReceiptAsRead();
    alertDialog.openDialog({
      title: 'Lectura confirmada',
      message: 'La lectura se registro correctamente.',
      type: 'success'
    });
  };

  const handleViewerLoad = () => {
    setViewerFrameLoaded(true);
  };

  const handleViewerError = () => {
    setViewerEmbedFallbackError('No se pudo mostrar la vista previa embebida.');
  };

  const handleImagePreviewError = () => {
    setViewerError('No se pudo cargar la vista previa de la imagen.');
  };

  const handleTryEmbeddedPreview = () => {
    setAllowMobileEmbeddedPreview(true);
    setViewerEmbedFallbackError('');
    setViewerFrameLoaded(false);
  };

  if (loading) {
    return (
      <div className="container page-container">
        <div className="documents-loading-state documents-loading-state--centered" role="status" aria-live="polite">
          <span className="documents-loading-state__icon" aria-hidden="true">
            <Icon name="file" size={16} />
          </span>
          <div className="documents-loading-state__body">
            <p className="documents-loading-state__title">Cargando documento</p>
            <p className="documents-loading-state__hint">Estamos preparando el acceso seguro.</p>
          </div>
          <span className="documents-loading-state__bar" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (error || !documentItem) {
    return (
      <div className="container page-container">
        <div className="dashboard-header dashboard-header--compact">
          <div>
            <h1 className="dashboard-title">Detalle de documento</h1>
            <p className="dashboard-subtitle">No se pudo cargar el documento solicitado.</p>
          </div>
          <button type="button" onClick={() => navigate(-1)} className="btn btn--outline btn--back">
            <Icon name="chevron-left" size={16} />
            Volver
          </button>
        </div>

        <div className="alert alert--error">
          {error || 'Documento no disponible'}
        </div>
      </div>
    );
  }

  const createdAtDate = toLocalDate(documentItem.createdAt);

  return (
    <div className="container page-container document-detail-page">
      <div className="dashboard-header dashboard-header--compact document-detail-header">
        <div>
          <h1 className="dashboard-title">{documentItem.titulo || 'Documento'}</h1>
        </div>
        <button type="button" onClick={() => navigate(-1)} className="btn btn--outline btn--back">
          <Icon name="chevron-left" size={16} />
          Volver
        </button>
      </div>

      <div className="card">
        <div className="card__body document-detail-card">
          {showStatusBadges && (
            <div className="document-detail-meta">
            {documentItem.requiereLectura && (
              <span className="badge badge--warning">Obligatorio</span>
            )}
            {showUnreadBadge && (
              <span className="badge badge--warning">No leído</span>
            )}
            </div>
          )}

          {documentItem.descripcion && (
            <p className="document-detail-description">{documentItem.descripcion}</p>
          )}

          <p className="document-detail-info">
            Publicado: {createdAtDate?.toLocaleDateString('es-AR') || 'Fecha desconocida'} ·
            Tamaño: {formatFileSize(resolvedFileSizeBytes)} ·
            Subido por: {documentItem.uploadedByEmail || 'Institución'}
          </p>

          <div className="document-detail-actions">
            <button type="button" className="btn btn--primary" onClick={handleOpenExternal} disabled={requestingAccess}>
              Ver
            </button>
            <button type="button" className="btn btn--outline" onClick={handleDownload} disabled={requestingAccess}>
              Descargar
            </button>
            <button type="button" className="btn btn--outline" onClick={handleCopyLink}>
              Copiar enlace
            </button>
            {documentItem.requiereLectura && isPending && canTrackRead && (
              <button type="button" className="btn btn--success" onClick={handleConfirmMandatoryRead} disabled={markingAsRead}>
                Marcar leído
              </button>
            )}
          </div>

          {isPdf || isImage ? (
            <div className="document-detail-viewer">
              {isPdf && isLikelyMobileDevice && !allowMobileEmbeddedPreview ? (
                <div className="alert alert--info">
                  <p style={{ margin: 0 }}>
                    En celular, este PDF funciona mejor con "Abrir PDF".
                  </p>
                  <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn--primary" onClick={handleOpenExternal} disabled={requestingAccess}>
                      Abrir PDF
                    </button>
                    <button type="button" className="btn btn--outline" onClick={handleTryEmbeddedPreview}>
                      Probar vista previa
                    </button>
                  </div>
                </div>
              ) : viewerLoading ? (
                <div className="documents-loading-state documents-loading-state--inline" role="status" aria-live="polite">
                  <span className="documents-loading-state__icon" aria-hidden="true">
                    <Icon name="file" size={16} />
                  </span>
                  <div className="documents-loading-state__body">
                    <p className="documents-loading-state__title">
                      {isPdf ? 'Preparando vista previa' : 'Cargando imagen'}
                    </p>
                    <p className="documents-loading-state__hint">
                      Generando un enlace temporal seguro.
                    </p>
                  </div>
                  <span className="documents-loading-state__bar" aria-hidden="true" />
                </div>
              ) : viewerUrl && (!isPdf || !viewerEmbedFallbackError) ? (
                isPdf ? (
                  <iframe
                    src={viewerUrl}
                    title={documentItem.titulo || 'Documento PDF'}
                    className="document-detail-viewer__frame"
                    onLoad={handleViewerLoad}
                    onError={handleViewerError}
                  />
                ) : (
                  <img
                    src={viewerUrl}
                    alt={documentItem.titulo || documentItem.archivoNombre || 'Vista previa de imagen'}
                    className="document-detail-viewer__image"
                    onError={handleImagePreviewError}
                  />
                )
              ) : (
                <div className="alert alert--warning">
                  <p style={{ margin: 0 }}>
                    {viewerError || viewerEmbedFallbackError || 'No se pudo cargar la vista embebida. Usa "Ver" o "Descargar".'}
                  </p>
                  <div style={{ marginTop: 'var(--spacing-sm)' }}>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={handleOpenExternal}
                      disabled={requestingAccess}
                    >
                      Abrir PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="alert alert--info" style={{ marginTop: 'var(--spacing-md)' }}>
              Este archivo no tiene vista previa. Usa "Ver" o "Descargar".
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={alertDialog.closeDialog}
        title={alertDialog.dialogData.title}
        message={alertDialog.dialogData.message}
        type={alertDialog.dialogData.type}
      />
    </div>
  );
}

