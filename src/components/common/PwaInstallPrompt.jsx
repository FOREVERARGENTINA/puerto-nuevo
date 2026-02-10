import { useEffect, useRef, useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useAuth } from '../../hooks/useAuth';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_PROMPT_DELAY_MS = 5000;

export function PwaInstallPrompt() {
  const { user, loading } = useAuth();
  const { canInstall, shouldShowIosInstall, promptInstall } = usePwaInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const promptTimerRef = useRef(null);
  const iosTimerRef = useRef(null);

  useEffect(() => {
    if (loading || !user || !canInstall) {
      setShowPrompt(false);
      return;
    }

    const status = localStorage.getItem('pwa-install-status');
    const lastPrompt = parseInt(localStorage.getItem('pwa-last-prompt') || '0', 10);
    const recentDismiss = status === 'later' && lastPrompt && (Date.now() - lastPrompt) < ONE_DAY_MS;

    if (status === 'installed' || recentDismiss) return;

    promptTimerRef.current = window.setTimeout(() => {
      setShowPrompt(true);
    }, SESSION_PROMPT_DELAY_MS);

    return () => {
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
      }
    };
  }, [canInstall, user, loading]);

  useEffect(() => {
    if (loading || !shouldShowIosInstall) {
      setShowIosBanner(false);
      return;
    }

    const alreadyShown = localStorage.getItem('ios-install-banner-shown');
    if (alreadyShown) return;

    iosTimerRef.current = window.setTimeout(() => {
      setShowIosBanner(true);
    }, SESSION_PROMPT_DELAY_MS);

    return () => {
      if (iosTimerRef.current) {
        clearTimeout(iosTimerRef.current);
      }
    };
  }, [shouldShowIosInstall, loading]);

  useEffect(() => {
    const handleInstalled = () => {
      localStorage.setItem('pwa-install-status', 'installed');
      setShowPrompt(false);
    };

    window.addEventListener('appinstalled', handleInstalled);
    return () => window.removeEventListener('appinstalled', handleInstalled);
  }, []);

  const handleLater = () => {
    localStorage.setItem('pwa-install-status', 'later');
    localStorage.setItem('pwa-last-prompt', Date.now().toString());
    setShowPrompt(false);
  };

  const handleInstall = async () => {
    if (!canInstall) return;
    const choice = await promptInstall();
    if (choice?.outcome === 'accepted') {
      localStorage.setItem('pwa-install-status', 'installed');
    } else {
      localStorage.setItem('pwa-install-status', 'later');
      localStorage.setItem('pwa-last-prompt', Date.now().toString());
    }
    setShowPrompt(false);
  };

  const handleDismissIos = () => {
    localStorage.setItem('ios-install-banner-shown', 'true');
    setShowIosBanner(false);
  };

  return (
    <>
      <Modal isOpen={showPrompt} onClose={handleLater} size="sm" className="pwa-install-modal">
        <ModalHeader title="Instalar app" onClose={handleLater} />
        <ModalBody>
          <div className="pwa-install-header">
            <img src="/logo-login.png" alt="Puerto Nuevo Montessori" className="pwa-install-logo" />
          </div>
          <p>¿Querés instalar la app de Puerto Nuevo en tu teléfono?</p>
          <p className="pwa-install-hint">Se instala rápido y no ocupa espacio extra.</p>
        </ModalBody>
        <ModalFooter>
          <button className="btn btn--outline" onClick={handleLater}>
            Más tarde
          </button>
          <button className="btn btn--primary" onClick={handleInstall}>
            Instalar
          </button>
        </ModalFooter>
      </Modal>

      {showIosBanner && (
        <div className="pwa-install-banner">
          <div className="pwa-install-banner__content">
            <img src="/logo-login.png" alt="Puerto Nuevo Montessori" className="pwa-install-banner__logo" />
            <div>
              <strong>Instalá la app</strong>
              <span>Compartir → Agregar a inicio</span>
            </div>
          </div>
          <button className="pwa-install-banner__button" onClick={handleDismissIos}>
            Entendido
          </button>
        </div>
      )}
    </>
  );
}
