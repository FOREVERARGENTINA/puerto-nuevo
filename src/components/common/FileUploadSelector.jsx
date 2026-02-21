import Icon from '../ui/Icon';
import './FileUploadSelector.css';

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;

  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
};

const UploadIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export function FileUploadSelector({
  id,
  accept = '',
  multiple = true,
  disabled = false,
  hint = '',
  onFilesSelected
}) {
  const handleChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0 && typeof onFilesSelected === 'function') {
      onFilesSelected(files);
    }
    event.target.value = '';
  };

  return (
    <div className="pn-upload-selector">
      <input
        type="file"
        id={id}
        multiple={multiple}
        accept={accept}
        onChange={handleChange}
        disabled={disabled}
        className="pn-upload-selector__input"
        aria-label="Seleccionar archivos"
      />
      <span className="pn-upload-selector__icon"><UploadIcon /></span>
      <p className="pn-upload-selector__cta">Arrastrar o <strong>seleccionar archivos</strong></p>
      {hint && <p className="pn-upload-selector__hint">{hint}</p>}
    </div>
  );
}

export function FileSelectionList({ files = [], onRemove }) {
  if (!Array.isArray(files) || files.length === 0) return null;

  return (
    <ul className="pn-upload-files">
      {files.map((file, index) => (
        <li key={`${file.name || 'file'}-${index}`} className="pn-upload-file">
          <Icon name="file" size={15} className="pn-upload-file__icon" />
          <span className="pn-upload-file__name">{file.name || `Archivo ${index + 1}`}</span>
          <span className="pn-upload-file__size">{formatFileSize(file.size)}</span>
          <button
            type="button"
            className="pn-upload-file__remove"
            onClick={() => onRemove(index)}
            aria-label={`Quitar ${file.name || `archivo ${index + 1}`}`}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}
