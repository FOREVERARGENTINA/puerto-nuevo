# Visualización de Destinatarios y Estado de Lectura en Comunicaciones

## Problema Actual
Actualmente solo se muestran los destinatarios que **NO** leyeron el comunicado. Se necesita mostrar:
- Quiénes son los destinatarios (especialmente familias)
- Quiénes SI leyeron el comunicado
- Evitar mostrar listas enormes cuando es un ambiente completo

---

## Decisiones de Diseño

### Por qué NO hay múltiples opciones de vista

El plan original ofrecía 3 opciones (resumida, agrupada por nivel, dashboard con filtros) con una "combinación híbrida" de las 3.

**Razon para rechazarlo:** La escuela tiene ~50 familias. Diseñar para escalar a cientos de destinatarios viola el principio de simplicidad de guia.md: *"La complejidad es el enemigo del lanzamiento. El mejor código es el que no escribiste."* Una vista única bien diseñada resuelve el problema real.

---

## Vista Unica: Resumen con expansion opcional

```
Comunicado: "Reunion de padres - Marzo 2024"
Enviado a: 45 familias
Leido: 32 familias (71%)
Pendiente: 13 familias (29%)

[Ver quienes leyeron]  [Ver pendientes]
```

### Al expandir cualquiera de los dos

```
Familias que leyeron (32):
- Familia Gonzalez - 15/03 14:30
- Familia Martinez - 15/03 15:45
- Familia Rodriguez - 16/03 09:20
...

Familias pendientes (13):
- Familia Lopez
- Familia Fernandez
...
```

La lista pendiente no tiene timestamps (no hay nada que mostrar). La lista de leidos muestra solo la fecha de primer lectura.

---

## Funcionalidades incluidas

- Estadistica inmediata (leidos / pendientes / porcentaje)
- Dos secciones expandibles independientes: [Ver quienes leyeron] y [Ver pendientes]
- Estado por defecto: ambas secciones colapsadas (solo estadisticas visibles)

## Funcionalidades descartadas y por que

| Funcionalidad | Razon del descarte |
|---|---|
| Agrupacion por nivel/curso | Escuela de ~50 familias, no aporta valor real |
| Filtro por fecha de lectura | Complejidad sin caso de uso claro |
| Exportar CSV/PDF | No pedido por coordinacion, agregar si surge la necesidad |
| Reenviar a destinatarios especificos | Puede agregarse como mejora futura; no es bloqueante |
| Rastreo de dispositivo (mobile/desktop) | Sin justificacion legal ni funcional. Dato de comportamiento de adultos que requiere consentimiento explicito |
| Tiempo de lectura | Mismo problema que dispositivo; ademas es estimacion poco confiable |
| Recordatorio automatico a las 48hs | Trigger de Cloud Function con costo real (Functions + FCM/Resend por familia pendiente). No analizado, no aprobado |
| Alerta admin si <50% lectura a los 3 dias | Mismo problema: trigger de cron sin analisis de costo ni caso de uso validado por coordinacion |

---

## Permisos: quien puede ver esta vista

Regla: solo pueden ver los read receipts de un comunicado quienes tienen permiso de enviar comunicados, mas coordinacion siempre.

| Rol | Ve estadisticas | Ve lista de quienes leyeron | Ve lista de pendientes |
|---|---|---|---|
| `superadmin` | SI | SI | SI |
| `coordinacion` | SI | SI | SI |
| `docente` | Solo sus comunicados | Solo sus comunicados | Solo sus comunicados |
| `tallerista` | NO (no envia comunicados) | NO | NO |
| `family` | NO | NO | NO |

**Razon:** Los docentes necesitan saber si sus familias leyeron, pero no tienen por que ver el estado de lectura de comunicados de otros docentes. Coordinacion (Camila) ve todo porque gestiona el seguimiento global.

**Implementacion:** verificar en el componente que `currentUser.uid === comunicado.autorId` o `hasPermission(PERMISSIONS.VIEW_ALL_COMMUNICATIONS)`. No requiere regla nueva en Firestore si la coleccion `/communications` ya restringe acceso por autor.

---

## Estructura de Datos

El proyecto ya tiene `/readReceipts` como coleccion separada en Firestore (definida en agents.md). Se usa esa estructura; no se embeben los detalles dentro del documento del comunicado.

**Por que no embeber:** Si `detalleLeidos[]` vive dentro del documento comunicado, cada nueva lectura requiere reescribir ese documento completo. Con `/readReceipts` cada lectura es 1 write aislado, mas barato y sin condiciones de carrera.

```javascript
// Coleccion existente: /readReceipts
{
  comunicadoId: "COM-2024-001",
  familiaId: "FAM-001",
  nombreFamilia: "Gonzalez",  // snapshot al momento de lectura (ver nota abajo)
  leidoPor: "uid-del-usuario", // uid, no nombre ni email
  fechaLectura: "2024-03-15T14:30:00Z"
  // NO: dispositivo, tiempoLectura
}
```

**Nota sobre `nombreFamilia` denormalizado:** Este campo es un snapshot del nombre al momento de la lectura. Si la familia cambia su nombre en el sistema, los recibos viejos mostraran el nombre anterior. Para una escuela de ~50 familias esto es aceptable: los cambios de nombre son raros y el historial viejo tiene menos importancia que la simplicidad de no hacer un join por cada receipt. Decision consciente, no accidental. Si en el futuro se necesita consistencia, se puede omitir el campo y hacer lookup por `familiaId` al momento de mostrar.

Para las estadisticas (leidos, pendientes, porcentaje), el componente calcula en cliente a partir de:
1. Lista de destinatarios del comunicado
2. Query a `/readReceipts` filtrada por `comunicadoId`

Esto evita mantener contadores sincronizados en el documento del comunicado.

---

## Flujo de usuario

```
Vista del comunicado
    -> Estadistica: "32 de 45 familias leyeron (71%)"
    -> [Ver quienes leyeron] / [Ver pendientes]
        -> Lista expandida con nombres y fechas
```

---

## Lo que queda fuera del alcance de este plan

- Recordatorios automaticos: requiere analisis de costo y aprobacion antes de implementar
- Notificaciones push a pendientes: idem
- Exportacion: agregar solo si coordinacion lo solicita explicitamente
