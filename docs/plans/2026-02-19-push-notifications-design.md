# Diseño: Sistema de Notificaciones Push para PWA

**Fecha:** 2026-02-19
**Estado:** Aprobado
**Autor:** Claude Code + Equipo Puerto Nuevo

## Resumen Ejecutivo

Implementación de notificaciones push nativas (iOS 16.4+ y Android) para comunicar eventos críticos (comunicados y mensajes de conversaciones) a familias y docentes. Sistema basado en Firebase Cloud Messaging con arquitectura de triggers directos, optimizado para simplicidad, seguridad y bajo costo operativo.

## Objetivos

1. **Comunicación inmediata**: Familias reciben notificación nativa cuando hay comunicados nuevos o mensajes en conversaciones
2. **Compatibilidad total**: Funcionar en iOS (PWA instalada) y Android
3. **Privacidad y seguridad**: Payloads sin datos sensibles, VAPID keys seguras, tokens por usuario/dispositivo
4. **Bajo mantenimiento**: Arquitectura simple, triggers directos, limpieza automática de tokens

## Eventos que Disparan Notificaciones

- **Comunicados nuevos**: Cuando se crea un documento en `/communications/{id}` dirigido al usuario
- **Mensajes en conversaciones**: Cuando se crea un mensaje en `/conversations/{convId}/messages/{msgId}` y el usuario es destinatario

**Fuera de scope (fase 1):**
- Turnos asignados
- Snacks asignados
- Documentos pendientes

## Arquitectura General

### Decisión: Enfoque de Triggers Directos

**Seleccionado:** Cloud Functions con triggers directos (onCreate)

**Alternativas consideradas:**
- Queue con batching: Mayor complejidad, delay innecesario para volumen de escuela
- Híbrido con SW inteligente: Over-engineering para necesidades actuales

**Justificación:**
- Volumen estimado: 500-1000 notificaciones/día (gratis en Cloud Functions free tier)
- Latencia crítica: Comunicación escuela-familia requiere inmediatez
- Simplicidad de mantenimiento: Menos partes móviles, fácil debugging
- Escalabilidad futura: Podemos migrar a queue si el volumen crece 10x

### Diagrama de Flujo

```
┌─────────────────┐
│ Evento Firestore│  (Comunicado creado / Mensaje enviado)
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Cloud Function Trigger  │  (onCreate)
│ - Leer destinatarios    │
│ - Fetch tokens FCM      │
│ - Enviar notificación   │
│ - Limpiar tokens viejos │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────┐
│ Firebase Cloud       │
│ Messaging (FCM)      │
└────────┬─────────────┘
         │
         ▼
┌───────────────────────────┐
│ Service Worker            │  (firebase-messaging-sw.js)
│ onBackgroundMessage       │
│ - Mostrar notificación    │
│ - Manejar clicks          │
└───────────┬───────────────┘
            │
            ▼
┌───────────────────────┐
│ Usuario ve notificación│  (Nativa iOS/Android)
│ Click → Abre URL      │
└───────────────────────┘
```

### Componentes del Sistema

#### 1. Frontend React (Gestión de Permisos y Tokens)

**Hook: `useFCMToken()`**
- Responsabilidad: Gestionar ciclo de vida de tokens FCM
- Funcionalidades:
  - Verificar soporte del navegador (`'serviceWorker' in navigator && 'PushManager' in window`)
  - Registrar Service Worker dedicado (`/firebase-messaging-sw.js`)
  - Solicitar permiso con `Notification.requestPermission()` (solo tras interacción del usuario)
  - Obtener token con `getToken()` usando VAPID public key
  - Guardar token en Firestore `/users/{uid}/fcm_tokens/{tokenId}`
  - Detectar cambios de token con `onTokenRefresh` y actualizar
  - Limpiar tokens duplicados del mismo dispositivo

**Estructura de token en Firestore:**
```javascript
/users/{userId}/fcm_tokens/{tokenId}
{
  token: string,              // Token FCM único
  device: string,             // UserAgent parseado (ej: "iPhone 15 - Safari 17.2")
  createdAt: Timestamp,       // Cuando se registró
  lastUsed: Timestamp,        // Última vez que se validó
  platform: 'ios' | 'android' | 'web'
}
```

**Componente: `NotificationPrompt`**
- Estrategia dual:
  1. **Modal inicial**: Se muestra en primer login si `notificationPromptStatus === 'pending'`
  2. **Banner recordatorio**: Si usuario cerró modal sin decidir, mostrar banner discreto en próximos logins
- Estados persistidos en `/users/{uid}`:
  - `notificationPromptStatus: 'accepted' | 'dismissed' | 'rejected' | 'pending'`
  - `notificationPromptLastShown: Timestamp`
- Textos UX:
  - Título: "Recibí notificaciones importantes"
  - Cuerpo: "Activá notificaciones para saber al instante cuando hay comunicados nuevos o mensajes de la escuela"
  - Botones: "Activar ahora" | "Más tarde" | "No volver a preguntar"

**Componente: `IOSInstallPrompt`**
- Detección: `navigator.userAgent` detecta iOS + verificar `!window.navigator.standalone`
- UI: Toast/Banner con instrucciones visuales
  - Texto: "Para recibir notificaciones en iPhone, instalá la app en tu pantalla de inicio"
  - Pasos ilustrados: Safari → Compartir → "Añadir a pantalla de inicio"
  - GIF/imagen animada demostrando el proceso
- Persistencia: Guardar en localStorage `ios_install_prompt_dismissed` para no mostrar en cada visita
- Solo para rol `FAMILY`

#### 2. Service Worker Dedicado (`firebase-messaging-sw.js`)

**Ubicación:** `public/firebase-messaging-sw.js` (NO procesado por Vite, servido estáticamente)

**Razón de SW dedicado:**
- VitePWA genera SW para caché de assets (Workbox)
- FCM requiere SW específico para interceptar push notifications
- Ambos pueden coexistir sin conflictos (scopes diferentes)

**Implementación:**
```javascript
// Importar Firebase desde CDN (v9 modular compat)
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Inicializar con config pública (sin secretos)
firebase.initializeApp({
  apiKey: "AIzaSyB9ZC5CLGhtdm1_6Vjm5ASHW1xepoBO9PU",
  projectId: "puerto-nuevo-montessori",
  messagingSenderId: "651913667566",
  appId: "1:651913667566:web:1421f44f25481685d664ff"
});

const messaging = firebase.messaging();

// Background message handler (CRÍTICO para iOS)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Background message received:', payload);

  const { title, body, icon, clickAction } = payload.data;

  const notificationOptions = {
    body,
    icon: icon || '/pwa/icon-192.png',
    badge: '/pwa/icon-192.png',
    tag: 'puerto-nuevo-notification',
    requireInteraction: false,
    data: { url: clickAction || '/portal/familia' }
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Click handler - abrir URL especificada
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/portal/familia';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay ventana abierta, focusearla
        for (const client of clientList) {
          if (client.url.includes(new URL(urlToOpen).pathname) && 'focus' in client) {
            return client.focus();
          }
        }
        // Si no, abrir nueva ventana
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
```

**Características clave:**
- Usa CDN (no aumenta bundle size)
- Compatible iOS 16.4+ y Android
- Maneja clicks para deeplinks
- Coexiste con SW de VitePWA

#### 3. Cloud Functions (Backend Triggers)

**Función 1: `onCommunicationCreated`**

**Trigger:** `onCreate` en `/communications/{commId}`

**Flujo:**
1. Leer comunicado recién creado
2. Extraer `destinatarios` (array de UIDs)
3. Fetch tokens FCM de cada destinatario desde `/users/{uid}/fcm_tokens/`
4. Construir payload seguro (sin datos sensibles)
5. Enviar con `admin.messaging().sendEachForMulticast()`
6. Procesar errores y limpiar tokens inválidos

**Código pseudocode:**
```javascript
exports.onCommunicationCreated = functions.firestore
  .document('/communications/{commId}')
  .onCreate(async (snap, context) => {
    const comm = snap.data();
    const destinatarios = comm.destinatarios || [];

    if (destinatarios.length === 0) return;

    // Fetch tokens (máx 30 días de antigüedad)
    const tokens = await fetchTokensForUsers(destinatarios);

    if (tokens.length === 0) return;

    // Payload sin datos sensibles
    const message = {
      data: {
        title: 'Nuevo comunicado',
        body: comm.title?.substring(0, 100) || 'Hay un comunicado importante',
        icon: '/pwa/icon-192.png',
        clickAction: '/portal/familia/comunicados'
      },
      tokens
    };

    // Enviar en batch
    const response = await admin.messaging().sendEachForMulticast(message);

    // Limpiar tokens que devolvieron error
    await cleanupInvalidTokens(response, tokens, destinatarios);

    console.log(`Notificación enviada: ${response.successCount} éxitos, ${response.failureCount} fallos`);
  });
```

**Función 2: `onConversationMessageCreated`**

**Trigger:** `onCreate` en `/conversations/{convId}/messages/{msgId}`

**Flujo:**
1. Leer mensaje recién creado
2. Fetch documento de conversación para determinar destinatario
3. Si `message.senderRole === 'family'` → destinatario es admin/docente (opcional, fase 2)
4. Si `message.senderRole !== 'family'` → destinatario es `conv.familiaUid`
5. Fetch tokens del destinatario
6. Enviar notificación con título personalizado

**Código pseudocode:**
```javascript
exports.onConversationMessageCreated = functions.firestore
  .document('/conversations/{convId}/messages/{msgId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const convId = context.params.convId;

    // Fetch conversación
    const convSnap = await admin.firestore()
      .collection('conversations').doc(convId).get();

    if (!convSnap.exists) return;

    const conv = convSnap.data();

    // Determinar destinatario (solo notificar a familia en fase 1)
    if (message.senderRole === 'family') {
      // Opcional: Notificar a admin/docente en fase 2
      return;
    }

    const recipientUid = conv.familiaUid;
    if (!recipientUid) return;

    const tokens = await fetchTokensForUsers([recipientUid]);
    if (tokens.length === 0) return;

    const payload = {
      data: {
        title: 'Nuevo mensaje de la escuela',
        body: conv.asunto?.substring(0, 100) || 'Tenés una respuesta',
        icon: '/pwa/icon-192.png',
        clickAction: `/portal/familia/conversaciones/${convId}`
      },
      tokens
    };

    const response = await admin.messaging().sendEachForMulticast(payload);
    await cleanupInvalidTokens(response, tokens, [recipientUid]);

    console.log(`Mensaje de conversación enviado: ${response.successCount} éxitos`);
  });
```

**Funciones auxiliares compartidas:**

```javascript
/**
 * Fetch tokens FCM válidos para un array de UIDs
 * Filtra tokens con lastUsed > 30 días atrás
 */
async function fetchTokensForUsers(uids) {
  const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  const allTokens = [];

  for (const uid of uids) {
    const tokensSnap = await admin.firestore()
      .collection('users').doc(uid)
      .collection('fcm_tokens')
      .where('lastUsed', '>', thirtyDaysAgo)
      .get();

    tokensSnap.forEach(doc => {
      allTokens.push(doc.data().token);
    });
  }

  return allTokens;
}

/**
 * Limpiar tokens que devolvieron error 'registration-token-not-registered'
 * Esto sucede cuando usuario desinstaló app o revocó permisos
 */
async function cleanupInvalidTokens(response, tokens, uids) {
  const invalidTokens = [];

  response.responses.forEach((resp, idx) => {
    if (resp.error?.code === 'messaging/registration-token-not-registered') {
      invalidTokens.push(tokens[idx]);
    }
  });

  if (invalidTokens.length === 0) return;

  console.log(`Limpiando ${invalidTokens.length} tokens inválidos`);

  // Para cada UID, buscar y eliminar tokens inválidos
  const batch = admin.firestore().batch();

  for (const uid of uids) {
    const tokensSnap = await admin.firestore()
      .collection('users').doc(uid)
      .collection('fcm_tokens')
      .where('token', 'in', invalidTokens.slice(0, 10)) // Firestore limit
      .get();

    tokensSnap.forEach(doc => batch.delete(doc.ref));
  }

  await batch.commit();
}
```

#### 4. Firestore (Estructura de Datos)

**Colección: `/users/{uid}/fcm_tokens/{tokenId}`**

Subcoleción para soportar múltiples dispositivos por usuario.

**Esquema:**
```typescript
interface FCMToken {
  token: string;              // Token único generado por FCM
  device: string;             // UserAgent parseado
  platform: 'ios' | 'android' | 'web';
  createdAt: Timestamp;
  lastUsed: Timestamp;        // Se actualiza cada vez que se valida el token
}
```

**Ventajas de subcolección:**
- No infla documento principal de usuario (límite 1MB)
- Queries eficientes con `where('lastUsed', '>', thirtyDaysAgo)`
- Fácil limpieza de tokens viejos
- Soporta ilimitados dispositivos por usuario

**Security Rules:**
```javascript
match /users/{userId}/fcm_tokens/{tokenId} {
  // Solo el usuario puede escribir sus propios tokens
  allow create, update, delete: if request.auth != null
                                && request.auth.uid == userId
                                && request.resource.data.keys().hasAll(['token', 'device', 'platform', 'createdAt', 'lastUsed']);

  // Solo el usuario puede leer sus tokens
  allow read: if request.auth != null && request.auth.uid == userId;

  // Cloud Functions necesitan leer tokens para envío (se ejecutan con admin SDK, bypass rules)
}
```

**Campo en `/users/{uid}`:**
```javascript
{
  // ... campos existentes
  notificationPromptStatus: 'pending' | 'accepted' | 'dismissed' | 'rejected',
  notificationPromptLastShown: Timestamp,
  notificationsEnabled: boolean  // Control manual para desactivar
}
```

## Seguridad y Privacidad

### VAPID Keys

**Qué son:** Voluntary Application Server Identification - par de llaves criptográficas que autentican al servidor que envía push notifications.

**Generación:**
1. Firebase Console → Cloud Messaging → Web Push Certificates
2. Click "Generate key pair"
3. Copiar public key

**Almacenamiento:**
- **Llave pública**: En `.env` frontend → `VITE_FIREBASE_VAPID_KEY`
- **Llave privada**: Automática en Cloud Functions (no tocar, manejada por Firebase)

**Uso:**
```javascript
// En useFCMToken()
const token = await getToken(messaging, {
  vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
});
```

### Payload Seguro (Privacidad)

**Regla de oro:** NUNCA incluir datos sensibles en el payload de la notificación.

**Prohibido:**
- ❌ Nombres completos de niños
- ❌ Datos médicos, alergias, información de salud
- ❌ Teléfonos, direcciones, emails
- ❌ Contenido completo de mensajes privados

**Permitido:**
- ✅ Títulos genéricos ("Nuevo comunicado", "Mensaje de la escuela")
- ✅ Extractos cortos sin datos sensibles (primeros 50 caracteres)
- ✅ URLs de acción (deeplinks a la app)
- ✅ Íconos y badges

**Ejemplo correcto:**
```javascript
{
  title: 'Nuevo comunicado',
  body: 'Información importante sobre Taller 1',
  clickAction: '/portal/familia/comunicados'
}
```

**Ejemplo INCORRECTO:**
```javascript
{
  title: 'Comunicado sobre Juan Pérez',  // ❌ Nombre del niño
  body: 'Juan tiene que traer certificado médico por su alergia al maní',  // ❌ Datos médicos
  clickAction: '/portal/familia/comunicados/abc123'
}
```

### Validación de iOS

**Requisito crítico:** En iOS, las notificaciones push SOLO funcionan si:
1. La PWA está **instalada** (agregada al Home Screen)
2. La app está en modo `standalone` (no Safari regular)
3. iOS 16.4 o superior

**Estrategia:**
- `IOSInstallPrompt` detecta iOS no instalado y muestra instrucciones
- No intentar solicitar permisos si no está instalado (falla silenciosamente)
- Validar en `useFCMToken()`:
```javascript
const isIOSInstalled = navigator.standalone === true;
if (isIOS && !isIOSInstalled) {
  // Mostrar prompt de instalación, NO solicitar permisos aún
  return;
}
```

## Consideraciones de Costos

### Cloud Functions

**Free tier:** 2M invocaciones/mes

**Estimación Puerto Nuevo:**
- ~20 comunicados/mes × 50 familias = 1000 invocaciones
- ~200 mensajes/mes en conversaciones = 200 invocaciones
- Total: ~1200 invocaciones/mes
- **Costo: $0** (dentro del free tier)

### Firestore

**Lecturas por envío:**
- 1 lectura del comunicado/mensaje (trigger)
- N lecturas de tokens (1 query por usuario destinatario)
- Para 50 familias con 1 comunicado: ~51 lecturas

**Free tier:** 50k lecturas/día

**Estimación:**
- ~20 comunicados/mes × 51 lecturas = 1020 lecturas/mes
- ~200 mensajes/mes × 3 lecturas = 600 lecturas/mes
- Total: ~1620 lecturas/mes
- **Costo: $0** (dentro del free tier)

### Firebase Cloud Messaging

**Completamente gratis** (sin límite de mensajes)

### Total estimado: $0/mes

## Plan de Testing

### Fase 1: Setup Inicial
- [ ] Generar VAPID keys en Firebase Console
- [ ] Crear archivo `.env` con `VITE_FIREBASE_VAPID_KEY`
- [ ] Crear `public/firebase-messaging-sw.js`
- [ ] Verificar que VitePWA no interfiera (diferentes scopes)
- [ ] Deploy a staging

### Fase 2: Frontend Testing

**Desktop (Chrome):**
- [ ] Solicitar permiso → verificar modal aparece
- [ ] Aceptar → verificar token se guarda en Firestore
- [ ] Rechazar → verificar no vuelve a preguntar
- [ ] Cerrar modal → verificar banner aparece en próximo login

**Android (Chrome Mobile):**
- [ ] Instalar PWA
- [ ] Solicitar permiso → verificar prompt nativo
- [ ] Verificar token en Firestore con platform: 'android'
- [ ] Detectar múltiples dispositivos (tablet + teléfono)

**iOS (Safari 16.4+):**
- [ ] Detectar iOS no instalado → mostrar `IOSInstallPrompt`
- [ ] Seguir pasos → instalar PWA
- [ ] Solicitar permiso → verificar prompt nativo iOS
- [ ] Verificar token en Firestore con platform: 'ios'
- [ ] Probar en Safari directo → verificar NO solicita permiso

### Fase 3: Backend Testing

**Cloud Functions:**
- [ ] Deploy functions a staging
- [ ] Crear comunicado de prueba → verificar logs de trigger
- [ ] Verificar función fetch tokens correctamente
- [ ] Verificar función envía a FCM sin errores
- [ ] Forzar token inválido → verificar cleanup funciona

**Conversaciones:**
- [ ] Crear mensaje en conversación existente
- [ ] Verificar trigger dispara
- [ ] Verificar destinatario correcto (familia)
- [ ] Verificar URL de clickAction incluye convId

### Fase 4: End-to-End

**Comunicado → Familia:**
- [ ] Admin crea comunicado dirigido a familia específica
- [ ] Familia recibe notificación en <5 segundos
- [ ] Notificación muestra título y body correctos
- [ ] Click en notificación → abre `/portal/familia/comunicados`

**Mensaje → Familia:**
- [ ] Docente responde conversación de familia
- [ ] Familia recibe notificación
- [ ] Click → abre conversación específica

**Estados de la app:**
- [ ] App abierta (foreground) → notificación in-app + push
- [ ] App en background → notificación push
- [ ] App cerrada → notificación push
- [ ] Dispositivo bloqueado → notificación en lock screen

**iOS específico:**
- [ ] PWA instalada + cerrada → notificación aparece
- [ ] Badge en ícono de app
- [ ] Notificación en centro de notificaciones

### Fase 5: Validación de Producción

**Semana 1:**
- [ ] Habilitar para 5 familias beta testers
- [ ] Enviar 2-3 comunicados de prueba
- [ ] Recoger feedback sobre UX del prompt
- [ ] Verificar tasa de delivery en Firebase Console

**Semana 2:**
- [ ] Habilitar para todas las familias
- [ ] Monitorear logs de Cloud Functions
- [ ] Revisar costos en Firebase Usage dashboard
- [ ] Verificar cantidad de tokens en Firestore (~50-100 tokens esperados)

### Métricas a Monitorear

**Firebase Console → Cloud Messaging:**
- Delivery rate (objetivo: >95%)
- Open rate (objetivo: >30%)
- Tokens activos vs inactivos

**Firestore:**
- Cantidad de tokens en `/users/{uid}/fcm_tokens/`
- Tokens con lastUsed > 30 días (limpiar periódicamente)

**Cloud Functions:**
- Invocaciones/día de `onCommunicationCreated`
- Invocaciones/día de `onConversationMessageCreated`
- Errores en logs

## Riesgos y Mitigaciones

### Riesgo 1: Usuarios rechazan permisos

**Probabilidad:** Media-Alta (30-50% de usuarios no aceptan notificaciones en primera instancia)

**Impacto:** Medio (no reciben comunicados importantes)

**Mitigación:**
- Modal explicativo claro con beneficios concretos
- Banner recordatorio (no invasivo) si cerraron sin decidir
- Opción en Perfil para reactivar más tarde
- Comunicar importancia en onboarding inicial

### Riesgo 2: iOS no instalado

**Probabilidad:** Alta (muchos usuarios no saben que deben instalar)

**Impacto:** Alto (iOS es ~50% de usuarios móviles en Argentina)

**Mitigación:**
- `IOSInstallPrompt` con instrucciones visuales claras
- GIF animado mostrando pasos
- Comunicar durante onboarding: "Para mejores resultados, instalá la app"

### Riesgo 3: Tokens inválidos acumulados

**Probabilidad:** Media (usuarios desinstalanapp, cambian de dispositivo)

**Impacto:** Bajo (solo afecta costos de escritura)

**Mitigación:**
- Cleanup automático en cada envío (detectar errores de FCM)
- Filtrar tokens con `lastUsed > 30 días`
- Job programado semanal para limpiar tokens viejos (fase 2)

### Riesgo 4: Service Workers conflictivos

**Probabilidad:** Baja (arquitectura previene conflictos)

**Impacto:** Alto (notificaciones no funcionan)

**Mitigación:**
- SW dedicado para FCM (`firebase-messaging-sw.js`)
- SW de VitePWA separado (generado automáticamente)
- Testing exhaustivo en fase 2

### Riesgo 5: Costos inesperados

**Probabilidad:** Muy baja (volumen controlado)

**Impacto:** Bajo (dentro de free tier)

**Mitigación:**
- Monitorear Firebase Usage dashboard semanalmente
- Alertas en Firebase si se acerca al límite del free tier
- Batching opcional si volumen crece 10x (fase futura)

## Decisiones Técnicas Clave

### ¿Por qué subcolección para tokens vs array en documento?

**Decisión:** Subcolección `/users/{uid}/fcm_tokens/{tokenId}`

**Razón:**
- Documentos Firestore tienen límite de 1MB
- Array de tokens podría crecer ilimitadamente (múltiples dispositivos, tokens viejos)
- Subcolección permite queries eficientes (`where('lastUsed', '>', ...)`)
- Facilita cleanup individual de tokens sin tocar documento principal

### ¿Por qué Service Worker dedicado vs unificado?

**Decisión:** SW separado (`firebase-messaging-sw.js`)

**Razón:**
- VitePWA genera SW para caché de assets (Workbox)
- FCM requiere handlers específicos (`onBackgroundMessage`)
- Separar concerns = menos complejidad, menos riesgo de bugs
- Recomendación oficial de Firebase
- Más fácil de actualizar independientemente

### ¿Por qué triggers directos vs queue?

**Decisión:** Triggers directos (onCreate)

**Razón:**
- Volumen bajo (~1200 notificaciones/mes)
- Latencia crítica (comunicación escuela-familia)
- Simplicidad de código y debugging
- Gratis dentro del free tier
- Queue agrega complejidad innecesaria para el volumen actual
- Migración futura a queue es trivial si crece 10x

### ¿Por qué solo comunicados y conversaciones en fase 1?

**Decisión:** Scope limitado a 2 eventos

**Razón:**
- Reducir riesgo en lanzamiento inicial
- Comunicados y conversaciones son más críticos (comunicación bidireccional)
- Evitar saturar a usuarios con notificaciones
- Turnos/snacks tienen UI in-app suficiente por ahora
- Podemos agregar más eventos en fase 2 basado en feedback

## Próximos Pasos (Fase 2 - Futuro)

Fuera del scope de este diseño, pero consideraciones para futuro:

1. **Notificaciones para turnos/snacks asignados**
   - Trigger en `assignedAt` field
   - Personalizar mensaje con fecha específica

2. **Notificaciones para admin/docentes**
   - Conversaciones iniciadas por familia
   - Documentos con lectura pendiente

3. **Preferencias granulares de notificación**
   - UI en Perfil para elegir tipos de notificaciones
   - Guardar en `/users/{uid}/notificationPreferences`

4. **Quiet hours (horarios de silencio)**
   - No enviar entre 22:00 - 08:00
   - Verificar timezone en Cloud Function

5. **Job de limpieza programado**
   - Cloud Function scheduled semanal
   - Eliminar tokens con `lastUsed > 60 días`

6. **Analytics de notificaciones**
   - Track open rate por tipo de notificación
   - A/B testing de mensajes

7. **Resumen diario opcional**
   - Agrupar múltiples eventos en 1 notificación
   - Enviar a las 18:00 si hay actividad

## Conclusión

Este diseño propone un sistema de notificaciones push robusto, seguro y mantenible para Puerto Nuevo. La arquitectura de triggers directos es ideal para el volumen actual, minimiza complejidad y costo operativo es cero. La estrategia dual de modal + banner maximiza adopción sin ser invasiva.

Los próximos pasos son:
1. Implementar componentes frontend (`useFCMToken`, `NotificationPrompt`, `IOSInstallPrompt`)
2. Crear Service Worker dedicado
3. Implementar Cloud Functions triggers
4. Testing exhaustivo en staging (iOS + Android)
5. Rollout gradual en producción

**Estado:** Listo para implementación ✅
