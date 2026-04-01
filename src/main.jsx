import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();

    // Recover from stale hashed chunks after a deployment.
    const guardKey = 'pn:chunk-reload-once';
    if (sessionStorage.getItem(guardKey)) return;

    sessionStorage.setItem(guardKey, '1');
    window.location.reload();
  });

  if (import.meta.env.DEV) {
    // Evita que service workers/caches viejos interfieran durante desarrollo.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => {});
    }

    if ('caches' in window) {
      caches.keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {});
    }
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
