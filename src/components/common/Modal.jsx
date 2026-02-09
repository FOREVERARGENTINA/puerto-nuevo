export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnOverlay = true,
  className = '',
  overlayClassName = ''
}) {
  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (!closeOnOverlay) return;
    onClose?.();
  };

  const overlayClasses = ['modal-overlay', overlayClassName].filter(Boolean).join(' ');
  const contentClasses = ['modal-content', `modal-content--${size}`, className].filter(Boolean).join(' ');

  return (
    <div className={overlayClasses} onClick={handleOverlayClick}>
      <div
        className={contentClasses}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ title, onClose }) {
  return (
    <div className="modal-header">
      <h3 className="modal-title">{title}</h3>
      {onClose && (
        <button onClick={onClose} className="modal-close" aria-label="Cerrar">
          X
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children }) {
  return <div className="modal-body">{children}</div>;
}

export function ModalFooter({ children }) {
  return <div className="modal-footer">{children}</div>;
}
