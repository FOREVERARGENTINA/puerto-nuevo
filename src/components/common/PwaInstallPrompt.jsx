import { useEffect, useRef, useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function PwaInstallPrompt() {
  const { canInstall, shouldShowIosInstall, promptInstall } = usePwaInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const promptTimerRef = useRef(null);
  const iosTimerRef = useRef(null);

  useEffect(() => {
    if (!canInstall) return;

    const status = localStorage.getItem('pwa-install-status');
    const lastPrompt = parseInt(localStorage.getItem('pwa-last-prompt') || '0', 10);
    const recentDismiss = status === 'later' && lastPrompt && (Date.now() - lastPrompt) < ONE_DAY_MS;

    if (status === 'installed' || recentDismiss) return;

    promptTimerRef.current = window.setTimeout(() => {
      setShowPrompt(true);
    }, 3000);

    return () => {
      if (promptTimerRef.current) {
        clearTimeout(promptTimerRef.current);
      }
    };
  }, [canInstall]);

  useEffect(() => {
    if (!shouldShowIosInstall) return;
    const alreadyShown = localStorage.getItem('ios-install-banner-shown');
    if (alreadyShown) return;

    iosTimerRef.current = window.setTimeout(() => {
      setShowIosBanner(true);
    }, 3000);

    return () => {
      if (iosTimerRef.current) {
        clearTimeout(iosTimerRef.current);
      }
    };
  }, [shouldShowIosInstall]);

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
      <Modal isOpen={showPrompt} onClose={handleLater} size="sm">
        <ModalHeader title="Instalar app" onClose={handleLater} />
        <ModalBody>
          <p>¿Querés instalar la app de Puerto Nuevo en tu teléfono?</p>
          <p className="pwa-install-hint">Se instala rápido y funciona como una app normal.</p>
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
            <strong>Instalá la app</strong>
            <span>Compartir → Agregar a inicio</span>
          </div>
          <button className="pwa-install-banner__button" onClick={handleDismissIos}>
            Entendido
          </button>
        </div>
      )}
    </>
  );
}
