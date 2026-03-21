# Turnos segmentados por Taller

**Objetivo:** Cada horario futuro genera dos slots en `appointments` — uno por `taller1` y otro por `taller2` — con una sola acción de creación para admin y visibilidad filtrada por el taller de los hijos de cada familia.

---

## Contrato funcional

- Todo turno nuevo lleva `ambiente: 'taller1' | 'taller2'`
- Cada horario genera **exactamente 2 documentos** con `slotGroupKey` compartido
- Familias ven solo slots cuyo `ambiente` coincide con el de sus hijos
- Familias con hijos en ambos talleres ven los dos slots del mismo horario
- Turnos **legacy pasados** se conservan para historial, notas y asistencia
- Turnos **legacy futuros** (sin `ambiente`) dejan de mostrarse a familias desde la fecha de corte

---

## Flujo de implementación

### 1 — Modelo de datos
Confirmar shape del nuevo slot:

```js
{
  ambiente: 'taller1' | 'taller2',
  slotGroupKey: 'YYYY-MM-DD_HH:mm',   // clave compartida por el par
  fechaHora: Timestamp,
  duracionMinutos: 30,
  estado: 'disponible',
  // ...resto del shape actual
}
```

Regla: dos turnos con la misma `fechaHora` son válidos si su `ambiente` es distinto.

### 2 — Generación doble en `AppointmentsManager`
Modificar el flujo de creación para que cada horario produzca internamente dos payloads, uno por ambiente. **La UI de admin no cambia** — sigue siendo una sola acción de creación.

### 3 — Persistencia en `appointments.service.js`
Actualizar `createTimeSlots` para escribir 2 documentos por slot base con `ambiente` y `slotGroupKey`. Extender también `createManualSlot` cuando exista.

### 4 — Corte del flujo legacy
Ajustar la lectura de turnos disponibles para familias:

| Tipo de slot | Familias | Admin |
|---|---|---|
| Nuevo (con `ambiente`) | visible | visible |
| Legacy futuro (sin `ambiente`) | **oculto** desde fecha de corte | visible para control |
| Legacy pasado (sin `ambiente`) | visible para historial | visible |

Definir la fecha de corte como constante centralizada, no hardcodeada por fecha literal.

### 5 — Filtrado por ambiente familiar
En `BookAppointment`, obtener los ambientes únicos de los hijos de la familia y filtrar `getAvailableSlots` para mostrar solo slots cuyo `ambiente` pertenezca a ese conjunto.

### 6 — UX de reserva en `AppointmentForm`
- Mostrar badge de taller del slot (`Taller 1` / `Taller 2`)
- Filtrar selector de alumnos por `hijo.ambiente === slot.ambiente`
- Preseleccionar automáticamente si queda un único hijo elegible

### 7 — Validación defensiva en servicio
Reforzar que `slot.ambiente === child.ambiente` tanto en reserva de familia como en asignación manual desde admin. Debe aplicar **en servicio**, no solo en UI.

### 8 — Conflictos y buffer por ambiente
Actualizar validación de solapamientos para operar **dentro del mismo ambiente**:

```
16:00 taller1  +  16:00 taller2  → compatible ✓
16:00 taller1  +  16:00 taller1  → conflicto ✗
```

Buffer de 10 min aplica solo entre slots del mismo ambiente.

### 9 — Visualización admin
Mostrar los dos documentos por horario como **filas separadas** con badge `Taller 1` / `Taller 2`. Sin agrupación compleja en esta primera versión.

---

## Archivos relevantes

| Archivo | Rol |
|---|---|
| `AppointmentsManager.jsx` | Generación de slots y listado admin |
| `appointments.service.js` | Escritura, disponibilidad y validaciones |
| `BookAppointment.jsx` | Carga y filtrado de slots para familia |
| `AppointmentForm.jsx` | Filtrado de alumnos y badge de taller |
| `ChildForm.jsx` | Referencia del campo `ambiente` en hijos |
| `constants.js` | `AMBIENTES.TALLER_1` / `AMBIENTES.TALLER_2` |
| `firestore.rules` | Verificar consistencia de ambiente sin cambiar permisos |
| `onAppointmentAssigned.js` | Trigger email al reservar |
| `appointmentSameDayReminder.js` | Recordatorio mismo día |

---

## Checklist de verificación

- [ ] Crear horario desde admin → se escriben exactamente 2 documentos con `ambiente` distinto y mismo `slotGroupKey`
- [ ] Familia con hijos solo en `taller1` → no ve slots `taller2`
- [ ] Familia con hijos solo en `taller2` → no ve slots `taller1`
- [ ] Familia con hijos en ambos → ve los dos slots del mismo horario
- [ ] Al elegir slot `taller1` → formulario muestra solo hijos `taller1` (y viceversa)
- [ ] Reservar `16:00 taller1` no modifica ni ocupa `16:00 taller2`
- [ ] Admin no puede asignar hijo de ambiente incorrecto a slot del otro taller
- [ ] Validación de conflictos y buffer operan dentro del mismo ambiente
- [ ] Turnos legacy pasados visibles para historial, notas y asistencia
- [ ] Turnos legacy futuros ocultos para familias desde la fecha de corte
- [ ] Cancelaciones, asistencia, notas, emails y recordatorios funcionan sobre slots nuevos

---

## Decisiones clave

**Incluido:** una sola colección `appointments`, dos documentos por horario, `slotGroupKey` compartido, filtrado por ambiente en UI y servicio, conflictos por ambiente, legacy pasado conservado, UX de admin sin cambio de flujo, visualización con filas separadas y badge.

**Excluido:** migración inmediata de legacy, nueva colección o subcolección, agrupación visual compleja en admin para esta entrega.

**Recomendado post-implementación:**
- Usar siempre `AMBIENTES.TALLER_1` / `AMBIENTES.TALLER_2` de `constants.js`, nunca strings sueltos
- Incluir el badge de ambiente en emails si familias con hijos en ambos talleres reportan confusión
- Si se decide migrar legacy, hacerlo con plan explícito de backfill — nunca mezclando esquemas silenciosamente
