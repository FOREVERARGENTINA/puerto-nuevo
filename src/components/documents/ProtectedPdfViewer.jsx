import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const MAX_CANVAS_PIXELS = 16_000_000;

function ProtectedPdfPage({ document, pageNumber, scrollRoot, viewportWidth, zoom }) {
  const frameRef = useRef(null);
  const canvasRef = useRef(null);
  const [nearViewport, setNearViewport] = useState(pageNumber === 1);
  const [rendering, setRendering] = useState(pageNumber === 1);
  const [dimensions, setDimensions] = useState(null);

  useEffect(() => {
    const frame = frameRef.current;
    const root = scrollRoot.current;
    if (!frame || !root || nearViewport) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { root, rootMargin: '600px 0px' }
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [nearViewport, scrollRoot]);

  useEffect(() => {
    if (!nearViewport || !document || !canvasRef.current || !viewportWidth) return undefined;

    let cancelled = false;

    const renderPage = async () => {
      setRendering(true);
      try {
        const page = await document.getPage(pageNumber);
        if (cancelled || !canvasRef.current) return;

        const originalViewport = page.getViewport({ scale: 1 });
        const pageWidth = Math.max(viewportWidth - 24, 280) * zoom;
        const pageHeight = pageWidth * (originalViewport.height / originalViewport.width);
        const requestedScale = (pageWidth / originalViewport.width) * Math.min(window.devicePixelRatio || 1, 2);
        const maximumScale = Math.sqrt(
          MAX_CANVAS_PIXELS / (originalViewport.width * originalViewport.height)
        );
        const renderViewport = page.getViewport({ scale: Math.min(requestedScale, maximumScale) });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);
        canvas.style.width = `${Math.ceil(pageWidth)}px`;
        canvas.style.height = `${Math.ceil(pageHeight)}px`;
        setDimensions({ width: pageWidth, height: pageHeight });

        await page.render({ canvasContext: context, viewport: renderViewport }).promise;
        if (!cancelled) setRendering(false);
      } catch (error) {
        console.error(`[ProtectedPdfViewer] Error renderizando página ${pageNumber}:`, error);
        if (!cancelled) setRendering(false);
      }
    };

    void renderPage();
    return () => {
      cancelled = true;
    };
  }, [document, nearViewport, pageNumber, viewportWidth, zoom]);

  const fallbackHeight = Math.max(viewportWidth * 1.35, 380) * zoom;
  return (
    <div
      ref={frameRef}
      className="document-detail-viewer__page"
      style={{
        minHeight: `${dimensions?.height || fallbackHeight}px`,
        width: `${dimensions?.width || Math.max(viewportWidth - 24, 280) * zoom}px`
      }}
    >
      <canvas ref={canvasRef} className="document-detail-viewer__canvas" />
      {rendering && <span className="document-detail-viewer__page-loading">Cargando página…</span>}
    </div>
  );
}

// Lector aislado para móviles: scroll vertical familiar y renderizado diferido.
// No se entrega el PDF al visor nativo ni se muestran controles de descarga.
export function ProtectedPdfViewer({ url, title }) {
  const scrollRootRef = useRef(null);
  const [document, setDocument] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [error, setError] = useState('');

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return undefined;

    const updateWidth = () => setViewportWidth(root.clientWidth);
    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(root);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!url) return undefined;

    let cancelled = false;
    let loadedDocument = null;
    const loadingTask = pdfjsLib.getDocument({ url });

    const loadDocument = async () => {
      setError('');
      setDocument(null);
      setPageCount(0);
      setZoom(MIN_ZOOM);

      try {
        loadedDocument = await loadingTask.promise;
        if (cancelled) return;
        setDocument(loadedDocument);
        setPageCount(loadedDocument.numPages);
      } catch (loadError) {
        console.error('[ProtectedPdfViewer] Error cargando PDF:', loadError);
        if (!cancelled) {
          setError('No se pudo cargar el documento. Intenta nuevamente.');
        }
      }
    };

    void loadDocument();
    return () => {
      cancelled = true;
      loadingTask.destroy();
      loadedDocument?.destroy?.();
    };
  }, [url]);

  const decreaseZoom = () => setZoom((currentZoom) => Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP));
  const increaseZoom = () => setZoom((currentZoom) => Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP));
  const resetZoom = () => setZoom(MIN_ZOOM);

  if (error) {
    return <div className="alert alert--warning">{error}</div>;
  }

  return (
    <div className="document-detail-viewer__protected-shell">
      <div
        ref={scrollRootRef}
        className={`document-detail-viewer__protected${zoom > MIN_ZOOM ? ' document-detail-viewer__protected--zoomed' : ''}`}
        role="region"
        aria-label={title || 'Documento PDF protegido'}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="document-detail-viewer__pages">
          {document && Array.from({ length: pageCount }, (_, index) => (
            <ProtectedPdfPage
              key={index + 1}
              document={document}
              pageNumber={index + 1}
              scrollRoot={scrollRootRef}
              viewportWidth={viewportWidth}
              zoom={zoom}
            />
          ))}
          {!document && <span className="document-detail-viewer__protected-loading">Cargando documento…</span>}
        </div>
      </div>

      <div className="document-detail-viewer__protected-controls" aria-label="Zoom del documento">
        <button type="button" onClick={decreaseZoom} disabled={!document || zoom <= MIN_ZOOM} aria-label="Alejar documento">−</button>
        <button type="button" className="document-detail-viewer__zoom-value" onClick={resetZoom} disabled={!document}>
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" onClick={increaseZoom} disabled={!document || zoom >= MAX_ZOOM} aria-label="Ampliar documento">+</button>
      </div>
    </div>
  );
}
