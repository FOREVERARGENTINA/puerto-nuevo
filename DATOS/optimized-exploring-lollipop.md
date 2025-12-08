# Plan de Implementación: Plataforma Montessori Puerto Nuevo

## Resumen Ejecutivo

**Proyecto:** Intranet educativa + Portal institucional para escuela Montessori
**Stack:** React + Vite + Firebase (100% free tier)
**Usuarios:** 40-80 familias (~100-120 usuarios totales)
**Prioridad 1:** Intranet privada con comunicación segmentada y confirmación de lectura obligatoria
**Prioridad 2:** Portal público (fase posterior)

## Decisiones Arquitectónicas Clave

### 1. Stack Tecnológico

- **Frontend:** React 18 + Vite 5
- **UI:** CSS vanilla con sistema de diseño centralizado (sin frameworks CSS innecesarios)
- **Hosting:** Firebase Hosting
- **Auth:** Firebase Authentication (email/password) + Custom Claims para roles
- **Database:** Firestore (native mode)
- **Storage:** Firebase Storage (5GB free tier)
- **Backend:** Cloud Functions for Firebase (2nd gen)
- **Notificaciones:** Firebase Cloud Messaging (FCM) + Resend (email)
- **PWA:** Service Worker + manifest.json

**Justificación Firebase:**
- Free tier generoso (1GB Firestore + 50K lecturas/día + 5GB Storage)
- Realtime listeners (actualizaciones automáticas)
- FCM gratis ilimitado (crítico para notificaciones)
- Security Rules declarativas (seguridad sin backend custom)
- Un solo proveedor integrado

### 2. Sistema de Roles

**Jerarquía:**
```
Dirección > Coordinación > Administración > Docentes/Talleristas > Familias/Aspirantes
```

**Implementación híbrida:**
- **Custom Claims:** Para Security Rules (performance, sin queries)
- **Firestore `/users`:** Para queries cliente (listar usuarios por rol)

**Roles específicos:**
- `direccion`: Acceso total, gestión sistema
- `coordinacion`: Similar a dirección, sin config crítica
- `admin`: CRUD usuarios, comunicados, documentos, reportes
- `teacher`: Docentes de ambiente (Taller 1 o 2)
- `tallerista`: Profesores de talleres especiales (Robótica, Yoga, etc.)
- `family`: Familias con acceso a info de sus hijos
- `aspirante`: Familias interesadas en inscripción

### 3. Arquitectura de Datos (Firestore)

**Colecciones principales:**

```
/users                              # Perfiles + roles
  /{uid}
    - role, children[], tallerAsignado, fcmTokens[]

/children                           # Fichas alumnos
  /{childId}
    - nombreCompleto, ambiente, talleresEspeciales[]
    - responsables[] (UIDs familias)
    - datosMedicos { alergias, medicamentos, contactosEmergencia }

/communications                     # Comunicados
  /{commId}
    - type: "global"|"ambiente"|"taller"|"individual"
    - ambiente, tallerEspecial, destinatarios[]
    - requiereLecturaObligatoria: boolean
    - title, body, attachments[]
    /lecturas/{uid}                # Subcolección: tracking lectura
      - leidoAt, userDisplayName

/appointments                       # Turnero reuniones
  /{appointmentId}
    - fechaHora, familiaUid, hijoId, estado: "libre"|"reservado"

/documents                          # Biblioteca institucional
  /{docId}
    - folder, category, fileUrl, visiblePara[]
    - requiereLecturaObligatoria (para aspirantes)
    /lecturas/{uid}

/talleres                           # Metadata talleres especiales
  /{tallerId}
    - nombre, ambiente, tallerista, descripcion

/aspirantes                         # Proceso admisión
  /{uid}
    - etapa, documentosLeidos[], documentosPendientes[]
```

**Decisiones clave modelo de datos:**
- **Subcolecciones para lecturas:** Escalabilidad (vs arrays con límite 1MB)
- **Desnormalización:** `familiaDisplayName` en appointments (evita queries extra)
- **Arrays para relaciones:** `children[]` en `/users`, `responsables[]` en `/children`

### 4. Confirmación de Lectura Obligatoria (Feature Crítico)

**Flujo completo:**

1. **Admin crea comunicado** con `requiereLecturaObligatoria: true`
2. **Cloud Function trigger** (`onCommunicationCreated`):
   - Expande destinatarios según type/ambiente/taller
   - Envía email a cada uno
   - Envía push notification FCM
3. **Familia recibe** email + push, abre app
4. **React detecta** comunicados sin leer obligatorios
5. **Modal bloqueante** (`ReadConfirmationModal`):
   - `blocking: true` (no se puede cerrar)
   - Checkbox "He leído y comprendido"
   - Botón "Confirmar Lectura" deshabilitado hasta marcar checkbox
6. **Al confirmar:** Crea documento `/communications/{id}/lecturas/{uid}`
7. **Admin ve panel** "Confirmaciones de Lectura":
   - Total leído/pendiente
   - Lista de usuarios pendientes con emails
   - Opción reenviar recordatorio

**Componente crítico:**
```jsx
<ReadConfirmationModal
  communication={unreadRequired[0]}
  blocking={true}
  onConfirm={() => markAsRead(commId, uid)}
/>
```

### 5. Comunicación Segmentada

**4 tipos de comunicación:**

1. **Global:** Toda la comunidad (familias, docentes, admin)
2. **Ambiente:** Solo Taller 1 o Taller 2 (familias + docentes del ambiente)
3. **Taller especial:** Solo familias de taller específico (ej: Robótica Taller 1)
4. **Individual:** Familia específica

**Expansión destinatarios (Cloud Function):**
```javascript
if (type === "ambiente") {
  // Query children donde ambiente === "taller1"
  // Extraer responsables[] de cada child
  // Agregar docentes donde tallerAsignado === "taller1"
}
```

**Security Rules optimizadas:**
- Familias leen solo comunicados que les corresponden (query filtrado)
- Admin/dirección/coordinación leen todos
- Docentes/talleristas pueden crear comunicados de su ambiente/taller

## Estructura de Archivos

```
puerto-nuevo/
├── firebase.json
├── firestore.rules              # Security rules completas
├── firestore.indexes.json       # Índices compuestos
├── storage.rules
│
├── functions/                   # Cloud Functions
│   ├── src/
│   │   ├── triggers/
│   │   │   ├── onCommunicationCreated.js    # Email/push al crear comunicado
│   │   │   ├── onAppointmentBooked.js       # Confirmación + recordatorio
│   │   │   └── scheduledTasksRunner.js      # Tareas programadas
│   │   ├── notifications/
│   │   │   ├── email.js                     # Resend SDK
│   │   │   └── push.js                      # FCM
│   │   └── api/
│   │       ├── appointments.js              # bookAppointment (transacción)
│   │       └── reports.js                   # getReadReceiptsReport
│   └── index.js
│
├── public/                      # PWA
│   ├── manifest.json
│   ├── service-worker.js
│   ├── firebase-messaging-sw.js
│   └── icons/
│
└── src/
    ├── config/
    │   ├── firebase.js                      # Firebase init
    │   └── constants.js                     # Roles, rutas
    │
    ├── styles/
    │   ├── design-system.css                # Variables CSS centralizadas
    │   ├── global.css                       # Reset + base
    │   ├── components.css                   # Botones, cards, modales
    │   └── sections/                        # CSS por sección
    │
    ├── components/
    │   ├── ui/                              # Reutilizables
    │   │   ├── Button.jsx
    │   │   ├── Card.jsx
    │   │   ├── Modal.jsx
    │   │   └── Spinner.jsx
    │   ├── layout/
    │   │   ├── Header.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── MainLayout.jsx
    │   ├── auth/
    │   │   ├── LoginForm.jsx
    │   │   ├── ProtectedRoute.jsx
    │   │   └── RoleGuard.jsx
    │   ├── communications/
    │   │   ├── CommunicationCard.jsx
    │   │   ├── ReadConfirmationModal.jsx   # CRÍTICO
    │   │   ├── CommunicationForm.jsx
    │   │   └── ReadReceiptList.jsx
    │   ├── children/
    │   ├── appointments/
    │   ├── documents/
    │   └── talleres/
    │
    ├── pages/
    │   ├── Login.jsx
    │   ├── Dashboard.jsx
    │   ├── family/
    │   │   ├── FamilyDashboard.jsx
    │   │   ├── MyChildren.jsx
    │   │   └── Communications.jsx
    │   ├── admin/
    │   │   ├── AdminDashboard.jsx
    │   │   ├── UserManagement.jsx
    │   │   ├── SendCommunication.jsx
    │   │   └── ReadReceiptsPanel.jsx
    │   ├── teacher/
    │   └── tallerista/
    │
    ├── hooks/
    │   ├── useAuth.js                       # AuthContext + custom claims
    │   ├── useCommunications.js             # Filtrado por rol + tracking
    │   ├── useReadReceipts.js
    │   ├── useChildren.js
    │   ├── useAppointments.js
    │   └── useNotifications.js              # FCM tokens
    │
    ├── services/
    │   ├── auth.service.js
    │   ├── users.service.js
    │   ├── children.service.js
    │   ├── communications.service.js
    │   ├── readReceipts.service.js          # markAsRead, hasUserRead
    │   ├── documents.service.js
    │   ├── appointments.service.js
    │   └── notifications.service.js
    │
    └── utils/
        ├── date.js
        ├── validators.js
        └── permissions.js
```

## Sistema de Diseño CSS

**Variables centralizadas (design-system.css):**

```css
:root {
  /* COLORES - A DEFINIR con escuela (propuesta Montessori) */
  --color-primary: #2C5F2D;           /* Verde natural */
  --color-secondary: #D4A574;         /* Madera/beige */
  --color-accent: #E67E22;            /* Naranja terracota */

  /* ESTADOS */
  --color-success: #27AE60;
  --color-warning: #F39C12;
  --color-error: #E74C3C;

  /* TIPOGRAFÍA */
  --font-family-base: -apple-system, system-ui, sans-serif;
  --font-family-headings: Georgia, serif;
  --font-size-md: 1rem;               /* 16px base */

  /* ESPACIADO (escala 8px) */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* BORDES */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* SOMBRAS */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
}
```

**Principios:**
- Mobile-first SIEMPRE (base = móvil, `@media min-width` = desktop)
- Touch targets mínimo 44x44px
- Contraste 4.5:1 (WCAG AA)
- Sin emojis (profesionalismo)
- Separación HTML/CSS/JS estricta

## Fases de Implementación

### FASE 1: FUNDAMENTOS 

**Objetivo:** Autenticación + roles + comunicación básica

**Entregables:**
- Setup Firebase project completo
- React + Vite + routing
- Sistema de diseño CSS (variables, componentes base)
- Firebase Auth + Custom Claims
- Firestore collections: users, children, communications
- Security Rules básicas
- Login funcional
- Admin puede crear usuarios y asignar roles
- Admin puede enviar comunicados globales
- Familias leen comunicados (sin confirmación aún)

**Testing:** 5 usuarios prueba (1 admin, 2 familias, 1 docente, 1 tallerista)

**Archivos críticos:**
- `firestore.rules` (versión básica)
- `src/config/firebase.js`
- `src/hooks/useAuth.js` (AuthContext)
- `src/components/auth/RoleGuard.jsx`
- `src/services/auth.service.js`
- `src/services/communications.service.js`

---

### FASE 2: CONFIRMACIÓN LECTURA + SEGMENTACIÓN 

**Objetivo:** Feature crítico de confirmación obligatoria + comunicación segmentada

**Entregables:**
- Subcolección `/communications/{id}/lecturas`
- Cloud Function `onCommunicationCreated` (email + push)
- Resend SDK configurado
- FCM setup completo (service worker + tokens)
- Componente `ReadConfirmationModal` (bloqueante)
- Hook `useCommunications` (filtrado por rol)
- Hook `useNotifications` (FCM)
- Panel admin `ReadReceiptsPanel` (tracking completo)
- Comunicados segmentados: global, ambiente, taller, individual

**Testing crítico:**
- Admin envía comunicado ambiente Taller 1 → solo familias Taller 1 reciben
- Familia con 2 hijos (Taller 1 y 2) recibe ambos comunicados filtrados
- Modal bloqueante impide acceso hasta confirmar lectura
- Admin ve quiénes NO leyeron con lista de pendientes

**Archivos críticos:**
- `functions/src/triggers/onCommunicationCreated.js`
- `functions/src/notifications/email.js`
- `functions/src/notifications/push.js`
- `src/components/communications/ReadConfirmationModal.jsx`
- `src/hooks/useCommunications.js`
- `src/services/readReceipts.service.js`
- `public/firebase-messaging-sw.js`

---

### FASE 3: FICHAS ALUMNOS + TURNERO 

**Objetivo:** Gestión completa alumnos + sistema de turnos con transacciones

**Entregables:**
- Colección `/children` con `datosMedicos`
- Storage rules `private/children/{id}/`
- Componente `ChildDetail` (ficha completa)
- Componente `MedicalInfoForm` (solo admin edita)
- Colección `/appointments`
- Cloud Function `bookAppointment` con transacción (anti-double-booking)
- Componente `Calendar` (vista mensual)
- Componente `TimeSlotPicker`
- Cloud Function `onAppointmentBooked` (confirmación email)
- Scheduled task: recordatorio 24hs antes

**Testing crítico:**
- 2 familias intentan reservar mismo turno simultáneamente → solo 1 éxito
- Familia recibe email confirmación + recordatorio 24hs antes
- Admin ve fichas médicas, familias NO ven otras familias

**Archivos críticos:**
- `functions/src/api/appointments.js` (transacciones)
- `functions/src/triggers/onAppointmentBooked.js`
- `functions/src/triggers/scheduledTasksRunner.js`
- `src/components/children/ChildDetail.jsx`
- `src/services/appointments.service.js`
- `storage.rules`

---

### FASE 4: TALLERES ESPECIALES + DOCUMENTOS 

**Objetivo:** Espacios talleres + biblioteca documentos

**Entregables:**
- Colección `/talleres` metadata
- Storage `public/talleres/{tallerId}/`
- Componente `TallerDetail` (espacio tallerista)
- Componente `MaterialGrid` (fotos, videos, PDFs)
- Componente `DocumentUploader` (admin/talleristas)
- Colección `/documents`
- Subcolección `/documents/{id}/lecturas`
- Componente `DocumentTree` (árbol carpetas)
- Permisos: talleristas solo editan SU taller

**Testing:**
- Tallerista sube foto a SU taller → familias del taller la ven
- Tallerista NO puede editar otro taller
- Admin sube documento "Reglamento" visible para todos

**Archivos críticos:**
- `src/components/talleres/TallerDetail.jsx`
- `src/components/documents/DocumentTree.jsx`
- `src/services/documents.service.js`

---

### FASE 5: ASPIRANTES + PWA 

**Objetivo:** Proceso admisión + app instalable

**Entregables:**
- Colección `/aspirantes`
- Página `AspiranteDashboard`
- Tracking lectura documentos obligatorios
- Panel admin: seguimiento aspirantes por etapa
- `manifest.json` completo
- `service-worker.js` optimizado
- Iconos PWA (192px, 512px)
- Prompt instalación PWA
- Testing instalación iOS + Android real

**Testing crítico:**
- Aspirante accede, lee documentos, confirma lectura
- Admin ve qué documentos leyó cada aspirante
- App se instala en Android (Chrome) e iOS (Safari 16.4+)
- Notificaciones push funcionan en app instalada

**Archivos críticos:**
- `public/manifest.json`
- `public/service-worker.js`
- `src/pages/aspirante/AspiranteDashboard.jsx`

---

### FASE 6: OPTIMIZACIÓN + PORTAL PÚBLICO - OPCIONAL

**Objetivo:** Performance + landing pública

**Entregables:**
- Lighthouse audit >90 en todo
- Lazy loading imágenes (Intersection Observer)
- Code splitting React (dynamic imports)
- Compresión assets (WebP, minificación)
- Índices Firestore optimizados
- Monitoreo Firebase Usage
- Portal público estático (HTML o Astro)
- Sección "Conocé la escuela"
- Formulario contacto
- SEO completo (sitemap, meta tags, JSON-LD)

**Archivos críticos:**
- `firestore.indexes.json`
- Portal público en carpeta separada

---

## Riesgos Identificados y Mitigaciones

### 1. Exceder Free Tier Firebase

**Riesgo:** Superar 50K lecturas/día Firestore

**Mitigación:**
- Usar `.limit()` en queries
- Cachear datos en React Context
- Desnormalizar (ej: `familiaDisplayName` en appointments)
- Monitorear Firebase Console semanalmente
- Paginación en listas largas

**Plan B:** Migrar a Blaze plan con budget $10/mes máximo

---

### 2. Double-Booking en Turnero

**Riesgo:** 2 familias reservan mismo turno simultáneamente

**Mitigación:**
- SIEMPRE usar transacciones Firestore en Cloud Function
- Verificar `estado === "libre"` dentro de transacción
- UI: deshabilitar botón al hacer click

```javascript
await admin.firestore().runTransaction(async (transaction) => {
  const appDoc = await transaction.get(appRef);
  if (appDoc.data().estado !== "libre") {
    throw new Error("Turno ya reservado");
  }
  transaction.update(appRef, { estado: "reservado", ... });
});
```

---

### 3. Confirmación Lectura Salteada

**Riesgo:** Usuario técnico cierra modal o accede directo a rutas

**Mitigación:**
- Modal sin botón cerrar (`blocking: true`)
- React Router intercepta rutas: si `unreadRequired.length > 0`, redirect forzado
- Educación usuarios sobre importancia

---

### 4. Notificaciones Push en iOS Safari

**Riesgo:** iOS Safari soporte PWA limitado (pre iOS 16.4)

**Mitigación:**
- Verificar versión iOS antes de solicitar permiso
- Mensaje: "Instala la app para recibir notificaciones"
- Fallback: solo email para iOS < 16.4

---

### 5. Emails no Llegan

**Riesgo:** Emails marcados como spam o límites excedidos

**Mitigación con Resend:**
- Free tier: 3000 emails/mes + 100 emails/día
- API simple y confiable
- Dominio verificado mejora deliverability
- Monitorear bounce rate en dashboard Resend

---

## Archivos Críticos para Iniciar

**Prioridad máxima (Fase 1):**

1. `firestore.rules` - Security rules base
2. `src/config/firebase.js` - Inicialización Firebase
3. `src/hooks/useAuth.js` - AuthContext + custom claims
4. `src/components/auth/RoleGuard.jsx` - Protección rutas
5. `src/styles/design-system.css` - Sistema diseño

**Prioridad alta (Fase 2):**

6. `functions/src/triggers/onCommunicationCreated.js` - Email/push automático
7. `src/components/communications/ReadConfirmationModal.jsx` - Modal bloqueante
8. `src/services/readReceipts.service.js` - Tracking lectura

---

## Configuración Inicial Necesaria

**Antes de empezar:**

1. Crear proyecto Firebase (console.firebase.google.com)
2. Activar servicios:
   - Authentication (Email/Password)
   - Firestore Database (native mode)
   - Storage
   - Hosting
   - Cloud Functions
3. Generar configuración Firebase (apiKey, projectId, etc.)
4. Crear cuenta Resend (resend.com) y obtener API key
5. Generar VAPID key para FCM (Firebase Console > Cloud Messaging)
6. Registrar dominio (o usar subdominio Firebase inicial)

---

## Principios de Desarrollo

**Según guia.md:**

- Mobile-first SIEMPRE
- Accesibilidad no negociable (contraste, teclado, alt texts)
- Separación HTML/CSS/JS estricta
- Variables CSS centralizadas
- Sin emojis (profesionalismo)
- Simplicidad sobre complejidad
- Performance Lighthouse >90

**Orden de carga HTML:**
1. Charset + viewport
2. Preconnects
3. CSS: design-system → global → components → sections
4. Contenido body
5. JavaScript al final con defer

---

## Métricas de Éxito

**Post-lanzamiento (revisar semanalmente):**

- Firestore reads < 40K/día (buffer 20%)
- Storage usage < 4GB
- Cloud Functions < 1.5M invocations/mes
- Lighthouse Performance >90
- Lighthouse Accessibility >95
- 0 errores JavaScript críticos (Sentry)
- Tasa confirmación lectura >95%

---

## Próximos Pasos Inmediatos

1. **Crear proyecto Firebase** 
2. **Instalar Firebase CLI:** `npm install -g firebase-tools`
3. **Init proyecto local:** `firebase init`
4. **Configurar Vite + React:** `npm create vite@latest puerto-nuevo -- --template react`
5. **Crear estructura carpetas** según plan
6. **Implementar Fase 1** (3 semanas)
7. **Testing con 5 usuarios piloto**
8. **Iterar según feedback**
