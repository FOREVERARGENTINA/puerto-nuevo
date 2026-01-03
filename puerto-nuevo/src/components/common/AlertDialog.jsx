import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';

export function AlertDialog({
  isOpen,
  onClose,
  title = 'Información',
  message,
  confirmText = 'Aceptar',
  type = 'info' // 'info', 'success', 'warning', 'error'
}) {
  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>
        <div className={`alert-dialog alert-dialog--${type}`}>
          <div className="alert-dialog__icon">{getIcon()}</div>
          <p className="alert-dialog__message">{message}</p>
        </div>
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} className="btn btn--primary btn--full">
          {confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
}
