# Testing Setup — Vitest + Playwright

**Fecha:** 2026-03-30
**Proyecto:** Puerto Nuevo Montessori

---

## Objetivo

Agregar cobertura de tests al proyecto: unit tests para toda la lógica pura del frontend y backend, y smoke tests E2E para los flujos críticos de usuario.

---

## Stack

- **Vitest** — unit tests, integrado en vite.config.js existente
- **Playwright** — smoke tests E2E contra `localhost` (dev server) + **Firebase real de producción**

---

## Nota importante sobre E2E y Firebase

`src/config/firebase.js` tiene la configuración hardcodeada (sin variables de entorno). El frontend siempre conecta al proyecto real `puerto-nuevo-montessori`. Por lo tanto, los tests E2E **son smoke tests contra Firebase real** con cuentas dedicadas solo para testing.

Implicaciones:
- Las cuentas de prueba deben existir en Firebase Auth del proyecto real
- Son cuentas exclusivas para tests, nunca cuentas de familias o staff real
- Las credenciales se guardan en `.env.test.local` (ya está en `.gitignore`)
- Playwright carga `.env.test.local` explícitamente vía `dotenv` en `playwright.config.js`

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
.env.test.local          ← gitignoreado, credenciales de cuentas de prueba
```

---

## Scripts npm

```json
"test":           "vitest run",
"test:watch":     "vitest",
"test:functions": "cd functions && npm install && vitest run",
"test:e2e":       "playwright test",
"test:all":       "npm run test && npm run test:functions && npm run test:e2e"
```

`test:functions` instala las dependencias de `functions/` primero para garantizar reproducibilidad en instalación limpia.

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
Usa `vi.useFakeTimers()` y `vi.setSystemTime()` para fijar el reloj — los tests no dependen del momento en que se ejecutan.

- `isNext24Hours` → true para fecha en 12h, false para fecha en 48h
- `isNext24Hours` → false para fecha pasada
- `isNext48Hours` → true para fecha en 36h
- `formatRelativeTime` → "Hace menos de 1 hora", "Hace 3 horas", "Ayer", "Hace 5 días"
- Acepta tanto `Date` como Timestamp de Firestore (objeto con `.toDate()`)

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
- `'doeente'` (typo conocido en el código) → `'docente'`
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
Usa `require()` (CommonJS, igual que `functions/`). Corre con `test:functions`.

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
Usa `require()` (CommonJS). Corre con `test:functions`.

- `isRateLimitError` detecta status 429
- `isRateLimitError` detecta mensaje "too many requests"
- `isRateLimitError` detecta código `'429'`
- `isTransientNetworkError` detecta status 500-599
- `isTransientNetworkError` detecta códigos de red (`ECONNRESET`, `ETIMEDOUT`, etc.)
- `isTransientNetworkError` devuelve `false` para error 400

---

## E2E Tests — smoke tests contra Firebase real

### Cuentas de prueba requeridas
Antes de correr E2E se deben crear manualmente en Firebase Auth:
- Una cuenta con rol `family` (ej: `test-family@test.local`)
- Una cuenta con rol `coordinacion` (ej: `test-admin@test.local`)

Las credenciales se guardan en `.env.test.local`:
```
PLAYWRIGHT_FAMILY_EMAIL=test-family@test.local
PLAYWRIGHT_FAMILY_PASSWORD=...
PLAYWRIGHT_ADMIN_EMAIL=test-admin@test.local
PLAYWRIGHT_ADMIN_PASSWORD=...
```

### Contratos mínimos de datos
Las cuentas de prueba deben tener al menos un documento en Firestore para que las pantallas carguen sin errores:
- La cuenta family debe tener al menos un hijo asociado
- Debe existir al menos un evento publicado

### `e2e/login.spec.js`
- Login con cuenta family → redirige a `/portal/familia`
- Login con cuenta admin → redirige a `/portal/admin`
- Login con password incorrecto → muestra mensaje de error, no navega
- Login con email inexistente → muestra mensaje de error

### `e2e/conversations.spec.js`
- Usuario family autenticado ve la lista de conversaciones en `/portal/familia/conversaciones`
- La página carga sin errores de consola críticos

### `e2e/events.spec.js`
- Usuario family ve el calendario de eventos en `/portal/familia`
- Usuario admin accede a `/portal/admin/eventos`

---

## Configuración

### vite.config.js — agregar bloque `test`
```js
test: {
  environment: 'node',
  globals: true,
}
```

### playwright.config.js
```js
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test.local' });

export default {
  baseURL: 'http://localhost:5173',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  use: { baseURL: 'http://localhost:5173' },
};
```

---

## Lo que queda fuera del alcance

- Firebase Emulator — requeriría refactorizar `firebase.js` para usar env vars y conectar al emulador según entorno
- Tests de componentes React (React Testing Library)
- `communicationRichText.js` — depende de DOMPurify + DOMParser (browser)
- `conversationEvents.js` — solo dispara eventos de window, lógica trivial
- Funciones async que requieren Canvas, Video, o fetch real (thumbnails, compresión)
