# Diseño: Clases Abiertas

**Fecha:** 2026-05-16  
**Estado:** Aprobado  
**Proyecto:** Montessori Puerto Nuevo — Portal familiar

---

## Resumen

Nueva sección "Clases Abiertas" accesible desde el sidebar para Admin/Coordinación y Familias. Permite a la coordinación definir convocatorias anuales de Ambiente Abierto y Taller Abierto por ambiente (Taller 1 / Taller 2), con días y horarios configurables. Las familias se inscriben según el ambiente de sus hijos.

---

## Contexto y reglas de negocio

### Roles involucrados
- **Admin / Coordinación** (`superadmin`, `coordinacion`): crean, editan y consultan inscripciones.
- **Familia** (`family`): ve e inscribe según el ambiente de sus hijos. Si tiene hijos en ambos talleres, ve ambos.

### Ambiente Abierto
- Cupo máximo: **2 familias por día**.
- Una familia puede anotarse a **1 solo día** por convocatoria por ambiente.
- Cuando se alcanza el cupo, el día muestra estado "Completo" (sin posibilidad de inscripción).
- Cambios de horario por admin no afectan inscripciones existentes.

### Taller Abierto
- Sin cupo máximo.
- Una familia puede anotarse a **todos los días** que quiera.
- Puede desanotarse de cualquier día.
- Cada día tiene un nombre de taller libre (ej: "Teatro", "Huerta") definido por admin.

### Convocatorias
- Una convocatoria activa por tipo (`ambiente_abierto` | `taller_abierto`) por ambiente (`taller1` | `taller2`) a la vez.
- Se repiten anualmente. No se requiere historial de convocatorias anteriores.
- Admin puede desactivar una convocatoria (deja de ser visible para familias).

---

## Modelo de datos Firestore

### Colección `/clasesAbiertas`

```
/clasesAbiertas/{convocatoriaId}
  tipo:         'ambiente_abierto' | 'taller_abierto'
  ambiente:     'taller1' | 'taller2'
  activo:       boolean
  dias: [
    {
      id:             string   // nanoid o uuid corto generado al guardar
      fecha:          Timestamp
      horario:        string   // texto libre, ej: "10:00 - 11:00"
      nombreTaller:   string   // solo en tipo 'taller_abierto'
    }
  ]
  creadoPor:    string (uid)
  createdAt:    Timestamp
  updatedAt:    Timestamp
```

**Nota:** `dias` es un array embebido en el documento de convocatoria. Los días se editan actualizando el array completo. Esto es viable dado que el número de días es acotado (aprox. 10-14 días por convocatoria).

### Subcolección `/clasesAbiertas/{convocatoriaId}/inscripciones`

```
/clasesAbiertas/{convocatoriaId}/inscripciones/{inscripcionId}
  diaId:          string       // referencia al id dentro del array dias
  familiaUid:     string (uid)
  familiaNombre:  string       // denormalizado para vista admin
  hijoId:         string
  hijoNombre:     string       // denormalizado
  ambiente:       'taller1' | 'taller2'
  createdAt:      Timestamp
```

### Índices Firestore requeridos
- `inscripciones` por `familiaUid` (para consultas de familia)
- `inscripciones` por `diaId` (para conteo de cupo en transacción)
- `clasesAbiertas` por `tipo` + `ambiente` + `activo` (para cargar convocatoria activa)

---

## Reglas de seguridad Firestore

```javascript
// /clasesAbiertas/{convocatoriaId}
match /clasesAbiertas/{convocatoriaId} {
  allow read: if isAuthenticated();
  allow create, update, delete: if isAdmin();

  // /clasesAbiertas/{convocatoriaId}/inscripciones/{inscripcionId}
  match /inscripciones/{inscripcionId} {
    allow read: if isAdmin() || 
                   (isFamily() && resource.data.familiaUid == request.auth.uid);
    allow create: if isFamily() && 
                     request.resource.data.familiaUid == request.auth.uid;
    allow delete: if isFamily() && 
                     resource.data.familiaUid == request.auth.uid;
    allow update: if false; // no se editan, se borran y recrean
  }
}
```

**Control de cupo:** No es implementable solo con reglas. Se usa una transacción Firestore en el servicio (ver sección de servicio).

---

## Arquitectura de componentes

### Rutas nuevas en `App.jsx`

```
/portal/admin/clases-abiertas
  → ClasesAbiertasManager
  → RoleGuard: [ROLES.SUPERADMIN, ROLES.COORDINACION]

/portal/familia/clases-abiertas
  → ClasesAbiertas (familia)
  → RoleGuard: [ROLES.FAMILY]
```

### Archivos nuevos

| Archivo | Propósito |
|---|---|
| `src/pages/admin/ClasesAbiertasManager.jsx` | Panel admin: CRUD de convocatorias y días, lista de inscriptos |
| `src/pages/family/ClasesAbiertas.jsx` | Vista familia: inscripción/desanotación |
| `src/services/clasesAbiertas.service.js` | Toda la lógica Firestore |
| `src/hooks/useClasesAbiertas.js` | Hook de carga de convocatorias activas por ambiente |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/App.jsx` | Agregar 2 rutas nuevas + lazy imports |
| `src/components/layout/Sidebar.jsx` | Agregar ítem "Clases Abiertas" en menús admin y familia |
| `src/config/constants.js` | Agregar rutas `ADMIN_CLASES_ABIERTAS` y `FAMILY_CLASES_ABIERTAS` |
| `firestore.rules` | Agregar reglas para `/clasesAbiertas` y subcolección |

---

## Detalle de componentes

### `ClasesAbiertasManager` (Admin)

**Estructura de UI (todo inline, sin modales):**

```
[page-header]
  Título: "Clases Abiertas"

[tabs] Ambiente Abierto | Taller Abierto
  [tabs] Taller 1 | Taller 2

    [card]
      Estado: Activa / Inactiva  [toggle btn--secondary]
      
      [section] Días programados
        [tabla de días existentes]
          Fila normal:    fecha | horario | (nombreTaller) | [Editar] [Eliminar]
          Fila en edición: inputs inline + [Guardar] [Cancelar]
          Fila expandida: lista de inscriptos (nombre familia + hijo)
        
        [form agregar día — siempre visible al pie]
          input fecha | input horario | input nombreTaller (si taller_abierto)
          [btn--primary "Agregar día"]
```

**Lógica:**
- Al cargar: busca convocatoria activa para ese tipo+ambiente. Si no existe, ofrece crearla.
- Edición de día: activa formulario inline en la misma fila (`editingDiaId` en estado).
- Eliminar día: confirmación inline (texto + botones confirmar/cancelar en la fila).
- Ver inscriptos: expand/collapse por fila de día.
- Si Ambiente Abierto: muestra conteo `X/2` por día junto a los inscriptos.

### `ClasesAbiertas` (Familia)

**Estructura de UI:**

```
[page-header]
  Título: "Clases Abiertas"

[tabs] (solo ambientes de sus hijos)
  Taller 1 | Taller 2

    [section] Ambiente Abierto
      [lista de días]
        Día disponible:  fecha | horario | [btn "Anotarme"]
        Día completo:    fecha | horario | badge "Completo"
        Día con inscripción propia: fecha | horario | badge "Anotada" ← destacado
      
      Si no hay convocatoria activa: texto "Sin fechas disponibles por el momento."

    [section] Taller Abierto
      [lista de días]
        Sin inscripción: fecha | horario | nombreTaller | [btn "Anotarme"]
        Con inscripción: fecha | horario | nombreTaller | badge "Anotada" + [btn--ghost "Desanotarme"]
      
      Si no hay convocatoria activa: texto "Sin fechas disponibles por el momento."
```

**Lógica:**
- Si familia tiene hijos en un solo ambiente: no muestra tabs, muestra directo.
- "Anotarme" en Ambiente Abierto: si la familia tiene más de un hijo en ese ambiente, muestra selector inline de hijo antes de confirmar.
- "Anotarme" en Taller Abierto: igual, selector de hijo si corresponde.
- Después de inscribirse: UI se actualiza optimistamente.

---

## Servicio `clasesAbiertas.service.js`

```javascript
clasesAbiertasService = {
  // Convocatorias
  getConvocatoriaActiva(tipo, ambiente),        // query activo==true + tipo + ambiente
  createConvocatoria(tipo, ambiente, uid),
  toggleConvocatoria(convocatoriaId, activo),
  
  // Días (actualización del array embebido)
  addDia(convocatoriaId, dia),                  // append al array dias
  updateDia(convocatoriaId, diaId, cambios),    // reemplaza el elemento en el array
  deleteDia(convocatoriaId, diaId),             // filtra el array
  
  // Inscripciones
  getInscripcionesByConvocatoria(convocatoriaId),     // para admin: todas
  getInscripcionesByFamilia(convocatoriaId, uid),     // para familia: las propias
  
  inscribirAmbienteAbierto(convocatoriaId, payload),  // transacción con control de cupo
  inscribirTallerAbierto(convocatoriaId, payload),    // escritura directa
  cancelarInscripcion(convocatoriaId, inscripcionId), // delete doc
}
```

### Transacción `inscribirAmbienteAbierto`

```
1. Lee todas las inscripciones del diaId dentro de la convocatoria
2. Verifica que count < 2 (cupo)
3. Verifica que familiaUid no tenga ya una inscripción en esa convocatoria
4. Si pasa ambas validaciones: crea el documento de inscripción
5. Si no: retorna error con código específico (CUPO_COMPLETO | YA_INSCRIPTA)
```

---

## Hook `useClasesAbiertas.js`

```javascript
useClasesAbiertas(ambientes)
// ambientes: ['taller1'] | ['taller2'] | ['taller1', 'taller2']
// Retorna: { convocatorias, inscripcionesPropia, loading, error }
// - convocatorias: mapa { 'taller1_ambiente_abierto': {...}, ... }
// - inscripcionesPropia: array de inscripciones del usuario autenticado
```

---

## Sistema de diseño — Lineamientos

Todos los componentes nuevos deben seguir estrictamente el sistema existente:

- **Variables CSS:** usar solo variables del design system (`--color-primary`, `--spacing-md`, etc.)
- **Clases de componentes:** `.card`, `.card__header`, `.card__title`, `.card__body`, `.btn`, `.btn--primary`, `.btn--secondary`, `.btn--ghost`, `.btn--danger`, `.badge`, `.form-group`, `.form-label`, `.form-input`, `.tabs`, `.tab`, `.tab--active`
- **Tipografía:** headings con `--font-size-xl` / `--font-weight-semibold`, body con `--font-size-md`
- **Espaciado:** escala de 8px usando `--spacing-*`
- **Sin modales:** toda interacción (edición, confirmación de borrado, selección de hijo) se resuelve inline dentro del flujo de la lista
- **Estados de carga:** usar el patrón existente con `loading` booleano y spinner o texto "Cargando..."
- **Feedback:** mensajes de éxito/error con las clases `.alert--success` / `.alert--error` existentes, auto-dismiss a los 3 segundos (patrón ya usado en `AmbienteActivitiesManager`)

---

## Secuencia de implementación recomendada

1. Constantes y rutas en `constants.js`
2. Servicio `clasesAbiertas.service.js`
3. Hook `useClasesAbiertas.js`
4. Reglas Firestore
5. `ClasesAbiertasManager` (admin)
6. `ClasesAbiertas` (familia)
7. Sidebar + App.jsx (rutas y navegación)
8. Deploy y verificación

---

## Decisiones de diseño y restricciones

- **Días como array embebido** (no subcolección): el volumen es acotado (~14 días), simplifica las queries y evita lecturas adicionales para obtener los días de una convocatoria.
- **Sin historial de convocatorias anteriores**: el sistema mantiene solo la convocatoria activa. Desactivar una convocatoria la oculta pero no la borra; permite recuperarla si es necesario.
- **Denormalización de nombres**: `familiaNombre` e `hijoNombre` en inscripciones evitan joins para la vista de admin.
- **Sin notificaciones**: por decisión explícita del cliente, no se envían avisos al inscribirse o desanotarse.
- **Edición libre de días**: cambiar fecha/horario/nombreTaller no cancela inscripciones existentes; las familias ven el dato actualizado automáticamente.
