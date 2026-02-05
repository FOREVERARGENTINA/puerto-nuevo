import { Modal, ModalHeader, ModalBody, ModalFooter } from '../common/Modal';
import Icon from '../ui/Icon';

/**
 * Modal para confirmar lectura de documento obligatorio
 */
export function DocumentMandatoryReadModal({ document, onConfirm, onClose }) {
  if (!document) return null;

  const handleConfirm = () => {
    onConfirm(document.id);
  };

  const getFechaLimiteText = () => {
    if (!document.fechaLimite) return null;
    
    const fecha = document.fechaLimite.toDate?.() || new Date(document.fechaLimite);
    const now = new Date();
    const diffDays = Math.ceil((fecha - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return {
        text: `Vencido hace ${Math.abs(diffDays)} día(s)`,
        style: { color: 'var(--color-danger)' }
      };
    } else if (diffDays === 0) {
      return {
        text: 'Vence hoy',
        style: { color: 'var(--color-warning)' }
      };
    } else if (diffDays <= 3) {
      return {
        text: `Vence en ${diffDays} día(s)`,
        style: { color: 'var(--color-warning)' }
      };
    } else {
      return {
        text: `Vence el ${fecha.toLocaleDateString('es-AR')}`,
        style: { color: 'var(--color-text-light)' }
      };
    }
  };

  const fechaLimite = getFechaLimiteText();

  return (
    <Modal isOpen={true} onClose={onClose} size="medium">
      <ModalHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Icon name="file-text" size={24} style={{ color: 'var(--color-primary)' }} />
          <span>Documento de lectura obligatoria</span>
        </div>
      </ModalHeader>

      <ModalBody>
        <div style={{ 
          padding: 'var(--spacing-md)', 
          background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.08), rgba(var(--color-primary-rgb), 0.02))',
          borderRadius: 'var(--border-radius)',
          borderLeft: '4px solid var(--color-primary)',
          marginBottom: 'var(--spacing-lg)'
        }}>
          <h3 style={{ marginTop: 0, marginBottom: 'var(--spacing-xs)' }}>{document.titulo}</h3>
          {document.descripcion && (
            <p style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-light)' }}>
              {document.descripcion}
            </p>
          )}
          
          {fechaLimite && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
              <Icon name="clock" size={16} style={fechaLimite.style} />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, ...fechaLimite.style }}>
                {fechaLimite.text}
              </span>
            </div>
          )}
        </div>

        {/* Botón destacado para ver el documento */}
        <a
          href={document.archivoURL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--primary btn--lg"
          style={{ 
            marginBottom: 'var(--spacing-lg)',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--spacing-sm)',
            fontSize: '1.1rem',
            padding: 'var(--spacing-md)'
          }}
        >
          <Icon name="eye" size={20} />
          Abrir documento para leer
        </a>

        <div className="alert alert--warning" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <p style={{ margin: 0 }}>
            <strong>¡Importante!</strong> Este documento requiere confirmación de lectura. 
            Una vez que confirmes, se notificará a coordinación que leíste el documento.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--spacing-sm)' }}>
            <Icon name="check-circle" size={20} style={{ color: 'var(--color-success)', marginTop: '2px' }} />
            <div>
              <strong>Antes de confirmar, asegurate de:</strong>
              <ul style={{ marginTop: 'var(--spacing-xs)', marginBottom: 0, paddingLeft: 'var(--spacing-md)' }}>
                <li>Haber leído el documento completo</li>
                <li>Entender su contenido</li>
                <li>Consultar cualquier duda antes de confirmar</li>
              </ul>
            </div>
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <button onClick={onClose} className="btn btn--outline">
          Volver sin confirmar
        </button>
        <button onClick={handleConfirm} className="btn btn--primary">
          <Icon name="check" size={16} />
          Confirmar que leí el documento
        </button>
      </ModalFooter>
    </Modal>
  );
}
