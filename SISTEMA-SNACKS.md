# Sistema de Calendario de Snacks

## Descripción General

Sistema completo para gestionar las asignaciones semanales de snacks. Una familia por semana es responsable de llevar los snacks para todos los niños de su taller.

## Validaciones Importantes

### Prevención de Asignaciones Duplicadas
- **No se puede asignar la misma semana dos veces** en el mismo taller
- La validación ocurre antes de crear la asignación
- Si intentas asignar una semana ya ocupada, recibirás el error: "Ya existe una asignación para esta semana en este taller. Por favor selecciona otra fecha."
- Implementado en: `snacks.service.js` línea 25-39

## Características Implementadas

### 1. Vista Admin (`/admin/snacks`)

**Funcionalidades:**
- Selector de taller (Taller 1 / Taller 2)
- **Toggle entre 2 vistas:**
  - **📅 Vista Calendario** (predeterminada)
  - **📋 Vista Tabla**

#### Vista Calendario
- Muestra **próximas 16 semanas** (4 meses aprox)
- Cada semana es una tarjeta con código de colores:
  - **Gris con borde punteado**: Sin asignar (click para asignar)
  - **Amarillo**: Asignada, pendiente confirmación
  - **Verde**: Confirmada por la familia
  - **Rojo**: Solicitud de cambio
- Separadores de meses para fácil navegación
- Click en semana sin asignar pre-completa el formulario
- Botones de acción directamente en cada tarjeta
- **Ventaja**: Visualización global de semanas cubiertas vs sin cubrir

#### Vista Tabla
- Tabla con todas las asignaciones mostrando:
  - Semana completa (formato: "Semana del 5 de enero al 9 de enero de 2026")
  - Familia y email
  - Estado (pendiente, confirmado, cambio_solicitado, completado)
  - Detalles (confirmación o solicitud de cambio con motivo)
  - Estado del recordatorio
- Acciones disponibles:
  - Marcar como completado
  - Eliminar asignación
- **Destacado visual**: Las asignaciones con solicitud de cambio se muestran con fondo rojo claro

#### Formulario de Creación
- Selector de familia responsable
- Selector de lunes de la semana (viernes se calcula automáticamente)
- Validación: NO permite asignar la misma semana dos veces

### 2. Vista Familia (`/familia/snacks`)

**Funcionalidades:**
- Lista de snacks a traer (cargada desde Firestore o lista por defecto)
- Mis semanas asignadas ordenadas por fecha
- Para cada asignación:
  - Muestra semana completa
  - Estado con badge visual
  - Alerta especial si el turno es esta semana
  - **Tres posibles estados:**
    1. **Pendiente**: Muestra dos botones
       - "✓ Confirmar que traeré los snacks" (botón verde)
       - "✗ No puedo, solicitar cambio" (botón rojo outline)
    2. **Confirmado**: Muestra check verde "Ya confirmaste"
    3. **Cambio solicitado**: Muestra alerta amarilla con el motivo y mensaje de que la escuela se contactará

### 3. Servicio de Snacks (`snacks.service.js`)

**Métodos principales:**
- `createSnackAssignment()` - Crear asignación
- `getAssignmentsByAmbiente()` - Obtener asignaciones por taller
- `getAssignmentsByFamily()` - Obtener asignaciones de una familia
- `confirmAssignment()` - Familia confirma que llevará snacks
- `requestChange()` - Familia solicita cambio (nuevo motivo)
- `markAsCompleted()` - Admin marca como completado
- `deleteAssignment()` - Eliminar asignación
- `getSnackList()` - Obtener lista de snacks del ambiente
- `updateSnackList()` - Actualizar lista de snacks

### 4. Cloud Function: Recordatorios Automáticos

**Función:** `sendSnacksReminder`
- **Programación:** Todos los viernes a las 10:00 AM (hora Argentina)
- **Qué hace:**
  1. Calcula el próximo lunes (3 días después)
  2. Busca asignaciones para esa semana que NO estén confirmadas
  3. Crea un comunicado para cada familia pendiente
  4. Marca el recordatorio como enviado
- **Ubicación:** `functions/src/scheduled/snacksReminder.js`
- **Estado:** Desplegada y activa en Firebase

## Estados de las Asignaciones

1. **pendiente**: Asignación creada, familia no ha respondido
2. **confirmado**: Familia confirmó que llevará los snacks
3. **cambio_solicitado**: Familia solicitó cambiar la fecha (incluye motivo)
4. **completado**: Admin marcó que la familia cumplió

## Flujo de Trabajo

### Escenario 1: Familia Confirma
1. Admin crea asignación para la familia en una semana específica
2. Familia ve su asignación en `/familia/snacks`
3. Familia hace click en "Confirmar que traeré los snacks"
4. Estado cambia a "confirmado"
5. Admin ve confirmación en la tabla
6. Viernes anterior: NO se envía recordatorio (ya confirmó)
7. Lunes: Familia lleva snacks
8. Admin marca como "completado"

### Escenario 2: Familia No Puede
1. Admin crea asignación (ej: Familia García para semana del 6 de enero)
2. Familia ve su asignación
3. Familia hace click en "No puedo, solicitar cambio"
4. Sistema pide motivo y **fecha alternativa preferida** (prompt con ejemplo)
   - Ejemplo: "Estaremos de viaje esa semana. Prefiero la semana del lunes 20 de enero."
5. Estado cambia a "cambio_solicitado"
6. Admin ve alerta roja en tabla con el motivo y fecha preferida
7. Admin realiza DOS acciones:
   - **Elimina** la asignación original (6 de enero)
   - **Crea nueva asignación** para otra familia que cubra el 6 de enero
   - **Crea nueva asignación** para Familia García en su fecha preferida (20 de enero)

### Escenario 3: Sin Respuesta
1. Admin crea asignación
2. Familia no confirma ni solicita cambio
3. **Viernes antes del lunes**: Cloud Function envía recordatorio automático
4. Familia recibe comunicado con recordatorio
5. Familia puede confirmar o solicitar cambio
6. Si no responde, admin puede contactar directamente

## Estructura de Datos

### Colección: `snackAssignments`

```javascript
{
  ambiente: 'taller1',
  fechaInicio: '2026-01-05',  // Lunes
  fechaFin: '2026-01-09',      // Viernes (calculado automáticamente)
  familiaUid: 'abc123',
  familiaEmail: 'familia@example.com',
  familiaNombre: 'Familia García',
  estado: 'pendiente',         // pendiente | confirmado | cambio_solicitado | completado
  confirmadoPorFamilia: false,
  solicitudCambio: false,
  motivoCambio: null,
  recordatorioEnviado: false,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  fechaConfirmacion: Timestamp,      // Si confirmó
  fechaSolicitudCambio: Timestamp,   // Si solicitó cambio
  fechaRecordatorio: Timestamp       // Cuando se envió recordatorio
}
```

### Colección: `snackLists`

```javascript
{
  items: [
    'Frutos secos sin azúcar 400g (almendras, semillas de girasol, nueces, pasas o maní)',
    'Pan casero 1 (considerar sin TACC)',
    '3 paquetes de galletas de arroz',
    'Frutas y/o verduras 2kg variado',
    'Queso cremoso 600g',
    'Huevos duros o revueltos (8 unidades)',
    '1 Leche'
  ],
  observaciones: 'Si desean enviar una preparación casera u otro alimento...',
  updatedAt: Timestamp
}
```

## Reglas de Firestore

- **Admin (superadmin/coordinacion):**
  - Crear, leer, actualizar, eliminar todas las asignaciones
  - Actualizar listas de snacks

- **Familia:**
  - Leer solo sus propias asignaciones
  - Actualizar solo para confirmar o solicitar cambio
  - No pueden modificar otros campos

## Archivos Modificados/Creados

### Creados:
1. `puerto-nuevo/src/services/snacks.service.js`
2. `puerto-nuevo/src/pages/admin/SnacksCalendar.jsx`
3. `puerto-nuevo/src/pages/family/MySnacks.jsx`
4. `functions/src/scheduled/snacksReminder.js`

### Modificados:
1. `puerto-nuevo/src/App.jsx` - Agregadas rutas `/admin/snacks` y `/familia/snacks`
2. `puerto-nuevo/src/pages/admin/AdminDashboard.jsx` - Agregado botón "Calendario de Snacks"
3. `puerto-nuevo/src/pages/family/FamilyDashboard.jsx` - Agregado botón "Mis Turnos de Snacks"
4. `firestore.rules` - Agregadas reglas para `snackAssignments` y `snackLists`
5. `functions/index.js` - Exportada función `sendSnacksReminder`

## Próximos Pasos (Opcional)

- [ ] Interfaz para editar la lista de snacks por taller
- [ ] Notificaciones push además de comunicados
- [ ] Dashboard con estadísticas (% confirmación, solicitudes de cambio, etc.)
- [ ] Exportar calendario anual a PDF
- [ ] Permitir que admin reasigne directamente desde la interfaz

## Notas Importantes

- La Cloud Function usa zona horaria `America/Argentina/Buenos_Aires`
- Los recordatorios se envían SOLO si la asignación no está confirmada
- Las familias pueden solicitar cambio hasta que pase la semana
- El motivo del cambio es opcional pero recomendado
