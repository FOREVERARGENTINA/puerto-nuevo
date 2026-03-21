## Checklist técnico: Turnos por Taller

Objetivo: implementar el esquema de turnos dobles por ambiente (`taller1` y `taller2`) manteniendo una sola acción de creación para admin, filtrando visibilidad para familias según sus hijos y cortando el flujo de slots legacy futuros sin `ambiente`.

**Checklist por archivo**

### 1. `src/config/constants.js`
- Confirmar uso de `AMBIENTES.TALLER_1` y `AMBIENTES.TALLER_2` en toda la feature.
- Si hace falta, agregar helpers o labels derivados para mostrar `Taller 1` y `Taller 2` sin duplicar strings en UI.
- Evitar strings hardcodeados de ambiente fuera de este punto central.

### 2. `src/pages/admin/AppointmentsManager.jsx`
- Ubicar la generación actual de slots base.
- Cambiar la expansión de cada horario para que produzca dos payloads internos:
  - uno con `ambiente: AMBIENTES.TALLER_1`
  - uno con `ambiente: AMBIENTES.TALLER_2`
- Incluir `slotGroupKey` compartido entre ambos documentos del mismo horario.
- Mantener intacta la UX de creación: admin crea un solo horario.
- Ajustar mensajes de confirmación si hace falta:
  - si admin crea 3 horarios, explicar que se crearán 6 turnos efectivos
- En el listado/calendario admin, mostrar badge visible del ambiente en cada turno nuevo.
- No esconder en admin los slots legacy futuros; solo diferenciarlos si hace falta para control manual.
- Mantener compatibilidad con historial, acciones, notas, cancelaciones y asistencia.

### 3. `src/services/appointments.service.js`
- Actualizar `createTimeSlots` para escribir dos documentos por slot base.
- Incluir en cada documento nuevo:
  - `ambiente`
  - `slotGroupKey`
  - resto del shape actual sin cambios
- Si existe `createManualSlot` o método equivalente, alinearlo al mismo esquema doble si esa feature se implementa luego.
- Crear helper reutilizable para expandir un slot base en dos slots por ambiente.
- Crear helper de lectura para distinguir slot nuevo vs legacy:
  - nuevo: tiene `ambiente`
  - legacy: no tiene `ambiente`
- En consultas de disponibilidad para familia, excluir legacy futuros sin `ambiente`.
- Mantener legacy pasados accesibles en histórico y operaciones administrativas.
- Reforzar validación de compatibilidad entre slot e hijo:
  - slot `taller1` solo acepta hijo `taller1`
  - slot `taller2` solo acepta hijo `taller2`
- Aplicar esta validación tanto en reserva familiar como en asignación manual admin.
- Recalibrar la validación de conflictos para que opere por ambiente y no globalmente.
- Regla de conflicto:
  - `16:00 taller1` y `16:00 taller2` son válidos
  - `16:00 taller1` y `16:00 taller1` no son válidos
  - buffer de 10 minutos solo dentro del mismo ambiente

### 4. `src/pages/family/BookAppointment.jsx`
- Obtener los hijos de la familia como hoy.
- Construir conjunto único de ambientes a partir de `child.ambiente`.
- Filtrar slots disponibles por:
  - `estado === 'disponible'`
  - `ambiente` incluido en los ambientes de la familia
  - exclusión de legacy futuros sin `ambiente`
  - resto de restricciones actuales que sigan aplicando
- Si la familia tiene hijos en ambos talleres, permitir que vea ambos slots del mismo horario.
- Mostrar claramente el ambiente del slot para evitar confusión cuando haya dos horarios iguales.
- Confirmar que reservar un slot de un ambiente no afecta al slot espejo del otro ambiente.

### 5. `src/components/appointments/AppointmentForm.jsx`
- Recibir y mostrar el ambiente del slot actual.
- Agregar badge o texto claro de `Taller 1` / `Taller 2` en el resumen del turno.
- Filtrar el selector de alumnos para que solo aparezcan hijos del ambiente del slot.
- Si solo queda un hijo elegible, preseleccionarlo.
- Si por alguna inconsistencia no hay hijos compatibles, bloquear confirmación y mostrar mensaje claro.
- Mantener intacto el resto del flujo de modalidad y nota.

### 6. `src/components/children/ChildForm.jsx`
- Verificar que `ambiente` siga siendo obligatorio o al menos consistente para todos los hijos que puedan reservar turnos.
- Confirmar que los valores válidos sigan siendo `taller1` y `taller2`.
- No cambiar esta UI salvo que se detecte un caso donde haya hijos sin ambiente y eso rompa el filtrado.

### 7. `firestore.rules`
- Revisar si las reglas actuales alcanzan para el nuevo esquema sin tocar permisos.
- Mantener `canManageAppointments()` sin cambios.
- Evaluar si conviene reforzar integridad básica en writes futuros:
  - `ambiente` opcional para legacy
  - `ambiente` obligatorio para turnos nuevos creados por el flujo actualizado
- No cambiar roles ni matriz de permisos.

### 8. `functions/src/triggers/onAppointmentAssigned.js`
- Verificar que el email de asignación siga funcionando con documentos que ahora incluyen `ambiente`.
- Evaluar si conviene incluir el label del taller en el contenido del email para familias con hijos en ambos talleres.
- Confirmar que no haya dependencias implícitas a slots generales sin ambiente.

### 9. `functions/src/scheduled/appointmentSameDayReminder.js`
- Verificar que el recordatorio siga funcionando sobre slots nuevos con `ambiente`.
- Confirmar que no se requiera lógica especial: debería bastar con seguir leyendo `estado === 'reservado'`.
- Evaluar si agregar el label de ambiente mejora la claridad del recordatorio.

### 10. Datos legacy y fecha de corte
- Definir una fecha de corte centralizada para el nuevo flujo.
- Regla operativa:
  - legacy pasado: sigue visible para historial, notas, asistencia y auditoría
  - legacy futuro: no se muestra a familias desde la fecha de corte
- Evitar migración automática en esta fase.
- Si más adelante se decide migrar o cancelar legacy futuros, hacerlo con plan separado y aprobación explícita.

**Checklist funcional**
- Crear 1 horario futuro desde admin genera 2 documentos, uno por ambiente.
- Ambos documentos comparten `fechaHora`, `duracionMinutos` y `slotGroupKey`.
- Cada documento tiene `ambiente` correcto.
- Familia con hijos solo en `taller1` ve solo slots `taller1`.
- Familia con hijos solo en `taller2` ve solo slots `taller2`.
- Familia con hijos en ambos ve ambos slots del mismo horario.
- Al reservar, el selector de hijos muestra solo compatibles con el ambiente del slot.
- Reservar `16:00 taller1` no afecta `16:00 taller2`.
- Admin no puede asignar un hijo del ambiente incorrecto.
- Los conflictos y el buffer solo bloquean dentro del mismo ambiente.
- Los legacy pasados siguen disponibles para historial y notas.
- Los legacy futuros dejan de entrar al flujo familiar.

**Orden recomendado de implementación**
1. Constantes y helpers de ambiente.
2. Expansión doble en creación de slots.
3. Persistencia con `ambiente` y `slotGroupKey`.
4. Corte de legacy futuro en lectura familiar.
5. Filtrado de disponibilidad por ambiente familiar.
6. Filtrado de hijos y UX en formulario de reserva.
7. Validaciones defensivas en servicio y asignación admin.
8. Conflictos y buffer por ambiente.
9. Badges y ajustes visuales admin/familia.
10. Verificación integral con legacy, emails y recordatorios.

**Decisiones ya cerradas**
- Una sola colección `appointments`.
- Dos documentos por horario futuro.
- `ambiente` obligatorio en turnos nuevos.
- `slotGroupKey` para vincular cupos gemelos.
- Slots legacy futuros fuera del flujo familiar.
- Slots legacy pasados conservados para historial.
- Validación slot-hijo en UI y servicio.
- Conflictos y buffer por ambiente, no globales.