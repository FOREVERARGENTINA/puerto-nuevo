import './LoadingModal.css';

export function LoadingModal({
  isOpen,
  message = 'Cargando...',
  progress = null,
  subMessage = null,
  type = 'default' // 'default' | 'upload' | 'optimize' | 'convert'
}) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'upload':
        return 'UP';
      case 'optimize':
        return 'OP';
      case 'convert':
        return 'HEIC';
      default:
        return null;
    }
  };

  return (
    <div className="loading-modal-overlay">
      <div className={`loading-modal-content loading-modal-content--${type}`}>
        <div className="loading-spinner-container">
          {getIcon() && <span className={`loading-icon loading-icon--${type}`}>{getIcon()}</span>}
          <div className={`loading-spinner loading-spinner--${type}`}></div>
        </div>
        <p className="loading-message">{message}</p>
        {progress !== null && (
          <div className="loading-progress">
            <div className="loading-progress-bar">
              <div
                className="loading-progress-fill"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <span className="loading-progress-text">{Math.round(progress)}%</span>
          </div>
        )}
        {subMessage && (
          <p className="loading-submessage">{subMessage}</p>
        )}
      </div>
    </div>
  );
}
