import { useEffect, useRef, useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { useAuth } from '../../hooks/useAuth';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_PROMPT_DELAY_MS = 5000;
// Delay to stagger the push banner after the install modal closes.
const PUSH_STAGGER_DELAY_MS = 5000;
const PUSH_STATUS_KEY = 'push-permission-status';
const PUSH_LAST_PROMPT_KEY = 'push-last-prompt';

export function PwaInstallPrompt() {
  const { user, loading } = useAuth();
  const { canInstall, shouldShowIosInstall, promptInstall } = usePwaInstall();
  const {
    shouldOfferPush,
    isPushEnabled,
    isActivatingPush,
    pushError,
    enablePush
  } = usePushNotifications(user);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const promptTimerRef = useRef(null);
  const iosTimerRef = useRef(null);
  const pushTimerRef = useRef(null);
  const prevShowPromptRef = useRef(false);

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

  // --- ensure push banner is hidden while install modal is open ---
  useEffect(() => {
    // if modal opens, immediately hide and clear any push timers
    if (showPrompt) {
      setShowPushBanner(false);
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
    }
    // track previous value for transition detection below
    prevShowPromptRef.current = showPrompt;
  }, [showPrompt]);

  // When the install modal is closed (transition true -> false) show the push banner
  // after a short stagger delay (improves UX and avoids competing prompts).
  useEffect(() => {
    // only act when modal was just closed
    if (!prevShowPromptRef.current || showPrompt) {
      prevShowPromptRef.current = showPrompt;
      return;
    }

    const isAuthenticatedUser = !!user?.uid;
    if (loading || !isAuthenticatedUser || !shouldOfferPush || isPushEnabled) {
      prevShowPromptRef.current = showPrompt;
      return;
    }

    const status = localStorage.getItem(PUSH_STATUS_KEY);
    const lastPrompt = parseInt(localStorage.getItem(PUSH_LAST_PROMPT_KEY) || '0', 10);
    const recentDismiss = status === 'later' && lastPrompt && (Date.now() - lastPrompt) < ONE_DAY_MS;
    if (status === 'enabled' || recentDismiss) {
      prevShowPromptRef.current = showPrompt;
      return;
    }

    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
    }

    pushTimerRef.current = window.setTimeout(() => {
      // guard: don't show if modal reopened in the meantime
      if (!showPrompt) setShowPushBanner(true);
    }, PUSH_STAGGER_DELAY_MS);

    prevShowPromptRef.current = showPrompt;

    return () => {
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
    };
  }, [showPrompt, loading, user?.role, shouldOfferPush, isPushEnabled]);

  // original push scheduling for initial session (preserves existing behaviour)
  useEffect(() => {
    const isAuthenticatedUser = !!user?.uid;
    // hide/clear when prerequisites are not met or modal is open
    if (loading || !isAuthenticatedUser || !shouldOfferPush || isPushEnabled || showPrompt) {
      setShowPushBanner(false);
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
      return;
    }

    const status = localStorage.getItem(PUSH_STATUS_KEY);
    const lastPrompt = parseInt(localStorage.getItem(PUSH_LAST_PROMPT_KEY) || '0', 10);
    const recentDismiss = status === 'later' && lastPrompt && (Date.now() - lastPrompt) < ONE_DAY_MS;

    if (status === 'enabled' || recentDismiss) return;

    pushTimerRef.current = window.setTimeout(() => {
      // guard: don't show if modal opened in the meantime
      if (!showPrompt) setShowPushBanner(true);
    }, SESSION_PROMPT_DELAY_MS);

    return () => {
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
      }
    };
  }, [loading, user?.role, shouldOfferPush, isPushEnabled, showPrompt]);

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

  const handlePushLater = () => {
    localStorage.setItem(PUSH_STATUS_KEY, 'later');
    localStorage.setItem(PUSH_LAST_PROMPT_KEY, Date.now().toString());
    setShowPushBanner(false);
  };

  const handleEnablePush = async () => {
    const enabled = await enablePush();
    if (enabled) {
      localStorage.setItem(PUSH_STATUS_KEY, 'enabled');
      setShowPushBanner(false);
    }
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

      {showPushBanner && (
        <div className="pwa-install-banner pwa-push-banner">
          <div className="pwa-install-banner__content">
            <img src="/logo-login.png" alt="Puerto Nuevo Montessori" className="pwa-install-banner__logo" />
            <div>
              <strong>Activar notificaciones</strong>
              <span>Recibí comunicados y respuestas al instante</span>
              {pushError && <span className="pwa-push-banner__error">{pushError}</span>}
            </div>
          </div>
          <div className="pwa-push-banner__actions">
            <button className="pwa-install-banner__button pwa-install-banner__button--ghost" onClick={handlePushLater}>
              Mas tarde
            </button>
            <button className="pwa-install-banner__button" onClick={handleEnablePush} disabled={isActivatingPush}>
              {isActivatingPush ? 'Activando...' : 'Activar'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
