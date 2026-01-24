# Registro de Implementación

Este archivo centraliza el estado actual, la documentación y las opciones de implementación para funcionalidades pendientes.

## Implementado y documentado

1) Flujo de aprobación de comunicados
- Estado: Implementado ✅ (con **impacto operativo** a revisar)
- Archivos clave:
  - `src/pages/admin/CommunicationsApproval.jsx`
  - `src/services/communications.service.js` (métodos `submitForApproval`, `approveCommunication`)
  - Firestore: campo `status` en `communications` (`draft|pending|approved|sent`)
- Notas de implementación e impacto:
  - **Comportamiento actual (actualizado):** `SendCommunication.jsx` incluye la opción `sendByEmail` (activada por defecto). Al crear un comunicado con `sendByEmail=true`, la Cloud Function `onCommunicationCreated` ahora intenta enviar emails y push a los destinatarios (idempotente y por batches). Si `RESEND_API_KEY` no está configurada, los destinatarios se marcan como `queued` en `/communications/{id}/emailStatus/{uid}`.

  - **Cómo probar rápidamente:**
    1. Crear un comunicado (individual o global) con la casilla "Enviar por email" marcada.
    2. Ver en Firestore `/communications/{commId}/emailStatus/` que existen documentos por destinatario con `status: 'sent'|'queued'|'failed'`.
    3. Si `RESEND_API_KEY` está configurada en Functions, verificar el inbox del destinatario (o logs en Resend). Para push, verificar `useNotifications` o dispositivo con token.
    4. Logs de la Cloud Function muestran envíos y errores: `firebase functions:log`.
  - **Seguridad/visibilidad:** Las reglas actuales permiten que los destinatarios lean el comunicado si aparecen en `destinatarios`, por lo que un comunicado **creado** se vuelve visible de inmediato, incluso si no fue aprobado por coordinación. Esto implica riesgo operativo (publicación sin aprobación efectiva).
  - **Recomendación inmediata:** crear comunicados en `status: 'draft'` por defecto y modificar reglas/UI/Funciones para que la visibilidad o el envío de notificaciones ocurra solo al pasar a `status: 'approved'`.

2) Confirmaciones de lectura en documentos
- Estado: Implementado ✅ (upload/download only, sin historial de versiones)
- Archivos clave:
  - `src/components/documents/DocumentViewer.jsx`
  - `src/pages/shared/Documents.jsx`
  - `src/services/documents.service.js`
  - Firestore: `/documents/{id}/readReceipts`
- Notas: Se registran `uid`, `timestamp` y `version` (si la metadata incluye `version`) — **pero actualmente NO existe historial/versionado ni UI de versiones (solo upload/download y confirmaciones).**

3) Sistema de snacks por taller
- Estado: Implementado ✅
- Archivos clave:
  - `src/pages/admin/SnacksManager.jsx`
  - `src/pages/family/SnacksCalendar.jsx`
  - `src/services/snacks.service.js`
  - Firestore: `/snacks`, `/snacks/calendar`
- Notas: Recordatorios via notificaciones programables.

### Checklist de pruebas: Subida de archivos y galería (rápido)
- Galería (imágenes/videos):
  1. Loguearse como **tallerista asignado** → Taller → Galería.
  2. Subir imagen (JPG/PNG) o video (MP4) ≤ 50MB → debe completarse; el elemento aparece en la UI y en Firestore (`talleres/{id}/gallery`).
  3. Eliminar: el uploader o admin puede borrar; confirmar que Storage y Firestore quedan consistentes.
  4. Intentar subir como **tallerista NO asignado** → debe ser rechazado por las reglas de Storage/Firestore.

- Documentos (DocumentUploader):
  1. Loguearse como **tallerista** → Gestión de Documentos → Subir Documento; seleccionar **categoría: `taller`** y subir PDF/imagen ≤ 10MB → debe completarse; verificar `documents/{id}` y Storage `documents/taller/...`.
  2. Intentar subir con **categoría `institucional`** como tallerista → debe ser rechazado por Storage (solo `superadmin`/`coordinacion` pueden subir a otras categorías).
  3. Verificar campos en Firestore: `roles`, `uploadedBy`, `uploadedByEmail`, `createdAt`.

- Pruebas adicionales:
  - Ejecutar pruebas en **Firebase Emulator** para validar reglas sin tocar prod.
  - Revisar logs (Storage / Cloud Functions) si la subida falla (permiso denegado o error técnico).

## Pendientes (detalle y opciones)

A) Versionado de documentos (NO implementado) — Opciones
- Opción 1 — Subcolección de versiones (recomendada, complejidad media)
  - Implementación: `/documents/{id}/versions/{versionId}` con metadata (uploader, changelog, createdAt, storageUrl)
  - Pros: simple de implementar, permite historial y restauración por versión
  - Contras: mayor coste de almacenamiento y lógica adicional en UI
  - Estimación: 1-2 días de trabajo + pruebas

- Opción 2 — Metadata + Storage object versioning (complejidad alta)
  - Implementación: usar versioning en bucket + mantener metadata ligera en Firestore
  - Pros: robusto, storage maneja versiones
  - Contras: configuración adicional en GCP, más costoso
  - Estimación: 2-4 días (incluye configuración y pruebas)

B) Página pública de información (NO implementado) — Opciones
- Opción 1 — Páginas estáticas en frontend (rápido)
  - Archivos: `src/pages/public/Contact.jsx`, `src/pages/public/Equipo.jsx`
  - Pros: rápido, simple de mantener en repo
  - Contras: cambios requieren deploy
  - Estimación: 0.5-1 día

- Opción 2 — Contenido editable (Markdown/JSON) cargado desde `/datos` (moderada)
  - Implementación: render Markdown en la web, editar en repo o panel admin
  - Pros: contenido editable sin deploy si se integra CMS o admin UI
  - Estimación: 1-2 días

C) Campos médicos y permisos (NO implementado)
- Requerimientos básicos:
  - Campos: `alergias`, `tratamientos`, `contactos_emergencia`, `protocolos` en `children/{id}`
  - Permisos: `view_medical_info`, `edit_medical_info`
- Opción 1 — Implementación mínima (recomendada para empezar)
  - Añadir campos en el formulario y aplicar reglas Firestore con permisos
  - Estimación: 1 día

- Opción 2 — Implementación avanzada (historial médico + documentos)
  - Subcolección `medicalRecords` + documentos adjuntos (Storage)
  - Estimación: 2-3 días

D) Validaciones del Turnero (NO implementado — reglas exactas para QA)
- Requerimientos pendientes (probar/asegurar con QA):
  - Bloquear reservaciones en **martes** para alumnos del **Taller 2** (no permitir crear ni reservar slots para ese día en ambiente `taller2`).
  - Enforce de ventana: **turnos de 30 minutos** con **10 minutos de buffer** entre turnos (el sistema debe impedir crear o reservar slots contiguos que no respeten el buffer).
  - Evitar solapamientos y cambios de último minuto que incumplan buffer: implementar validación server-side (transaction o Cloud Function) en `appointments.service.js`.
- Estimación: 1 día para añadir validaciones + pruebas de QA.


## Próximo paso sugerido
- Priorizar **Versionado de documentos** o **Campos médicos** (ambos críticos para cumplimiento y trazabilidad).
- ¿Querés que implemente uno de estos pendientes ahora? Indica prioridad y yo avanzo con PRs y cambios de código.
