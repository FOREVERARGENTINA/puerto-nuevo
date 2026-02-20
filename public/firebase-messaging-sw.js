/* global importScripts, firebase, clients */

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyB9ZC5CLGhtdm1_6Vjm5ASHW1xepoBO9PU',
  authDomain: 'puerto-nuevo-montessori.firebaseapp.com',
  projectId: 'puerto-nuevo-montessori',
  storageBucket: 'puerto-nuevo-montessori.firebasestorage.app',
  messagingSenderId: '651913667566',
  appId: '1:651913667566:web:1421f44f25481685d664ff',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.data?.title || 'Puerto Nuevo';
  const body = payload?.data?.body || 'Tienes una notificacion nueva';
  const clickAction = payload?.data?.clickAction || payload?.data?.url || '/portal/familia';

  return self.registration.showNotification(title, {
    body,
    // Use a larger maskable icon for the notification body and a dedicated badge for the status bar
    icon: '/pwa/icon-512-maskable.png',
    badge: '/pwa/icon-master.png',
    data: { clickAction },
    tag: 'puerto-nuevo-push',
    vibrate: [100, 50, 100]
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickAction = event.notification?.data?.clickAction || event.notification?.data?.url || '/portal/familia';
  const targetUrl = new URL(clickAction, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }

      return null;
    })
  );
});
