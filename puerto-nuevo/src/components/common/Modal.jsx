export function Modal({ isOpen, onClose, children, size = 'md' }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content modal-content--${size}`}
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
          ✕
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
