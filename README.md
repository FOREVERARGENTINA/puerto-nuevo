# Plataforma Montessori Puerto Nuevo

Intranet educativa + Portal institucional para escuela Montessori.

## Stack Tecnológico

- **Frontend:** React 19 + Vite 7
- **Backend:** Firebase (Firestore, Storage, Cloud Functions, Authentication)
- **Hosting:** Firebase Hosting
- **Notificaciones:** FCM (push) + Resend (email)
  - Para envio por email en producción configura `RESEND_API_KEY` en las Cloud Functions; si no está configurado, los destinatarios se marcarán `queued` y no se enviará email automáticamente.
- **PWA:** Service Worker + manifest.json

## Estado del Proyecto

**Fase actual:** Fase 5 - Talleres Especiales (80% completada)

✅ **Fases completadas:**
- Fase 1: Autenticación y roles
- Fase 2: Comunicación segmentada + confirmación de lectura
- Fase 3: Fichas de alumnos + Sistema de turnos
- Fase 4: Gestión de usuarios y roles
- Fase 4.5: Dashboards por rol

Ver `ESTADO-ACTUAL.md` para detalles completos del progreso.

## Instalación y Setup

### Requisitos
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Cuenta Firebase (proyecto: `puerto-nuevo-montessori`)

### Primera vez

```bash
# 1. Instalar dependencias del proyecto
npm install

# 2. Instalar dependencias de Cloud Functions
cd functions
npm install

# 3. Configurar Firebase CLI
cd ..
firebase login
firebase use puerto-nuevo-montessori
```

### Desarrollo diario

```bash
# Iniciar servidor de desarrollo
npm run dev
```

Abre http://localhost:5173

### Desplegar cambios a Firebase

```bash
# Desplegar todo
firebase deploy

# Solo rules
firebase deploy --only firestore,storage

# Solo functions
firebase deploy --only functions

# Solo hosting
firebase deploy --only hosting
```

## Usuarios de Prueba

### Admin
- Email: `admin@puerto.com`
- Password: sonamos
- Acceso: Dashboard administrativo completo

## Estructura del Proyecto

```
├── datos/              # Documentación e imágenes
├── functions/          # Cloud Functions
├── src/                # Frontend React (código fuente)
├── public/             # Assets públicos
├── dist/               # Build de producción
├── firestore.rules     # Security Rules Firestore
├── firestore.indexes.json  # Índices Firestore
├── storage.rules       # Security Rules Storage
├── firebase.json       # Configuración Firebase
├── vite.config.js      # Configuración Vite
└── package.json        # Dependencias y scripts
```

## Funcionalidades Implementadas

### Sistema de Autenticación
- Login con email/password
- Roles: Admin, Dirección, Coordinación, Guía, Tallerista, Familia, Aspirante
- Custom claims para control de acceso
- Dashboards específicos por rol

### Comunicación
- Comunicados segmentados (global, por ambiente, por taller, individual)
- Confirmación de lectura obligatoria
- Panel de tracking de confirmaciones
- Modal bloqueante para comunicados críticos

### Gestión de Alumnos
- Fichas completas con datos médicos
- Asignación de responsables
- Filtros por ambiente (Taller 1/Taller 2)
- Vista de familias con sus hijos

### Sistema de Turnos
- Reserva de turnos por familias
- Panel administrativo de gestión
- Bloqueo de horarios y días
- Estadísticas de asistencia

### Talleres Especiales
- Creación y gestión de talleres por ambiente
- Asignación de talleristas
- Galerías de fotos/videos
- Vista para familias con información de talleres
- Calendarios de actividades

### Gestión de Usuarios
- Creación de usuarios con roles
- Asignación/cambio de roles
- Asignación de ambiente para guías
- Panel administrativo completo

## Documentación

- **Estado actual completo:** `ESTADO-ACTUAL.md`
- **Documentación histórica:** `DATOS/historico/`

## Comandos Útiles

```bash
# Ver logs de Cloud Functions
firebase functions:log

# Listar proyectos Firebase
firebase projects:list

# Limpiar caché de Vite
npm run build -- --force
```

## Seguridad

Archivos que **NUNCA** deben subirse a Git:
- `service-account-key.json`
- `*-firebase-adminsdk-*.json`
- `.env*`

Ya están en `.gitignore` ✅

## Próximos Pasos

Ver `ESTADO-ACTUAL.md` para:
- Funcionalidades pendientes de Fase 5
- Roadmap completo de fases futuras
- Troubleshooting y soporte
