# Implementación Push Notifications PWA (Ejecución Final)

## Resumen
Implementar push nativas para familias (iOS 16.4+ y Android) sobre la base actual, sin migraciones ni cambios de `firestore.rules`, corrigiendo bugs del backend existente y agregando el frontend mínimo necesario (SW + hook + UX suave en banner/menú).

## Cambios de interfaces públicas / configuración
1. Agregar `VITE_FIREBASE_VAPID_KEY` en entorno frontend.
2. Crear `public/firebase-messaging-sw.js`.
3. Extender `src/services/users.service.js` con helpers de tokens FCM.
4. Crear `src/hooks/usePushNotifications.js`.
5. Crear `functions/src/utils/pushNotifications.js`.
6. Refactorizar `functions/src/triggers/onCommunicationCreated.js`.
7. Refactorizar `functions/src/triggers/onConversationMessageCreated.js`.

## Track 0 (bloqueante): Seguridad
1. Tratar `functions/service-account-key.json` como incidente potencial.
2. Verificar exposición histórica en remoto y forks antes de cualquier rollout.
3. Rotar/revocar credenciales asociadas si hubo exposición.
4. Eliminar uso local del archivo en runtime productivo (Functions debe usar credenciales administradas).
5. Mantener y verificar cobertura en `.gitignore` para claves.
6. Condición de salida: evidencia de auditoría + rotación completada + riesgo residual aceptado.

## Track 1: Backend (primero)
1. Crear `functions/src/utils/pushNotifications.js` con:
   1. Resolución de usuarios por UIDs en batches Firestore (`in` de 10).
   2. Extracción/deduplicación de `fcmTokens`.
   3. Envío por chunks con `admin.messaging().sendEachForMulticast`.
   4. Limpieza de tokens inválidos con `arrayRemove` en `users/{uid}.fcmTokens`.
2. En `functions/src/triggers/onCommunicationCreated.js`:
   1. Enviar push una sola vez en `onCreate`, desacoplada de email.
   2. Hacer push aunque `sendByEmail=false`.
   3. Hacer push aunque `hasPendingAttachments=true`.
   4. Mantener flujo email tal como está para adjuntos.
   5. Eliminar cualquier envío push duplicado en `onUpdate`.
   6. Corregir roles legacy en queries (alinear con `docente`, `coordinacion`, `superadmin`, `facturacion`, `family`).
3. En `functions/src/triggers/onConversationMessageCreated.js`:
   1. En fase 1, push solo cuando responde escuela a familia.
   2. No enviar push a staff cuando escribe familia.
   3. Reusar util compartido de push y cleanup.
4. Payload estándar con privacidad:
   1. `title` y `body` breves/sanitizados.
   2. `clickAction` con deep-link válido.
   3. Sin datos sensibles de menores.

## Track 2: Frontend (segundo)
1. Crear `public/firebase-messaging-sw.js`:
   1. Inicializar Firebase Messaging compat.
   2. Manejar `onBackgroundMessage`.
   3. Manejar `notificationclick` para abrir/enfocar ruta.
2. Crear `src/hooks/usePushNotifications.js`:
   1. Validar soporte (`Notification`, SW, contexto seguro, `isSupported` de Messaging).
   2. Bloquear solicitud en iOS no instalada.
   3. Solicitar permiso solo por interacción de usuario.
   4. Registrar SW de messaging.
   5. Obtener token con VAPID.
   6. Persistir token en `users.fcmTokens` solo si no existe.
3. Extender `src/services/users.service.js`:
   1. `addFcmToken(uid, token)` con `arrayUnion`.
   2. `removeFcmToken(uid, token)` con `arrayRemove`.
4. UX “simple pero premium”:
   1. Reusar `src/components/common/PwaInstallPrompt.jsx` para banner suave de activación push (solo familias elegibles).
   2. Agregar acción manual en `src/components/layout/Navbar.jsx` (“Activar notificaciones”).
   3. Cooldown por `localStorage` para evitar insistencia.

## Track 3: Config y documentación (tercero)
1. Crear `.env.example` con `VITE_FIREBASE_VAPID_KEY=`.
2. Actualizar `docs/plans/2026-02-19-push-notifications-implementation.md` con este plan final.
3. Dejar explícito backlog fase 2 (staff push, preferencias granulares, subcolección, quiet hours).

## Casos de prueba
1. Comunicado nuevo dispara push una vez, aunque no haya email.
2. Comunicado con adjuntos pendientes no duplica push al completar adjuntos.
3. Respuesta escuela->familia en conversación dispara push.
4. Mensaje familia->escuela no dispara push a staff (fase 1).
5. Token inválido reportado por FCM se elimina de `fcmTokens`.
6. Android instalado: permiso + token + recepción OK.
7. iOS no instalada: no pide permiso, muestra guía.
8. iOS instalada: habilita permiso y recibe en background.
9. No regresión en envíos de email de comunicados/conversaciones.

## Criterio de aceptación
1. Backend sin `sendMulticast` deprecado.
2. Cero envíos push duplicados en comunicados.
3. Registro y cleanup de tokens funcionando.
4. Activación push disponible y usable para familias.
5. Track 0 de seguridad cerrado antes de producción.

## Supuestos y defaults
1. Se mantiene `users.fcmTokens` como almacenamiento fase 1.
2. No se modifican `firestore.rules`.
3. Scope funcional: solo familias.
4. Rollout productivo condicionado al cierre del Track 0.
