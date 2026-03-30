# Testing Setup — Vitest + Playwright — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar 12 archivos de unit tests (Vitest) para toda la lógica pura del repo y 5 smoke tests E2E (Playwright) para los flujos críticos de usuario.

**Architecture:** Vitest corre dentro del mismo `vite.config.js` existente para los tests del frontend. Los tests de `functions/` tienen su propia config Vitest en `functions/vitest.config.mjs` y se instalan por separado. Playwright levanta el dev server automáticamente y corre smoke tests contra Firebase real con cuentas dedicadas.

**Tech Stack:** Vitest 3.x, @playwright/test 1.x, dotenv

---

## Task 1: Instalar Vitest y configurar scripts

**Files:**
- Modify: `vite.config.js`
- Modify: `package.json`

- [ ] **Step 1: Instalar Vitest**

```bash
cd "D:/Aideas/PUERTO NUEVO"
npm install -D vitest
```

Resultado esperado: `vitest` aparece en `devDependencies` de `package.json`.

- [ ] **Step 2: Agregar bloque `test` a `vite.config.js`**

Agregar el bloque `test` dentro del objeto de `defineConfig`, después de `build`:

```js
// Al final de vite.config.js, antes del cierre de defineConfig
  build: {
    // ... (existente, no tocar)
  },
  test: {
    environment: 'node',
    globals: true,
  }
```

El archivo completo debe quedar con el bloque `test` dentro de `defineConfig({ ... })`.

- [ ] **Step 3: Agregar scripts a `package.json`**

Dentro de `"scripts"`, agregar:

```json
"test":           "vitest run",
"test:watch":     "vitest",
"test:functions": "cd functions && npm install && npm test",
"test:e2e":       "playwright test",
"test:all":       "npm run test && npm run test:functions && npm run test:e2e"
```

- [ ] **Step 4: Verificar que Vitest funciona con un test trivial**

Crear temporalmente `src/utils/_smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('vitest runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Correr:
```bash
npm test
```

Resultado esperado: `1 passed` en verde.

- [ ] **Step 5: Eliminar el test trivial y hacer commit**

```bash
rm src/utils/_smoke.test.js
git add vite.config.js package.json
git commit -m "chore: agregar Vitest con config base"
```

---

## Task 2: Unit tests — access guards (dmAccess + socialAccess)

**Files:**
- Create: `src/utils/dmAccess.test.js`
- Create: `src/utils/socialAccess.test.js`

- [ ] **Step 1: Crear `src/utils/dmAccess.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { canAccessDMs } from './dmAccess';

describe('canAccessDMs', () => {
  it('returns false for non-family roles', () => {
    expect(canAccessDMs({ role: 'docente', uid: 'uid1', config: { enabled: true } })).toBe(false);
    expect(canAccessDMs({ role: 'coordinacion', uid: 'uid1', config: { enabled: true } })).toBe(false);
    expect(canAccessDMs({ role: 'superadmin', uid: 'uid1', config: { enabled: true } })).toBe(false);
  });

  it('returns false when uid is missing, even if enabled', () => {
    expect(canAccessDMs({ role: 'family', uid: null, config: { enabled: true } })).toBe(false);
    expect(canAccessDMs({ role: 'family', uid: '', config: { enabled: true } })).toBe(false);
  });

  it('returns true for family when enabled is true', () => {
    expect(canAccessDMs({ role: 'family', uid: 'uid1', config: { enabled: true } })).toBe(true);
  });

  it('returns true for family uid in pilot list when disabled', () => {
    const config = { enabled: false, pilotFamilyUids: ['uid1', 'uid2'] };
    expect(canAccessDMs({ role: 'family', uid: 'uid1', config })).toBe(true);
  });

  it('returns false for family uid NOT in pilot list when disabled', () => {
    const config = { enabled: false, pilotFamilyUids: ['uid1', 'uid2'] };
    expect(canAccessDMs({ role: 'family', uid: 'uid3', config })).toBe(false);
  });

  it('returns false for family when disabled and pilot list is empty', () => {
    expect(canAccessDMs({ role: 'family', uid: 'uid1', config: { enabled: false } })).toBe(false);
  });
});
```

- [ ] **Step 2: Crear `src/utils/socialAccess.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { canAccessSocial } from './socialAccess';

describe('canAccessSocial', () => {
  it('returns false for missing role', () => {
    expect(canAccessSocial({ role: null, uid: 'u1', config: { enabled: true } })).toBe(false);
    expect(canAccessSocial({ role: '', uid: 'u1', config: { enabled: true } })).toBe(false);
  });

  it('returns true for admin roles regardless of config', () => {
    expect(canAccessSocial({ role: 'superadmin', uid: 'u1', config: { enabled: false } })).toBe(true);
    expect(canAccessSocial({ role: 'coordinacion', uid: 'u1', config: { enabled: false } })).toBe(true);
  });

  it('returns true for family/docente/tallerista when enabled', () => {
    const config = { enabled: true };
    expect(canAccessSocial({ role: 'family', uid: 'u1', config })).toBe(true);
    expect(canAccessSocial({ role: 'docente', uid: 'u1', config })).toBe(true);
    expect(canAccessSocial({ role: 'tallerista', uid: 'u1', config })).toBe(true);
  });

  it('returns true for family uid in pilot list when disabled', () => {
    const config = { enabled: false, pilotFamilyUids: ['uid1'] };
    expect(canAccessSocial({ role: 'family', uid: 'uid1', config })).toBe(true);
  });

  it('returns false for family uid NOT in pilot list when disabled', () => {
    const config = { enabled: false, pilotFamilyUids: ['uid1'] };
    expect(canAccessSocial({ role: 'family', uid: 'uid2', config })).toBe(false);
  });

  it('returns false for unknown role', () => {
    expect(canAccessSocial({ role: 'guest', uid: 'u1', config: { enabled: true } })).toBe(false);
  });
});
```

- [ ] **Step 3: Correr tests**

```bash
npm test
```

Resultado esperado: todos los tests pasan en verde.

- [ ] **Step 4: Commit**

```bash
git add src/utils/dmAccess.test.js src/utils/socialAccess.test.js
git commit -m "test: agregar unit tests para dmAccess y socialAccess"
```

---

## Task 3: Unit tests — roles + constants

**Files:**
- Create: `src/utils/roles.test.js`
- Create: `src/config/constants.test.js`

- [ ] **Step 1: Crear `src/utils/roles.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { normalizeRole } from './roles';

describe('normalizeRole', () => {
  it('normalizes "teacher" to "docente"', () => {
    expect(normalizeRole('teacher')).toBe('docente');
  });

  it('normalizes "teachers" to "docente"', () => {
    expect(normalizeRole('teachers')).toBe('docente');
  });

  it('normalizes typo "doeente" to "docente"', () => {
    expect(normalizeRole('doeente')).toBe('docente');
  });

  it('passes through known roles unchanged', () => {
    expect(normalizeRole('family')).toBe('family');
    expect(normalizeRole('coordinacion')).toBe('coordinacion');
    expect(normalizeRole('superadmin')).toBe('superadmin');
  });

  it('trims whitespace before normalizing', () => {
    expect(normalizeRole('  teacher  ')).toBe('docente');
  });

  it('returns empty string for non-string input', () => {
    expect(normalizeRole(null)).toBe('');
    expect(normalizeRole(undefined)).toBe('');
    expect(normalizeRole(42)).toBe('');
    expect(normalizeRole({})).toBe('');
  });
});
```

- [ ] **Step 2: Crear `src/config/constants.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { hasPermission, getRolePermissions, ROLES, PERMISSIONS } from './constants';

describe('hasPermission', () => {
  it('returns true for superadmin with MANAGE_USERS', () => {
    expect(hasPermission(ROLES.SUPERADMIN, PERMISSIONS.MANAGE_USERS)).toBe(true);
  });

  it('returns false for family with MANAGE_USERS', () => {
    expect(hasPermission(ROLES.FAMILY, PERMISSIONS.MANAGE_USERS)).toBe(false);
  });

  it('returns true for docente with SEND_COMMUNICATIONS', () => {
    expect(hasPermission(ROLES.DOCENTE, PERMISSIONS.SEND_COMMUNICATIONS)).toBe(true);
  });

  it('returns false for tallerista with SEND_COMMUNICATIONS', () => {
    expect(hasPermission(ROLES.TALLERISTA, PERMISSIONS.SEND_COMMUNICATIONS)).toBe(false);
  });

  it('returns false when role is null', () => {
    expect(hasPermission(null, PERMISSIONS.MANAGE_USERS)).toBe(false);
  });

  it('returns false when permission is null', () => {
    expect(hasPermission(ROLES.SUPERADMIN, null)).toBe(false);
  });
});

describe('getRolePermissions', () => {
  it('returns all permissions for superadmin', () => {
    const perms = getRolePermissions(ROLES.SUPERADMIN);
    expect(perms).toContain(PERMISSIONS.MANAGE_USERS);
    expect(perms).toContain(PERMISSIONS.MANAGE_CHILDREN);
    expect(perms).toContain(PERMISSIONS.SEND_COMMUNICATIONS);
    expect(perms).toContain(PERMISSIONS.VIEW_MEDICAL_INFO);
    expect(perms.length).toBeGreaterThan(5);
  });

  it('returns empty array for family', () => {
    expect(getRolePermissions(ROLES.FAMILY)).toEqual([]);
  });

  it('returns empty array for aspirante', () => {
    expect(getRolePermissions(ROLES.ASPIRANTE)).toEqual([]);
  });

  it('returns empty array for unknown role', () => {
    expect(getRolePermissions('rol_inexistente')).toEqual([]);
  });
});
```

- [ ] **Step 3: Correr tests**

```bash
npm test
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 4: Commit**

```bash
git add src/utils/roles.test.js src/config/constants.test.js
git commit -m "test: agregar unit tests para roles y constants"
```

---

## Task 4: Unit tests — snackAssignmentState

**Files:**
- Create: `src/utils/snackAssignmentState.test.js`

- [ ] **Step 1: Crear `src/utils/snackAssignmentState.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  normalizeSnackAssignmentState,
  getSnackStatusMeta,
  isSnackAssignmentActiveForFamily,
  isSnackAssignmentConfirmedLike,
  SNACK_ASSIGNMENT_STATE,
} from './snackAssignmentState';

describe('normalizeSnackAssignmentState', () => {
  it('returns empty for null/undefined', () => {
    expect(normalizeSnackAssignmentState(null)).toBe(SNACK_ASSIGNMENT_STATE.EMPTY);
    expect(normalizeSnackAssignmentState(undefined)).toBe(SNACK_ASSIGNMENT_STATE.EMPTY);
  });

  it('suspendido:true wins over any estado string', () => {
    expect(normalizeSnackAssignmentState({ suspendido: true, estado: 'confirmado' }))
      .toBe(SNACK_ASSIGNMENT_STATE.SUSPENDED);
    expect(normalizeSnackAssignmentState({ suspendido: true, estado: 'cancelado' }))
      .toBe(SNACK_ASSIGNMENT_STATE.SUSPENDED);
  });

  it('estado "suspendido" string also triggers suspended', () => {
    expect(normalizeSnackAssignmentState({ estado: 'suspendido' }))
      .toBe(SNACK_ASSIGNMENT_STATE.SUSPENDED);
  });

  it('estado "cancelado" returns cancelled', () => {
    expect(normalizeSnackAssignmentState({ estado: 'cancelado' }))
      .toBe(SNACK_ASSIGNMENT_STATE.CANCELLED);
  });

  it('solicitudCambio:true returns change_requested', () => {
    expect(normalizeSnackAssignmentState({ solicitudCambio: true }))
      .toBe(SNACK_ASSIGNMENT_STATE.CHANGE_REQUESTED);
  });

  it('estado "cambio_solicitado" returns change_requested', () => {
    expect(normalizeSnackAssignmentState({ estado: 'cambio_solicitado' }))
      .toBe(SNACK_ASSIGNMENT_STATE.CHANGE_REQUESTED);
  });

  it('estado "completado" returns completed', () => {
    expect(normalizeSnackAssignmentState({ estado: 'completado' }))
      .toBe(SNACK_ASSIGNMENT_STATE.COMPLETED);
  });

  it('confirmadoPorFamilia:true returns confirmed', () => {
    expect(normalizeSnackAssignmentState({ confirmadoPorFamilia: true }))
      .toBe(SNACK_ASSIGNMENT_STATE.CONFIRMED);
  });

  it('estado "confirmado" returns confirmed', () => {
    expect(normalizeSnackAssignmentState({ estado: 'confirmado' }))
      .toBe(SNACK_ASSIGNMENT_STATE.CONFIRMED);
  });

  it('returns pending for object with no recognized state', () => {
    expect(normalizeSnackAssignmentState({ familiaId: 'abc' }))
      .toBe(SNACK_ASSIGNMENT_STATE.PENDING);
    expect(normalizeSnackAssignmentState({ estado: '' }))
      .toBe(SNACK_ASSIGNMENT_STATE.PENDING);
  });
});

describe('getSnackStatusMeta', () => {
  it('returns correct meta for confirmed', () => {
    const meta = getSnackStatusMeta({ confirmadoPorFamilia: true });
    expect(meta.label).toBe('Confirmado');
    expect(meta.style).toBe('confirmed');
    expect(meta.isConfirmedState).toBe(true);
    expect(meta.isTerminal).toBe(false);
  });

  it('returns correct meta for suspended', () => {
    const meta = getSnackStatusMeta({ suspendido: true });
    expect(meta.label).toBe('No hay snacks');
    expect(meta.isSuspended).toBe(true);
  });

  it('returns isTerminal:true for completed', () => {
    const meta = getSnackStatusMeta({ estado: 'completado' });
    expect(meta.isTerminal).toBe(true);
    expect(meta.isConfirmedState).toBe(true);
  });

  it('returns isTerminal:true for cancelled', () => {
    const meta = getSnackStatusMeta({ estado: 'cancelado' });
    expect(meta.isTerminal).toBe(true);
    expect(meta.isConfirmedState).toBe(false);
  });
});

describe('isSnackAssignmentActiveForFamily', () => {
  it('returns true for pending', () => {
    expect(isSnackAssignmentActiveForFamily({ familiaId: 'x' })).toBe(true);
  });

  it('returns true for confirmed', () => {
    expect(isSnackAssignmentActiveForFamily({ confirmadoPorFamilia: true })).toBe(true);
  });

  it('returns true for change_requested', () => {
    expect(isSnackAssignmentActiveForFamily({ solicitudCambio: true })).toBe(true);
  });

  it('returns false for cancelled', () => {
    expect(isSnackAssignmentActiveForFamily({ estado: 'cancelado' })).toBe(false);
  });

  it('returns false for completed', () => {
    expect(isSnackAssignmentActiveForFamily({ estado: 'completado' })).toBe(false);
  });

  it('returns false for suspended', () => {
    expect(isSnackAssignmentActiveForFamily({ suspendido: true })).toBe(false);
  });
});

describe('isSnackAssignmentConfirmedLike', () => {
  it('returns true for confirmed', () => {
    expect(isSnackAssignmentConfirmedLike({ confirmadoPorFamilia: true })).toBe(true);
  });

  it('returns true for completed', () => {
    expect(isSnackAssignmentConfirmedLike({ estado: 'completado' })).toBe(true);
  });

  it('returns false for pending', () => {
    expect(isSnackAssignmentConfirmedLike({ familiaId: 'x' })).toBe(false);
  });

  it('returns false for cancelled', () => {
    expect(isSnackAssignmentConfirmedLike({ estado: 'cancelado' })).toBe(false);
  });
});
```

- [ ] **Step 2: Correr tests**

```bash
npm test
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 3: Commit**

```bash
git add src/utils/snackAssignmentState.test.js
git commit -m "test: agregar unit tests para snackAssignmentState"
```

---

## Task 5: Unit tests — conversationHelpers

**Files:**
- Create: `src/utils/conversationHelpers.test.js`

- [ ] **Step 1: Crear `src/utils/conversationHelpers.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  getAreaLabel,
  getCategoryLabel,
  getConversationStatusLabel,
  getConversationStatusBadge,
  sortConversationsByLatestMessage,
} from './conversationHelpers';
import { ROLES, ESCUELA_AREAS, CONVERSATION_STATUS } from '../config/constants';

describe('getAreaLabel', () => {
  it('returns correct label for coordinacion', () => {
    expect(getAreaLabel(ESCUELA_AREAS.COORDINACION)).toBe('Coordinación');
  });

  it('returns "Facturación" for administracion', () => {
    expect(getAreaLabel(ESCUELA_AREAS.ADMINISTRACION)).toBe('Facturación');
  });

  it('returns "Dirección" for direccion', () => {
    expect(getAreaLabel(ESCUELA_AREAS.DIRECCION)).toBe('Dirección');
  });

  it('returns "Escuela" for unknown area', () => {
    expect(getAreaLabel('otro')).toBe('Escuela');
    expect(getAreaLabel(undefined)).toBe('Escuela');
  });
});

describe('getCategoryLabel', () => {
  it('returns label for known category', () => {
    expect(getCategoryLabel('pedagogica')).toBe('Consulta pedagógica');
    expect(getCategoryLabel('pagos')).toBe('Consulta sobre pagos');
  });

  it('returns value itself for unknown category', () => {
    expect(getCategoryLabel('desconocida')).toBe('desconocida');
  });

  it('returns "General" for undefined', () => {
    expect(getCategoryLabel(undefined)).toBe('General');
  });
});

describe('getConversationStatusLabel', () => {
  it('shows "Respuesta pendiente" for family with pendiente', () => {
    expect(getConversationStatusLabel(CONVERSATION_STATUS.PENDIENTE, ROLES.FAMILY))
      .toBe('Respuesta pendiente');
  });

  it('shows "Sin responder" for admin with pendiente', () => {
    expect(getConversationStatusLabel(CONVERSATION_STATUS.PENDIENTE, ROLES.COORDINACION))
      .toBe('Sin responder');
  });

  it('shows "Respondida" for both roles', () => {
    expect(getConversationStatusLabel(CONVERSATION_STATUS.RESPONDIDA, ROLES.FAMILY))
      .toBe('Respondida');
    expect(getConversationStatusLabel(CONVERSATION_STATUS.RESPONDIDA, ROLES.COORDINACION))
      .toBe('Respondida');
  });

  it('returns status value for unknown status', () => {
    expect(getConversationStatusLabel('status_raro', ROLES.FAMILY)).toBe('status_raro');
  });
});

describe('getConversationStatusBadge', () => {
  it('returns error badge for pendiente', () => {
    expect(getConversationStatusBadge(CONVERSATION_STATUS.PENDIENTE)).toBe('badge badge--error');
  });

  it('returns warning badge for respondida', () => {
    expect(getConversationStatusBadge(CONVERSATION_STATUS.RESPONDIDA)).toBe('badge badge--warning');
  });

  it('returns success badge for activa', () => {
    expect(getConversationStatusBadge(CONVERSATION_STATUS.ACTIVA)).toBe('badge badge--success');
  });

  it('returns info badge for cerrada', () => {
    expect(getConversationStatusBadge(CONVERSATION_STATUS.CERRADA)).toBe('badge badge--info');
  });

  it('returns plain badge for unknown status', () => {
    expect(getConversationStatusBadge('unknown')).toBe('badge');
  });
});

describe('sortConversationsByLatestMessage', () => {
  it('sorts by ultimoMensajeAt descending', () => {
    const older = { ultimoMensajeAt: new Date('2024-01-01') };
    const newer = { ultimoMensajeAt: new Date('2024-06-01') };
    const result = sortConversationsByLatestMessage([older, newer]);
    expect(result[0]).toBe(newer);
    expect(result[1]).toBe(older);
  });

  it('falls back to creadoAt when ultimoMensajeAt is absent', () => {
    const older = { creadoAt: new Date('2024-01-01') };
    const newer = { creadoAt: new Date('2024-06-01') };
    const result = sortConversationsByLatestMessage([older, newer]);
    expect(result[0]).toBe(newer);
  });

  it('handles Firestore Timestamps (objects with .toDate())', () => {
    const makeTs = (date) => ({ toDate: () => date });
    const older = { ultimoMensajeAt: makeTs(new Date('2024-01-01')) };
    const newer = { ultimoMensajeAt: makeTs(new Date('2024-06-01')) };
    const result = sortConversationsByLatestMessage([older, newer]);
    expect(result[0]).toBe(newer);
  });

  it('does not mutate the original array', () => {
    const arr = [
      { creadoAt: new Date('2024-01-01') },
      { creadoAt: new Date('2024-06-01') },
    ];
    const firstBefore = arr[0];
    sortConversationsByLatestMessage(arr);
    expect(arr[0]).toBe(firstBefore);
  });

  it('handles empty array', () => {
    expect(sortConversationsByLatestMessage([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr tests**

```bash
npm test
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 3: Commit**

```bash
git add src/utils/conversationHelpers.test.js
git commit -m "test: agregar unit tests para conversationHelpers"
```

---

## Task 6: Unit tests — dateHelpers

**Files:**
- Create: `src/utils/dateHelpers.test.js`

- [ ] **Step 1: Crear `src/utils/dateHelpers.test.js`**

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';
import { isNext24Hours, isNext48Hours, formatRelativeTime } from './dateHelpers';

// Fecha fija de referencia para todos los tests
const NOW = new Date('2024-06-15T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('isNext24Hours', () => {
  it('returns true for a date 12 hours from now', () => {
    const date = new Date(NOW.getTime() + 12 * 60 * 60 * 1000);
    expect(isNext24Hours(date)).toBe(true);
  });

  it('returns false for a date exactly 48 hours from now', () => {
    const date = new Date(NOW.getTime() + 48 * 60 * 60 * 1000);
    expect(isNext24Hours(date)).toBe(false);
  });

  it('returns false for a past date', () => {
    const date = new Date(NOW.getTime() - 1000);
    expect(isNext24Hours(date)).toBe(false);
  });

  it('accepts Firestore Timestamp objects (with .toDate())', () => {
    const futureDate = new Date(NOW.getTime() + 6 * 60 * 60 * 1000);
    const timestamp = { toDate: () => futureDate };
    expect(isNext24Hours(timestamp)).toBe(true);
  });
});

describe('isNext48Hours', () => {
  it('returns true for a date 36 hours from now', () => {
    const date = new Date(NOW.getTime() + 36 * 60 * 60 * 1000);
    expect(isNext48Hours(date)).toBe(true);
  });

  it('returns false for a date 49 hours from now', () => {
    const date = new Date(NOW.getTime() + 49 * 60 * 60 * 1000);
    expect(isNext48Hours(date)).toBe(false);
  });

  it('returns false for a past date', () => {
    const date = new Date(NOW.getTime() - 1000);
    expect(isNext48Hours(date)).toBe(false);
  });
});

describe('formatRelativeTime', () => {
  it('returns "Hace menos de 1 hora" for 30 minutes ago', () => {
    const date = new Date(NOW.getTime() - 30 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('Hace menos de 1 hora');
  });

  it('returns "Hace 1 hora" for exactly 1 hour ago', () => {
    const date = new Date(NOW.getTime() - 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('Hace 1 hora');
  });

  it('returns "Hace 3 horas" for 3 hours ago', () => {
    const date = new Date(NOW.getTime() - 3 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('Hace 3 horas');
  });

  it('returns "Ayer" for 25 hours ago', () => {
    const date = new Date(NOW.getTime() - 25 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('Ayer');
  });

  it('returns "Hace 5 días" for 5 days ago', () => {
    const date = new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(date)).toBe('Hace 5 días');
  });
});
```

- [ ] **Step 2: Correr tests**

```bash
npm test
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 3: Commit**

```bash
git add src/utils/dateHelpers.test.js
git commit -m "test: agregar unit tests para dateHelpers con fake timers"
```

---

## Task 7: Unit tests — avatarHelpers

**Files:**
- Create: `src/utils/avatarHelpers.test.js`

- [ ] **Step 1: Crear `src/utils/avatarHelpers.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { getInitials, getAvatarColorToken, COLOR_TOKENS } from './avatarHelpers';

describe('getInitials', () => {
  it('returns first and last initial for two-word name', () => {
    expect(getInitials('Juan Pérez')).toBe('JP');
  });

  it('returns single initial for one-word name', () => {
    expect(getInitials('Juan')).toBe('J');
  });

  it('returns "?" for empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('returns "?" for null', () => {
    expect(getInitials(null)).toBe('?');
  });

  it('uses first and last word for multi-word names', () => {
    expect(getInitials('Juan Carlos López')).toBe('JL');
  });

  it('trims and collapses extra whitespace', () => {
    expect(getInitials('  Ana  Gómez  ')).toBe('AG');
  });

  it('returns uppercase initials', () => {
    expect(getInitials('ana gómez')).toBe('AG');
  });
});

describe('getAvatarColorToken', () => {
  it('returns a token from COLOR_TOKENS list', () => {
    const token = getAvatarColorToken('Juan Pérez');
    expect(COLOR_TOKENS).toContain(token);
  });

  it('returns the same token for the same name (stable hash)', () => {
    expect(getAvatarColorToken('Maria López')).toBe(getAvatarColorToken('Maria López'));
  });

  it('different names can return different tokens', () => {
    // No es obligatorio que sean distintos, pero lo comprobamos
    const tokens = new Set(['Ana García', 'Pedro Torres', 'María Gómez', 'Carlos Ruiz'].map(getAvatarColorToken));
    // Al menos debe haber más de un token distinto entre 4 nombres
    expect(tokens.size).toBeGreaterThanOrEqual(1);
  });

  it('handles empty string without throwing', () => {
    expect(() => getAvatarColorToken('')).not.toThrow();
    expect(COLOR_TOKENS).toContain(getAvatarColorToken(''));
  });
});
```

- [ ] **Step 2: Correr tests**

```bash
npm test
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 3: Commit**

```bash
git add src/utils/avatarHelpers.test.js
git commit -m "test: agregar unit tests para avatarHelpers"
```

---

## Task 8: Unit tests — textEncoding

**Files:**
- Create: `src/utils/textEncoding.test.js`

- [ ] **Step 1: Crear `src/utils/textEncoding.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { fixMojibake, fixMojibakeDeep } from './textEncoding';

describe('fixMojibake', () => {
  it('corrects a mojibake string (é encoded as Latin-1)', () => {
    // 'Café' en UTF-8 bytes leídos como Latin-1 produce 'CafÃ©'
    expect(fixMojibake('CafÃ©')).toBe('Café');
  });

  it('corrects otro ejemplo común (ó)', () => {
    // 'ó' en UTF-8 = [0xC3, 0xB3] → Latin-1 chars 'Ã³'
    expect(fixMojibake('PedagÃ³gica')).toBe('Pedagógica');
  });

  it('returns original string when no mojibake pattern', () => {
    expect(fixMojibake('Hola mundo')).toBe('Hola mundo');
    expect(fixMojibake('Normal text 123')).toBe('Normal text 123');
  });

  it('does not break normal unicode strings without mojibake patterns', () => {
    expect(fixMojibake('Texto con ñ y ü')).toBe('Texto con ñ y ü');
  });

  it('returns non-string values unchanged', () => {
    expect(fixMojibake(null)).toBe(null);
    expect(fixMojibake(42)).toBe(42);
    expect(fixMojibake(undefined)).toBe(undefined);
  });
});

describe('fixMojibakeDeep', () => {
  it('fixes strings inside flat objects', () => {
    const result = fixMojibakeDeep({ nombre: 'CafÃ©' });
    expect(result.nombre).toBe('Café');
  });

  it('fixes strings inside arrays', () => {
    const result = fixMojibakeDeep(['CafÃ©', 'normal']);
    expect(result[0]).toBe('Café');
    expect(result[1]).toBe('normal');
  });

  it('fixes strings in nested objects', () => {
    const result = fixMojibakeDeep({ alumno: { apellido: 'PedagÃ³gica' } });
    expect(result.alumno.apellido).toBe('Pedagógica');
  });

  it('does not modify Date objects (returns same reference)', () => {
    const date = new Date('2024-01-01');
    expect(fixMojibakeDeep(date)).toBe(date);
  });

  it('does not modify Firestore Timestamp objects (has .toDate())', () => {
    const timestamp = { toDate: () => new Date(), seconds: 12345 };
    const result = fixMojibakeDeep(timestamp);
    expect(result).toBe(timestamp);
  });

  it('returns null/undefined as-is', () => {
    expect(fixMojibakeDeep(null)).toBe(null);
    expect(fixMojibakeDeep(undefined)).toBe(undefined);
  });
});
```

- [ ] **Step 2: Correr tests**

```bash
npm test
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 3: Commit**

```bash
git add src/utils/textEncoding.test.js
git commit -m "test: agregar unit tests para textEncoding (fixMojibake)"
```

---

## Task 9: Unit tests — galleryHelpers

**Files:**
- Create: `src/utils/galleryHelpers.test.js`

- [ ] **Step 1: Crear `src/utils/galleryHelpers.test.js`**

```js
import { describe, it, expect } from 'vitest';
import {
  validateGalleryFiles,
  sanitizeFileName,
  getMediaType,
  isHeicFile,
  parseYouTubeUrl,
  parseVimeoUrl,
  parseVideoUrl,
  MAX_FILE_SIZE_BYTES,
} from './galleryHelpers';

// validateGalleryFiles solo accede a .name, .type, .size — no necesita File real
const makeFile = (name, type, size = 100) => ({ name, type, size });

describe('validateGalleryFiles', () => {
  it('returns error for empty array', () => {
    const { valid, errors } = validateGalleryFiles([]);
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('returns error for null input', () => {
    const { valid, errors } = validateGalleryFiles(null);
    expect(valid).toHaveLength(0);
    expect(errors).toHaveLength(1);
  });

  it('rejects files over 20MB', () => {
    const big = makeFile('foto.jpg', 'image/jpeg', MAX_FILE_SIZE_BYTES + 1);
    const { valid, errors } = validateGalleryFiles([big]);
    expect(valid).toHaveLength(0);
    expect(errors[0]).toContain('20MB');
  });

  it('rejects .exe extension', () => {
    const exe = makeFile('virus.exe', 'application/octet-stream', 100);
    const { errors } = validateGalleryFiles([exe]);
    expect(errors[0]).toContain('.exe');
  });

  it('rejects .zip extension', () => {
    const zip = makeFile('archivo.zip', 'application/zip', 100);
    const { errors } = validateGalleryFiles([zip]);
    expect(errors[0]).toContain('.zip');
  });

  it('accepts jpg, png, mp4, pdf', () => {
    const files = [
      makeFile('foto.jpg', 'image/jpeg', 100),
      makeFile('foto.png', 'image/png', 100),
      makeFile('video.mp4', 'video/mp4', 100),
      makeFile('doc.pdf', 'application/pdf', 100),
    ];
    const { valid, errors } = validateGalleryFiles(files);
    expect(valid).toHaveLength(4);
    expect(errors).toHaveLength(0);
  });

  it('accepts HEIC with empty MIME type (iOS behavior)', () => {
    const heic = makeFile('photo.heic', '', 100);
    const { valid, errors } = validateGalleryFiles([heic]);
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });

  it('accepts HEIC with application/octet-stream MIME (some iOS versions)', () => {
    const heic = makeFile('photo.heic', 'application/octet-stream', 100);
    const { valid, errors } = validateGalleryFiles([heic]);
    expect(valid).toHaveLength(1);
    expect(errors).toHaveLength(0);
  });
});

describe('sanitizeFileName', () => {
  it('removes accents from filename', () => {
    expect(sanitizeFileName('canción.mp4')).toBe('cancion.mp4');
  });

  it('replaces spaces with underscores', () => {
    expect(sanitizeFileName('foto bonita.jpg')).toBe('foto_bonita.jpg');
  });

  it('replaces special characters with underscores', () => {
    expect(sanitizeFileName('foto!#$.jpg')).toBe('foto___.jpg');
  });

  it('collapses multiple consecutive underscores into one', () => {
    expect(sanitizeFileName('foto   bonita.jpg')).toBe('foto_bonita.jpg');
  });

  it('preserves dots and hyphens', () => {
    expect(sanitizeFileName('mi-foto.v2.jpg')).toBe('mi-foto.v2.jpg');
  });
});

describe('getMediaType', () => {
  it('returns "video" for video/mp4', () => {
    expect(getMediaType({ type: 'video/mp4' })).toBe('video');
  });

  it('returns "imagen" for image/jpeg', () => {
    expect(getMediaType({ type: 'image/jpeg' })).toBe('imagen');
  });

  it('returns "pdf" for application/pdf', () => {
    expect(getMediaType({ type: 'application/pdf' })).toBe('pdf');
  });

  it('returns "archivo" for unknown type', () => {
    expect(getMediaType({ type: 'application/octet-stream' })).toBe('archivo');
  });
});

describe('isHeicFile', () => {
  it('detects HEIC by .heic extension', () => {
    expect(isHeicFile({ name: 'photo.heic', type: '' })).toBe(true);
  });

  it('detects HEIF by .heif extension', () => {
    expect(isHeicFile({ name: 'photo.heif', type: '' })).toBe(true);
  });

  it('detects HEIC by MIME type', () => {
    expect(isHeicFile({ name: 'photo.jpg', type: 'image/heic' })).toBe(true);
  });

  it('returns false for standard jpg', () => {
    expect(isHeicFile({ name: 'photo.jpg', type: 'image/jpeg' })).toBe(false);
  });

  it('returns false for null input', () => {
    expect(isHeicFile(null)).toBe(false);
  });
});

describe('parseYouTubeUrl', () => {
  it('extracts videoId from watch URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result).not.toBeNull();
    expect(result.valid).toBe(true);
    expect(result.videoId).toBe('dQw4w9WgXcQ');
  });

  it('extracts videoId from youtu.be short URL', () => {
    const result = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(result.videoId).toBe('dQw4w9WgXcQ');
  });

  it('extracts videoId from embed URL', () => {
    const result = parseYouTubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(result.videoId).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube URL', () => {
    expect(parseYouTubeUrl('https://vimeo.com/123456789')).toBeNull();
    expect(parseYouTubeUrl('https://example.com')).toBeNull();
  });
});

describe('parseVimeoUrl', () => {
  it('extracts videoId from vimeo.com URL', () => {
    const result = parseVimeoUrl('https://vimeo.com/123456789');
    expect(result).not.toBeNull();
    expect(result.valid).toBe(true);
    expect(result.videoId).toBe('123456789');
  });

  it('extracts videoId from player.vimeo.com URL', () => {
    const result = parseVimeoUrl('https://player.vimeo.com/video/123456789');
    expect(result.videoId).toBe('123456789');
  });

  it('preserves h parameter in embedUrl for unlisted videos', () => {
    const result = parseVimeoUrl('https://vimeo.com/123456789?h=abc123');
    expect(result.embedUrl).toContain('h=abc123');
  });

  it('returns null for non-Vimeo URL', () => {
    expect(parseVimeoUrl('https://youtube.com/watch?v=abc')).toBeNull();
    expect(parseVimeoUrl('https://example.com')).toBeNull();
  });
});

describe('parseVideoUrl', () => {
  it('detects YouTube and returns provider "youtube"', () => {
    const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result.valid).toBe(true);
    expect(result.provider).toBe('youtube');
  });

  it('detects Vimeo and returns provider "vimeo"', () => {
    const result = parseVideoUrl('https://vimeo.com/123456789');
    expect(result.valid).toBe(true);
    expect(result.provider).toBe('vimeo');
  });

  it('returns valid:false with error for unsupported URL', () => {
    const result = parseVideoUrl('https://example.com/video.mp4');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns valid:false for null input', () => {
    expect(parseVideoUrl(null).valid).toBe(false);
  });

  it('returns valid:false for empty string', () => {
    expect(parseVideoUrl('').valid).toBe(false);
  });
});
```

- [ ] **Step 2: Correr tests**

```bash
npm test
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 3: Commit**

```bash
git add src/utils/galleryHelpers.test.js
git commit -m "test: agregar unit tests para galleryHelpers"
```

---

## Task 10: Setup Vitest en functions + tests de sanitize

**Files:**
- Modify: `functions/package.json`
- Create: `functions/vitest.config.mjs`
- Create: `functions/src/utils/sanitize.test.js`

- [ ] **Step 1: Agregar vitest a `functions/package.json`**

En `functions/package.json` agregar **solo** estas dos entradas (no reemplazar el archivo):

Dentro de `"scripts"`, agregar:
```json
"test": "vitest run"
```

Dentro de `"devDependencies"`, agregar:
```json
"vitest": "^3.0.0"
```

Luego instalar:
```bash
cd functions && npm install && cd ..
```

- [ ] **Step 2: Crear `functions/vitest.config.mjs`**

```js
export default {
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.js'],
  },
};
```

- [ ] **Step 3: Crear `functions/src/utils/sanitize.test.js`**

```js
const { escapeHtml, sanitizeUrl, toPlainText, renderAttachmentList } = require('./sanitize');

describe('escapeHtml', () => {
  it('escapes < and >', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hola"')).toBe('&quot;hola&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('sanitizeUrl', () => {
  it('accepts http URL', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('accepts https URL with path', () => {
    expect(sanitizeUrl('https://example.com/path/to/file')).toBe('https://example.com/path/to/file');
  });

  it('rejects javascript: protocol', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('rejects data: protocol', () => {
    expect(sanitizeUrl('data:text/html,<h1>xss</h1>')).toBeNull();
  });

  it('returns null for invalid URL string', () => {
    expect(sanitizeUrl('not-a-valid-url')).toBeNull();
  });

  it('returns null for null input', () => {
    expect(sanitizeUrl(null)).toBeNull();
  });
});

describe('toPlainText', () => {
  it('strips HTML tags', () => {
    expect(toPlainText('<p>Hello <strong>world</strong></p>')).toBe('Hello world');
  });

  it('decodes &amp;', () => {
    expect(toPlainText('a &amp; b')).toBe('a & b');
  });

  it('decodes &lt; and &gt;', () => {
    expect(toPlainText('&lt;div&gt;')).toBe('<div>');
  });

  it('collapses multiple spaces and trims', () => {
    expect(toPlainText('<p>a</p><p>b</p>')).toBe('a b');
  });

  it('returns empty string for null', () => {
    expect(toPlainText(null)).toBe('');
  });
});

describe('renderAttachmentList', () => {
  it('returns empty string for empty array', () => {
    expect(renderAttachmentList([])).toBe('');
  });

  it('returns empty string for null', () => {
    expect(renderAttachmentList(null)).toBe('');
  });

  it('renders a link when URL is valid https', () => {
    const html = renderAttachmentList([
      { name: 'documento.pdf', url: 'https://example.com/doc.pdf' },
    ]);
    expect(html).toContain('href="https://example.com/doc.pdf"');
    expect(html).toContain('documento.pdf');
  });

  it('renders item without href when URL is javascript:', () => {
    const html = renderAttachmentList([
      { name: 'doc.pdf', url: 'javascript:alert(1)' },
    ]);
    expect(html).not.toContain('href=');
    expect(html).toContain('doc.pdf');
  });

  it('renders item without href when URL is invalid', () => {
    const html = renderAttachmentList([{ name: 'doc.pdf', url: 'not-a-url' }]);
    expect(html).not.toContain('href=');
  });
});
```

- [ ] **Step 4: Instalar dependencias y correr tests de functions**

```bash
npm run test:functions
```

Resultado esperado: todos los tests pasan.

- [ ] **Step 5: Commit**

```bash
git add functions/package.json functions/vitest.config.mjs functions/src/utils/sanitize.test.js
git commit -m "test: setup Vitest en functions y tests para sanitize utils"
```

---

## Task 11: Unit tests — rateLimiter

**Files:**
- Create: `functions/src/utils/rateLimiter.test.js`

- [ ] **Step 1: Crear `functions/src/utils/rateLimiter.test.js`**

```js
const { mailLimiter } = require('./rateLimiter');

describe('isRateLimitError', () => {
  it('detects HTTP status 429', () => {
    expect(mailLimiter.isRateLimitError({ status: 429 })).toBe(true);
  });

  it('detects statusCode 429 (alternate property name)', () => {
    expect(mailLimiter.isRateLimitError({ statusCode: 429 })).toBe(true);
  });

  it('detects code "429" as string', () => {
    expect(mailLimiter.isRateLimitError({ code: '429' })).toBe(true);
  });

  it('detects "too many requests" in message (case-insensitive)', () => {
    expect(mailLimiter.isRateLimitError({ message: 'Too Many Requests from this IP' })).toBe(true);
  });

  it('detects "rate_limit_exceeded" in message', () => {
    expect(mailLimiter.isRateLimitError({ message: 'rate_limit_exceeded' })).toBe(true);
  });

  it('returns false for 400 error', () => {
    expect(mailLimiter.isRateLimitError({ status: 400 })).toBe(false);
  });

  it('returns false for 500 error', () => {
    expect(mailLimiter.isRateLimitError({ status: 500 })).toBe(false);
  });
});

describe('isTransientNetworkError', () => {
  it('detects HTTP 500', () => {
    expect(mailLimiter.isTransientNetworkError({ status: 500 })).toBe(true);
  });

  it('detects HTTP 503', () => {
    expect(mailLimiter.isTransientNetworkError({ status: 503 })).toBe(true);
  });

  it('detects ECONNRESET code', () => {
    expect(mailLimiter.isTransientNetworkError({ code: 'ECONNRESET' })).toBe(true);
  });

  it('detects ETIMEDOUT code', () => {
    expect(mailLimiter.isTransientNetworkError({ code: 'ETIMEDOUT' })).toBe(true);
  });

  it('detects ENOTFOUND code', () => {
    expect(mailLimiter.isTransientNetworkError({ code: 'ENOTFOUND' })).toBe(true);
  });

  it('returns false for 400 Bad Request', () => {
    expect(mailLimiter.isTransientNetworkError({ status: 400 })).toBe(false);
  });

  it('returns false for 404 Not Found', () => {
    expect(mailLimiter.isTransientNetworkError({ status: 404 })).toBe(false);
  });

  it('returns false for 429 (that is rate limit, not transient)', () => {
    expect(mailLimiter.isTransientNetworkError({ status: 429 })).toBe(false);
  });
});
```

- [ ] **Step 2: Correr tests**

```bash
npm run test:functions
```

Resultado esperado: todos los tests pasan (incluyendo los de sanitize del task anterior).

- [ ] **Step 3: Commit**

```bash
git add functions/src/utils/rateLimiter.test.js
git commit -m "test: agregar unit tests para rateLimiter"
```

---

## Task 12: Instalar Playwright y configurar

**Files:**
- Modify: `package.json` (ya tiene `test:e2e`)
- Create: `playwright.config.js`
- Create: `.env.test.local` (template, no se versiona)

- [ ] **Step 1: Instalar Playwright y Chromium**

```bash
npm install -D @playwright/test dotenv
npx playwright install chromium
```

Resultado esperado: Chromium descargado en la carpeta de Playwright.

- [ ] **Step 2: Crear `playwright.config.js`**

```js
import dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';

dotenv.config({ path: '.env.test.local' });

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
```

- [ ] **Step 3: Crear el directorio e2e**

```bash
mkdir -p e2e
```

- [ ] **Step 4: Crear `.env.test.local` con template**

Crear el archivo `.env.test.local` (NO hacer commit de este archivo — ya está en `.gitignore`):

```
# Cuentas dedicadas para tests E2E — nunca usar cuentas de familias o staff real
PLAYWRIGHT_FAMILY_EMAIL=test-family@test.local
PLAYWRIGHT_FAMILY_PASSWORD=COMPLETAR
PLAYWRIGHT_ADMIN_EMAIL=test-admin@test.local
PLAYWRIGHT_ADMIN_PASSWORD=COMPLETAR
```

**Antes de continuar con los tests E2E**, crear manualmente las cuentas en Firebase Auth del proyecto `puerto-nuevo-montessori` con los emails definidos arriba, y asignarles los roles `family` y `coordinacion` en Firestore. La cuenta family necesita al menos un hijo asociado y debe existir al menos un evento publicado.

- [ ] **Step 5: Verificar config con un test mínimo**

Crear temporalmente `e2e/_smoke.spec.js`:

```js
import { test, expect } from '@playwright/test';

test('dev server arranca y devuelve la página de login', async ({ page }) => {
  await page.goto('/portal/login');
  await expect(page).toHaveURL(/login/);
  await expect(page.locator('#email')).toBeVisible();
});
```

Correr:
```bash
npm run test:e2e
```

Resultado esperado: `1 passed`. Si falla por timeout del webServer, aumentar `timeout` en el bloque `webServer` de `playwright.config.js`.

- [ ] **Step 6: Eliminar smoke test y hacer commit**

```bash
rm e2e/_smoke.spec.js
git add playwright.config.js package.json
git commit -m "chore: agregar Playwright con config base"
```

---

## Task 13: E2E — Login

**Files:**
- Create: `e2e/login.spec.js`

- [ ] **Step 1: Crear `e2e/login.spec.js`**

```js
import { test, expect } from '@playwright/test';

const FAMILY_EMAIL = process.env.PLAYWRIGHT_FAMILY_EMAIL;
const FAMILY_PASSWORD = process.env.PLAYWRIGHT_FAMILY_PASSWORD;
const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

async function fillLogin(page, email, password) {
  await page.goto('/portal/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}

test('login con cuenta family redirige a /portal/familia', async ({ page }) => {
  await fillLogin(page, FAMILY_EMAIL, FAMILY_PASSWORD);
  await expect(page).toHaveURL(/\/portal\/familia/, { timeout: 15000 });
});

test('login con cuenta admin (coordinacion) redirige a /portal/admin', async ({ page }) => {
  await fillLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/portal\/admin/, { timeout: 15000 });
});

test('login con password incorrecto muestra error y no navega', async ({ page }) => {
  await fillLogin(page, FAMILY_EMAIL, 'password-incorrecto-xyz-9999');
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  await expect(page).not.toHaveURL(/\/portal\/familia/);
});

test('login con email inexistente muestra error', async ({ page }) => {
  await fillLogin(page, 'noexiste-xyz@test.invalid', 'cualquierpassword');
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
});
```

- [ ] **Step 2: Correr solo estos tests**

```bash
npx playwright test e2e/login.spec.js
```

Resultado esperado: 4 passed. Si alguno falla por timeout, puede ser latencia de Firebase Auth — aumentar el timeout del `expect`.

- [ ] **Step 3: Commit**

```bash
git add e2e/login.spec.js
git commit -m "test: agregar smoke tests E2E para login"
```

---

## Task 14: E2E — Conversations y Events

**Files:**
- Create: `e2e/conversations.spec.js`
- Create: `e2e/events.spec.js`

- [ ] **Step 1: Crear `e2e/conversations.spec.js`**

```js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/portal/login');
  await page.fill('#email', process.env.PLAYWRIGHT_FAMILY_EMAIL);
  await page.fill('#password', process.env.PLAYWRIGHT_FAMILY_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/portal\/familia/, { timeout: 15000 });
});

test('family puede ver la lista de conversaciones sin error', async ({ page }) => {
  await page.goto('/portal/familia/conversaciones');
  // No redirigió a login (está autenticado)
  await expect(page).not.toHaveURL(/\/portal\/login/);
  // No hay error de carga visible
  const errorAlert = page.locator('[role="alert"]');
  const hasError = await errorAlert.isVisible().catch(() => false);
  if (hasError) {
    const errorText = await errorAlert.textContent();
    throw new Error(`Página muestra error: ${errorText}`);
  }
});
```

- [ ] **Step 2: Crear `e2e/events.spec.js`**

```js
import { test, expect } from '@playwright/test';

test('family puede acceder al dashboard con calendario de eventos', async ({ page }) => {
  await page.goto('/portal/login');
  await page.fill('#email', process.env.PLAYWRIGHT_FAMILY_EMAIL);
  await page.fill('#password', process.env.PLAYWRIGHT_FAMILY_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/portal\/familia/, { timeout: 15000 });
  // El dashboard cargó sin redirigir a login
  await expect(page).not.toHaveURL(/\/portal\/login/);
});

test('admin puede acceder a EventsManager sin ser redirigido', async ({ page }) => {
  await page.goto('/portal/login');
  await page.fill('#email', process.env.PLAYWRIGHT_ADMIN_EMAIL);
  await page.fill('#password', process.env.PLAYWRIGHT_ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/portal\/admin/, { timeout: 15000 });
  await page.goto('/portal/admin/eventos');
  // No redirigió a login ni a otra sección
  await expect(page).not.toHaveURL(/\/portal\/login/);
  await expect(page).toHaveURL(/\/portal\/admin\/eventos/, { timeout: 8000 });
});
```

- [ ] **Step 3: Correr todos los tests E2E**

```bash
npm run test:e2e
```

Resultado esperado: 7 tests passed (4 login + 1 conversations + 2 events).

- [ ] **Step 4: Commit final**

```bash
git add e2e/conversations.spec.js e2e/events.spec.js
git commit -m "test: agregar smoke tests E2E para conversaciones y eventos"
```

---

## Verificación final

- [ ] **Correr suite completa de unit tests**

```bash
npm run test
```

Resultado esperado: ~70 tests passed, 0 failed.

- [ ] **Correr tests de functions**

```bash
npm run test:functions
```

Resultado esperado: ~25 tests passed, 0 failed.

- [ ] **Correr E2E**

```bash
npm run test:e2e
```

Resultado esperado: 7 tests passed.
