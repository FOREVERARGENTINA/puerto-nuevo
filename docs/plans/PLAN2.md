# Plan Final Unificado: Push Notifications PWA (Simple, Premium, Sin Sobreingeniería)

## Resumen
Implementar push nativas para familias (iOS 16.4+ y Android) sobre la base actual del repo, sin migraciones de datos ni cambios de reglas.  
Se corrigen bugs backend existentes (API deprecada, duplicados, limpieza de tokens) y se agrega frontend mínimo viable (SW + hook + UX suave en banner/menú).

## Cambios de interfaces públicas
1. Nueva env var frontend: `VITE_FIREBASE_VAPID_KEY`.
2. Nuevo archivo estático: `public/firebase-messaging-sw.js`.
3. Reuso del campo existente en Firestore: `users/{uid}.fcmTokens` (array).
4. Nuevo módulo backend compartido: `functions/src/utils/pushNotifications.js`.
5. Nuevos helpers en frontend: `src/services/users.service.js` para agregar/quitar token.
6. No hay cambios de schema en colecciones sensibles ni en `firestore.rules`.

## Alcance
1. Incluido fase 1: push de comunicados y respuestas escuela->familia.
2. Excluido fase 1: push a staff, preferencias granulares, subcolección de tokens, quiet hours.
3. Privacidad: payload con resumen breve, sin datos sensibles de menores.

## Track 0 obligatorio: preflight de seguridad antes de rollout
1. Verificar y confirmar si hubo exposición histórica de credenciales de service account.
2. Si se detecta exposición: rotar credenciales en GCP/Firebase antes de producción.
3. Confirmar que `.gitignore` siga cubriendo claves (`service-account-key.json`, `*-adminsdk-*.json`).
4. Nota de estado local: en esta copia no se detecta `service-account-key.json` ni en árbol ni en historial visible; el check formal queda igual como puerta de salida.

## Track 1: Backend (primero)
1. Crear `functions/src/utils/pushNotifications.js`.
2. Implementar función de resolución de tokens desde `users.fcmTokens` con deduplicación.
3. Reemplazar `sendMulticast` por `sendEachForMulticast` con chunking seguro.
4. Implementar limpieza automática con `arrayRemove` para tokens inválidos (`messaging/registration-token-not-registered`, `messaging/invalid-registration-token`).
5. Refactor `functions/src/triggers/onCommunicationCreated.js`.
6. Enviar push una sola vez en `onCreate`, desacoplada del flujo de email.
7. Mantener `onCommunicationUpdated` para email diferido por adjuntos, sin push duplicada.
8. Corregir mapeos de roles legacy en consultas de destinatarios para alinear con `src/config/constants.js`.
9. Refactor `functions/src/triggers/onConversationMessageCreated.js`.
10. En fase 1, enviar push solo cuando responde escuela a familia.
11. Mantener emails actuales sin romper lógica existente.

## Track 2: Frontend FCM (segundo)
1. Crear `public/firebase-messaging-sw.js` con Firebase Messaging compat y handlers de background/click.
2. Crear `src/hooks/usePushNotifications.js` con objetivo de simplicidad operativa.
3. Regla de implementación del hook: mantenerlo compacto, idealmente <100 líneas efectivas.
4. Responsabilidades del hook: soporte browser, guardas iOS instalada, solicitud de permiso por interacción, registro de SW, obtención de token, persistencia en `users.fcmTokens`.
5. Extender `src/services/users.service.js` con `addFcmToken(uid, token)` y `removeFcmToken(uid, token)`.
6. Integrar activación en `src/components/common/PwaInstallPrompt.jsx` con banner suave no invasivo.
7. Integrar acción manual en `src/components/layout/Navbar.jsx` para activar notificaciones desde menú usuario.
8. Mantener `usePwaInstall` como base de detección e instalación.

## Track 3: Config y documentación (tercero)
1. Crear `.env.example` con `VITE_FIREBASE_VAPID_KEY=`.
2. Actualizar `docs/plans/2026-02-19-push-notifications-implementation.md` con este flujo final realista.
3. Documentar explícitamente backlog fase 2 para evitar scope creep.

## Orden de ejecución cerrado
1. `functions/src/utils/pushNotifications.js`.
2. Refactor de triggers en `functions/src/triggers/onCommunicationCreated.js` y `functions/src/triggers/onConversationMessageCreated.js`.
3. `public/firebase-messaging-sw.js` y `src/hooks/usePushNotifications.js`.
4. UX en `src/components/common/PwaInstallPrompt.jsx` y `src/components/layout/Navbar.jsx`.
5. `.env.example` y docs.

## Casos de prueba y aceptación
1. Comunicado creado con `sendByEmail=false` envía push igual.
2. Comunicado con adjuntos pendientes envía una sola push en create y no repite al update.
3. Respuesta escuela->familia en conversación envía push a familia.
4. Mensaje familia->escuela no envía push a staff en fase 1.
5. Token inválido se elimina automáticamente de `users.fcmTokens`.
6. Android: permiso concedido guarda token y recibe push.
7. iOS no instalada: no solicita permiso, muestra guía de instalación.
8. iOS instalada: permite activar y recibe push en background.
9. No regresión en envíos email existentes.

## Verificación técnica mínima
1. `npm run lint` en raíz.
2. `npm run build` en raíz.
3. Validación manual en staging con 2-5 familias reales.
4. Monitoreo de logs Functions y delivery FCM antes de producción completa.

## Supuestos y defaults explícitos
1. Se mantiene `users.fcmTokens` como almacenamiento fase 1.
2. No se tocan `firestore.rules` ni estructuras sensibles.
3. Backend usa `firebase-admin` v12+ y se actualiza a API no deprecada.
4. UX de permisos prioriza bajo roce y control manual del usuario.
5. Rollout a producción queda bloqueado hasta completar Track 0 de seguridad.
