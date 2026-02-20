# Plan Unificado: Push Notifications PWA (Simple + Premium)

## Resumen
Implementar push notifications nativas para PWA en iOS 16.4+ y Android, usando el stack actual (React + Vite + Firebase Functions), evitando sobreingeniería y sin migraciones de datos.  
Se unifica idea + diseño + implementación real del repo con foco en: familias primero, UX suave, privacidad de menores, y mantenimiento bajo.

## Decisiones Cerradas
1. Almacenamiento de tokens: mantener `users.fcmTokens` (array existente), sin subcolección ni migración.
2. Alcance fase 1: notificar por push solo a familias.
3. UX permisos: reusar UI existente + banner suave (no modal invasivo).
4. Privacidad payload: resumen breve, sin datos sensibles.
5. Momento de envío: push inmediata al crear comunicado (no esperar adjuntos).

## Cambios en Interfaces Públicas / Tipos / Configuración
1. Nueva variable de entorno frontend: `VITE_FIREBASE_VAPID_KEY`.
2. Nuevo service worker estático: `public/firebase-messaging-sw.js`.
3. Uso activo del campo Firestore existente: `users/{uid}.fcmTokens: string[]`.
4. No se agregan colecciones nuevas ni cambios de `firestore.rules` en esta fase.
5. Push payload backend estandarizado en `data`: `title`, `body`, `clickAction`.

## Implementación Detallada

## 1) Consolidación documental (merge de planes)
1. Actualizar `docs/plans/2026-02-19-push-notifications-implementation.md` con este enfoque final.
2. Mantener `docs/plans/2026-02-19-push-notifications-design.md` como referencia conceptual.
3. Dejar explícito en la documentación qué se difiere a fase 2:
   - subcolección de tokens,
   - preferencias granulares,
   - push a staff,
   - quiet hours,
   - jobs programados.

## 2) Frontend base FCM (sin romper PWA actual)
1. Crear `.env.example` en raíz con:
   - `VITE_FIREBASE_VAPID_KEY=`
2. Crear `public/firebase-messaging-sw.js`:
   - importar `firebase-app-compat` y `firebase-messaging-compat` desde CDN,
   - inicializar Firebase con config pública del proyecto,
   - implementar `messaging.onBackgroundMessage` para mostrar notificación,
   - implementar `notificationclick` para abrir/enfocar `clickAction`.
3. Crear `src/hooks/usePushNotifications.js`:
   - detectar soporte real (`isSecureContext`, `Notification`, SW, `firebase/messaging isSupported()`),
   - bloquear solicitud en iOS si no está instalada (`standalone`),
   - `enablePush()`:
     - solicitar permiso por interacción de usuario,
     - registrar `firebase-messaging-sw.js` con scope dedicado para coexistir con VitePWA,
     - obtener token con `getToken(..., { vapidKey, serviceWorkerRegistration })`,
     - persistir token con `arrayUnion` en `users/{uid}.fcmTokens`,
   - `syncIfGranted()`:
     - si `Notification.permission === 'granted'`, revalidar token sin repreguntar.
4. Extender `src/services/users.service.js` con helpers explícitos:
   - `addFcmToken(uid, token)` con `arrayUnion`,
   - `removeFcmToken(uid, token)` con `arrayRemove` (uso actual/futuro).

## 3) UX “simple pero premium” (familias)
1. Reusar `src/components/common/PwaInstallPrompt.jsx` para banner push suave:
   - solo rol `family`,
   - solo cuando soporte esté disponible,
   - solo cuando permiso no esté concedido,
   - en iOS solo si app está instalada,
   - cooldown local (localStorage) para no insistir en cada sesión.
2. Ajustar `src/components/layout/Navbar.jsx`:
   - agregar acción manual en menú usuario:
     - “Activar notificaciones” (si no activadas),
     - “Notificaciones activas” (estado informativo),
     - ayuda contextual si iOS no instalada.
3. Ajustar estilos en `src/styles/components.css` reutilizando estética de banners actuales (sin crear un sistema nuevo).

## 4) Backend push reutilizable y limpieza automática
1. Crear `functions/src/utils/pushNotifications.js`:
   - resolver destinatarios y tokens en batches desde `users`,
   - filtrar por rol `family` cuando corresponda,
   - deduplicar tokens,
   - enviar en lotes con `sendEachForMulticast` (chunk <= 500),
   - limpiar tokens inválidos (`registration-token-not-registered`, `invalid-registration-token`) removiéndolos de `users/{uid}.fcmTokens`.
2. Mantener payload con `data` (no `notification`) para control en SW:
   - `title`,
   - `body`,
   - `clickAction`.

## 5) Refactor triggers actuales (sin cambio de modelo de datos)
1. Modificar `functions/src/triggers/onCommunicationCreated.js`:
   - desacoplar push del flujo email,
   - enviar push inmediatamente después de resolver destinatarios,
   - enviar aunque `sendByEmail=false`,
   - enviar aunque `hasPendingAttachments=true`,
   - mantener emails como hasta ahora (incluyendo diferido por adjuntos),
   - quitar bloques duplicados de push dentro de loops de email,
   - dejar `onCommunicationUpdated` solo para emails diferidos (sin segundo push).
2. Corregir mapeo de roles en helpers de destinatarios del mismo archivo:
   - reemplazar roles legacy (`teacher`, `admin`, `direccion`) por roles reales del proyecto (`docente`, `coordinacion`, `superadmin`, `facturacion`, `family`) según la lógica vigente.
3. Modificar `functions/src/triggers/onConversationMessageCreated.js`:
   - push solo cuando escuela responde a familia,
   - no enviar push a staff en fase 1,
   - mantener email actual para staff/familia según lógica existente,
   - usar util compartido de push + limpieza de tokens.
4. No tocar `firestore.rules` en esta fase (evita zona roja y mantiene simplicidad).

## 6) Contenido de notificaciones (privacidad)
1. Comunicados:
   - título: basado en `commData.title` sanitizado,
   - cuerpo: resumen breve sanitizado y truncado,
   - `clickAction`: `/portal/familia/comunicados/{commId}`.
2. Conversaciones:
   - título: “Nuevo mensaje de la escuela”,
   - cuerpo: resumen breve de `message.texto` (o fallback),
   - `clickAction`: `/portal/familia/conversaciones/{convId}`.
3. Prohibido en payload:
   - datos médicos,
   - nombres completos de menores,
   - información sensible de contacto.

## 7) Pruebas y aceptación
1. `npm run lint` en raíz.
2. `npm run build` en raíz.
3. Verificación manual frontend:
   - Android/Chrome: activar permiso y confirmar token en `users/{uid}.fcmTokens`,
   - iOS Safari no instalada: no pedir permiso, mostrar guía de instalación,
   - iOS instalada: permitir activación de push.
4. Verificación backend:
   - comunicado con `sendByEmail=false` dispara push igual,
   - comunicado con adjuntos dispara una sola push (sin duplicado en update),
   - respuesta de escuela en conversación dispara push a familia,
   - mensaje de familia no dispara push a staff (fase 1),
   - token inválido se elimina del array automáticamente.
5. Verificación de regresión:
   - emails de comunicados y conversaciones siguen funcionando.

## 8) Rollout y monitoreo
1. Staging con 2-5 familias reales.
2. Producción gradual.
3. Monitorear:
   - logs de Functions (success/failure de push),
   - tamaño y salud de `fcmTokens`,
   - tasa de entrega en Firebase Cloud Messaging.
4. Mantener plan de rollback simple:
   - quitar `VITE_FIREBASE_VAPID_KEY` para desactivar registro de nuevos tokens sin revertir código.

## Casos de Test (escenarios mínimos obligatorios)
1. Familia Android instalada acepta permisos y recibe comunicado.
2. Familia iOS no instalada ve guía y no se intenta registrar token.
3. Familia iOS instalada acepta permisos y recibe conversación.
4. Comunicado sin email (`sendByEmail=false`) igualmente notifica por push.
5. Comunicado con adjuntos pendientes notifica al crear y no repite al completar adjuntos.
6. Push con token inválido limpia `fcmTokens`.
7. Staff no recibe push en mensajes de familia (acorde al alcance definido).

## Supuestos y Defaults Explícitos
1. Se mantiene `users.fcmTokens` como fuente única de tokens en fase 1.
2. No habrá migración de datos ni cambios de estructura sensible.
3. No se modifica `firestore.rules` en este ciclo.
4. Se prioriza UX no invasiva (banner suave + acción manual).
5. “Familias primero” significa push solo hacia familias en esta fase.
6. Deploy y ejecución de comandos productivos los realiza el humano, no el agente.
