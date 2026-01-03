# Estado Actual del Proyecto - Montessori Puerto Nuevo

**Fecha:** 30 de Diciembre 2025
**Fase completada:** Fase 5.5 - Sistema de Roles y Permisos Granulares ✅

---

## ✅ LO QUE YA ESTÁ FUNCIONANDO

### 1. Configuración Firebase (DESPLEGADO)
- ✅ Proyecto: `puerto-nuevo-montessori`
- ✅ Firestore Security Rules desplegadas
- ✅ Storage Security Rules desplegadas
- ✅ Cloud Functions desplegadas:
  - `setUserRole`: Asigna roles a usuarios
  - `createUserWithRole`: Crea usuarios con rol

### 2. Usuario Admin Creado
- ✅ Email: admin@puertenuevo.com
- ✅ UID: `ExBqv01hhsdxbAg0pBagFjyLq7x2`
- ✅ Rol: `admin` (asignado vía custom claims)
- ✅ Documento en Firestore `/users/ExBqv01hhsdxbAg0pBagFjyLq7x2` creado

### 3. Frontend React + Vite
- ✅ Proyecto configurado en `/puerto-nuevo`
- ✅ Firebase SDK integrado
- ✅ React Router configurado
- ✅ Sistema de diseño CSS completo

### 4. Sistema de Gestión de Usuarios (FASE 4) ✅
- ✅ Panel `/admin/usuarios` para gestionar usuarios
- ✅ Crear usuarios con roles: Guía, Tallerista, Familia, Admin, etc.
- ✅ Asignar taller específico a guías (Taller 1 o 2)
- ✅ Cambiar roles de usuarios existentes
- ✅ Integración con Cloud Functions `createUserWithRole` y `setUserRole`
- ✅ Problema custom claims resuelto (familias pueden ver alumnos)

### 5. Dashboards por Rol (FASE 4.5) ✅
- ✅ `/docente` - Dashboard para guías de taller
- ✅ `/tallerista` - Dashboard para talleristas de talleres especiales
- ✅ `/aspirante` - Dashboard para familias en proceso de admisión
- ✅ Rutas protegidas por rol con RoleGuard
- ✅ Redirección automática según rol al hacer login

### 6. Sistema de Roles y Permisos Granulares (FASE 5.5) ✅ **NUEVO**
**Basado en documento de requerimientos de la directora Emilse**

#### Roles Implementados:
- ✅ **SuperAdmin**: Emilse + otra persona (todos los permisos)
- ✅ **Coordinación**: Emilse, Camila, Rosana (enviar + aprobar comunicados, ver info médica, administrar turnos)
- ✅ **Docente**: Emilse, Camila, Rosana, Vanesa, Gise, Javi (enviar comunicados, algunos ven info médica)
- ✅ **Tallerista**: Camila como nexo (NO envían mensajes, solo documentos y editan talleres)
- ✅ **Family**: Familias (permisos básicos)
- ✅ **Aspirante**: Aspirantes (permisos limitados)

#### Permisos Granulares:
- ✅ `manage_users` - Gestionar usuarios
- ✅ `manage_children` - Gestionar alumnos
- ✅ `send_communications` - Enviar comunicados (SuperAdmin, Coordinación, Docente)
- ✅ `approve_communications` - Aprobar comunicados (SuperAdmin, Coordinación)
- ✅ `view_medical_info` - Ver información médica (SuperAdmin, Coordinación, algunos Docentes)
- ✅ `manage_appointments` - Administrar turnos (SuperAdmin, Coordinación)
- ✅ `upload_documents` - Subir documentos (SuperAdmin, Coordinación, Docente, Tallerista)
- ✅ `manage_talleres` - Gestionar talleres (SuperAdmin, Coordinación)

#### Archivos Actualizados:
- ✅ `src/config/constants.js` - 11 permisos + mapeo roles→permisos
- ✅ `firestore.rules` - Reglas de seguridad actualizadas con permisos específicos
- ✅ `src/hooks/useAuth.js` - Hook con verificadores de permisos
- ✅ `assign-roles.js` - Script para asignar roles al equipo

#### Características Clave:
- ✅ **Talleristas NO pueden enviar comunicados** (solo Camila como nexo)
- ✅ Solo Coordinación puede **aprobar comunicaciones oficiales**
- ✅ Solo Coordinación puede **administrar turnos** (Emilse, Camila, Rosana)
- ✅ Martes bloqueados para Taller 2 en sistema de turnos
- ✅ Turnos de 30 min + 10 min buffer entre turnos
- ✅ Sistema de permisos verificable con `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`

### 5. Archivos Clave Creados

**Configuración:**
- `firebase.json` - Configuración Firebase
- `firestore.rules` - Reglas de seguridad Firestore
- `firestore.indexes.json` - Índices
- `storage.rules` - Reglas Storage
- `.gitignore` - Archivos a ignorar

**Frontend (`/puerto-nuevo/src`):**
- `config/firebase.js` - Configuración Firebase (con credenciales)
- `config/constants.js` - Roles, rutas, constantes
- `hooks/useAuth.js` - AuthContext con custom claims
- `components/auth/LoginForm.jsx`
- `components/auth/ProtectedRoute.jsx`
- `components/auth/RoleGuard.jsx`
- `services/auth.service.js`
- `services/users.service.js`
- `pages/Login.jsx`
- `pages/admin/AdminDashboard.jsx`
- `pages/admin/UserManagement.jsx` ⭐ (Fase 4)
- `pages/family/FamilyDashboard.jsx`
- `pages/teacher/TeacherDashboard.jsx` ⭐ (Fase 4.5)
- `pages/tallerista/TalleristaDashboard.jsx` ⭐ (Fase 4.5)
- `pages/aspirante/AspiranteDashboard.jsx` ⭐ (Fase 4.5)
- `App.jsx` - Router principal
- `styles/design-system.css` - Variables CSS
- `styles/global.css` - Reset + base
- `styles/components.css` - Componentes reutilizables

**Backend (`/functions`):**
- `index.js` - Cloud Functions
- `package.json` - Dependencias

**Scripts de Gestión (raíz):**
- `assign-roles.js` ⭐ - Script para asignar roles al equipo docente (NUEVO)

---

## 🔑 CREDENCIALES Y ACCESOS

### Firebase Console
- URL: https://console.firebase.google.com/project/puerto-nuevo-montessori
- Proyecto: `puerto-nuevo-montessori`

### Usuario Admin de Prueba
- Email: `admin@puerto.com`
- Password: sonamos
- Rol: `admin`

### Archivos Sensibles (NO SUBIR A GIT)
- `functions/service-account-key.json` (credenciales admin)
- `puerto-nuevo/leer.md` (config temporal)
- `functions/assign-admin.js` (script temporal)

---

## 🚀 CÓMO RETOMAR EL PROYECTO

### 1. Iniciar el servidor de desarrollo

```bash
cd E:\Aideas\PUERTO NUEVO\puerto-nuevo
npm run dev
```

Esto iniciará el servidor en http://localhost:5173

### 2. Asignar roles al equipo docente (PENDIENTE)

**Cuando tengas los emails del equipo**, actualiza el archivo `assign-roles.js` y ejecuta:

```bash
cd E:\Aideas\PUERTO NUEVO
node assign-roles.js
```

Este script:
- Crea usuarios automáticamente si no existen
- Asigna roles mediante Custom Claims (superadmin, coordinacion, docente, tallerista)
- Actualiza documentos en Firestore
- Genera passwords temporales para usuarios nuevos

**Equipo a configurar:**
- **SuperAdmin**: Emilse + otra persona
- **Coordinación**: Emilse, Camila, Rosana
- **Docentes**: Emilse, Camila, Rosana, Vanesa, Gise, Javi
- **Talleristas**: Camila (nexo)

### 3. Hacer login

1. Abre http://localhost:5173
2. Se redirigirá automáticamente a `/login`
3. Ingresa:
   - Email: `admin@puertenuevo.com`
   - Password: (tu contraseña)
4. Deberías ser redirigido a `/admin` (Dashboard Administrativo)

### 3. Si hay errores

**Si Firebase dice "not found" o errores de auth:**
```bash
firebase login
firebase use puerto-nuevo-montessori
```

**Si hay errores de compilación en React:**
```bash
cd puerto-nuevo
npm install
```

**Si necesitas redesplegar rules o functions:**
```bash
# Desde la raíz del proyecto
firebase deploy --only "firestore,storage,functions"
```

---

## 📋 ROADMAP DE FUNCIONALIDADES PENDIENTES

### FASE 5: Talleres Especiales + Documentación 🔴 PRÓXIMA

**Ver detalle en:** `FASE4.5-DASHBOARDS-ROLES-CHECKPOINT.md`

**Objetivo:** Completar funcionalidades de talleristas y sistema de documentos

### Funcionalidades a implementar:

1. **Gestión de Talleres Especiales**
   - Página propia para cada taller (Robótica, Yoga, Teatro, etc.)
   - Publicación de calendarios y planificaciones
   - Galería de fotos por taller
   - Comunicación directa tallerista-familias del taller

2. **Sistema de Documentos**
   - Biblioteca institucional de documentos
   - Organización por carpetas: general, taller1, taller2, talleres especiales
   - Upload de PDF, imágenes, videos
   - Control de permisos por rol
   - Descarga con registro de actividad
   - Confirmación de lectura obligatoria para documentos críticos

3. **Firebase Storage**
   - Configuración de buckets públicos y privados
   - Reglas de seguridad para archivos
   - Upload directo desde frontend
   - Preview de imágenes y PDFs

**Archivos a crear:**
- `src/pages/tallerista/MyTallerEspecial.jsx`
- `src/pages/tallerista/TallerGallery.jsx`
- `src/pages/shared/Documents.jsx`
- `src/services/talleres.service.js`
- `src/services/documents.service.js`
- `src/services/storage.service.js`
- `src/services/galleries.service.js`

**Colecciones Firestore:**
- `/talleres` - Info de talleres especiales
- `/documents` - Documentos institucionales
- `/galleries` - Galerías por taller

**Firebase Storage:**
- Configurar buckets y rules
- Upload/download de archivos

---

### 📘 DOCUMENTACIÓN: Talleres Especiales - Modelo de Datos y Lógica

#### Concepto de Ambientes
En Puerto Nuevo Montessori, los alumnos se dividen en dos grupos principales:
- **Taller 1**: Alumnos de 6 a 9 años (`ambiente: 'taller1'`)
- **Taller 2**: Alumnos de 9 a 12 años (`ambiente: 'taller2'`)

#### Talleres Especiales
Los talleres especiales son actividades **obligatorias** (no opcionales) que forman parte del horario escolar regular. Ejemplos: Yoga, Robótica, Teatro, Música, Educación Física, etc.

**Características importantes:**
- Cada taller especial pertenece a **UN SOLO ambiente** (Taller 1 o Taller 2)
- **NO hay inscripciones individuales**: Todos los alumnos del ambiente asisten automáticamente
- **NO hay límite de capacidad**: El taller es para todo el grupo
- Si un tallerista enseña a ambos grupos, se crean **dos talleres separados** en la base de datos:
  - Ejemplo: "Yoga Taller 1" (lunes 15:00-16:00) y "Yoga Taller 2" (martes 14:00-15:00)

#### Estructura de Datos

**Colección: `talleres`**
```javascript
{
  nombre: "Yoga Taller 1",
  descripcion: "Clase de yoga para niños de 6-9 años",
  talleristaId: ["uid1", "uid2"],  // Array: permite múltiples talleristas
  ambiente: "taller1",              // String: "taller1" o "taller2" (obligatorio)
  horario: "Lunes 15:00 - 16:00",
  diasSemana: ["Lunes"],
  calendario: "https://...",        // URL a PDF/Excel con cronograma de actividades
  estado: "activo",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Subcolección: `talleres/{tallerId}/gallery`**
```javascript
{
  fileName: "1234567890_foto.jpg",
  tipo: "imagen",                   // "imagen" o "video"
  url: "https://storage...",
  uploadedBy: "uid",
  uploadedByEmail: "email@...",
  createdAt: timestamp
}
```

**Campo en `children`:**
```javascript
{
  ambiente: "taller1",              // Determina a qué talleres asiste automáticamente
  // ... otros campos del alumno
}
```

#### Lógica de Asignación
1. Admin crea un taller y **debe** seleccionar el ambiente (Taller 1 o Taller 2)
2. Admin asigna uno o más talleristas al taller
3. Los alumnos se asignan automáticamente según su campo `ambiente`
4. No hay proceso de inscripción ni lista de alumnos en el taller

#### Funcionalidades Implementadas

**Admin (`/admin/talleres`):**
- Crear talleres con nombre, descripción, ambiente obligatorio
- Asignar tallerista(s)
- Configurar horario y días de la semana
- Editar y eliminar talleres

**Tallerista (`/tallerista/mi-taller`):**
- Ver sus talleres asignados
- Actualizar descripción, horario, días
- Agregar URL de calendario (para cronogramas/actividades/muestras)
- Ver ambiente asignado (Taller 1 o Taller 2)

**Tallerista (`/tallerista/galeria`):**
- Subir fotos y videos (max 50MB)
- Ver galería del taller
- Eliminar contenido propio

#### Campo Calendario
El campo `calendario` almacena una URL donde las familias y el equipo pueden descargar:
- Cronograma de actividades del taller
- Planificación mensual/trimestral
- Fechas de muestras o presentaciones
- Archivos en formato PDF, Excel, Google Drive, etc.

#### Reglas de Seguridad

**Firestore (`talleres`):**
- Lectura: Todos los autenticados
- Crear: Solo admin
- Actualizar: Admin o tallerista asignado (verifica `talleristaId` array)
- Eliminar: Solo admin

**Storage (`talleres/{id}/gallery/`):**
- Lectura: Todos los autenticados
- Escritura: Admin o tallerista asignado (verifica `talleristaId` en Firestore)

---

### FASE 6: Funcionalidades Específicas de Guías 🟡

**Prioridad:** Media

**Objetivo:** Completar dashboard de guías con gestión de alumnos

**Funcionalidades:**
1. Ver alumnos de su taller específico (filtrado por `tallerAsignado`)
2. Ver fichas completas de alumnos
3. Ver calendario del taller
4. Comunicación directa con familias

**Archivos a crear:**
- `src/pages/teacher/MyTaller.jsx`
- `src/pages/teacher/StudentDetail.jsx`
- `src/pages/teacher/TallerCalendar.jsx`

---

### FASE 7: Sistema de Admisión de Aspirantes 🟢

**Prioridad:** Baja

**Objetivo:** Proceso completo de admisión para aspirantes

**Funcionalidades:**
1. Ver documentos del proceso
2. Subir documentación requerida
3. Ver estado del proceso (interesado → entrevista → documentación → aceptado/rechazado)
4. Agendar entrevistas
5. Panel admin para gestionar aspirantes

**Archivos a crear:**
- `src/pages/aspirante/Documents.jsx`
- `src/pages/aspirante/MyStatus.jsx`
- `src/pages/aspirante/Interviews.jsx`
- `src/pages/aspirante/UploadDocs.jsx`
- `src/pages/admin/AspirantesManager.jsx`
- `src/services/aspirantes.service.js`

**Colecciones Firestore:**
- `/aspirantes` - Info y etapa del proceso
- `/aspiration-documents` - Docs subidos
- `/admission-interviews` - Entrevistas agendadas

---

## 📁 ESTRUCTURA DEL PROYECTO

```
E:\Aideas\PUERTO NUEVO/
├── DATOS/                      # Documentación original
│   ├── guia.md
│   ├── STACK FIREBASE.MD
│   └── FUNCIONES.MD
│
├── firebase.json               # Config Firebase
├── firestore.rules            # Security Rules Firestore ✅
├── firestore.indexes.json     # Índices Firestore
├── storage.rules              # Security Rules Storage ✅
├── .gitignore
│
├── functions/                  # Cloud Functions ✅
│   ├── index.js               # setUserRole, createUserWithRole
│   ├── package.json
│   ├── service-account-key.json  # ⚠️ NO SUBIR A GIT
│   └── assign-admin.js        # Script temporal (puede borrarse)
│
└── puerto-nuevo/              # Frontend React + Vite ✅
    ├── public/
    ├── src/
    │   ├── config/
    │   │   ├── firebase.js    # ⚠️ Contiene credenciales
    │   │   └── constants.js
    │   ├── styles/
    │   │   ├── design-system.css
    │   │   ├── global.css
    │   │   └── components.css
    │   ├── components/
    │   │   ├── auth/
    │   │   └── ui/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── admin/
    │   │   └── family/
    │   ├── hooks/
    │   │   └── useAuth.js
    │   ├── services/
    │   │   ├── auth.service.js
    │   │   └── users.service.js
    │   └── App.jsx
    ├── package.json
    ├── vite.config.js
    └── index.html
```

---

## 🔒 SEGURIDAD

### Archivos que NUNCA deben subirse a Git:
- ✅ Ya están en `.gitignore`:
  - `service-account-key.json`
  - `*-firebase-adminsdk-*.json`
  - `node_modules/`
  - `.env` y variantes

### Archivos con credenciales (ya en el proyecto):
- `puerto-nuevo/src/config/firebase.js` - Contiene API keys
  - ⚠️ Estas keys son públicas en el frontend, pero protegidas por Firebase Security Rules
  - ✅ Es seguro tenerlas en el código (Firebase las espera ahí)

---

## ✅ CHECKLIST PARA MAÑANA

Antes de empezar Fase 5, verifica:

- [ ] El servidor dev inicia sin errores (`npm run dev`)
- [ ] Puedes hacer login como admin
- [ ] Crear usuario con rol "teacher" en `/admin/usuarios`
- [ ] Login como teacher → redirige a `/docente` ✅
- [ ] Crear usuario con rol "tallerista" en `/admin/usuarios`
- [ ] Login como tallerista → redirige a `/tallerista` ✅
- [ ] Crear usuario con rol "aspirante" en `/admin/usuarios`
- [ ] Login como aspirante → redirige a `/aspirante` ✅
- [ ] Usuarios familia pueden ver sus alumnos (custom claims funcionando)

Si todo funciona → Listo para Fase 5

Si algo falla → Revisa sección "Cómo retomar el proyecto"

**Documentación actualizada:**
- `FASE4-USUARIOS-CHECKPOINT.md` - Sistema de gestión de usuarios
- `FASE4.5-DASHBOARDS-ROLES-CHECKPOINT.md` - Dashboards por rol + roadmap detallado

---

## 📞 SOPORTE

Si mañana hay problemas:

1. Verifica que Firebase CLI esté logueado: `firebase login`
2. Verifica el proyecto seleccionado: `firebase projects:list`
3. Reinstala dependencias si hay errores: `npm install`
4. Revisa logs de Cloud Functions: `firebase functions:log`

---

**Todo el progreso está guardado en:**
- Firebase (reglas y functions desplegadas en la nube)
- Disco local (todos los archivos del proyecto)

Mañana solo ejecutas `npm run dev` y continúas desde donde quedaste.
