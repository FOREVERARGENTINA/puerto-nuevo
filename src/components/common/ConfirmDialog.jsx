import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'default' // 'default', 'danger', 'warning'
}) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>
        <p className="confirm-message">{message}</p>
      </ModalBody>
      <ModalFooter>
        <button onClick={onClose} className="btn btn--outline">
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          className={`btn ${
            type === 'danger' ? 'btn--danger' :
            type === 'warning' ? 'btn--warning' :
            'btn--primary'
          }`}
        >
          {confirmText}
        </button>
      </ModalFooter>
    </Modal>
  );
}
