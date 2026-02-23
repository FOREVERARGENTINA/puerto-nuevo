import { useEffect, useState, useCallback } from 'react';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    // iPadOS moderno reporta "Macintosh" en userAgent
    const isTouchMac = /macintosh/.test(ua) && window.navigator.maxTouchPoints > 1;
    const ios = isIosDevice || isTouchMac;
    const mobile = isAndroid || ios;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsMobileDevice(mobile);
    setIsIos(ios);
    setIsStandalone(standalone);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return choice;
  }, [deferredPrompt]);

  return {
    canInstall: isMobileDevice && !!deferredPrompt && !isInstalled,
    shouldShowIosInstall: isMobileDevice && isIos && !isStandalone,
    isMobileDevice,
    promptInstall
  };
}
