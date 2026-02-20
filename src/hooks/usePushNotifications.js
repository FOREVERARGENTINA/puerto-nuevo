import { useCallback, useEffect, useMemo, useState } from 'react';
import { getMessaging, getToken, isSupported as isMessagingSupported, onMessage } from 'firebase/messaging';
import app from '../config/firebase';
import { usersService } from '../services/users.service';

const PUSH_SW_PATH = '/firebase-messaging-sw.js';

async function waitForActiveServiceWorker(registration) {
  if (registration.active) return registration;

  const worker = registration.installing || registration.waiting;
  if (!worker) return registration;

  await new Promise((resolve) => {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated') {
        resolve();
      }
    });
  });

  return registration;
}

function detectIos() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIosDevice = /iphone|ipad|ipod/.test(ua);
  const isTouchMac = /macintosh/.test(ua) && window.navigator.maxTouchPoints > 1;
  return isIosDevice || isTouchMac;
}

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function usePushNotifications(user) {
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isActivatingPush, setIsActivatingPush] = useState(false);
  const [pushError, setPushError] = useState('');

  const isIos = useMemo(() => detectIos(), []);
  const isStandalone = useMemo(() => detectStandalone(), []);
  const iosNeedsInstall = isIos && !isStandalone;

  const registerToken = useCallback(async () => {
    if (!user?.uid) throw new Error('Usuario no autenticado');

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) throw new Error('VITE_FIREBASE_VAPID_KEY no configurada');

    const registration = await navigator.serviceWorker.register(PUSH_SW_PATH);
    await waitForActiveServiceWorker(registration);
    await navigator.serviceWorker.ready;

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      throw new Error('No se pudo obtener token de notificaciones');
    }

    const saveResult = await usersService.addFcmToken(user.uid, token);
    if (!saveResult?.success) {
      throw new Error(saveResult?.error || 'No se pudo guardar token push en el perfil');
    }
    return token;
  }, [user?.uid]);

  useEffect(() => {
    let mounted = true;

    const checkSupportAndSync = async () => {
      if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        if (mounted) {
          setIsPushSupported(false);
          setIsPushEnabled(false);
        }
        return;
      }

      const baseSupport = window.isSecureContext;
      let messagingSupport = false;
      if (baseSupport) {
        try {
          messagingSupport = await isMessagingSupported();
        } catch {
          messagingSupport = false;
        }
      }

      const supported = baseSupport && messagingSupport;
      if (!mounted) return;

      setIsPushSupported(supported);
      setIsPushEnabled(false);

      if (supported && window.Notification.permission === 'granted' && user?.uid) {
        try {
          await registerToken();
          if (!mounted) return;
          setIsPushEnabled(true);
          setPushError('');
        } catch (error) {
          console.error('[Push] Error sincronizando token:', error);
          if (!mounted) return;
          setPushError(error.message || 'No se pudo sincronizar notificaciones');
        }
      }
    };

    void checkSupportAndSync();

    return () => {
      mounted = false;
    };
  }, [registerToken, user?.uid]);

  const enablePush = useCallback(async () => {
    if (!user?.uid) {
      setPushError('Debes iniciar sesion para activar notificaciones');
      return false;
    }
    if (!isPushSupported) {
      setPushError('Tu navegador no soporta notificaciones push');
      return false;
    }
    if (iosNeedsInstall) {
      setPushError('En iPhone primero debes instalar la app');
      return false;
    }

    setIsActivatingPush(true);
    setPushError('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setIsPushEnabled(false);
        setPushError('Permiso de notificaciones denegado');
        return false;
      }

      await registerToken();
      setIsPushEnabled(true);
      setPushError('');
      return true;
    } catch (error) {
      setPushError(error.message || 'No se pudo activar notificaciones');
      return false;
    } finally {
      setIsActivatingPush(false);
    }
  }, [iosNeedsInstall, isPushSupported, registerToken, user?.uid]);

  // Escuchar mensajes en foreground para mejorar la percepción de entrega
  useEffect(() => {
    if (!isPushSupported || !user?.uid) return undefined;

    let unsub;
    try {
      const messaging = getMessaging(app);
      unsub = onMessage(messaging, (payload) => {
        const title = payload?.data?.title || payload?.notification?.title || 'Puerto Nuevo';
        const body = payload?.data?.body || payload?.notification?.body || '';

        if (document.visibilityState === 'visible') {
          showInAppToast(title, body);
          return;
        }

        if (Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, { body, data: payload.data });
          });
        }
      });
    } catch (err) {
      console.error('[Push] onMessage setup error:', err);
    }

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [isPushSupported, user?.uid]);

  // helper: toast in-app mínima (sin librerías externas)
  function showInAppToast(title, body) {
    try {
      const containerId = 'push-toast-container';
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.style.position = 'fixed';
        container.style.top = '1rem';
        container.style.right = '1rem';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.style.background = 'rgba(0,0,0,0.85)';
      toast.style.color = '#fff';
      toast.style.padding = '0.6rem 0.9rem';
      toast.style.marginTop = '0.4rem';
      toast.style.borderRadius = '6px';
      toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.2)';
      toast.style.maxWidth = '320px';
      toast.style.fontSize = '0.95rem';
      toast.innerHTML = `<strong style="display:block;margin-bottom:4px">${title}</strong><div>${body}</div>`;

      container.appendChild(toast);

      setTimeout(() => {
        toast.style.transition = 'opacity 0.25s linear';
        toast.style.opacity = '0';
      }, 4600);

      setTimeout(() => {
        toast.remove();
        if (!container.hasChildNodes()) container.remove();
      }, 5000);
    } catch (_e) {
      console.log('[Push] foreground', title, body);
    }
  }

  return {
    isPushSupported,
    isPushEnabled,
    isActivatingPush,
    iosNeedsInstall,
    pushError,
    shouldOfferPush: isPushSupported && !isPushEnabled && !iosNeedsInstall,
    enablePush,
  };
}
