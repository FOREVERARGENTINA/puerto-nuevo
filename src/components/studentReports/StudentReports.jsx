import { useEffect, useMemo, useState } from 'react';
import { AlertDialog } from '../common/AlertDialog';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { FileSelectionList, FileUploadSelector } from '../common/FileUploadSelector';
import Icon from '../ui/Icon';
import { useAuth } from '../../hooks/useAuth';
import { useDialog } from '../../hooks/useDialog';
import { studentReportsService } from '../../services/studentReports.service';

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_PERIOD_OPTIONS = [
  '1er cuatrimestre',
  '2do cuatrimestre',
  '1er semestre',
  '2do semestre',
  'Anual'
];

const DEFAULT_PERIOD = DEFAULT_PERIOD_OPTIONS[0];

const formatDateTime = (value) => {
  if (!value) return 'Fecha no disponible';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return date.toLocaleDateString('es-AR');
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

export function StudentReports({
  childId,
  canUpload = false,
  canDelete = false,
  hideWhenEmpty = false,
  embeddedInForm = false
}) {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    periodo: DEFAULT_PERIOD,
    anio: CURRENT_YEAR
  });

  const alertDialog = useDialog();
  const confirmDialog = useDialog();

  const canShowUploader = canUpload && !!childId;

  const loadReports = async () => {
    if (!childId) {
      setReports([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await studentReportsService.getReportsByChild(childId);
    if (result.success) {
      setReports(result.reports);
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: 'No se pudieron cargar los informes: ' + result.error,
        type: 'error'
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    loadReports();
  }, [childId]);

  const reportsTitle = useMemo(() => {
    const count = reports.length;
    if (count === 0) return 'Informes';
    return `Informes (${count})`;
  }, [reports.length]);

  const handleFileSelect = (files) => {
    const file = Array.isArray(files) ? files[0] : null;
    const validationError = studentReportsService.validateReportFile(file);

    if (validationError) {
      alertDialog.openDialog({
        title: 'Archivo no valido',
        message: validationError,
        type: 'warning'
      });
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async (event) => {
    event?.preventDefault?.();

    if (!selectedFile) {
      alertDialog.openDialog({
        title: 'Archivo requerido',
        message: 'Selecciona el informe que queres subir.',
        type: 'warning'
      });
      return;
    }

    const periodo = formData.periodo.trim();
    if (!periodo) {
      alertDialog.openDialog({
        title: 'Periodo requerido',
        message: 'Escribi o selecciona el periodo del informe.',
        type: 'warning'
      });
      return;
    }

    if (!String(formData.anio || '').trim()) {
      alertDialog.openDialog({
        title: 'Año requerido',
        message: 'Indica el año del informe.',
        type: 'warning'
      });
      return;
    }

    setUploading(true);
    const result = await studentReportsService.uploadReport(childId, selectedFile, {
      periodo,
      anio: Number(formData.anio),
      uploadedBy: user?.uid || '',
      uploadedByEmail: user?.email || ''
    });
    setUploading(false);

    if (!result.success) {
      alertDialog.openDialog({
        title: 'Error',
        message: 'No se pudo subir el informe: ' + result.error,
        type: 'error'
      });
      return;
    }

    setSelectedFile(null);
    setFormData({
      periodo: DEFAULT_PERIOD,
      anio: CURRENT_YEAR
    });
    await loadReports();
    alertDialog.openDialog({
      title: 'Informe cargado',
      message: 'El informe ya esta disponible en la ficha del alumno.',
      type: 'success'
    });
  };

  const handleDownload = async (report) => {
    setDownloadingId(report.id);
    const result = await studentReportsService.downloadReport(report);
    setDownloadingId(null);

    if (!result.success) {
      alertDialog.openDialog({
        title: 'Error',
        message: 'No se pudo descargar el informe: ' + result.error,
        type: 'error'
      });
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

  const handleDelete = (report) => {
    confirmDialog.openDialog({
      title: 'Eliminar informe',
      message: `Se eliminara el informe de ${report.periodo} ${report.anio}.`,
      type: 'danger',
      confirmText: 'Eliminar',
      onConfirm: async () => {
        const result = await studentReportsService.deleteReport(childId, report.id, report.storagePath);
        if (!result.success) {
          alertDialog.openDialog({
            title: 'Error',
            message: 'No se pudo eliminar el informe: ' + result.error,
            type: 'error'
          });
          return;
        }

        await loadReports();
        alertDialog.openDialog({
          title: 'Informe eliminado',
          message: 'El informe fue eliminado correctamente.',
          type: 'success'
        });
      }
    });
  };

  if (!loading && reports.length === 0 && hideWhenEmpty && !canShowUploader) {
    return null;
  }

  const UploadContainer = embeddedInForm ? 'div' : 'form';

  return (
    <div className="child-card__section student-reports">
      <div className="student-reports__header">
        <span className="child-card__section-title">{reportsTitle}</span>
        {loading && <span className="muted-text">Cargando...</span>}
      </div>

      {!loading && reports.length === 0 && (
        <p className="muted-text student-reports__empty">Sin informes cargados.</p>
      )}

      {!loading && reports.length > 0 && (
        <div className="student-reports__list">
          {reports.map((report) => (
            <div key={report.id} className="student-reports__item">
              <div className="student-reports__file-icon" aria-hidden="true">
                <Icon name="file" size={16} />
              </div>
              <div className="student-reports__content">
                <div className="student-reports__title">
                  {report.periodo} {report.anio}
                </div>
                <div className="student-reports__meta">
                  {report.archivoNombre}
                  {report.archivoTamanoBytes ? ` · ${formatFileSize(report.archivoTamanoBytes)}` : ''}
                  {report.createdAt ? ` · ${formatDateTime(report.createdAt)}` : ''}
                </div>
              </div>
              <div className="student-reports__actions">
                <button
                  type="button"
                  className="btn btn--sm btn--outline"
                  onClick={() => handleDownload(report)}
                  disabled={downloadingId === report.id}
                >
                  {downloadingId === report.id ? 'Descargando...' : 'Descargar'}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    className="btn btn--sm btn--text btn--danger"
                    onClick={() => handleDelete(report)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {canShowUploader && (
        <UploadContainer
          className="student-reports__form"
          {...(!embeddedInForm ? { onSubmit: handleUpload } : {})}
        >
          <div className="student-reports__form-grid">
            <div className="form-group">
              <label htmlFor={`report-periodo-${childId}`} className="form-label">Periodo</label>
              <input
                id={`report-periodo-${childId}`}
                className="form-control"
                value={formData.periodo}
                onChange={(event) => setFormData((prev) => ({ ...prev, periodo: event.target.value }))}
                disabled={uploading}
                placeholder="Ej. 1er semestre, Marzo-Junio, Informe final"
                required={!embeddedInForm}
              />
              {embeddedInForm && (
                <div className="student-reports__period-options" aria-label="Periodos frecuentes">
                  {DEFAULT_PERIOD_OPTIONS.map((period) => (
                    <button
                      key={period}
                      type="button"
                      className={`student-reports__period-option ${formData.periodo === period ? 'student-reports__period-option--active' : ''}`}
                      onClick={() => setFormData((prev) => ({ ...prev, periodo: period }))}
                      disabled={uploading}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor={`report-anio-${childId}`} className="form-label">Año</label>
              <input
                id={`report-anio-${childId}`}
                type="number"
                min="2000"
                max="2100"
                step="1"
                className="form-control"
                value={formData.anio}
                onChange={(event) => setFormData((prev) => ({ ...prev, anio: event.target.value }))}
                disabled={uploading}
                required={!embeddedInForm}
              />
            </div>
          </div>

          <FileUploadSelector
            id={`report-file-${childId}`}
            multiple={false}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            disabled={uploading}
            hint="PDF, Word o imagenes JPG/PNG. Maximo 10 MB"
            onFilesSelected={handleFileSelect}
          />

          {selectedFile && (
            <FileSelectionList files={[selectedFile]} onRemove={() => setSelectedFile(null)} />
          )}

          <button
            type={embeddedInForm ? 'button' : 'submit'}
            className="btn btn--primary btn--sm"
            disabled={uploading}
            onClick={embeddedInForm ? handleUpload : undefined}
          >
            {uploading ? 'Subiendo...' : 'Subir informe'}
          </button>
        </UploadContainer>
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
