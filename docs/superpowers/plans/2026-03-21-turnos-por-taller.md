# Turnos Segmentados por Taller — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cada horario generado crea dos slots en `appointments` (uno por taller), con visibilidad filtrada por el ambiente de los hijos de cada familia y validaciones defensivas en UI, servicio y reglas de Firestore.

**Architecture:** Se extiende `createTimeSlots` para duplicar cada slot con `ambiente` y `slotGroupKey`. La visibilidad familiar se filtra en `BookAppointment` pasando los hijos como argumento para evitar stale closure. Las validaciones de ambiente se refuerzan en capas: `AppointmentForm` (UI), `bookSlot` (servicio, leyendo el hijo directamente de Firestore dentro de la transaccion), y `firestore.rules` (enforcement real, no convencion de frontend).

**Tech Stack:** React, Firebase/Firestore (transacciones, `get()` en rules), `firebase/firestore` Timestamps, `constants.js` para constantes centralizadas.

**Spec:** `docs/plans/plan-turnosPorTaller.prompt.md`

---

## Mapa de archivos

| Archivo | Cambio |
|---|---|
| `src/config/constants.js` | Agregar `LEGACY_SLOTS_CUTOFF_DATE` |
| `src/services/appointments.service.js` | `createTimeSlots` genera 2 docs/slot; conflict check por ambiente; `bookSlot` con transaccion que lee hijo de DB |
| `src/pages/admin/AppointmentsManager.jsx` | Fix timezone en `generateTimeSlots`; selector de ambiente en sobreturno manual; mensaje de confirmacion; badge de taller |
| `src/pages/family/BookAppointment.jsx` | Filtrar slots por ambientes de hijos; refactor de carga de datos para evitar stale closure |
| `src/components/appointments/AppointmentForm.jsx` | `useMemo` para hijos elegibles por ambiente; badge de taller |
| `firestore.rules` | Validar que al reservar, `slot.ambiente === child.ambiente`; validar valores validos de `ambiente` en create |

---

## Task 1: Constante de corte de legacy en `constants.js`

**Files:**
- Modify: `src/config/constants.js`

> **BLOQUEANTE antes de deploy:** Si se despliega sin actualizar esta fecha, slots legacy futuros seguiran visibles para familias. Agregar al checklist de deploy que se revise este valor.

- [ ] **Step 1: Localizar el bloque de `AMBIENTES`** (~linea 139)

- [ ] **Step 2: Agregar la constante de corte inmediatamente despues de `AMBIENTES`**

```js
// Fecha de corte para slots legacy sin ambiente.
// Los slots sin 'ambiente' con fechaHora >= esta fecha quedan ocultos para familias.
// ACTUALIZAR al dia real de deploy antes de produccion.
// Nota: el mes en `new Date` usa indice 0-based (0 = enero).
export const LEGACY_SLOTS_CUTOFF_DATE = new Date(2026, 3, 1, 0, 0, 0, 0); // 1 de abril 2026
```

- [ ] **Step 3: Verificar en consola del browser**

```js
import { LEGACY_SLOTS_CUTOFF_DATE } from '../config/constants';
console.log(LEGACY_SLOTS_CUTOFF_DATE); // Wed Apr 01 2026 00:00:00
```

- [ ] **Step 4: Commit**

```bash
git add src/config/constants.js
git commit -m "feat: add LEGACY_SLOTS_CUTOFF_DATE constant for taller segmentation"
```

---

## Task 2: Fix bug de timezone en `generateTimeSlots`

**Files:**
- Modify: `src/pages/admin/AppointmentsManager.jsx:537-538`

`new Date("2026-03-21")` parsea como UTC midnight. En Argentina (UTC-3) eso es el dia anterior a las 21:00. El fix construye la fecha con componentes locales.

- [ ] **Step 1: Localizar `generateTimeSlots`** (~linea 519)

- [ ] **Step 2: Reemplazar las dos lineas de construccion de fechas**

Buscar:
```js
    const startDate = new Date(fechaDesde);
    const endDate = new Date(fechaHasta);
```

Reemplazar con:
```js
    const [startY, startM, startD] = String(fechaDesde).split('-').map(Number);
    const [endY, endM, endD] = String(fechaHasta).split('-').map(Number);
    const startDate = new Date(startY, startM - 1, startD);
    const endDate = new Date(endY, endM - 1, endD);
```

- [ ] **Step 3: Verificar manualmente**
Crear turnos para el lunes 6 de abril 2026. Confirmar que el dia generado es lunes 6/04 y no domingo 5/04.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AppointmentsManager.jsx
git commit -m "fix: build slot dates from local components to avoid UTC timezone shift"
```

---

## Task 3: `buildSlotGroupKey` + `createTimeSlots` genera dos docs por slot

**Files:**
- Modify: `src/services/appointments.service.js`

Cada horario produce exactamente 2 documentos con `ambiente` distinto y el mismo `slotGroupKey`. Se incluye `familiasUids: []` para mantener consistencia con el shape usado en `getAppointmentsByFamily` y `unblockAppointment`.

- [ ] **Step 1: Agregar el import de `AMBIENTES`**

Al principio del archivo:
```js
import { AMBIENTES } from '../config/constants';
```

- [ ] **Step 2: Agregar `buildSlotGroupKey` despues de `formatConflictTime`** (~linea 48)

```js
const buildSlotGroupKey = (date) => {
  const d = date?.toDate ? date.toDate() : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hour}:${minute}`;
};
```

- [ ] **Step 3: Reemplazar `createTimeSlots` completo** (~linea 367)

```js
async createTimeSlots(slotsData) {
  try {
    const writes = slotsData.flatMap(slot => {
      const mode = normalizeAppointmentMode(slot?.modalidad);
      const slotGroupKey = buildSlotGroupKey(slot.fechaHora);
      const base = {
        ...slot,
        ...(mode ? { modalidad: mode } : {}),
        slotGroupKey,
        estado: 'disponible',
        familiaUid: null,
        familiasUids: [],
        hijoId: null,
        createdAt: serverTimestamp()
      };
      return [
        addDoc(appointmentsCollection, { ...base, ambiente: AMBIENTES.TALLER_1 }),
        addDoc(appointmentsCollection, { ...base, ambiente: AMBIENTES.TALLER_2 })
      ];
    });
    await Promise.all(writes);
    emitAppointmentsUpdated();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
},
```

- [ ] **Step 4: Actualizar el mensaje de confirmacion en `AppointmentsManager`** (~linea 658)

Buscar:
```js
message: `Se crearán ${slots.length} turnos disponibles. ¿Deseas continuar?`,
```

Reemplazar con:
```js
message: `Se crearán ${slots.length * 2} turnos disponibles (${slots.length} por taller). ¿Deseas continuar?`,
```

- [ ] **Step 5: Verificar manualmente**
Crear 2 horarios desde admin/reuniones. Firestore debe mostrar 4 documentos: 2 con `ambiente: 'taller1'` y 2 con `ambiente: 'taller2'`, todos con `slotGroupKey` igual para cada par y `familiasUids: []`.

- [ ] **Step 6: Commit**

```bash
git add src/services/appointments.service.js src/pages/admin/AppointmentsManager.jsx
git commit -m "feat: createTimeSlots generates two docs per slot, one per taller"
```

---

## Task 4: Selector de ambiente en el formulario de sobreturno manual

**Files:**
- Modify: `src/pages/admin/AppointmentsManager.jsx`

El sobreturno manual debe declarar a que taller pertenece. Sin esto, `createManualSlot` no recibe `ambiente` y la validacion de conflictos por ambiente nunca se activa. Esta task debe ejecutarse antes de Task 5.

- [ ] **Step 1: Agregar `AMBIENTES` al import de `constants.js` en `AppointmentsManager.jsx`**

Buscar:
```js
import { ROLES } from '../../config/constants';
```

Reemplazar con:
```js
import { ROLES, AMBIENTES } from '../../config/constants';
```

- [ ] **Step 2: Agregar `ambiente` al estado inicial de `manualSlotForm`**

Buscar `getDefaultManualSlotDraft` (~linea 77). El `return` al final del bloque retorna:
```js
  return {
    fecha: formatDateInputValueLocal(candidate),
    hora: formatTimeInputValueLocal(candidate),
    duracionMinutos: 30
  };
```

Reemplazar con:
```js
  return {
    fecha: formatDateInputValueLocal(candidate),
    hora: formatTimeInputValueLocal(candidate),
    duracionMinutos: 30,
    ambiente: ''
  };
```

- [ ] **Step 3: Agregar el campo `ambiente` en `buildManualSlotPayload`** (~linea 569)

La funcion actualmente retorna un `payload` sin `ambiente`. Buscar el `return` final de esta funcion:

```js
    return {
      startDate,
      payload: {
        fechaHora: startDate,
        duracionMinutos: duration,
        creadoPorUid: user?.uid || ''
      }
    };
```

Reemplazar con:
```js
    const ambiente = manualSlotForm.ambiente;
    if (ambiente !== AMBIENTES.TALLER_1 && ambiente !== AMBIENTES.TALLER_2) {
      return { error: 'Seleccioná el taller para el sobreturno.' };
    }

    return {
      startDate,
      payload: {
        fechaHora: startDate,
        duracionMinutos: duration,
        ambiente,
        creadoPorUid: user?.uid || ''
      }
    };
```

- [ ] **Step 4: Agregar el selector de ambiente en el formulario del sobreturno manual en la UI**

Localizar el JSX del formulario `showCreateManualSlot` (~linea 1428). Dentro del formulario, agregar el selector de ambiente antes del campo de fecha. Buscar la primera etiqueta del formulario de sobreturno, que deberia ser algo como:

```jsx
              <div className="form-group">
                <label htmlFor="manual-fecha" className="required">Fecha</label>
```

Agregar antes de ese bloque:

```jsx
              <div className="form-group">
                <label className="required">Taller</label>
                <div className="radio-group">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="ambiente"
                      value={AMBIENTES.TALLER_1}
                      checked={manualSlotForm.ambiente === AMBIENTES.TALLER_1}
                      onChange={handleManualSlotFormChange}
                      disabled={manualSlotSubmitting}
                    />
                    Taller 1
                  </label>
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="ambiente"
                      value={AMBIENTES.TALLER_2}
                      checked={manualSlotForm.ambiente === AMBIENTES.TALLER_2}
                      onChange={handleManualSlotFormChange}
                      disabled={manualSlotSubmitting}
                    />
                    Taller 2
                  </label>
                </div>
              </div>
```

- [ ] **Step 5: Verificar manualmente**
- El formulario de sobreturno muestra los dos radio buttons.
- Intentar crear sin seleccionar taller → muestra "Selecciona el taller para el sobreturno."
- Seleccionar Taller 1 y crear → el documento en Firestore tiene `ambiente: 'taller1'`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/AppointmentsManager.jsx
git commit -m "feat: add ambiente selector to manual slot form"
```

---

## Task 5: Conflictos y buffer de `createManualSlot` filtrados por ambiente

**Files:**
- Modify: `src/services/appointments.service.js:414-432`

Ahora que `createManualSlot` recibe `data.ambiente` (creado en Task 4), la validacion de conflictos puede operar solo dentro del mismo ambiente. `16:00 taller1` + `16:05 taller2` son compatibles; `16:00 taller1` + `16:05 taller1` no.

- [ ] **Step 1: Localizar el `.find()` de conflictos en `createManualSlot`** (~linea 414)

- [ ] **Step 2: Agregar filtro de ambiente en el `.find()` antes de la verificacion de estado**

Buscar:
```js
      const conflictingAppointment = snapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...fixMojibakeDeep(docSnapshot.data()) }))
        .find((appointment) => {
          if (!ACTIVE_CONFLICT_STATUSES.has(appointment.estado)) return false;
```

Reemplazar con:
```js
      const newAmbiente = data?.ambiente || null;
      const conflictingAppointment = snapshot.docs
        .map(docSnapshot => ({ id: docSnapshot.id, ...fixMojibakeDeep(docSnapshot.data()) }))
        .find((appointment) => {
          if (!ACTIVE_CONFLICT_STATUSES.has(appointment.estado)) return false;
          // El buffer y solapamiento solo aplican dentro del mismo ambiente.
          // Si ambos tienen ambiente definido y son distintos: compatible.
          // Slots legacy sin ambiente siempre se consideran conflicto (conservador).
          if (newAmbiente && appointment.ambiente && appointment.ambiente !== newAmbiente) return false;
```

- [ ] **Step 3: Verificar manualmente**
- Slot `taller1` a las 16:00 existente + sobreturno `taller2` a las 16:05 → debe permitirse.
- Slot `taller1` a las 16:00 existente + sobreturno `taller1` a las 16:05 → debe rechazarse (dentro del buffer de 10 min).
- Slot sin ambiente a las 16:00 + sobreturno con cualquier ambiente a las 16:05 → debe rechazarse (legacy conservador).

- [ ] **Step 4: Commit**

```bash
git add src/services/appointments.service.js
git commit -m "feat: manual slot conflict and buffer check respects ambiente boundary"
```

---

## Task 6: Filtrar slots disponibles por ambientes de la familia en `BookAppointment`

**Files:**
- Modify: `src/pages/family/BookAppointment.jsx:65-112`

**Problema de stale closure a evitar:** Si se llama `setUserChildren(...)` y luego `loadAvailableAppointments()` en la misma funcion, React no actualiza el estado entre llamadas — `userChildren` seguira vacio en el closure. La solucion es que `loadAvailableAppointments` reciba los hijos como argumento.

- [ ] **Step 1: Importar `AMBIENTES` y `LEGACY_SLOTS_CUTOFF_DATE`**

```js
import { AMBIENTES, LEGACY_SLOTS_CUTOFF_DATE } from '../../config/constants';
```

- [ ] **Step 2: Refactorizar `loadAvailableAppointments` para recibir `children` como argumento**

Reemplazar la funcion completa (~linea 65):

```js
const loadAvailableAppointments = async (children = []) => {
  const { start, end } = getMonthRange(currentMonth);
  const result = await appointmentsService.getAppointmentsByDateRange(start, end);
  if (result.success) {
    const minLeadTimeMs = 12 * 60 * 60 * 1000;
    const earliestAllowedDate = new Date(Date.now() + minLeadTimeMs);
    setEarliestAllowed(earliestAllowedDate);

    const familyAmbientes = new Set(
      children
        .map(child => child.ambiente)
        .filter(a => a === AMBIENTES.TALLER_1 || a === AMBIENTES.TALLER_2)
    );

    const available = result.appointments.filter(app => {
      if (app.estado !== 'disponible') return false;
      if (app.origenSlot === 'manual') return false;
      if (app.familiaUid) return false;
      if (Array.isArray(app.familiasUids) && app.familiasUids.length > 0) return false;

      const fechaDate = app.fechaHora?.toDate ? app.fechaHora.toDate() : new Date(app.fechaHora);
      if (fechaDate < earliestAllowedDate) return false;

      if (app.ambiente) {
        return familyAmbientes.has(app.ambiente);
      }

      return fechaDate < LEGACY_SLOTS_CUTOFF_DATE;
    });

    setAvailableAppointments(available);
  }
};
```

- [ ] **Step 3: Refactorizar `loadUserData` para devolver los hijos**

```js
const loadUserData = async () => {
  const result = await childrenService.getChildrenByResponsable(user.uid);
  if (result.success) {
    setUserChildren(result.children);
    return result.children;
  }
  return [];
};
```

- [ ] **Step 4: Actualizar `loadData` para pasar los hijos como argumento**

```js
const loadData = async () => {
  setLoading(true);
  const children = await loadUserData();
  await Promise.all([
    loadAvailableAppointments(children),
    loadMyAppointments()
  ]);
  setLoading(false);
};
```

- [ ] **Step 5: Actualizar el `useEffect` que recarga slots al cambiar de mes**

Buscar:
```js
  useEffect(() => {
    if (user) {
      loadAvailableAppointments();
    }
  }, [currentMonth, user]);
```

Reemplazar con:
```js
  useEffect(() => {
    if (user) {
      loadAvailableAppointments(userChildren);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // userChildren se omite intencionalmente: este efecto recarga slots al cambiar de mes.
    // En ese momento userChildren ya tiene el valor correcto del render anterior.
    // El montaje inicial usa loadData() que pasa children como argumento explicito.
  }, [currentMonth, user]);
```

- [ ] **Step 6: Verificar manualmente**
- Familia con hijos solo en `taller1` no ve slots `taller2`.
- Familia con hijos solo en `taller2` no ve slots `taller1`.
- Familia con hijos en ambos ve los dos slots del mismo horario.
- Slots legacy anteriores al corte siguen visibles.
- Slots legacy posteriores al corte ocultos.

- [ ] **Step 7: Commit**

```bash
git add src/pages/family/BookAppointment.jsx
git commit -m "feat: filter available slots by family child ambientes, fix stale closure"
```

---

## Task 7: `AppointmentForm` filtra hijos por ambiente del slot + badge de taller

**Files:**
- Modify: `src/components/appointments/AppointmentForm.jsx`

- [ ] **Step 1: Agregar imports**

Buscar:
```js
import { useState, useEffect } from 'react';
```

Reemplazar con:
```js
import { useState, useEffect, useMemo } from 'react';
```

Agregar:
```js
import { AMBIENTES } from '../../config/constants';
```

- [ ] **Step 2: Agregar `getAmbienteLabel` a nivel de modulo** (despues de `VirtualIcon`)

```js
const getAmbienteLabel = (ambiente) => {
  if (ambiente === AMBIENTES.TALLER_1) return 'Taller 1';
  if (ambiente === AMBIENTES.TALLER_2) return 'Taller 2';
  return null;
};
```

- [ ] **Step 3: Derivar `eligibleChildren` con `useMemo`** (dentro del componente, despues del segundo `useEffect`)

```js
  const eligibleChildren = useMemo(() => {
    if (!appointment?.ambiente) return userChildren || [];
    return (userChildren || []).filter(child => child.ambiente === appointment.ambiente);
  }, [appointment?.ambiente, userChildren]);
```

- [ ] **Step 4: Actualizar el `useEffect` de preseleccion**

Buscar:
```js
  useEffect(() => {
    if (userChildren && userChildren.length === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => ({ ...prev, hijoId: userChildren[0].id }));
    }
  }, [userChildren]);
```

Reemplazar con:
```js
  useEffect(() => {
    if (eligibleChildren.length === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => ({ ...prev, hijoId: eligibleChildren[0].id }));
    }
  }, [eligibleChildren]);
```

- [ ] **Step 5: Agregar badge de taller en el resumen del slot** (despues del chip de duracion, ~linea 118)

```jsx
{getAmbienteLabel(appointment?.ambiente) && (
  <>
    <span className="booking-summary-separator" aria-hidden="true">&#8226;</span>
    <span className="booking-summary-chip">
      <span className="booking-summary-label">Taller</span>
      <span className="booking-summary-value">{getAmbienteLabel(appointment.ambiente)}</span>
    </span>
  </>
)}
```

- [ ] **Step 6: Actualizar el select de alumnos** (~linea 175)

```jsx
                  {eligibleChildren.map(child => (
                    <option key={child.id} value={child.id}>
                      {child.nombreCompleto}
                    </option>
                  ))}
```

- [ ] **Step 7: Verificar manualmente**
- Slot `taller1`: selector muestra solo hijos `taller1`. Si hay un unico hijo elegible, queda preseleccionado.
- Badge "Taller 1" / "Taller 2" visible en el resumen.
- Slot sin `ambiente` (legacy): muestra todos los hijos.

- [ ] **Step 8: Commit**

```bash
git add src/components/appointments/AppointmentForm.jsx
git commit -m "feat: filter children by slot ambiente and show taller badge in booking form"
```

---

## Task 8: `bookSlot` con transaccion Firestore — lee hijo de DB

**Files:**
- Modify: `src/services/appointments.service.js`
- Modify: `src/pages/family/BookAppointment.jsx`

**Por que leer el hijo de DB y no confiar en el cliente:** El cliente puede fabricar cualquier valor de `childAmbiente`. La validacion defensiva real requiere leer el documento del hijo dentro de la misma transaccion que hace la reserva. Esto cierra el vector de manipulacion y hace la regla independiente del frontend.

- [ ] **Step 1: Agregar `runTransaction` al import de `firebase/firestore`**

Buscar:
```js
import {
  collection,
  doc,
  getDoc,
```

Agregar `runTransaction`:
```js
import {
  collection,
  doc,
  getDoc,
  runTransaction,
```

- [ ] **Step 2: Agregar `bookSlot` en `appointmentsService`** (antes del cierre del objeto, como ultimo metodo)

La coleccion de hijos es `children` (confirmado en `children.service.js` linea 17: `collection(db, 'children')`).

```js
  async bookSlot(appointmentId, data) {
    try {
      const slotRef = doc(appointmentsCollection, appointmentId);
      const childRef = doc(collection(db, 'children'), data.payload.hijoId);

      const result = await runTransaction(db, async (transaction) => {
        const [slotDoc, childDoc] = await Promise.all([
          transaction.get(slotRef),
          transaction.get(childRef)
        ]);

        if (!slotDoc.exists()) {
          return { success: false, error: 'El turno no existe.' };
        }

        const slot = slotDoc.data();

        if (slot.estado !== 'disponible') {
          return { success: false, error: 'El turno ya no esta disponible.' };
        }

        // Validacion defensiva: leer ambiente del hijo directamente de Firestore.
        // No se confia en ningun valor enviado por el cliente.
        const slotAmbiente = slot.ambiente || null;
        const childAmbiente = childDoc.exists() ? (childDoc.data().ambiente || null) : null;

        if (slotAmbiente && childAmbiente && slotAmbiente !== childAmbiente) {
          return {
            success: false,
            error: 'El alumno seleccionado no corresponde al taller de este turno.',
            code: 'AMBIENTE_MISMATCH'
          };
        }

        transaction.update(slotRef, {
          ...data.payload,
          updatedAt: serverTimestamp()
        });

        return { success: true };
      });

      if (result.success) {
        emitAppointmentsUpdated();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
```

- [ ] **Step 3: Actualizar `handleBookingSubmit` en `BookAppointment.jsx`**

Buscar el bloque de `handleBookingSubmit` (~linea 147). Reemplazar la llamada a `appointmentsService.updateAppointment` con `appointmentsService.bookSlot`:

```js
  const handleBookingSubmit = async (data) => {
    const selectedChild = userChildren.find(child => child.id === data.hijoId);
    const selectedMode = data.modalidad === 'presencial' || data.modalidad === 'virtual'
      ? data.modalidad
      : null;

    const result = await appointmentsService.bookSlot(data.appointmentId, {
      payload: {
        familiaUid: user.uid,
        familiasUids: [user.uid],
        familiasInfo: [{ uid: user.uid, email: user.email || '', displayName: user.displayName || '' }],
        hijoId: data.hijoId,
        ...(selectedMode ? { modalidad: selectedMode } : {}),
        nota: data.nota,
        estado: 'reservado',
        familiaEmail: user.email || '',
        familiaDisplayName: user.displayName || '',
        hijoNombre: selectedChild?.nombreCompleto || ''
      }
    });
```

> Verificar que el resto del handler (alertas, recarga de datos) siga igual al original.

- [ ] **Step 4: Verificar manualmente**
- Reserva normal con hijo del ambiente correcto: funciona.
- Reserva con hijo de ambiente incorrecto (manipulando el request): rechazada con "El alumno seleccionado no corresponde al taller de este turno."
- Race condition: marcar un slot como `reservado` en Firestore console mientras la transaccion ejecuta → el segundo intento recibe "El turno ya no esta disponible."

- [ ] **Step 5: Commit**

```bash
git add src/services/appointments.service.js src/pages/family/BookAppointment.jsx
git commit -m "feat: add bookSlot with Firestore transaction, reads child ambiente from DB"
```

---

## Task 9: Badge de taller en listado admin

**Files:**
- Modify: `src/pages/admin/AppointmentsManager.jsx`

(Nota: `AMBIENTES` ya fue importado en Task 4.)

- [ ] **Step 1: Agregar helper `getAmbienteLabel` a nivel de modulo** (junto a `getAppointmentModeLabel`, ~linea 44)

```js
const getAmbienteLabel = (ambiente) => {
  if (ambiente === AMBIENTES.TALLER_1) return 'T1';
  if (ambiente === AMBIENTES.TALLER_2) return 'T2';
  return null;
};
```

- [ ] **Step 2: Agregar el badge en la fila del listado admin**

Localizar el bloque de duracion del turno en el listado (~linea 1756). Debe verse asi (el bullet es U+2022):

```jsx
                                  <div className="appointment-duration">
                                    {app.duracionMinutos} min
```

Agregar al final de ese `div`, despues de la linea del sobreturno:

```jsx
                                    {getAmbienteLabel(app.ambiente) ? ` \u2022 ${getAmbienteLabel(app.ambiente)}` : ''}
```

> Usar `\u2022` (bullet U+2022) para mantener consistencia con el resto de la linea y evitar ambiguedad de caracteres en copy/paste.

- [ ] **Step 3: Verificar manualmente**
Slots nuevos muestran "• T1" o "• T2". Slots legacy no muestran nada.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AppointmentsManager.jsx
git commit -m "feat: show taller badge in admin appointments list"
```

---

## Task 10: Endurecer `firestore.rules` para validar ambiente

**Files:**
- Modify: `firestore.rules`

La logica de ambiente hoy es convencion de frontend. Con estas reglas pasa a ser un contrato de backend: Firestore rechaza reservas donde `slot.ambiente != child.ambiente`, independientemente del cliente.

- [ ] **Step 1: Agregar helper `isValidAmbiente` en el bloque de funciones** (despues de `canManageAppointments`, ~linea 86)

```
function isValidAmbiente(ambiente) {
  return ambiente in ['taller1', 'taller2'];
}
```

- [ ] **Step 2: Actualizar el `allow create` de `/appointments`** (~linea 389)

Buscar:
```
      // Crear: Solo SuperAdmin y Coordinación (Emilse, Camila, Rosana)
      allow create: if canManageAppointments();
```

Reemplazar con:
```
      // Crear: Solo SuperAdmin y Coordinacion.
      // Si el slot declara ambiente, debe ser un valor valido.
      allow create: if canManageAppointments() &&
        (!('ambiente' in request.resource.data) ||
         isValidAmbiente(request.resource.data.ambiente));
```

- [ ] **Step 3: Actualizar el `allow update` de `/appointments` para familias**

Buscar el bloque actual de update (~linea 392):
```
      // Actualizar: Admin puede todo, familias solo reservar disponibles o cancelar sus turnos
      allow update: if canManageAppointments() || (
        isFamily() && (
          (resource.data.estado == 'disponible' &&
            resource.data.get('origenSlot', '') != 'manual' &&
            request.resource.data.familiaUid == request.auth.uid &&
            request.resource.data.estado == 'reservado') ||
          ((resource.data.familiaUid == request.auth.uid || request.auth.uid in resource.data.get('familiasUids', [])) && request.resource.data.estado == 'cancelado')
        )
      );
```

Reemplazar con:
```
      // Actualizar: Admin puede todo, familias solo reservar disponibles o cancelar sus turnos.
      // Al reservar: si el slot tiene ambiente, validar que el hijo pertenezca al mismo ambiente.
      allow update: if canManageAppointments() || (
        isFamily() && (
          (resource.data.estado == 'disponible' &&
            resource.data.get('origenSlot', '') != 'manual' &&
            request.resource.data.familiaUid == request.auth.uid &&
            request.resource.data.estado == 'reservado' &&
            (
              !('ambiente' in resource.data) ||
              (request.resource.data.hijoId is string &&
               get(/databases/$(database)/documents/children/$(request.resource.data.hijoId)).data.ambiente == resource.data.ambiente)
            )) ||
          ((resource.data.familiaUid == request.auth.uid ||
            request.auth.uid in resource.data.get('familiasUids', [])) &&
            request.resource.data.estado == 'cancelado')
        )
      );
```

- [ ] **Step 4: Desplegar las reglas**

```bash
firebase deploy --only firestore:rules
```

- [ ] **Step 5: Verificar con Firebase Emulator o Rules Playground**
- Familia intenta reservar slot `taller1` con hijo `taller2` → rechazado por rules.
- Familia reserva slot `taller1` con hijo `taller1` → permitido.
- Familia reserva slot legacy (sin ambiente) → permitido.
- Admin crea slot con `ambiente: 'invalido'` → rechazado.
- Admin crea slot con `ambiente: 'taller1'` → permitido.
- Admin crea slot sin `ambiente` (legacy) → permitido.

- [ ] **Step 6: Commit**

```bash
git add firestore.rules
git commit -m "feat: enforce ambiente consistency in firestore rules for appointment booking"
```

---

## Checklist de verificacion final

### Bloqueante antes de deploy
- [ ] Actualizar `LEGACY_SLOTS_CUTOFF_DATE` en `constants.js` al dia real de deploy
- [ ] `firebase deploy --only firestore:rules` ejecutado y verificado

### Funcional
- [ ] Crear horario → 2 documentos con `ambiente` distinto, mismo `slotGroupKey`, `familiasUids: []`
- [ ] Sobreturno manual requiere seleccionar taller; el documento resultante tiene `ambiente`
- [ ] Familia con hijos solo en `taller1` no ve slots `taller2`
- [ ] Familia con hijos solo en `taller2` no ve slots `taller1`
- [ ] Familia con hijos en ambos ve los dos slots del mismo horario
- [ ] Formulario de reserva: selector de alumnos filtrado por `slot.ambiente`
- [ ] Preseleccion automatica si hay un unico hijo elegible
- [ ] Badge de taller visible en el resumen del formulario de reserva
- [ ] Reserva exitosa con hijo del ambiente correcto (transaccion Firestore + rules)
- [ ] Reserva rechazada con hijo de ambiente incorrecto: servicio y rules lo bloquean independientemente
- [ ] Slots legacy anteriores al corte visibles para familias
- [ ] Slots legacy posteriores al corte ocultos para familias, visibles en admin
- [ ] Sobreturno `taller1` no conflictua con slot `taller2` a la misma hora
- [ ] Sobreturno `taller1` si conflictua con slot `taller1` dentro del buffer de 10 min
- [ ] Badge T1 / T2 visible en listado admin para slots nuevos
- [ ] Emails y recordatorio same-day funcionan sobre slots nuevos (misma coleccion, sin cambios en triggers)
- [ ] Fechas del generador masivo no se corren por timezone (verificar con lunes 6/04/2026)
