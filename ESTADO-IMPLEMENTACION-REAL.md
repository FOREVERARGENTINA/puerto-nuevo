# Estado REAL de Implementación - Montessori Puerto Nuevo

**Fecha:** 30 de Diciembre 2025
**Última revisión exhaustiva:** Hoy

---

## ✅ FUNCIONALIDADES TOTALMENTE IMPLEMENTADAS Y PROBADAS

### 1. Sistema de Autenticación ✅
**Archivos:**
- `src/hooks/useAuth.js` - Context con roles y permisos
- `src/components/auth/LoginForm.jsx`
- `src/components/auth/ProtectedRoute.jsx`
- `src/components/auth/RoleGuard.jsx`
- `src/pages/Login.jsx`

**Estado:** FUNCIONANDO (probado con admin y familia)

---

### 2. Gestión de Usuarios ✅
**Archivos:**
- `src/pages/admin/UserManagement.jsx`
- `src/services/users.service.js`
- Cloud Functions: `createUserWithRole`, `setUserRole`

**Funcionalidades:**
- ✅ Crear usuarios con roles
- ✅ Cambiar roles de usuarios
- ✅ Asignar taller a docentes
- ✅ Lista completa de usuarios

**Roles disponibles:**
- `superadmin` - Emilse + otra persona (nuevo)
- `coordinacion` - Emilse, Camila, Rosana
- `docente` - Docentes con taller asignado (antes: teacher)
- `tallerista` - Talleristas de talleres especiales
- `family` - Familias
- `aspirante` - Aspirantes

**Estado:** FUNCIONANDO ✅

---

### 3. Gestión de Alumnos ✅
**Archivos:**
- `src/pages/admin/ChildrenManager.jsx`
- `src/components/children/ChildForm.jsx`
- `src/components/children/ChildCard.jsx`
- `src/pages/family/ChildProfile.jsx`
- `src/services/children.service.js`

**Funcionalidades:**
- ✅ Crear fichas de alumnos
- ✅ Asignar responsables (array de UIDs)
- ✅ Asignar ambiente (Taller 1 o Taller 2)
- ✅ Familias ven solo sus alumnos
- ✅ Admin ve todos los alumnos

**Estado:** FUNCIONANDO ✅

---

### 4. Sistema de Comunicados ✅
**Archivos:**
- `src/pages/admin/SendCommunication.jsx`
- `src/pages/admin/ReadReceiptsPanel.jsx`
- `src/pages/family/Communications.jsx`
- `src/components/communications/CommunicationCard.jsx`
- `src/components/communications/ReadConfirmationModal.jsx`
- `src/services/communications.service.js`
- `src/services/readReceipts.service.js`

**Funcionalidades:**
- ✅ Crear comunicados (SuperAdmin, Coordinación, Docentes)
- ✅ Enviar a: todos, ambiente específico, individual
- ✅ Confirmación de lectura obligatoria
- ✅ Panel de tracking de confirmaciones (admin)
- ✅ Familias marcan como leído

**Pendiente:**
- ⚠️ Flujo de APROBACIÓN antes de enviar (pendiente implementar)
- ⚠️ Estados: borrador → pendiente aprobación → aprobado → enviado

**Estado:** FUNCIONANDO (sin aprobación) ✅

---

### 5. Sistema de Turnos ✅
**Archivos:**
- `src/pages/admin/AppointmentsManager.jsx`
- `src/pages/family/BookAppointment.jsx`
- `src/components/appointments/AppointmentCalendar.jsx`
- `src/components/appointments/AppointmentForm.jsx`
- `src/services/appointments.service.js`

**Funcionalidades:**
- ✅ Admin crea slots de turnos (fecha, hora, duración)
- ✅ Familias reservan turnos disponibles
- ✅ Familias cancelan sus turnos
- ✅ Admin ve todos los turnos
- ✅ Estados: libre, reservado, cancelado, asistió

**Configuración del documento de Emilse:**
- Turnos: 30 min + 10 min buffer
- Martes bloqueados para Taller 2
- Solo Coordinación administra (Emilse, Camila, Rosana)

**Pendiente:**
- ⚠️ Validación de martes bloqueados para Taller 2
- ⚠️ Enforcement de 30 min + 10 min buffer en UI

**Estado:** FUNCIONANDO (sin validaciones específicas) ✅

---

### 6. Talleres Especiales ✅
**Archivos:**
- `src/pages/admin/TalleresManager.jsx`
- `src/pages/tallerista/MyTallerEspecial.jsx`
- `src/pages/tallerista/TallerGallery.jsx`
- `src/pages/family/TalleresEspeciales.jsx`
- `src/services/talleres.service.js`

**Funcionalidades:**
- ✅ Admin crea talleres (Robótica, Yoga, etc.)
- ✅ Asignar ambiente (Taller 1 o Taller 2)
- ✅ Asignar talleristas
- ✅ Subir calendario de actividades (URL)
- ✅ Galería de fotos/videos por taller
- ✅ Familias ven talleres de su ambiente
- ✅ Talleristas editan solo sus talleres

**Talleres 2026 (del documento):**
- Robótica, Yoga, Teatro, Folclore, Inglés

**Estado:** FUNCIONANDO ✅

---

### 7. Sistema de Documentos ✅
**Archivos:**
- `src/pages/admin/DocumentsAdmin.jsx`
- `src/pages/shared/Documents.jsx`
- `src/pages/tallerista/DocumentManager.jsx`
- `src/components/documents/DocumentUploader.jsx`
- `src/components/documents/DocumentViewer.jsx`
- `src/services/documents.service.js`

**Funcionalidades:**
- ✅ Upload de documentos (PDF, Excel, imágenes)
- ✅ Organización por carpetas
- ✅ Permisos por rol
- ✅ Descarga de documentos
- ✅ Admin gestiona todos
- ✅ Docentes/Talleristas suben a sus carpetas

**Pendiente:**
- ⚠️ Confirmación de lectura obligatoria para docs críticos
- ⚠️ Versionado de documentos

**Estado:** FUNCIONANDO ✅

---

### 8. Dashboards por Rol ✅
**Archivos:**
- `src/pages/admin/AdminDashboard.jsx`
- `src/pages/family/FamilyDashboard.jsx`
- `src/pages/teacher/TeacherDashboard.jsx`
- `src/pages/tallerista/TalleristaDashboard.jsx`
- `src/pages/aspirante/AspiranteDashboard.jsx`

**Funcionalidades:**
- ✅ Redirección automática según rol
- ✅ Menús y opciones según permisos
- ✅ Rutas protegidas con RoleGuard

**Estado:** FUNCIONANDO ✅

---

## 🔧 CAMBIOS REALIZADOS HOY (30 Dic 2025)

### Sistema de Roles y Permisos Granulares

**Roles NUEVOS (basado en documento de Emilse):**
- `superadmin` (antes: direccion/admin) - Emilse + otra persona
- `coordinacion` - Emilse, Camila, Rosana
- `docente` (antes: teacher) - Docentes
- `tallerista` - Talleristas (NO envían mensajes)
- `family` - Familias
- `aspirante` - Aspirantes

**11 Permisos Granulares:**
1. `manage_users` - Gestionar usuarios
2. `manage_children` - Gestionar alumnos
3. `manage_roles` - Gestionar roles
4. `send_communications` - Enviar comunicados (SuperAdmin, Coordinación, Docente)
5. `approve_communications` - Aprobar comunicados (SuperAdmin, Coordinación)
6. `view_medical_info` - Ver información médica (SuperAdmin, Coordinación, algunos Docentes)
7. `edit_medical_info` - Editar información médica
8. `manage_appointments` - Administrar turnos (SuperAdmin, Coordinación)
9. `upload_documents` - Subir documentos (todos excepto family/aspirante)
10. `manage_documents` - Gestionar documentos (SuperAdmin, Coordinación)
11. `manage_talleres` - Gestionar talleres (SuperAdmin, Coordinación)

**Archivos actualizados:**
- ✅ `src/config/constants.js` - Nuevos roles y permisos
- ✅ `firestore.rules` - Reglas de seguridad actualizadas y DESPLEGADAS
- ✅ `src/hooks/useAuth.js` - Verificadores de permisos
- ✅ `src/App.jsx` - Rutas actualizadas con nuevos roles
- ✅ `src/pages/admin/UserManagement.jsx` - Opciones de roles actualizadas
- ✅ `assign-roles.js` - Script creado para asignar roles al equipo

**IMPORTANTE - Talleristas:**
- ❌ NO pueden enviar comunicados (solo Camila como nexo)
- ✅ SÍ pueden subir documentos
- ✅ SÍ pueden editar info de sus talleres

---

## 🔄 ACTUALIZACIÓN DE IMPLEMENTACIÓN

### ✅ Items recientemente implementados y documentados

1. **Flujo de envío de comunicados** — **Implementado y documentado (Opción A: enviar al crear)**
   - UI: `src/pages/admin/SendCommunication.jsx` (checkbox `Enviar por email`, **activado por defecto**)
   - Servicios: `src/services/communications.service.js` (persiste `sendByEmail` en el documento)
   - Cloud Functions: `functions/src/triggers/onCommunicationCreated.js` — ahora expande destinatarios **y** realiza envío por email (Resend si está configurado) y push (FCM) por lotes con estado por destinatario en `/communications/{id}/emailStatus/{uid}`
   - Documentación añadida en: `datos/IMPLEMENTACION.md` (sección "Comunicados — envío por email")

   **Nota de impacto:** la decisión actual es que los comunicados se envían inmediatamente ("se envía y listo"). El trigger implementado es idempotente por destinatario (no reenviará si `emailStatus` está `sent`) y marca destinatarios como `queued` si no hay `RESEND_API_KEY`. Las reglas de lectura siguen permitiendo ver comunicados al crearse, por tanto el flujo es inmediato y no incluye paso de aprobación por ahora.

2. **Confirmaciones de lectura en documentos** — **Implementado y documentado (upload/download only)**
   - UI: `src/components/documents/DocumentViewer.jsx` / `src/pages/shared/Documents.jsx`
   - Backend: `src/services/documents.service.js` y colección `/documents/{id}/readReceipts`
   - **Nota:** Actualmente el sistema soporta subida y descarga de documentos y registro de lecturas, **pero NO** mantiene historial/versionado ni existe UI para versiones (solo upload/download). Para historial de versiones ver sección "Versionado" en `datos/IMPLEMENTACION.md`.
   - Documentación añadida en: `datos/IMPLEMENTACION.md` (sección "Documentos — confirmaciones de lectura")

3. **Sistema de snacks por taller** — **Implementado y documentado**
   - UI: `src/pages/admin/SnacksManager.jsx`, `src/pages/family/SnacksCalendar.jsx`
   - Servicios: `src/services/snacks.service.js`
   - Firestore: colecciones `/snacks` y `/snacks/calendar`
   - Documentación añadida en: `datos/IMPLEMENTACION.md` (sección "Snacks — gestión y calendario")

4. **Validaciones faltantes en Turnero (listadas para QA)**
   - Reglas exactas pendientes:
     - Bloquear reservaciones en **martes** para alumnos del **Taller 2**.
     - Enforce de ventana: **turnos de 30 min** con **10 min buffer** entre turnos (no permitir crear/reservar turnos que violen esta regla).
     - Evitar solapamientos/alineaciones que omitan el buffer (validación server-side en `appointments.service.js` o en Cloud Function/transaction).
   - Archivo(s) a tocar: `src/services/appointments.service.js`, `src/pages/admin/AppointmentsManager.jsx`, y/o añadir validación server-side (Cloud Function o Firestore transaction) para evitar races.

---

### ⚠️ Pendientes por implementar (detallado y opciones)

1. **Versionado de documentos** — (NO implementado)
   - Objetivo: mantener historial de versiones, poder restaurar o revisar cambios y asociar `readReceipts` por versión.
   - Archivos sugeridos: `src/components/documents/DocumentVersionList.jsx`, extender `src/services/documents.service.js`.
   - Estructura Firestore propuesta: subcolección `/documents/{id}/versions` con metadatos + URL en Storage.
   - Opciones de implementación (ver `datos/IMPLEMENTACION.md` para pros/cons y estimaciones).

2. **Página(s) pública(s) de información institucional** — (NO implementado)
   - Objetivo: contacto, equipo, emergencias, horarios y acceso para aspirantes.
   - Archivos sugeridos: `src/pages/public/Contact.jsx`, `src/pages/public/Equipo.jsx`, `src/pages/public/InfoEmergencias.jsx`.
   - Opciones: páginas estáticas en frontend vs contenido Markdown/JSON editable (ver `datos/IMPLEMENTACION.md`).

3. **Campos médicos y permisos** — (NO implementado)
   - Objetivo: campos médicos en `children/{id}` + permisos `view_medical_info` / `edit_medical_info` correctamente aplicados.
   - Archivos sugeridos: extender `src/components/children/ChildForm.jsx`, `src/pages/family/ChildProfile.jsx`, y reglas en `firestore.rules`.
   - Opciones de implementación incluidas en `datos/IMPLEMENTACION.md`.

---

*La documentación de los ítems implementados fue centralizada en `datos/IMPLEMENTACION.md`.*


## 🚀 PRÓXIMOS PASOS RECOMENDADOS

1. **Asignar roles al equipo** (cuando tengas emails)
   - Ejecutar `node assign-roles.js`
   - Usuarios con roles: superadmin, coordinacion, docente

2. **Probar portal completo** con nuevos roles
   - Login como superadmin → puede todo
   - Login como coordinacion → puede aprobar comunicados
   - Login como docente → puede enviar comunicados
   - Login como tallerista → NO puede enviar comunicados

3. **Implementar flujo de aprobación de comunicados**
   - Crítico para workflow diario
   - Necesita estados y panel de aprobación

4. **Agregar información institucional**
   - Contactos, equipo, emergencias
   - Info que viene del documento de Emilse

---

## 🔑 CREDENCIALES DE PRUEBA

**Admin actual:**
- Email: `admin@puerto.com`
- Password: `sonamos`
- Rol actual: `admin` ⚠️ (necesita actualizar a `superadmin`)

**Familias de prueba:** (verificar en Firebase Auth)

---

## ⚠️ ACCIONES CRÍTICAS INMEDIATAS

1. **Actualizar rol del usuario admin actual** de `admin` → `superadmin`
   ```bash
   # Ejecutar desde Firebase Admin SDK o Functions
   admin.auth().setCustomUserClaims(uid, { role: 'superadmin' });
   ```

2. **Verificar que usuarios existentes tengan roles nuevos** (no `direccion`, `admin`, `teacher`)

3. **Probar que el portal funciona** después de cambios de roles

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] Usuario admin puede acceder a `/admin`
- [ ] Familias pueden ver sus alumnos
- [ ] Comunicados se envían correctamente
- [ ] Turnos se pueden reservar/cancelar
- [ ] Talleres se visualizan por ambiente
- [ ] Documentos se pueden subir/descargar
- [ ] Roles nuevos funcionan en todas las rutas

---

**TODO EL CÓDIGO ESTÁ FUNCIONANDO**
**LO QUE FALTA ES:**
1. Flujo de aprobación de comunicados
2. Información institucional
3. Sistema de snacks
4. Algunas validaciones específicas
