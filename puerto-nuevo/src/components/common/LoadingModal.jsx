import { Modal, ModalBody } from './Modal';

export function LoadingModal({ isOpen, message = 'Cargando...' }) {
  return (
    <Modal isOpen={isOpen} onClose={() => {}} size="sm">
      <ModalBody>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          padding: '24px 16px'
        }}>
          <div className="spinner"></div>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>
            {message}
          </p>
        </div>
      </ModalBody>
    </Modal>
  );
}
