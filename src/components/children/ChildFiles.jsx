import { useEffect, useState } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useDialog } from '../../hooks/useDialog';
import { childrenService } from '../../services/children.service';
import { studentReportsService } from '../../services/studentReports.service';
import { AlertDialog } from '../common/AlertDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { FileSelectionList, FileUploadSelector } from '../common/FileUploadSelector';
import Icon from '../ui/Icon';

const CURRENT_YEAR = new Date().getFullYear();

const toDate = (value) => {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * Archivos de la ficha: informes (subcolección /reports, con período y año) y
 * documentos adjuntos (array `documentos` del alumno, con descripción).
 * Una sola lista y una sola carga; cada tipo se guarda donde siempre se guardó.
 */
export function ChildFiles({
  childId,
  documentos = [],
  onDocumentosChange,
  canUploadReports = false,
  canManageAll = false
}) {
  const { user } = useAuth();
  const alertDialog = useDialog();
  const confirmDialog = useDialog();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [tipo, setTipo] = useState('informe');
  const [file, setFile] = useState(null);
  const [periodo, setPeriodo] = useState('');
  const [anio, setAnio] = useState(CURRENT_YEAR);
  const [descripcion, setDescripcion] = useState('');

  const canUpload = canUploadReports || canManageAll;
  // EOE solo sube informes; admin elige el tipo
  const effectiveTipo = canManageAll ? tipo : 'informe';

  const loadReports = async () => {
    if (!childId) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await studentReportsService.getReportsByChild(childId);
    if (result.success) setReports(result.reports);
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    loadReports();
  }, [childId]);

  const showError = (message) => alertDialog.openDialog({ title: 'Error', message, type: 'error' });

  const persistDocumentos = async (next) => {
    const result = await childrenService.updateChild(childId, { documentos: next });
    if (!result.success) throw new Error(result.error);
    onDocumentosChange?.(next);
  };

  const items = [
    ...reports.map(r => ({
      key: `r-${r.id}`,
      kind: 'informe',
      title: `${r.periodo} ${r.anio}`,
      meta: [r.archivoNombre, formatSize(r.archivoTamanoBytes)].filter(Boolean).join(' · '),
      date: toDate(r.createdAt),
      report: r
    })),
    ...documentos.map((d, index) => ({
      key: `d-${index}-${d.storagePath || d.url}`,
      kind: 'documento',
      title: d.descripcion || d.nombre,
      meta: [d.descripcion ? d.nombre : '', formatSize(d['tamaño'])].filter(Boolean).join(' · '),
      date: toDate(d.fechaSubida),
      doc: d,
      index
    }))
  ].sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  const handleFileSelected = (files) => {
    const selected = Array.isArray(files) ? files[0] : null;
    const error = studentReportsService.validateReportFile(selected);
    if (error) {
      alertDialog.openDialog({ title: 'Archivo no válido', message: error, type: 'warning' });
      return;
    }
    setFile(selected);
  };

  const resetUpload = () => {
    setFile(null);
    setDescripcion('');
    setPeriodo('');
    setAnio(CURRENT_YEAR);
  };

  const handleUpload = async () => {
    if (!file) return;
    if (effectiveTipo === 'informe' && (!periodo.trim() || !String(anio).trim())) {
      alertDialog.openDialog({ title: 'Faltan datos', message: 'Indicá el período y el año del informe.', type: 'warning' });
      return;
    }
    if (effectiveTipo === 'documento' && !descripcion.trim()) {
      alertDialog.openDialog({ title: 'Falta la descripción', message: 'Escribí qué documento es (ej: Ficha de inscripción 2026).', type: 'warning' });
      return;
    }

    setUploading(true);
    try {
      if (effectiveTipo === 'informe') {
        const result = await studentReportsService.uploadReport(childId, file, {
          periodo: periodo.trim(),
          anio: Number(anio),
          uploadedBy: user?.uid || '',
          uploadedByEmail: user?.email || ''
        });
        if (!result.success) throw new Error(result.error);
        await loadReports();
      } else {
        const storagePath = `private/children/${childId}/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, storagePath);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        await persistDocumentos([
          ...documentos,
          {
            nombre: file.name,
            descripcion: descripcion.trim(),
            url,
            storagePath,
            tipo: file.type,
            tamaño: file.size,
            fechaSubida: new Date().toISOString()
          }
        ]);
      }
      resetUpload();
    } catch (error) {
      showError('No se pudo subir el archivo: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (item) => {
    if (item.kind === 'documento') {
      window.open(item.doc.url, '_blank', 'noopener,noreferrer');
      return;
    }
    setBusyId(item.key);
    const result = await studentReportsService.downloadReport(item.report);
    setBusyId(null);
    if (!result.success) {
      showError('No se pudo descargar el informe: ' + result.error);
      return;
    }
    const objectUrl = URL.createObjectURL(result.blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = result.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  const handleDelete = (item) => {
    confirmDialog.openDialog({
      title: item.kind === 'informe' ? 'Eliminar informe' : 'Eliminar documento',
      message: `Se eliminará "${item.title}". Esta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        try {
          if (item.kind === 'informe') {
            const result = await studentReportsService.deleteReport(childId, item.report.id, item.report.storagePath);
            if (!result.success) throw new Error(result.error);
            await loadReports();
          } else {
            if (item.doc.storagePath) {
              try {
                await deleteObject(ref(storage, item.doc.storagePath));
              } catch (error) {
                if (error?.code !== 'storage/object-not-found') throw error;
              }
            }
            await persistDocumentos(documentos.filter((_, i) => i !== item.index));
          }
        } catch (error) {
          showError('No se pudo eliminar: ' + error.message);
        }
      }
    });
  };

  if (!childId) {
    return (
      <div className="alert alert--info">
        <strong>Primero guardá la ficha del alumno</strong>
        <span style={{ display: 'block', marginTop: '4px', fontSize: 'var(--font-size-sm)' }}>
          Después vas a poder adjuntar informes y documentos.
        </span>
      </div>
    );
  }

  return (
    <div className="child-files">
      <h4 className="child-form__subtitle">Archivos{items.length ? ` (${items.length})` : ''}</h4>

      {loading ? (
        <p className="muted-text">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="muted-text">Todavía no hay informes ni documentos.</p>
      ) : (
        <ul className="child-files__list">
          {items.map(item => (
            <li key={item.key} className="child-files__item">
              <span className="child-files__icon" aria-hidden="true"><Icon name="file" size={16} /></span>
              <div className="child-files__info">
                <div className="child-files__title">
                  {item.title}
                  <span className={`child-files__kind child-files__kind--${item.kind}`}>
                    {item.kind === 'informe' ? 'Informe' : 'Documento'}
                  </span>
                </div>
                <div className="child-files__meta">
                  {[item.meta, item.date?.toLocaleDateString('es-AR')].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div className="child-files__actions">
                <button
                  type="button"
                  className="btn btn--sm btn--outline"
                  onClick={() => handleOpen(item)}
                  disabled={busyId === item.key}
                >
                  {busyId === item.key ? 'Descargando...' : 'Ver'}
                </button>
                {canManageAll && (
                  <button type="button" className="btn btn--sm btn--text btn--danger" onClick={() => handleDelete(item)}>
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canUpload && (
        <div className="child-files__upload">
          <h4 className="child-form__subtitle">Agregar archivo</h4>

          {canManageAll && (
            <div className="form-group child-files__type">
            <div className="child-form__yesno" role="radiogroup" aria-label="Tipo de archivo">
              {[{ value: 'informe', label: 'Informe' }, { value: 'documento', label: 'Documento' }].map(opt => (
                <label key={opt.value} className="child-form__yesno-option">
                  <input
                    type="radio"
                    name="child-file-tipo"
                    value={opt.value}
                    checked={tipo === opt.value}
                    onChange={() => setTipo(opt.value)}
                    disabled={uploading}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
            </div>
          )}

          <div className="child-files__fields">
            {effectiveTipo === 'informe' ? (
              <>
                <div className="form-group">
                  <label htmlFor="child-file-periodo" className="form-label required">Período</label>
                  <input
                    id="child-file-periodo"
                    className="form-input"
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    placeholder="Ej: 1er cuatrimestre, Informe final"
                    disabled={uploading}
                  />
                </div>
                <div className="form-group child-files__year">
                  <label htmlFor="child-file-anio" className="form-label">Año</label>
                  <input
                    id="child-file-anio"
                    type="number"
                    min="2000"
                    max="2100"
                    className="form-input"
                    value={anio}
                    onChange={(e) => setAnio(e.target.value)}
                    disabled={uploading}
                  />
                </div>
              </>
            ) : (
              <div className="form-group child-files__desc">
                <label htmlFor="child-file-desc" className="form-label">Descripción</label>
                <input
                  id="child-file-desc"
                  className="form-input"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Ficha de inscripción 2026"
                  disabled={uploading}
                />
              </div>
            )}
          </div>

          {file ? (
            <FileSelectionList files={[file]} onRemove={() => setFile(null)} />
          ) : (
            <FileUploadSelector
              id="child-file-input"
              multiple={false}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              disabled={uploading}
              hint="PDF, Word o imágenes JPG/PNG. Máximo 10 MB"
              onFilesSelected={handleFileSelected}
            />
          )}

          <button
            type="button"
            className="btn btn--primary btn--sm child-files__submit"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'Subiendo...' : effectiveTipo === 'informe' ? 'Subir informe' : 'Subir documento'}
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.closeDialog}
        onConfirm={confirmDialog.dialogData.onConfirm}
        title={confirmDialog.dialogData.title}
        message={confirmDialog.dialogData.message}
        type={confirmDialog.dialogData.type}
        confirmText={confirmDialog.dialogData.confirmText}
      />
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
