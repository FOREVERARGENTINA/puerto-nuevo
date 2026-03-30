# Testing Setup — Vitest + Playwright

**Fecha:** 2026-03-30
**Proyecto:** Puerto Nuevo Montessori

---

## Objetivo

Agregar cobertura de tests al proyecto: unit tests para toda la lógica pura del frontend y backend, y E2E para los flujos críticos de usuario. Sin Firebase Emulator. Sin costo de infraestructura.

---

## Stack

- **Vitest** — unit tests, integrado en vite.config.js existente
- **Playwright** — E2E contra `localhost` (dev server), sin tocar Firebase real

---

## Estructura de archivos

```
src/
  utils/
    snackAssignmentState.test.js
    conversationHelpers.test.js
    dateHelpers.test.js
    dmAccess.test.js
    socialAccess.test.js
    roles.test.js
    avatarHelpers.test.js
    textEncoding.test.js
    galleryHelpers.test.js
  config/
    constants.test.js

functions/src/utils/
  sanitize.test.js
  rateLimiter.test.js

e2e/
  login.spec.js
  conversations.spec.js
  events.spec.js

playwright.config.js
```

---

## Scripts npm

```json
"test":        "vitest run",
"test:watch":  "vitest",
"test:e2e":    "playwright test"
```

---

## Unit Tests — detalle por archivo

### `snackAssignmentState.test.js`
- `suspendido: true` tiene máxima prioridad sobre cualquier `estado` string
- `cancelado` es estado terminal
- `solicitudCambio: true` → `change_requested`
- `confirmadoPorFamilia: true` → `confirmed`
- `null` / sin assignment → `empty`
- `isSnackAssignmentActiveForFamily` → true solo para pending/confirmed/change_requested
- `isSnackAssignmentConfirmedLike` → true solo para confirmed/completed
- `getSnackStatusMeta` devuelve label y style correctos para cada estado

### `conversationHelpers.test.js`
- `sortConversationsByLatestMessage` ordena por `ultimoMensajeAt` descendente
- Usa `creadoAt` como fallback cuando no hay `ultimoMensajeAt`
- Maneja Timestamps de Firestore (objetos con `.toDate()`)
- `getConversationStatusLabel` devuelve texto diferente para rol `family` vs admin
- `getConversationStatusBadge` devuelve clase CSS correcta por estado
- `getAreaLabel` cubre coordinacion, administracion, direccion, default

### `dateHelpers.test.js`
- `isNext24Hours` → true para fecha en 12h, false para fecha en 48h
- `isNext24Hours` → false para fecha pasada
- `isNext48Hours` → true para fecha en 36h
- `formatRelativeTime` → "Hace menos de 1 hora", "Hace 3 horas", "Ayer", "Hace 5 días"
- Acepta tanto `Date` como Timestamp de Firestore

### `dmAccess.test.js`
- Rol no-family (docente, admin) → siempre `false`
- Rol family + `enabled: true` → `true` sin importar uid
- Rol family + `enabled: false` + uid en `pilotFamilyUids` → `true`
- Rol family + `enabled: false` + uid fuera del piloto → `false`
- Sin uid → `false`

### `socialAccess.test.js`
- Roles admin (superadmin, coordinacion) → siempre `true`
- `enabled: true` + rol SOCIAL_OPEN (family, docente, tallerista) → `true`
- `enabled: false` + family + uid en piloto → `true`
- `enabled: false` + family + uid fuera del piloto → `false`
- Rol desconocido → `false`

### `roles.test.js`
- `'teacher'` → `'docente'`
- `'teachers'` → `'docente'`
- `'doeente'` (typo conocido) → `'docente'`
- `'family'` → `'family'` (pasa sin cambio)
- `null` / número → `''`

### `avatarHelpers.test.js`
- `getInitials('Juan Pérez')` → `'JP'`
- `getInitials('Juan')` → `'J'`
- `getInitials('')` / `null` → `'?'`
- `getInitials('Juan Carlos López')` → `'JL'` (primera y última palabra)
- `getAvatarColorToken` devuelve token CSS válido de `COLOR_TOKENS`
- El mismo nombre siempre devuelve el mismo token (hash estable)

### `textEncoding.test.js`
- `fixMojibake` corrige string con encoding roto (ej: `'CafÃ©'` → `'Café'`)
- `fixMojibake` devuelve el string intacto si no tiene mojibake
- `fixMojibake` no rompe strings con caracteres unicode normales
- `fixMojibakeDeep` corrige strings dentro de objetos anidados
- `fixMojibakeDeep` corrige strings dentro de arrays
- `fixMojibakeDeep` no modifica Date ni Timestamps de Firestore

### `galleryHelpers.test.js`
- `validateGalleryFiles` rechaza archivos > 20MB
- `validateGalleryFiles` rechaza extensiones bloqueadas (`.exe`, `.zip`)
- `validateGalleryFiles` acepta jpg/png/mp4/pdf
- `validateGalleryFiles` permite HEIC sin MIME type (comportamiento iOS)
- `sanitizeFileName` elimina acentos y caracteres especiales
- `sanitizeFileName` reduce múltiples guiones bajos consecutivos
- `getMediaType` clasifica correctamente video, imagen, pdf
- `isHeicFile` detecta por extensión y por MIME type
- `parseYouTubeUrl` extrae videoId de youtube.com/watch?v=, youtu.be/, embed/
- `parseYouTubeUrl` devuelve `null` para URL no-YouTube
- `parseVimeoUrl` extrae videoId de vimeo.com y player.vimeo.com
- `parseVimeoUrl` preserva el parámetro `h` para videos no listados
- `parseVideoUrl` combina ambos y devuelve error para URL inválida

### `constants.test.js`
- `hasPermission(SUPERADMIN, MANAGE_USERS)` → `true`
- `hasPermission(FAMILY, MANAGE_USERS)` → `false`
- `hasPermission(DOCENTE, SEND_COMMUNICATIONS)` → `true`
- `hasPermission(null, ...)` → `false`
- `hasPermission(..., null)` → `false`
- `getRolePermissions(SUPERADMIN)` contiene todos los permisos
- `getRolePermissions(FAMILY)` devuelve array vacío

### `functions/src/utils/sanitize.test.js`
- `escapeHtml` escapa `<`, `>`, `&`, `"`, `'`
- `escapeHtml` con `null`/`undefined` devuelve `''`
- `sanitizeUrl` acepta http y https
- `sanitizeUrl` rechaza `javascript:` y otros protocolos peligrosos
- `sanitizeUrl` devuelve `null` para URL inválida
- `toPlainText` elimina tags HTML y decodifica entidades HTML
- `renderAttachmentList` genera HTML con link cuando hay URL válida
- `renderAttachmentList` genera item sin link cuando la URL es inválida
- `renderAttachmentList` devuelve `''` para array vacío

### `functions/src/utils/rateLimiter.test.js`
- `isRateLimitError` detecta status 429
- `isRateLimitError` detecta mensaje "too many requests"
- `isRateLimitError` detecta código `'429'`
- `isTransientNetworkError` detecta status 500-599
- `isTransientNetworkError` detecta códigos de red (`ECONNRESET`, `ETIMEDOUT`, etc.)
- `isTransientNetworkError` devuelve `false` para error 400

---

## E2E Tests — detalle por archivo

### `e2e/login.spec.js`
- Login con credenciales de familia válidas → redirige a `/portal/familia`
- Login con credenciales de admin válidas → redirige a `/portal/admin`
- Login con password incorrecto → muestra mensaje de error, no navega
- Login con email inexistente → muestra mensaje de error

### `e2e/conversations.spec.js`
- Usuario familia autenticado puede ver la lista de conversaciones en `/portal/familia/conversaciones`
- La página carga sin errores de consola críticos

### `e2e/events.spec.js`
- Usuario familia puede ver el calendario de eventos en `/portal/familia`
- Usuario admin puede acceder a `/portal/admin/eventos`

---

## Configuración

### vite.config.js — agregar bloque `test`
```js
test: {
  environment: 'node',
  globals: true,
}
```

> Los tests de frontend que usan APIs de DOM (DOMParser, window) quedan excluidos del alcance actual. Se testea solo lógica pura.

> **Nota CommonJS vs ESM:** `functions/src/utils/` usa CommonJS (`module.exports`). Los test files de functions usan `require()`. Vitest en ambiente `node` maneja ambos sin configuración extra.

### playwright.config.js
```js
baseURL: 'http://localhost:5173',
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:5173',
  reuseExistingServer: true,
}
```

Los tests E2E requieren un archivo `.env.test` con credenciales de prueba (usuarios reales del proyecto).

---

## Lo que queda fuera del alcance

- Firebase Emulator / tests de Cloud Functions triggers
- Tests de componentes React (React Testing Library)
- `communicationRichText.js` — depende de DOMPurify + DOMParser (browser)
- `conversationEvents.js` — solo dispara eventos de window, lógica trivial
- Funciones async que requieren Canvas, Video, o fetch real (thumbnails, compresión)
