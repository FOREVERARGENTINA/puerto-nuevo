# Push Notifications Implementation Plan


**Goal:** Implement native push notifications (iOS 16.4+ & Android) for critical events (comunicados and conversaciones).

**Architecture:** Direct triggers approach with Cloud Functions onCreate triggers, dedicated Service Worker for FCM, React hooks for token management, dual UX strategy (modal + banner) for permission requests.

**Tech Stack:** Firebase Cloud Messaging (FCM), Firebase Cloud Functions v2, React 19, Vite, VitePWA, Workbox

## Decision Update (2026-02-19)

- Token storage decision: keep `users.fcmTokens` (array in user document).
- Subcollection `/users/{userId}/fcm_tokens/{tokenId}` is discarded in this phase.
- Reason: consistency with existing repo structure and enough capacity for current volume.
- Security gate before production rollout: treat `functions/service-account-key.json` as potential exposure risk until historical audit and credential rotation are completed (if needed).

---

## Prerequisites

Before starting, ensure you have:
- Firebase project with Blaze plan (required for Cloud Functions)
- Access to Firebase Console
- Node.js 20+ installed
- Firebase CLI installed and authenticated

---

## Phase 1: Setup & Configuration

### Task 1: Generate VAPID Keys

**Files:**
- Document: `docs/firebase-setup.md` (create for reference)

**Step 1: Generate VAPID keys in Firebase Console**

Manual steps:
1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Scroll to "Web Push certificates"
3. Click "Generate key pair"
4. Copy the public key (starts with "B...")

**Step 2: Document the setup**

Create `docs/firebase-setup.md`:

```markdown
# Firebase Push Notifications Setup

## VAPID Keys Generated

Date: 2026-02-19

Public Key: [PASTE_HERE]

**Important:** Never commit the private key. It's managed automatically by Firebase.

## Environment Variables

Add to `.env`:
```
VITE_FIREBASE_VAPID_KEY=<public_key_here>
```

## Firebase Console Configuration

- Project: puerto-nuevo-montessori
- Cloud Messaging enabled: Yes
- Web Push certificates generated: Yes
```

**Step 3: Commit documentation**

```bash
git add docs/firebase-setup.md
git commit -m "docs: add Firebase push notifications setup guide"
```

---

### Task 2: Configure Environment Variables

**Files:**
- Modify: `.env` (create if doesn't exist)
- Modify: `.gitignore`

**Step 1: Verify .gitignore includes .env**

Check that `.gitignore` contains:
```
.env
.env.local
.env.production
```

If not, add these lines.

**Step 2: Create .env file**

Create `.env` in project root:

```env
# Firebase Cloud Messaging
VITE_FIREBASE_VAPID_KEY=YOUR_VAPID_PUBLIC_KEY_HERE
```

**Important:** Replace `YOUR_VAPID_PUBLIC_KEY_HERE` with actual key from Task 1.

**Step 3: Create .env.example for documentation**

Create `.env.example`:

```env
# Firebase Cloud Messaging
VITE_FIREBASE_VAPID_KEY=
```

**Step 4: Commit .env.example**

```bash
git add .env.example .gitignore
git commit -m "chore: add environment variables template for FCM"
```

---

### Task 3: Install Firebase Messaging Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Verify firebase package version**

Check `package.json` - should have `firebase@^12.6.0` (already installed).

**Step 2: Install in functions directory**

```bash
cd functions
npm install
cd ..
```

**Step 3: Verify installation**

Run: `npm list firebase`
Expected: Should show firebase@12.x.x

No commit needed (package.json unchanged).

---

## Phase 2: Service Worker for FCM

### Task 4: Create Service Worker for Firebase Messaging

**Files:**
- Create: `public/firebase-messaging-sw.js`

**Step 1: Create Service Worker file**

Create `public/firebase-messaging-sw.js`:

```javascript
// Firebase Cloud Messaging Service Worker
// This SW handles push notifications when the app is closed or in background

// Import Firebase scripts from CDN (v9 compat for SW compatibility)
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase app in Service Worker
firebase.initializeApp({
  apiKey: "AIzaSyB9ZC5CLGhtdm1_6Vjm5ASHW1xepoBO9PU",
  authDomain: "puerto-nuevo-montessori.firebaseapp.com",
  projectId: "puerto-nuevo-montessori",
  storageBucket: "puerto-nuevo-montessori.firebasestorage.app",
  messagingSenderId: "651913667566",
  appId: "1:651913667566:web:1421f44f25481685d664ff"
});

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages (when app is closed or not focused)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Background message received:', payload);

  // Extract notification data from payload
  const notificationTitle = payload.data?.title || 'Puerto Nuevo';
  const notificationOptions = {
    body: payload.data?.body || 'Tienes una notificación nueva',
    icon: payload.data?.icon || '/pwa/icon-192.png',
    badge: '/pwa/icon-192.png',
    tag: 'puerto-nuevo-notification',
    requireInteraction: false,
    data: {
      url: payload.data?.clickAction || '/portal/familia',
      timestamp: Date.now()
    }
  };

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/portal/familia';

  // Try to focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
```

**Step 2: Commit Service Worker**

```bash
git add public/firebase-messaging-sw.js
git commit -m "feat: add Firebase Messaging Service Worker for push notifications"
```

---

## Phase 3: Frontend - FCM Token Management Hook

### Task 5: Create useFCMToken Hook

**Files:**
- Create: `src/hooks/useFCMToken.js`

**Step 1: Create the hook file**

Create `src/hooks/useFCMToken.js`:

```javascript
import { useState, useEffect, useCallback } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, collection, setDoc, deleteDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import app from '../config/firebase';

/**
 * Detects platform from user agent
 */
const detectPlatform = () => {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'web';
};

/**
 * Parses user agent to friendly device name
 */
const getDeviceName = () => {
  const ua = navigator.userAgent;
  const platform = detectPlatform();

  if (platform === 'ios') {
    if (ua.includes('iPhone')) return 'iPhone - Safari';
    if (ua.includes('iPad')) return 'iPad - Safari';
    return 'iOS Device';
  }

  if (platform === 'android') {
    return 'Android - Chrome';
  }

  return 'Desktop Browser';
};

/**
 * Check if browser supports FCM
 */
const isSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Check if iOS is installed (standalone mode)
 */
const isIOSInstalled = () => {
  return window.navigator.standalone === true;
};

/**
 * Custom hook to manage FCM token lifecycle
 *
 * @param {Object} user - Current user object with uid
 * @returns {Object} { requestPermission, hasPermission, isSupported, error, loading }
 */
export function useFCMToken(user) {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if FCM is supported
  const supported = isSupported();
  const platform = detectPlatform();
  const iosInstalled = platform === 'ios' ? isIOSInstalled() : true;

  /**
   * Save token to Firestore subcollection
   */
  const saveToken = useCallback(async (token) => {
    if (!user?.uid) return;

    try {
      const tokensRef = collection(db, 'users', user.uid, 'fcm_tokens');

      // Check if token already exists
      const q = query(tokensRef, where('token', '==', token));
      const existingTokens = await getDocs(q);

      if (existingTokens.empty) {
        // Token is new, save it
        const tokenId = `token_${Date.now()}`;
        await setDoc(doc(tokensRef, tokenId), {
          token,
          device: getDeviceName(),
          platform,
          createdAt: Timestamp.now(),
          lastUsed: Timestamp.now()
        });
        console.log('[FCM] Token saved to Firestore:', tokenId);
      } else {
        // Token exists, update lastUsed
        const tokenDoc = existingTokens.docs[0];
        await setDoc(tokenDoc.ref, {
          lastUsed: Timestamp.now()
        }, { merge: true });
        console.log('[FCM] Token updated in Firestore');
      }
    } catch (err) {
      console.error('[FCM] Error saving token:', err);
      throw err;
    }
  }, [user?.uid, platform]);

  /**
   * Request notification permission and get FCM token
   */
  const requestPermission = useCallback(async () => {
    if (!supported) {
      setError('Push notifications not supported in this browser');
      return false;
    }

    if (platform === 'ios' && !iosInstalled) {
      setError('Please install the app to Home Screen first (iOS)');
      return false;
    }

    if (!user?.uid) {
      setError('User not authenticated');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setHasPermission(false);
        setError('Notification permission denied');
        setLoading(false);
        return false;
      }

      setHasPermission(true);

      // Get FCM token
      const messaging = getMessaging(app);
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

      if (!vapidKey) {
        throw new Error('VAPID key not configured');
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js',
        { scope: '/firebase-cloud-messaging-push-scope' }
      );

      console.log('[FCM] Service Worker registered');

      // Get token
      const currentToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration
      });

      if (currentToken) {
        console.log('[FCM] Token obtained:', currentToken.substring(0, 20) + '...');
        await saveToken(currentToken);
        setLoading(false);
        return true;
      } else {
        throw new Error('No registration token available');
      }
    } catch (err) {
      console.error('[FCM] Error getting token:', err);
      setError(err.message);
      setLoading(false);
      return false;
    }
  }, [supported, platform, iosInstalled, user?.uid, saveToken]);

  /**
   * Check current permission status on mount
   */
  useEffect(() => {
    if (!supported) return;

    const checkPermission = async () => {
      if (Notification.permission === 'granted') {
        setHasPermission(true);

        // If granted but no token saved, request it
        if (user?.uid) {
          try {
            const messaging = getMessaging(app);
            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

            if (!vapidKey) return;

            const registration = await navigator.serviceWorker.register(
              '/firebase-messaging-sw.js',
              { scope: '/firebase-cloud-messaging-push-scope' }
            );

            const currentToken = await getToken(messaging, {
              vapidKey,
              serviceWorkerRegistration: registration
            });

            if (currentToken) {
              await saveToken(currentToken);
            }
          } catch (err) {
            console.error('[FCM] Error checking existing token:', err);
          }
        }
      }
    };

    checkPermission();
  }, [supported, user?.uid, saveToken]);

  /**
   * Listen for foreground messages
   */
  useEffect(() => {
    if (!supported || !hasPermission) return;

    const messaging = getMessaging(app);

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);

      // Show notification even in foreground
      if (payload.data?.title) {
        new Notification(payload.data.title, {
          body: payload.data.body || '',
          icon: payload.data.icon || '/pwa/icon-192.png'
        });
      }
    });

    return unsubscribe;
  }, [supported, hasPermission]);

  return {
    requestPermission,
    hasPermission,
    isSupported: supported,
    iosNeedsInstall: platform === 'ios' && !iosInstalled,
    loading,
    error
  };
}
```

**Step 2: Commit the hook**

```bash
git add src/hooks/useFCMToken.js
git commit -m "feat: add useFCMToken hook for FCM token management"
```

---

## Phase 4: Frontend - Notification Prompt Components

### Task 6: Create NotificationPrompt Component

**Files:**
- Create: `src/components/common/NotificationPrompt.jsx`

**Step 1: Create component directory if needed**

```bash
mkdir -p src/components/common
```

**Step 2: Create the component**

Create `src/components/common/NotificationPrompt.jsx`:

```javascript
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useFCMToken } from '../../hooks/useFCMToken';

/**
 * NotificationPrompt Component
 *
 * Dual strategy for requesting notification permissions:
 * 1. Modal on first login (if status is 'pending')
 * 2. Banner reminder if user dismissed modal without deciding
 */
export function NotificationPrompt({ user }) {
  const [promptStatus, setPromptStatus] = useState('pending');
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);

  const { requestPermission, hasPermission, isSupported, iosNeedsInstall, loading: fcmLoading } = useFCMToken(user);

  /**
   * Load prompt status from Firestore
   */
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const loadStatus = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          const status = data.notificationPromptStatus || 'pending';
          setPromptStatus(status);

          // Show modal if status is pending and hasn't been shown recently
          if (status === 'pending') {
            const lastShown = data.notificationPromptLastShown?.toDate();
            const now = new Date();
            const daysSinceShown = lastShown
              ? (now - lastShown) / (1000 * 60 * 60 * 24)
              : 999;

            if (daysSinceShown > 1) {
              setShowModal(true);
            } else {
              setShowBanner(true);
            }
          }

          // Show banner if status is dismissed
          if (status === 'dismissed') {
            setShowBanner(true);
          }
        } else {
          // New user, show modal
          setShowModal(true);
        }
      } catch (error) {
        console.error('[NotificationPrompt] Error loading status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [user?.uid]);

  /**
   * Update status in Firestore
   */
  const updateStatus = async (newStatus) => {
    if (!user?.uid) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        notificationPromptStatus: newStatus,
        notificationPromptLastShown: Timestamp.now()
      }, { merge: true });
      setPromptStatus(newStatus);
    } catch (error) {
      console.error('[NotificationPrompt] Error updating status:', error);
    }
  };

  /**
   * Handle "Activate Now" button
   */
  const handleActivate = async () => {
    const success = await requestPermission();

    if (success) {
      await updateStatus('accepted');
      setShowModal(false);
      setShowBanner(false);
    }
  };

  /**
   * Handle "Later" button
   */
  const handleLater = async () => {
    await updateStatus('dismissed');
    setShowModal(false);
    setShowBanner(true);
  };

  /**
   * Handle "Don't ask again" button
   */
  const handleNever = async () => {
    await updateStatus('rejected');
    setShowModal(false);
    setShowBanner(false);
  };

  /**
   * Handle banner close
   */
  const handleBannerClose = () => {
    setShowBanner(false);
  };

  // Don't show anything if loading, not supported, or already has permission
  if (loading || !isSupported || hasPermission || iosNeedsInstall) {
    return null;
  }

  // Don't show if user rejected
  if (promptStatus === 'rejected') {
    return null;
  }

  return (
    <>
      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleLater();
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
            }}
          >
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#2C6B6F'
            }}>
              Recibí notificaciones importantes
            </h2>

            <p style={{
              margin: '0 0 24px 0',
              fontSize: '15px',
              lineHeight: '1.5',
              color: '#555'
            }}>
              Activá notificaciones para saber al instante cuando hay comunicados nuevos o mensajes de la escuela.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleActivate}
                disabled={fcmLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#2C6B6F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: fcmLoading ? 'not-allowed' : 'pointer',
                  opacity: fcmLoading ? 0.6 : 1
                }}
              >
                {fcmLoading ? 'Activando...' : 'Activar ahora'}
              </button>

              <button
                onClick={handleLater}
                disabled={fcmLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f5f5f5',
                  color: '#555',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: fcmLoading ? 'not-allowed' : 'pointer'
                }}
              >
                Más tarde
              </button>

              <button
                onClick={handleNever}
                disabled={fcmLoading}
                style={{
                  padding: '8px',
                  backgroundColor: 'transparent',
                  color: '#999',
                  border: 'none',
                  fontSize: '13px',
                  cursor: fcmLoading ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline'
                }}
              >
                No volver a preguntar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner */}
      {showBanner && !showModal && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#2C6B6F',
            color: '#fff',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 9998,
            boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '500' }}>
              Activá notificaciones para no perderte comunicados importantes
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginLeft: '16px' }}>
            <button
              onClick={handleActivate}
              disabled={fcmLoading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#fff',
                color: '#2C6B6F',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: fcmLoading ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {fcmLoading ? 'Activando...' : 'Activar'}
            </button>

            <button
              onClick={handleBannerClose}
              disabled={fcmLoading}
              style={{
                padding: '8px',
                backgroundColor: 'transparent',
                color: '#fff',
                border: 'none',
                fontSize: '20px',
                cursor: fcmLoading ? 'not-allowed' : 'pointer',
                lineHeight: 1
              }}
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

**Step 3: Commit the component**

```bash
git add src/components/common/NotificationPrompt.jsx
git commit -m "feat: add NotificationPrompt component with modal and banner"
```

---

### Task 7: Create IOSInstallPrompt Component

**Files:**
- Create: `src/components/common/IOSInstallPrompt.jsx`

**Step 1: Create the component**

Create `src/components/common/IOSInstallPrompt.jsx`:

```javascript
import { useState, useEffect } from 'react';

/**
 * Detects if user is on iOS
 */
const isIOS = () => {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
};

/**
 * Detects if PWA is installed (standalone mode)
 */
const isInstalled = () => {
  return window.navigator.standalone === true;
};

/**
 * IOSInstallPrompt Component
 *
 * Shows installation instructions for iOS users who haven't installed the PWA.
 * Only displays to family users on iOS Safari (not installed).
 */
export function IOSInstallPrompt({ userRole }) {
  const [dismissed, setDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show for family role on iOS not installed
    if (userRole !== 'family') {
      setShowPrompt(false);
      return;
    }

    if (!isIOS()) {
      setShowPrompt(false);
      return;
    }

    if (isInstalled()) {
      setShowPrompt(false);
      return;
    }

    // Check if user has dismissed before
    const dismissedKey = 'pn:ios-install-prompt-dismissed';
    const wasDismissed = localStorage.getItem(dismissedKey);

    if (wasDismissed) {
      setDismissed(true);
      setShowPrompt(false);
      return;
    }

    // Show prompt
    setShowPrompt(true);
  }, [userRole]);

  const handleDismiss = () => {
    const dismissedKey = 'pn:ios-install-prompt-dismissed';
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
    setShowPrompt(false);
  };

  if (!showPrompt || dismissed) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#007AFF',
        color: '#fff',
        padding: '20px 16px',
        zIndex: 9997,
        boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.15)'
      }}
    >
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          backgroundColor: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '24px',
          cursor: 'pointer',
          padding: '4px',
          lineHeight: 1
        }}
        aria-label="Cerrar"
      >
        ×
      </button>

      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '17px',
          fontWeight: '600'
        }}>
          📱 Instalá la app para recibir notificaciones
        </h3>

        <p style={{
          margin: '0 0 16px 0',
          fontSize: '15px',
          lineHeight: '1.4',
          opacity: 0.95
        }}>
          Para recibir notificaciones importantes en tu iPhone o iPad:
        </p>

        <ol style={{
          margin: '0',
          paddingLeft: '20px',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <li>Tocá el botón de <strong>Compartir</strong> en Safari (abajo al centro)</li>
          <li>Desplazate y seleccioná <strong>"Añadir a pantalla de inicio"</strong></li>
          <li>Confirmá tocando <strong>"Agregar"</strong></li>
        </ol>

        <p style={{
          margin: '16px 0 0 0',
          fontSize: '13px',
          opacity: 0.8
        }}>
          Una vez instalada, podrás activar las notificaciones desde la app.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit the component**

```bash
git add src/components/common/IOSInstallPrompt.jsx
git commit -m "feat: add IOSInstallPrompt component for iOS PWA installation"
```

---

### Task 8: Integrate Notification Components into Layout

**Files:**
- Modify: `src/components/layout/FamilyLayout.jsx` (or wherever family portal layout is)

**Step 1: Find the family layout component**

```bash
find src -name "*Layout*.jsx" -o -name "*layout*.jsx" | grep -i family
```

**Step 2: Import and add components**

Add to the family layout file (adjust path as needed):

```javascript
import { NotificationPrompt } from '../common/NotificationPrompt';
import { IOSInstallPrompt } from '../common/IOSInstallPrompt';
import { useAuth } from '../../hooks/useAuth';

// Inside component, after user is loaded:
const { user, role } = useAuth();

// In JSX, add near the end (before closing tag):
<>
  {/* Existing layout content */}

  {/* Notification prompts */}
  {user && role === 'family' && (
    <>
      <NotificationPrompt user={user} />
      <IOSInstallPrompt userRole={role} />
    </>
  )}
</>
```

**Note:** Exact implementation depends on your layout structure. The key is to mount these components after the user is authenticated and their role is determined.

**Step 3: Commit integration**

```bash
git add src/components/layout/*.jsx
git commit -m "feat: integrate notification prompts into family layout"
```

---

## Phase 5: Cloud Functions - FCM Helpers

### Task 9: Create FCM Helper Functions

**Files:**
- Create: `functions/src/utils/fcm.js`

**Step 1: Create FCM utility module**

Create `functions/src/utils/fcm.js`:

```javascript
const admin = require('firebase-admin');

/**
 * Fetch valid FCM tokens for given user IDs
 * Filters tokens older than 30 days
 *
 * @param {string[]} userIds - Array of user UIDs
 * @returns {Promise<string[]>} Array of FCM tokens
 */
async function fetchTokensForUsers(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return [];
  }

  const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  const allTokens = [];

  // Fetch tokens from subcollection for each user
  for (const uid of userIds) {
    try {
      const tokensSnap = await admin.firestore()
        .collection('users').doc(uid)
        .collection('fcm_tokens')
        .where('lastUsed', '>', thirtyDaysAgo)
        .get();

      tokensSnap.forEach(doc => {
        const data = doc.data();
        if (data.token) {
          allTokens.push(data.token);
        }
      });
    } catch (error) {
      console.error(`[FCM] Error fetching tokens for user ${uid}:`, error);
      // Continue with other users even if one fails
    }
  }

  return allTokens;
}

/**
 * Clean up invalid FCM tokens from Firestore
 * Removes tokens that returned 'registration-token-not-registered' error
 *
 * @param {Object} response - FCM sendEachForMulticast response
 * @param {string[]} tokens - Array of tokens that were sent
 * @param {string[]} userIds - Array of user IDs to check
 * @returns {Promise<number>} Number of tokens cleaned up
 */
async function cleanupInvalidTokens(response, tokens, userIds) {
  if (!response || !response.responses || !Array.isArray(tokens)) {
    return 0;
  }

  const invalidTokens = [];

  // Identify invalid tokens from response
  response.responses.forEach((resp, idx) => {
    if (resp.error?.code === 'messaging/registration-token-not-registered') {
      invalidTokens.push(tokens[idx]);
    }
  });

  if (invalidTokens.length === 0) {
    return 0;
  }

  console.log(`[FCM] Cleaning up ${invalidTokens.length} invalid tokens`);

  let cleanedCount = 0;

  // Delete invalid tokens from Firestore
  // Use batching for efficiency (max 500 operations per batch)
  const batch = admin.firestore().batch();
  let operationsCount = 0;

  for (const uid of userIds) {
    try {
      // Firestore 'in' query supports max 10 items
      // Split invalid tokens into chunks of 10
      const chunks = [];
      for (let i = 0; i < invalidTokens.length; i += 10) {
        chunks.push(invalidTokens.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        const tokensSnap = await admin.firestore()
          .collection('users').doc(uid)
          .collection('fcm_tokens')
          .where('token', 'in', chunk)
          .get();

        tokensSnap.forEach(doc => {
          batch.delete(doc.ref);
          operationsCount++;
          cleanedCount++;

          // Commit batch if we hit 500 operations
          if (operationsCount >= 500) {
            batch.commit();
            operationsCount = 0;
          }
        });
      }
    } catch (error) {
      console.error(`[FCM] Error cleaning tokens for user ${uid}:`, error);
    }
  }

  // Commit remaining operations
  if (operationsCount > 0) {
    await batch.commit();
  }

  console.log(`[FCM] Cleaned up ${cleanedCount} invalid tokens`);
  return cleanedCount;
}

/**
 * Send push notification to multiple tokens
 *
 * @param {Object} payload - Notification payload
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification body
 * @param {string} payload.clickAction - URL to open on click
 * @param {string[]} tokens - Array of FCM tokens
 * @param {string[]} userIds - Array of user IDs (for cleanup)
 * @returns {Promise<Object>} { successCount, failureCount }
 */
async function sendPushNotification(payload, tokens, userIds) {
  if (!tokens || tokens.length === 0) {
    console.log('[FCM] No tokens to send to');
    return { successCount: 0, failureCount: 0 };
  }

  const message = {
    data: {
      title: payload.title || 'Puerto Nuevo',
      body: payload.body || 'Tienes una notificación nueva',
      icon: payload.icon || '/pwa/icon-192.png',
      clickAction: payload.clickAction || '/portal/familia'
    },
    tokens
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`[FCM] Sent: ${response.successCount} success, ${response.failureCount} failures`);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      await cleanupInvalidTokens(response, tokens, userIds);
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount
    };
  } catch (error) {
    console.error('[FCM] Error sending notification:', error);
    throw error;
  }
}

module.exports = {
  fetchTokensForUsers,
  cleanupInvalidTokens,
  sendPushNotification
};
```

**Step 2: Commit FCM helpers**

```bash
git add functions/src/utils/fcm.js
git commit -m "feat: add FCM helper functions for token management and sending"
```

---

## Phase 6: Cloud Functions - Modify Existing Triggers

### Task 10: Add FCM to onCommunicationCreated Trigger

**Files:**
- Modify: `functions/src/triggers/onCommunicationCreated.js`

**Step 1: Read existing trigger to understand structure**

Read `functions/src/triggers/onCommunicationCreated.js` to find where to add FCM logic.

**Step 2: Add FCM import and logic**

At the top of the file, add:

```javascript
const { sendPushNotification, fetchTokensForUsers } = require('../utils/fcm');
```

After the email sending logic (search for where emails are sent), add FCM sending logic:

```javascript
// After email sending is complete, send push notifications
try {
  // Fetch FCM tokens for destinatarios
  const fcmTokens = await fetchTokensForUsers(destinatarios);

  if (fcmTokens.length > 0) {
    const notificationPayload = {
      title: 'Nuevo comunicado',
      body: commData.title?.substring(0, 100) || 'Hay un comunicado importante',
      icon: '/pwa/icon-192.png',
      clickAction: '/portal/familia/comunicados'
    };

    await sendPushNotification(notificationPayload, fcmTokens, destinatarios);
    console.log(`[FCM] Push notifications sent for communication ${commId}`);
  } else {
    console.log('[FCM] No FCM tokens found for destinatarios');
  }
} catch (fcmError) {
  console.error('[FCM] Error sending push notifications:', fcmError);
  // Don't fail the entire function if FCM fails
}
```

**Step 3: Test the function locally (optional)**

```bash
cd functions
npm run serve
```

**Step 4: Commit the changes**

```bash
git add functions/src/triggers/onCommunicationCreated.js
git commit -m "feat: add push notifications to communication created trigger"
```

---

### Task 11: Add FCM to onConversationMessageCreated Trigger

**Files:**
- Modify: `functions/src/triggers/onConversationMessageCreated.js`

**Step 1: Read existing trigger**

Read the file to understand current structure.

**Step 2: Add FCM logic**

At the top, add import:

```javascript
const { sendPushNotification, fetchTokensForUsers } = require('../utils/fcm');
```

In the function body, after fetching the conversation document, add:

```javascript
// Determine recipient for push notification
// Only send to family when school sends a message
const message = snapshot.data();
const senderRole = message.senderRole;

if (senderRole !== 'family' && convData.familiaUid) {
  try {
    // Fetch FCM tokens for family
    const fcmTokens = await fetchTokensForUsers([convData.familiaUid]);

    if (fcmTokens.length > 0) {
      const notificationPayload = {
        title: 'Nuevo mensaje de la escuela',
        body: convData.asunto?.substring(0, 100) || 'Tenés una respuesta',
        icon: '/pwa/icon-192.png',
        clickAction: `/portal/familia/conversaciones/${convId}`
      };

      await sendPushNotification(notificationPayload, fcmTokens, [convData.familiaUid]);
      console.log(`[FCM] Push notification sent for conversation ${convId}`);
    }
  } catch (fcmError) {
    console.error('[FCM] Error sending conversation push notification:', fcmError);
  }
}
```

**Step 3: Commit the changes**

```bash
git add functions/src/triggers/onConversationMessageCreated.js
git commit -m "feat: add push notifications to conversation message trigger"
```

---

## Phase 7: Firestore Security Rules

### Task 12: Add Security Rules for FCM Tokens

**Files:**
- Modify: `firestore.rules`

**Step 1: Add rules for fcm_tokens subcollection**

Open `firestore.rules` and add within the `users/{userId}` match block:

```javascript
match /fcm_tokens/{tokenId} {
  // Users can read, write, and delete their own FCM tokens
  allow read, create, update, delete: if request.auth != null
                                      && request.auth.uid == userId
                                      && request.resource.data.keys().hasAll(['token', 'device', 'platform', 'createdAt', 'lastUsed']);
}
```

Also update the main `users/{userId}` rule to allow writing `notificationPromptStatus` and `notificationPromptLastShown`:

```javascript
match /users/{userId} {
  // Existing rules...

  // Allow users to update their notification prompt status
  allow update: if request.auth != null
                && request.auth.uid == userId
                && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['notificationPromptStatus', 'notificationPromptLastShown']);

  // Existing subcollections...

  match /fcm_tokens/{tokenId} {
    allow read, create, update, delete: if request.auth != null
                                        && request.auth.uid == userId;
  }
}
```

**Step 2: Deploy rules**

```bash
firebase deploy --only firestore:rules
```

**Step 3: Commit the changes**

```bash
git add firestore.rules
git commit -m "feat: add security rules for FCM tokens subcollection"
```

---

## Phase 8: Testing & Validation

### Task 13: Manual Testing Checklist

**Files:**
- Create: `docs/testing/push-notifications-test-plan.md`

**Step 1: Create test plan document**

Create `docs/testing/push-notifications-test-plan.md`:

```markdown
# Push Notifications Testing Plan

## Phase 1: Setup Verification

- [ ] VAPID keys generated in Firebase Console
- [ ] `.env` file has `VITE_FIREBASE_VAPID_KEY`
- [ ] Service Worker file exists at `public/firebase-messaging-sw.js`
- [ ] Cloud Functions deployed successfully

## Phase 2: Frontend Testing

### Desktop (Chrome)

- [ ] Visit app as family user
- [ ] Modal appears on first visit
- [ ] Click "Activar ahora" → Browser requests permission
- [ ] Grant permission → Token saved to Firestore `/users/{uid}/fcm_tokens/`
- [ ] Check Firestore: token exists with correct platform ('web')
- [ ] Refresh page → Modal doesn't appear again

### Android (Chrome Mobile)

- [ ] Install PWA on Android device
- [ ] Open PWA → Modal appears
- [ ] Grant permission
- [ ] Check Firestore: token exists with platform: 'android'
- [ ] Test with multiple devices → Multiple tokens in subcollection

### iOS (Safari 16.4+)

- [ ] Visit in Safari (not installed) → IOSInstallPrompt appears
- [ ] Follow instructions → Install PWA to Home Screen
- [ ] Open installed PWA → NotificationPrompt appears
- [ ] Grant permission
- [ ] Check Firestore: token exists with platform: 'ios'

### Permission States

- [ ] Click "Más tarde" → Modal closes, banner appears on next visit
- [ ] Click "No volver a preguntar" → Modal never appears again
- [ ] Check `notificationPromptStatus` in Firestore matches UI state

## Phase 3: Backend Testing

### Communication Push Notifications

- [ ] Deploy Cloud Functions: `cd functions && npm run deploy`
- [ ] Create test communication as admin
- [ ] Check Cloud Function logs for FCM send success
- [ ] Family user receives push notification within 5 seconds
- [ ] Notification shows correct title and body
- [ ] Click notification → Opens `/portal/familia/comunicados`

### Conversation Push Notifications

- [ ] Family creates conversation
- [ ] Admin/docente responds
- [ ] Family receives push notification
- [ ] Notification shows "Nuevo mensaje de la escuela"
- [ ] Click notification → Opens specific conversation

## Phase 4: Edge Cases

### App States

- [ ] App open (foreground) → Notification appears as toast
- [ ] App in background → Push notification appears
- [ ] App closed → Push notification appears
- [ ] Device locked → Notification on lock screen (iOS)

### Error Handling

- [ ] User denies permission → Status saved as 'rejected', no retry
- [ ] Invalid token → FCM returns error, token deleted from Firestore
- [ ] User uninstalls app → Next send cleans up token automatically

### iOS Specific

- [ ] PWA installed → Notifications work
- [ ] Safari web (not installed) → IOSInstallPrompt shows, no notification request
- [ ] Badge appears on app icon after notification

## Phase 5: Performance & Cost

- [ ] Check Firebase Console → Cloud Messaging → Delivery rate (target: >95%)
- [ ] Check Cloud Functions logs → No errors
- [ ] Check Firebase Usage → Functions within free tier
- [ ] Check Firestore reads → Expected ~50-100 tokens total for school

## Phase 6: Security & Privacy

- [ ] Notification payload contains NO sensitive data (names, medical info)
- [ ] Security rules prevent users from reading other users' tokens
- [ ] VAPID public key is in `.env`, private key never exposed

## Issues Found

Document any issues discovered during testing:

1.
2.
3.

## Sign-off

- [ ] All critical tests passed
- [ ] Performance acceptable
- [ ] Security validated
- [ ] Ready for production rollout
```

**Step 2: Commit test plan**

```bash
mkdir -p docs/testing
git add docs/testing/push-notifications-test-plan.md
git commit -m "docs: add push notifications testing plan"
```

---

### Task 14: Deploy to Staging

**Files:**
- None (deployment task)

**Step 1: Build frontend**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Deploy Cloud Functions**

```bash
cd functions
npm run deploy
cd ..
```

Expected: Functions deploy successfully

**Step 3: Deploy Hosting**

```bash
firebase deploy --only hosting
```

Expected: Hosting deploys successfully

**Step 4: Verify deployment**

Visit staging URL and check:
- Service Worker registered
- NotificationPrompt appears for family users
- No console errors

**Step 5: Document deployment**

```bash
git tag v1.0.0-push-notifications
git push origin master --tags
```

---

## Phase 9: Production Rollout

### Task 15: Beta Testing with 5 Families

**Files:**
- Create: `docs/rollout/push-notifications-beta.md`

**Step 1: Create beta rollout doc**

Create `docs/rollout/push-notifications-beta.md`:

```markdown
# Push Notifications Beta Rollout

## Beta Testers (5 families)

1. Family UID: ____________ - Feedback: ____________
2. Family UID: ____________ - Feedback: ____________
3. Family UID: ____________ - Feedback: ____________
4. Family UID: ____________ - Feedback: ____________
5. Family UID: ____________ - Feedback: ____________

## Testing Period

Start: ____________
End: ____________

## Metrics to Track

- Permission grant rate: ____%
- Notification delivery rate: ____%
- Average time to receive: ____s
- User feedback summary: ____________

## Issues Found

1.
2.

## Decision

- [ ] Proceed with full rollout
- [ ] Needs fixes (list below):
  -
```

**Step 2: Enable for beta testers**

No code changes needed - feature is available to all family users.

**Step 3: Monitor for 1 week**

Check Firebase Console daily:
- Cloud Messaging delivery metrics
- Cloud Functions logs
- Firestore token count

**Step 4: Collect feedback**

Reach out to beta families after 1 week for feedback.

**Step 5: Document results**

Update `docs/rollout/push-notifications-beta.md` with findings.

**Step 6: Commit documentation**

```bash
mkdir -p docs/rollout
git add docs/rollout/push-notifications-beta.md
git commit -m "docs: add beta rollout tracking for push notifications"
```

---

### Task 16: Full Rollout

**Files:**
- Update: `docs/rollout/push-notifications-production.md`

**Step 1: Create production rollout doc**

Create `docs/rollout/push-notifications-production.md`:

```markdown
# Push Notifications Production Rollout

## Rollout Date

Date: ____________

## Pre-rollout Checklist

- [ ] Beta testing completed successfully
- [ ] All critical bugs fixed
- [ ] Cloud Functions monitoring enabled
- [ ] Firebase alerts configured
- [ ] Documentation updated

## Rollout Steps

1. ✅ Feature already deployed (available to all)
2. 📧 Send email to all families explaining new feature
3. 📊 Monitor adoption rate
4. 📈 Track delivery metrics

## Week 1 Metrics

- Total families: ____
- Families with permissions granted: ____
- Permission grant rate: ____%
- Average delivery time: ____s
- Total notifications sent: ____

## Week 2+ Monitoring

- Monitor weekly
- Review Cloud Functions costs
- Check for token accumulation
- User feedback

## Success Criteria

- Permission grant rate: >40%
- Delivery rate: >95%
- Zero critical errors
- Positive user feedback
```

**Step 2: Announce to families**

Send email/communication explaining:
- New notification feature
- How to enable
- Benefits

**Step 3: Monitor first week**

Check metrics daily for first week, then weekly.

**Step 4: Commit documentation**

```bash
git add docs/rollout/push-notifications-production.md
git commit -m "docs: add production rollout plan for push notifications"
```

---

## Completion Checklist

Before marking this plan as complete, verify:

- [ ] All 16 tasks completed
- [ ] Service Worker deployed and functional
- [ ] Frontend components integrated
- [ ] Cloud Functions sending notifications
- [ ] Firestore security rules updated
- [ ] Testing plan executed
- [ ] Beta testing completed
- [ ] Production rollout documented
- [ ] Monitoring in place

## Post-Implementation Notes

### Future Enhancements (Phase 2)

Consider these improvements after initial rollout:

1. **Quiet Hours**: Don't send between 22:00-08:00
2. **Notification Preferences**: Let users choose which types
3. **Token Cleanup Job**: Scheduled function to remove old tokens
4. **Admin Notifications**: Send to admin when family creates conversation
5. **Daily Digest**: Optional summary notification
6. **Rich Notifications**: Add images, action buttons

### Maintenance

- **Weekly**: Check Firebase Console metrics
- **Monthly**: Review token count and cleanup if needed
- **Quarterly**: Review costs and optimize if necessary

---

## Troubleshooting

### Service Worker not registering

- Check `/firebase-messaging-sw.js` is in `public/`
- Check browser console for errors
- Verify HTTPS (required for Service Workers)

### Tokens not saving to Firestore

- Check security rules allow write to `/users/{uid}/fcm_tokens/`
- Verify user is authenticated
- Check browser console for errors

### Notifications not received

- Verify token exists in Firestore
- Check Cloud Function logs for send errors
- Verify FCM is enabled in Firebase Console
- Test with different device/browser

### iOS not working

- Verify PWA is installed (not Safari web)
- Check iOS version (16.4+ required)
- Verify `display: standalone` in manifest

---

**End of Implementation Plan**
