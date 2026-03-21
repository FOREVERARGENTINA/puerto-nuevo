# Sobreturno Manual — Reuniones

**Objetivo:** Permitir al admin crear un único slot de reunión en fecha y hora puntuales, con el mismo ciclo de vida que los turnos normales.

---

## Contrato funcional

- Crea **1 slot** en `/appointments` con estado inicial `disponible`
- Visible en calendario/listado de admin y reservable por familias
- **No** incluye recurrencia, ni creación directamente reservada
- **Bloqueado** si la fecha/hora es pasada
- Duración editable, valor defecto `30 min`

---

## Flujo de implementación

### 1 — UI en `AppointmentsManager`
Agregar botón **"Crear sobreturno"** junto a "Crear turnos" (con equivalente mobile). Formulario compacto con:

| Campo | Detalle |
|---|---|
| `fecha` | date picker |
| `hora` | time picker |
| `duracionMinutos` | numérico, default `30` |
| `notaInterna` | texto opcional |

### 2 — Helper de construcción de fecha
Construir el timestamp con componentes locales (`year, month, day, hour, minute`) — **nunca** `new Date('YYYY-MM-DD')` para evitar corrimiento de zona horaria en `America/Argentina/Buenos_Aires`.

### 3 — `createManualSlot` en `appointments.service.js`
Mismo shape que `createTimeSlots`, más metadata:
```js
origenSlot: 'manual',
creadoPorUid: uid,
createdAt: serverTimestamp()
```

### 4 — Validación de conflictos (crítica)
Antes de persistir, consultar turnos del mismo día y verificar:

```
nuevoFin = nuevoInicio + duracionMinutos
existenteFin = existenteInicio + (existente.duracionMinutos || 30)

conflicto si separación entre intervalos < 10 min
```

Aplica contra estados: `disponible`, `reservado`, `bloqueado`, `asistio`
Ignora: `cancelado`

### 5 — Confirmación y feedback
- `ConfirmDialog` con resumen del slot antes de crear
- `AlertDialog` con error específico si hay conflicto
- Tras éxito: cerrar formulario + recargar mes actual

### 6 — Badge de trazabilidad *(opcional)*
Insignia discreta "Sobreturno" en listado admin cuando `origenSlot === 'manual'`. No afecta vista de familias.

---

## Archivos relevantes

| Archivo | Rol |
|---|---|
| `AppointmentsManager.jsx` | UI y lógica de creación |
| `appointments.service.js` | CRUD — agregar `createManualSlot` |
| `firestore.rules` | Verificar que `canManageAppointments()` cubre el caso |
| `onAppointmentAssigned.js` | Trigger email al reservar |
| `appointmentSameDayReminder.js` | Recordatorio mismo día |

---

## Checklist de verificación

- [ ] Slot futuro libre aparece en admin y en vista familia
- [ ] Solapamiento con slot activo → rechazado con mensaje claro
- [ ] Solapamiento con slot `cancelado` → permitido
- [ ] Reserva desde familia / asignación admin → cambia a `reservado` correctamente
- [ ] Triggers de email y recordatorio same-day funcionan sin cambios
- [ ] Fecha/hora pasada → bloqueado antes de persistir
- [ ] Formulario abre con duración `30` precargada
- [ ] Fecha no se corre por parseo UTC en cambio de día

---

## Decisiones clave

**Incluido:** validación de conflictos con buffer fijo `10 min`, bloqueo en pasado, duración editable con default `30`, metadata `origenSlot: 'manual'`, permisos sin cambios.

**Excluido:** recurrencia, nuevas colecciones, creación directamente reservada, cambios de permisos.

**Recomendado post-implementación:** aplicar la misma validación de solapamiento al generador masivo, que hoy no lo tiene.
