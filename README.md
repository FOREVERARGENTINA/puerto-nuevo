# Plataforma Montessori Puerto Nuevo

Intranet educativa + Portal institucional para escuela Montessori.

## Stack Tecnológico

- **Frontend:** React 18 + Vite 5
- **Backend:** Firebase (Firestore, Storage, Cloud Functions, Authentication)
- **Hosting:** Firebase Hosting
- **Notificaciones:** FCM (push) + Resend (email)
- **PWA:** Service Worker + manifest.json

## Estado del Proyecto

✅ **Fase 1 completada:** Sistema de autenticación y roles funcionando

Ver `ESTADO-ACTUAL.md` para detalles completos del progreso.

## Instalación y Setup

### Requisitos
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Cuenta Firebase (proyecto: `puerto-nuevo-montessori`)

### Primera vez

```bash
# 1. Instalar dependencias del frontend
cd puerto-nuevo
npm install

# 2. Instalar dependencias de Cloud Functions
cd ../functions
npm install

# 3. Configurar Firebase CLI
cd ..
firebase login
firebase use puerto-nuevo-montessori
```

### Desarrollo diario

```bash
# Iniciar servidor de desarrollo
cd puerto-nuevo
npm run dev
```

Abre http://localhost:5173

### Desplegar cambios a Firebase

```bash
# Desplegar todo
firebase deploy

# Solo rules
firebase deploy --only "firestore,storage"

# Solo functions
firebase deploy --only functions
```

## Usuarios de Prueba

### Admin
- Email: `admin@puertenuevo.com`
- Rol: `admin`
- Acceso: Dashboard administrativo

## Estructura del Proyecto

```
├── DATOS/              # Documentación original
├── functions/          # Cloud Functions
├── puerto-nuevo/       # Frontend React
├── firestore.rules     # Security Rules Firestore
├── storage.rules       # Security Rules Storage
└── firebase.json       # Configuración Firebase
```

## Documentación

- **Plan completo:** `C:\Users\casa\.claude\plans\sunny-leaping-raven.md`
- **Estado actual:** `ESTADO-ACTUAL.md`
- **Próximos pasos:** `PASOS-SIGUIENTES.md`

## Fases del Proyecto

- [x] **Fase 1:** Autenticación + Roles ✅
- [ ] **Fase 2:** Comunicación segmentada + Confirmación lectura
- [ ] **Fase 3:** Fichas alumnos + Turnero
- [ ] **Fase 4:** Talleres especiales + Documentos
- [ ] **Fase 5:** Aspirantes + PWA
- [ ] **Fase 6:** Optimización + Portal público

## Comandos Útiles

```bash
# Ver logs de Cloud Functions
firebase functions:log

# Listar proyectos Firebase
firebase projects:list

# Ver qué está desplegado
firebase deploy --only hosting --dry-run

# Limpiar caché de Vite
cd puerto-nuevo && npm run build -- --force
```

## Seguridad

Archivos que **NUNCA** deben subirse a Git:
- `service-account-key.json`
- `*-firebase-adminsdk-*.json`
- `.env*`

Ya están en `.gitignore` ✅

## Soporte

Revisa `ESTADO-ACTUAL.md` para troubleshooting y cómo retomar el proyecto.
