# Graph Report - PUERTO NUEVO  (2026-10-09)

## Corpus Check
- 309 files · ~339,404 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2095 nodes · 3995 edges · 160 communities (128 shown, 32 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 79 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c6e63746`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Push Notifications System
- Roles and Permissions System
- galleryHelpers.js
- Apple Touch Icon Default
- Checklist Turnos por Taller
- dependencies
- index.js
- PWA Push Notifications Plan
- Clases Abiertas Implementation Plan
- PWA Master Icon Source
- Fase 3: Fichas Alumnos + Turnero
- Push Notifications Implementation Plan
- Gallery Album Views Plan
- Microsoft Tile 310x310
- Testing Setup Plan
- Estado Actual del Proyecto
- Firestore /children Collection
- index.html (Root SPA)
- llms.txt (Root)
- Mapa Social index.html
- Open Graph Social Sharing Image JPG
- Vite Logo SVG
- React 19
- Album Content Mosaic Brainstorm
- Album View Options Brainstorm
- mapa/src/App.tsx
- scripts
- sendInstitutionalGalleryAlbumNotification.js
- onAppointmentAssigned.js
- pushNotifications.js
- public/code.txt (Icon Snippets)
- Mojibake Prevention Guide
- SocialPage.jsx
- useAuth.jsx
- Plan de Implementación: Plataforma Montessori Puerto Nuevo
- onCommunicationCreated.js
- social.service.js
- ConfirmDialog.jsx
- getDocumentAccessUrl.js
- Icon.jsx
- DocumentDetail.jsx
- functions/package.json
- Fase 4: Sistema de Gestión de Usuarios
- documents.service.js
- Fase 2: Comunicación Segmentada + Confirmación de Lectura
- Fase 4.5: Dashboards por Rol
- devDependencies
- compilerOptions
- ChildFiles.jsx
- useAuth
- db
- CommunicationRichTextEditor.jsx
- emulator-config.cjs
- TalleresManager.jsx
- toPlainText
- fixMojibake.js
- DocumentViewer.jsx
- useDialog
- Requerimientos para la Plataforma Montessori Puerto Nuevo
- FamilyDashboard.jsx
- Plan e implementacion: Informes por alumno
- InstitutionalGallery.jsx
- AppointmentsManager.jsx
- Navbar.jsx
- src/config/firebase.js
- dependencies
- seed-emulators.cjs
- ClasesAbiertasManager.jsx
- fixSourceEncoding.js
- onAmbienteActivityCreated.js
- AdminConversationDetail.jsx
- onSnackAssignmentCancelled.js
- usePushNotifications.js
- devDependencies
- eventSameDayReminder.js
- fix-encoding.js
- lint-guardrails.cjs
- RateLimiter
- run-emulated-suite.cjs
- wait-for-emulators.cjs
- talleres.service.js
- ROLES
- assign-roles.cjs
- crear-familia.cjs
- check-encoding.js
- reset-emulators.cjs
- test-familia-data.cjs
- activar-grafo-mensajes.cjs
- deleteLegacySlots.js
- deleteNewSlots.js
- smoke.spec.js
- corregir-responsables.cjs
- onDocumentCreated.js
- EventCalendar.jsx
- playwright.config.cjs
- restaurar-dm-uids.cjs
- App.jsx
- create-e2e-accounts.cjs
- useNotifications.js
- migrateTalleristaId.js
- Registro de Implementación
- limpiar-turnos-disponibles.cjs
- scripts
- package.json
- AdminNewConversation.jsx
- migrateParticipantesUids.js
- update-admin-role.cjs
- Q: Plan para informes docentes en ficha del alumno
- mapa/package.json
- checkGroupConversations.js
- clean-dev-cache.cjs
- limpiar-conversaciones-cerradas.cjs
- limpiar-responsables.cjs
- verificar-datos-alumno.cjs
- AGENTS.md
- Cambios
- seedAspiranteAppointments.js
- firebase
- playwright.emulator.config.cjs
- ReadReceiptsPanel
- firebase-tools
- globals
- src/App.tsx
- lucide-react
- dotenv
- react-dom
- react-force-graph-2d
- @tailwindcss/vite
- documentReadReceipts.service.js
- onDirectMessageThreadWritten.js
- firebase-messaging-sw.js
- findOrphanDocumentReceipts.js
- vite
- institutionalGallery.service.js
- TallerGallery.jsx
- appointmentSameDayReminder.js
- vite
- ChildForm.jsx
- @eslint/js
- vite-plugin-pwa
- storage.rules.test.js

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 129 edges
2. `Icon()` - 51 edges
3. `scripts` - 37 edges
4. `SocialPage()` - 32 edges
5. `db` - 31 edges
6. `useDialog()` - 31 edges
7. `ROLES` - 30 edges
8. `ROUTES` - 24 edges
9. `useNotifications()` - 23 edges
10. `usersService` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Tiny Upload Test Fixture` --conceptually_related_to--> `Favicon 128px`  [INFERRED]
  tests/fixtures/tiny-upload.txt → public/favicon-128.png
- `Tiny Upload Test Fixture` --conceptually_related_to--> `Login Screen Logo`  [INFERRED]
  tests/fixtures/tiny-upload.txt → public/logo-login.png
- `Estado Real de Implementacion` --references--> `Guia para Agentes de IA`  [INFERRED]
  ESTADO-IMPLEMENTACION-REAL.md → docs/agents.md
- `Communications System` --implements--> `Communications Service`  [EXTRACTED]
  ESTADO-ACTUAL.md → ESTADO-IMPLEMENTACION-REAL.md
- `User Management System` --implements--> `Users Service`  [INFERRED]
  ESTADO-ACTUAL.md → docs/plans/PLAN3.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Clases Abiertas Feature (plan + spec + service)** — docs_superpowers_plans_2026_05_16_clases_abiertas, docs_superpowers_specs_2026_05_16_clases_abiertas_design, docs_superpowers_plans_2026_05_16_clases_abiertas_clasesabiertasservice [EXTRACTED 1.00]
- **Communication Read Receipt Flow** — system_communications, fcollection_read_receipts, service_communications, trigger_on_communication_created, comunicaciones_destinatarios_md [EXTRACTED 1.00]
- **Gallery Album Views Feature (plan + spec)** — docs_superpowers_plans_2026_03_11_gallery_album_views, docs_superpowers_specs_2026_03_11_gallery_album_views_design, docs_superpowers_plans_2026_03_11_gallery_album_views_albummosaic [EXTRACTED 1.00]
- **Role-Permission Matrix Implementation** — system_roles_permissions, role_superadmin, role_coordinacion, role_docente, permission_send_communications, config_constants [EXTRACTED 1.00]
- **Turnos por Taller Feature (plan + checklist + implementation)** — docs_plans_plan_turnospertaller_prompt, docs_plans_checklist_turnospertaller_prompt, docs_superpowers_plans_2026_03_21_turnos_por_taller [EXTRACTED 1.00]
- **Vite and React Build Toolchain Branding Logos** — public_vite_svg, src_assets_react_svg [INFERRED 0.85]
- **Push Notifications Full-Stack Implementation** — system_push_notifications, hook_use_push_notifications, util_push_notifications, sw_firebase_messaging, component_notification_prompt, fcollection_fcm_tokens [INFERRED 0.85]
- **PWA Icon Family - multi-platform app icons derived from master source** — public_pwa_icon_master_png, public_pwa_icon_512_png, public_pwa_icon_512_maskable_png, public_pwa_icon_192_png, public_pwa_apple_touch_icon_png, public_mstile_70x70_png [INFERRED 0.90]
- **Open Graph Social Meta Images - same image in two formats** — public_og_image_jpg, public_og_image_png [INFERRED 0.90]
- **Apple Touch Icon Multi-Resolution Set** — public_apple_touch_icon_png, public_apple_touch_icon_57x57_png, public_apple_touch_icon_60x60_png, public_apple_touch_icon_72x72_png, public_apple_touch_icon_76x76_png, public_apple_touch_icon_114x114_png, public_apple_touch_icon_120x120_png, public_apple_touch_icon_144x144_png, public_apple_touch_icon_152x152_png [INFERRED 0.95]
- **Favicon Multi-Resolution Set** — public_favicon_128_png, public_favicon_16x16_png, public_favicon_32x32_png, public_favicon_96x96_png, public_favicon_196x196_png [INFERRED 0.95]
- **Microsoft Tile Multi-Resolution Set** — public_mstile_310x310_png, public_mstile_144x144_png, public_mstile_150x150_png, public_mstile_310x150_png [INFERRED 0.95]

## Communities (160 total, 32 thin omitted)

### Community 0 - "Push Notifications System"
Cohesion: 0.09
Nodes (30): IOSInstallPrompt Component, NotificationPrompt Component, PwaInstallPrompt Component, Comunicaciones Destinatarios and Read Receipts, Dedicated FCM Service Worker, Direct Trigger Notification Architecture, FCM Token Subcollection Architecture, iOS PWA Install Requirement (+22 more)

### Community 1 - "Roles and Permissions System"
Cohesion: 0.05
Nodes (48): Claude Code Project Configuration, GitHub Copilot Instructions, Social Pilot Access Rollback Checkpoint, Web Accessibility (a11y), Cost-Conscious Optimization, CSS Nesting Native, Granular Role-Based Permissions System, INP Optimization (+40 more)

### Community 2 - "galleryHelpers.js"
Cohesion: 0.12
Nodes (30): MediaGrid(), MediaUploader(), TallerGallery(), ALLOWED_EXTENSIONS, ALLOWED_MIME_PREFIXES, BLOCKED_EXTENSIONS, checkImageExists(), compressImage() (+22 more)

### Community 3 - "Apple Touch Icon Default"
Cohesion: 0.12
Nodes (16): Apple Touch Icon 114x114, Apple Touch Icon 120x120, Apple Touch Icon 144x144, Apple Touch Icon 152x152, Apple Touch Icon 57x57, Apple Touch Icon 60x60, Apple Touch Icon 72x72, Apple Touch Icon 76x76 (+8 more)

### Community 4 - "Checklist Turnos por Taller"
Cohesion: 0.20
Nodes (11): Checklist Turnos por Taller, AMBIENTES (TALLER_1, TALLER_2), Conflict Check Per Ambiente, Legacy Slot Cutoff, slotGroupKey, Plan Sobreturno Manual Reuniones, createManualSlot, Plan Turnos por Taller (+3 more)

### Community 5 - "dependencies"
Cohesion: 0.05
Nodes (41): dompurify, firebase, jspdf, jspdf-autotable, dependencies, browser-image-compression, d3-force-3d, dompurify (+33 more)

### Community 6 - "index.js"
Cohesion: 0.07
Nodes (32): admin, canUserReadDocument(), { getDocumentAccessUrl, getProtectedDocumentPreview }, getFamilyAmbientes(), getUserRole(), { maskEmail }, matchesResponsable(), normalizeAndValidateEmail() (+24 more)

### Community 7 - "PWA Push Notifications Plan"
Cohesion: 0.33
Nodes (6): PWA Push Notifications Plan, FCM Tokens Subcollection, Payload Privacy Rule, usePushNotifications Hook, Track 0 Security Audit, Service Account Key Audit

### Community 8 - "Clases Abiertas Implementation Plan"
Cohesion: 0.40
Nodes (6): Clases Abiertas Implementation Plan, clasesAbiertasService, Convocatoria Activa Deterministic Index, Cupo Desnormalized Counter, Clases Abiertas Design Spec, Reinicial Anual Pattern

### Community 9 - "PWA Master Icon Source"
Cohesion: 0.47
Nodes (6): Microsoft Tile Icon 70x70, Apple Touch Icon for iOS, PWA Icon 192x192, PWA Maskable Icon 512x512, PWA Icon 512x512, PWA Master Icon Source

### Community 10 - "Fase 3: Fichas Alumnos + Turnero"
Cohesion: 0.06
Nodes (35): 1. Iniciar Dev Server, 1. Test Crear Alumno, 2. Preparar Datos de Prueba, 2. Test Ver Alumno (Familia), 3. Probar Flujo Completo, 3. Test Crear Slots de Turnos Recurrentes, 3b. Test Bloquear Turno, 4. Test Reservar Turno (Familia) (+27 more)

### Community 11 - "Push Notifications Implementation Plan"
Cohesion: 0.60
Nodes (5): Push Notifications Design Document, Push Notifications Implementation Plan, Push Notifications Final Unified Plan, Push Notifications Final Execution Plan, Push Notifications Unified Plan

### Community 12 - "Gallery Album Views Plan"
Cohesion: 0.50
Nodes (4): Gallery Album Views Plan, AlbumGrid Feed List, AlbumMosaic Component, Gallery Album Views Design Spec

### Community 13 - "Microsoft Tile 310x310"
Cohesion: 0.50
Nodes (4): Microsoft Tile 144x144, Microsoft Tile 150x150, Microsoft Tile 310x150, Microsoft Tile 310x310

### Community 25 - "mapa/src/App.tsx"
Cohesion: 0.21
Nodes (10): App(), CLASSROOM_CENTERS, ROLE_COLORS, ROLE_LABELS, mockData, Classroom, GraphData, Person (+2 more)

### Community 26 - "scripts"
Cohesion: 0.05
Nodes (37): scripts, build, check:encoding, dev, dev:emulated, dev:test-e2e, dev:test-emulated, emulators (+29 more)

### Community 27 - "sendInstitutionalGalleryAlbumNotification.js"
Cohesion: 0.11
Nodes (26): admin, finalizeAlbumNotification(), { onCall, HttpsError }, { sendPushNotificationToUsers }, {
  STAFF_ROLES,
  sanitizeText,
  hasFamilyAccess,
  isSendingLockActive,
  normalizeFamilyNotification,
  getFamilyRecipients,
  getEffectiveUserRole,
  buildAlbumNotificationBody,
  buildAlbumClickAction,
  countPendingAlbumMedia,
  buildFamilyNotificationState,
  FieldValue,
}, admin, ALREADY_EXISTS_CODES, markAlbumNotificationPending() (+18 more)

### Community 28 - "onAppointmentAssigned.js"
Cohesion: 0.09
Nodes (27): admin, brevoApiKey, { defineSecret }, { escapeHtml }, { FieldPath }, { isVisibleUserData }, { onDocumentUpdated }, { sendEmailMessage } (+19 more)

### Community 29 - "pushNotifications.js"
Cohesion: 0.11
Nodes (25): admin, { FieldValue }, { onDocumentCreated }, { sendPushNotificationToUsers }, { isEmulatorRuntime }, { mailLimiter }, sendEmailMessage(), { writeEmulatorOutboxEntry } (+17 more)

### Community 33 - "SocialPage.jsx"
Cohesion: 0.05
Nodes (63): SocialPage, Avatar(), EmojiPicker(), EMOJIS, useDirectMessages(), useDirectMessagesUnreadCount(), useDirectMessageThread(), DirectMessagesList() (+55 more)

### Community 34 - "useAuth.jsx"
Cohesion: 0.11
Nodes (22): FamilyNewConversation, LoginForm(), ADMIN_ROLES, APPOINTMENT_STATUS, ASPIRANTE_STAGES, CAN_APPROVE_COMMUNICATIONS, CAN_MANAGE_APPOINTMENTS, CAN_SEND_COMMUNICATIONS (+14 more)

### Community 35 - "Plan de Implementación: Plataforma Montessori Puerto Nuevo"
Cohesion: 0.07
Nodes (28): 1. Exceder Free Tier Firebase, 1. Stack Tecnológico, 2. Double-Booking en Turnero, 2. Sistema de Roles, 3. Arquitectura de Datos (Firestore), 3. Confirmación Lectura Salteada, 4. Confirmación de Lectura Obligatoria (Feature Crítico), 4. Notificaciones Push en iOS Safari (+20 more)

### Community 36 - "onCommunicationCreated.js"
Cohesion: 0.12
Nodes (20): admin, brevoApiKey, { defineSecret }, {
  escapeHtml,
  toSafeHtmlParagraph,
  sanitizeRichHtml,
  toPlainText,
  renderAttachmentList,
}, { FieldPath }, { filterVisibleUserDocs, filterVisibleUserIds, isVisibleUserData }, getSafeCommunicationBodyHtml(), { isEmulatorRuntime } (+12 more)

### Community 37 - "social.service.js"
Cohesion: 0.11
Nodes (23): buildChildNode(), buildFamilyNode(), buildPublicContact(), buildStaffNode(), childrenCollection, childSocialProfilesCollection, getPhotoUrl(), getRoleListForStaff() (+15 more)

### Community 38 - "ConfirmDialog.jsx"
Cohesion: 0.24
Nodes (10): InstitutionalGalleryManager, UserManagement, ConfirmDialog(), LoadingModal(), AlbumManager(), CategoryManager(), loadCategories(), InstitutionalGalleryManager() (+2 more)

### Community 39 - "getDocumentAccessUrl.js"
Cohesion: 0.14
Nodes (25): admin, ADMIN_ROLES, ALLOWED_ORIGINS, applyCorsHeaders(), buildLegacyAccessUrl(), buildProtectedPreviewUrl(), buildResponseDisposition(), canUserAccessDocument() (+17 more)

### Community 40 - "Icon.jsx"
Cohesion: 0.18
Nodes (18): EventsCalendar, EventsManager, SnacksLists, EventDetailModal(), Modal(), ModalBody(), ModalFooter(), ModalHeader() (+10 more)

### Community 41 - "DocumentDetail.jsx"
Cohesion: 0.24
Nodes (10): DocumentDetail, getSharedDocumentDetailRoute(), detectMobileClient(), DocumentDetail(), formatFileSize(), normalizeSizeBytes(), ProtectedPdfViewer, resolveDocumentAccessUrl() (+2 more)

### Community 42 - "functions/package.json"
Cohesion: 0.08
Nodes (25): firebase-functions-test, dependencies, firebase-admin, firebase-functions, sanitize-html, description, devDependencies, firebase-functions-test (+17 more)

### Community 43 - "Fase 4: Sistema de Gestión de Usuarios"
Cohesion: 0.08
Nodes (24): 1. Panel de Gestión de Usuarios (`UserManagement.jsx`), 1. Verificar que todo funciona, 2. Login como admin, 2. Servicios Backend (`usersService`), 3. Integración en AdminDashboard, 3. Probar panel de usuarios, 4. Rutas Configuradas, 4. Si todo OK → Fase 5 (+16 more)

### Community 44 - "documents.service.js"
Cohesion: 0.18
Nodes (11): childrenCollection, documentsCollection, documentsService, extractFamilyAmbiente(), isValidFamilyAmbiente(), KNOWN_ROLES, matchesResponsable(), normalizeAmbiente() (+3 more)

### Community 45 - "Fase 2: Comunicación Segmentada + Confirmación de Lectura"
Cohesion: 0.08
Nodes (23): **1. Test Comunicado Global**, **2. Test Comunicado Individual**, **3. Test Comunicado Ambiente (requiere datos de prueba)**, ✅ Checklist Final Fase 2, ✅ Cloud Functions (Backend), 📌 Comandos Útiles, **Componentes**, ✅ Componentes Frontend Implementados (+15 more)

### Community 46 - "Fase 4.5: Dashboards por Rol"
Cohesion: 0.08
Nodes (23): 1. TeacherDashboard (`/docente`), 2. TalleristaDashboard (`/tallerista`), 3. AspiranteDashboard (`/aspirante`), 📁 Archivos Creados, ✅ Checklist Actual, Comunicaciones (Ya implementado), ✅ Dashboards Creados, Fase 4.5: Dashboards por Rol (+15 more)

### Community 47 - "devDependencies"
Cohesion: 0.09
Nodes (23): eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, eslint-plugin-security, @firebase/rules-unit-testing, devDependencies, dotenv, eslint (+15 more)

### Community 48 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+10 more)

### Community 49 - "ChildFiles.jsx"
Cohesion: 0.19
Nodes (13): ChildFiles(), CURRENT_YEAR, formatSize(), toDate(), FileSelectionList(), FileUploadSelector(), formatFileSize(), CURRENT_YEAR (+5 more)

### Community 50 - "useAuth"
Cohesion: 0.21
Nodes (11): Communications, Documents, TeacherCommunications, ProtectedRoute(), RoleGuard(), CommunicationCard(), useAuth(), useCommunications() (+3 more)

### Community 51 - "db"
Cohesion: 0.11
Nodes (16): CommunicationDetail, ReadReceiptsPanel, SendCommunication, TeacherCommunicationDetail, CommunicationRichContent(), ReadReceiptsSection(), COMMUNICATION_TYPES, db (+8 more)

### Community 52 - "CommunicationRichTextEditor.jsx"
Cohesion: 0.21
Nodes (9): CommunicationRichTextEditor(), normalizeEditorText(), CommunicationRichTextEditor, ALLOWED_ATTR, ALLOWED_TAGS, normalizeAnchorAttributes(), normalizeCommunicationEditorValue(), normalizeEmptyRichText() (+1 more)

### Community 53 - "emulator-config.cjs"
Cohesion: 0.14
Nodes (15): args, child, cliArgs, path, portArgIndex, {
  ROOT_DIR,
  HOST,
  PORTS,
  withFrontendEmulatorEnv,
}, { spawn }, viteEntry (+7 more)

### Community 54 - "TalleresManager.jsx"
Cohesion: 0.15
Nodes (12): TalleresManager, EVENT_ALLOWED_EXTENSIONS, EVENT_ALLOWED_MIME_PREFIXES, EVENT_ALLOWED_MIME_TYPES, EVENT_BLOCKED_EXTENSIONS, GALLERY_ALLOWED_EXTENSIONS, GALLERY_ALLOWED_MIME_PREFIXES, GALLERY_BLOCKED_EXTENSIONS (+4 more)

### Community 55 - "toPlainText"
Cohesion: 0.14
Nodes (14): admin, handleConversationMessageCreated(), { onDocumentCreated }, { sendPushNotificationToUsers }, { toPlainText }, admin, ALREADY_EXISTS_CODES, getFamilyRecipientsByAmbiente() (+6 more)

### Community 56 - "fixMojibake.js"
Cohesion: 0.18
Nodes (16): APPLY, argv, collectionsArg, db, decodeLatin1ToUtf8(), fixString(), hasMojibake(), isInstance() (+8 more)

### Community 57 - "DocumentViewer.jsx"
Cohesion: 0.17
Nodes (15): DocumentsAdmin, CATEGORY_SECTIONS, DocumentViewer(), getFileTypeInfo(), getNewDocumentsBannerStorageKey(), isRecentDocument(), toLocalDate(), DOCUMENT_CATEGORY_OPTIONS (+7 more)

### Community 58 - "useDialog"
Cohesion: 0.12
Nodes (22): BookAppointment, ChildrenManager, MyTallerEspecial, TalleresList, AppointmentForm(), getAmbienteLabel(), ChildCard(), AlertDialog() (+14 more)

### Community 59 - "Requerimientos para la Plataforma Montessori Puerto Nuevo"
Cohesion: 0.12
Nodes (15): 1. Identidad Institucional, 2. Estructura Organizacional, 3. Documentación Institucional, 4. Sistema de Turnos, 5. Proceso de Aspirantes, 6. Información Médica y Emergencias, 7. Aspectos Legales y Privacidad, 8. Hosting y Dominio (+7 more)

### Community 60 - "FamilyDashboard.jsx"
Cohesion: 0.32
Nodes (5): FamilyDashboard, FEATURES, STORAGE_KEY(), WelcomeModal(), FamilyDashboard()

### Community 61 - "Plan e implementacion: Informes por alumno"
Cohesion: 0.12
Nodes (15): Alcance funcional, Cambios en permisos, Componentes sugeridos, Criterios de aceptacion, Decision de arquitectura, Estado de implementacion, Estimacion original, Modelo de datos (+7 more)

### Community 62 - "InstitutionalGallery.jsx"
Cohesion: 0.10
Nodes (11): InstitutionalGallery, GalleryBreadcrumbs(), InstitutionalLightbox(), resolveExternalEmbedUrl(), resolveMediaType(), AlbumGrid(), AlbumMosaic(), MosaicTile() (+3 more)

### Community 63 - "AppointmentsManager.jsx"
Cohesion: 0.19
Nodes (15): AppointmentsManager, AppointmentsManager(), buildLocalDateTime(), formatDateInputValueLocal(), formatTimeInputValueLocal(), getAmbienteLabel(), getAppointmentModeLabel(), getCurrentTimestampMs() (+7 more)

### Community 64 - "Navbar.jsx"
Cohesion: 0.18
Nodes (12): PwaInstallPrompt(), Navbar(), NotificationDropdown(), ThemeToggle(), resolveConversationAreasForRole(), useAdminSummary(), usePwaInstall(), getStoredTheme() (+4 more)

### Community 65 - "src/config/firebase.js"
Cohesion: 0.17
Nodes (8): app, auth, firebaseEmulatorConfig, functions, PROD_FIREBASE_CONFIG, AuthAction(), authService, documentAccessService

### Community 66 - "dependencies"
Cohesion: 0.13
Nodes (15): better-sqlite3, express, @google/genai, dependencies, better-sqlite3, d3-force-3d, express, @google/genai (+7 more)

### Community 67 - "seed-emulators.cjs"
Cohesion: 0.23
Nodes (14): buildStorageDownloadUrl(), addDaysToDateKey(), admin, buildArgentinaTimestamp(), clearCollection(), ensureAdminApp(), getArgentinaParts(), getNextMondayDateKey() (+6 more)

### Community 68 - "ClasesAbiertasManager.jsx"
Cohesion: 0.07
Nodes (32): ClasesAbiertas, ClasesAbiertasManager, CalendarioConvocatoria(), DAY_NAMES, getDaysInMonth(), getInitialMonth(), MONTH_NAMES, toDayKey() (+24 more)

### Community 69 - "fixSourceEncoding.js"
Cohesion: 0.19
Nodes (14): APPLY, argv, CP1252_MAP, decodeCP1252(), extArg, extensions, isUtf8(), looksBinary() (+6 more)

### Community 70 - "onAmbienteActivityCreated.js"
Cohesion: 0.18
Nodes (11): admin, ALREADY_EXISTS_CODES, CATEGORY_LABELS, getFamilyRecipientsByAmbiente(), normalizeCategory(), normalizeCustomCategory(), { onDocumentCreated }, sanitizeText() (+3 more)

### Community 71 - "AdminConversationDetail.jsx"
Cohesion: 0.06
Nodes (57): AdminConversationDetail, AdminConversations, FamilyConversationDetail, FamilyConversations, CONVERSATION_CATEGORIES, CONVERSATION_STATUS, ESCUELA_AREAS, storage (+49 more)

### Community 72 - "onSnackAssignmentCancelled.js"
Cohesion: 0.19
Nodes (12): admin, ALREADY_EXISTS_CODES, { filterVisibleUserDocs }, formatAmbiente(), formatDateLabel(), formatDateTimeLabel(), formatWeekRange(), normalizeText() (+4 more)

### Community 73 - "usePushNotifications.js"
Cohesion: 0.28
Nodes (14): isUsingFirebaseEmulators, detectIos(), detectStandalone(), getFriendlyPushError(), getPushServiceWorkerRegistration(), isDedicatedPushRegistration(), isPushWorkerScript(), isTransientIndexedDbClosingError() (+6 more)

### Community 74 - "devDependencies"
Cohesion: 0.15
Nodes (13): autoprefixer, devDependencies, autoprefixer, tailwindcss, tsx, @types/express, @types/node, typescript (+5 more)

### Community 75 - "eventSameDayReminder.js"
Cohesion: 0.26
Nodes (12): admin, buildReminderMessage(), createInAppNotifications(), { FieldValue }, { filterVisibleUserDocs, filterVisibleUserIds }, getArgentinaDayWindow(), getFamilyRecipientsForEvent(), normalizeString() (+4 more)

### Community 76 - "fix-encoding.js"
Cohesion: 0.19
Nodes (12): APPLY_CHANGES, __dirname, DIRS_TO_SCAN, escapeRegex(), FILE_EXTENSIONS, __filename, fixMojibakes(), IGNORE_DIRS (+4 more)

### Community 77 - "lint-guardrails.cjs"
Cohesion: 0.24
Nodes (11): checkCallableValidation(), checkMaskedEmailLogs(), fs, FUNCTIONS_DIR, INDEX_FILE, main(), path, report() (+3 more)

### Community 78 - "RateLimiter"
Cohesion: 0.25
Nodes (4): mailLimiter, RateLimiter, { mailLimiter }, require

### Community 79 - "run-emulated-suite.cjs"
Cohesion: 0.20
Nodes (10): path, playwrightCli, { resetEmulators }, { ROOT_DIR }, runCommand(), runSuite(), { seedEmulators }, { spawn } (+2 more)

### Community 80 - "wait-for-emulators.cjs"
Cohesion: 0.27
Nodes (7): {
  PROJECT_ID,
  STORAGE_BUCKET,
  withAdminEmulatorEnv,
}, { waitForEmulators }, { HOST, PORTS }, net, waitForEmulators(), waitForPort(), { waitForEmulators }

### Community 81 - "talleres.service.js"
Cohesion: 0.14
Nodes (13): HorarioSemanal, BLOQUES_HORARIOS, buildFileName(), DIAS_SEMANA, hexToRgb(), HorarioSemanal(), toSoftBackground(), getFileExtension() (+5 more)

### Community 82 - "ROLES"
Cohesion: 0.11
Nodes (21): TeacherDashboard, DMsFeatureGuard(), SOCIAL_ALLOWED_ROLES, SocialFeatureGuard(), Breadcrumbs(), isDocumentId(), resolveRoleRootPath(), ROOT_ROLE_SEGMENTS (+13 more)

### Community 83 - "assign-roles.cjs"
Cohesion: 0.25
Nodes (8): admin, assignRoleToUser(), auth, db, EQUIPO_DOCENTE, main(), ROLES, serviceAccount

### Community 84 - "crear-familia.cjs"
Cohesion: 0.22
Nodes (7): app, auth, firebaseConfig, functions, { getAuth, signInWithEmailAndPassword }, { getFunctions, httpsCallable, connectFunctionsEmulator }, { initializeApp }

### Community 85 - "check-encoding.js"
Cohesion: 0.25
Nodes (8): checkFile(), __dirname, dirsToScan, extensionsToCheck, __filename, filesWithIssues, mojibakePatterns, scanDirectory()

### Community 86 - "reset-emulators.cjs"
Cohesion: 0.33
Nodes (8): admin, ensureAdminApp(), flushAuth(), flushFirestore(), flushStorage(), {
  PROJECT_ID,
  HOST,
  PORTS,
  STORAGE_BUCKET,
  withAdminEmulatorEnv,
}, resetEmulators(), { waitForEmulators }

### Community 87 - "test-familia-data.cjs"
Cohesion: 0.22
Nodes (7): app, auth, db, firebaseConfig, { getAuth, signInWithEmailAndPassword }, { getFirestore, collection, query, where, getDocs }, { initializeApp }

### Community 88 - "activar-grafo-mensajes.cjs"
Cohesion: 0.29
Nodes (7): admin, auth, db, FAMILY_EMAILS, getUidsByEmail(), main(), serviceAccount

### Community 89 - "deleteLegacySlots.js"
Cohesion: 0.25
Nodes (6): APPLY, argv, CUTOFF, db, keyArg, serviceAccount

### Community 90 - "deleteNewSlots.js"
Cohesion: 0.25
Nodes (6): APPLY, argv, CUTOFF, db, keyArg, serviceAccount

### Community 91 - "smoke.spec.js"
Cohesion: 0.33
Nodes (4): __dirname, escapeRegExp(), loginAs(), uploadFixturePath

### Community 92 - "corregir-responsables.cjs"
Cohesion: 0.33
Nodes (6): admin, corregirResponsables(), db, pregunta(), readline, rl

### Community 93 - "onDocumentCreated.js"
Cohesion: 0.33
Nodes (6): admin, loadFamilyPendingReceipts(), { onDocumentCreated }, { sendPushNotificationToUsers }, sleep(), { toPlainText }

### Community 94 - "EventCalendar.jsx"
Cohesion: 0.12
Nodes (20): APPOINTMENT_VISIBLE_STATES, EventCalendar(), formatSnackWeek(), getAmbienteLabel(), getAppointmentModeLabel(), getFamilyFirstName(), isSnackConfirmedByFamily(), mapAppointmentsToCalendarEvents() (+12 more)

### Community 95 - "playwright.config.cjs"
Cohesion: 0.29
Nodes (6): { defineConfig, devices }, dotenv, envPath, missingEnvVars, path, requiredEnvVars

### Community 96 - "restaurar-dm-uids.cjs"
Cohesion: 0.29
Nodes (5): admin, auth, db, EMAILS_TO_ADD, serviceAccount

### Community 97 - "App.jsx"
Cohesion: 0.13
Nodes (10): AdminDashboard, AspiranteDashboard, DocumentManager, MySnacks, SnacksCalendar, TalleristaDashboard, LoadingScreen(), ROUTES (+2 more)

### Community 98 - "create-e2e-accounts.cjs"
Cohesion: 0.33
Nodes (6): admin, createOrUpdateUser(), main(), path, serviceAccount, TEST_USERS

### Community 99 - "useNotifications.js"
Cohesion: 0.06
Nodes (52): AmbienteActivities, AmbienteActivitiesManager, FamilyHorariosPlaceholder, AMBIENTE_ACTIVITY_CATEGORIES, AMBIENTE_ACTIVITY_CATEGORY_LABELS, AMBIENTE_ACTIVITY_CATEGORY_OPTIONS, resolveCategoryLabel(), sanitizeCustomCategory() (+44 more)

### Community 100 - "migrateTalleristaId.js"
Cohesion: 0.29
Nodes (5): APPLY, argv, db, keyArg, serviceAccount

### Community 101 - "Registro de Implementación"
Cohesion: 0.33
Nodes (5): Checklist de pruebas: Subida de archivos y galería (rápido), Implementado y documentado, Pendientes (detalle y opciones), Próximo paso sugerido, Registro de Implementación

### Community 102 - "limpiar-turnos-disponibles.cjs"
Cohesion: 0.33
Nodes (4): db, { getFirestore }, { initializeApp, cert }, serviceAccount

### Community 103 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, clean, dev, lint, preview

### Community 104 - "package.json"
Cohesion: 0.33
Nodes (5): description, name, private, type, version

### Community 105 - "AdminNewConversation.jsx"
Cohesion: 0.12
Nodes (14): AdminNewConversation, ChildProfile, TalleresEspeciales, AdminNewConversation(), AreaIcons, ChildProfile(), formatMinutesToTime(), getMergedHorariosByDay() (+6 more)

### Community 106 - "migrateParticipantesUids.js"
Cohesion: 0.33
Nodes (4): APPLY, argv, keyArg, serviceAccount

### Community 107 - "update-admin-role.cjs"
Cohesion: 0.33
Nodes (4): admin, auth, db, serviceAccount

### Community 108 - "Q: Plan para informes docentes en ficha del alumno"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Plan para informes docentes en ficha del alumno, Source Nodes

### Community 109 - "mapa/package.json"
Cohesion: 0.40
Nodes (4): name, private, type, version

### Community 110 - "checkGroupConversations.js"
Cohesion: 0.40
Nodes (3): APPLY, argv, keyArg

### Community 111 - "clean-dev-cache.cjs"
Cohesion: 0.40
Nodes (4): cacheDirs, fs, path, rootDir

### Community 117 - "seedAspiranteAppointments.js"
Cohesion: 0.25
Nodes (6): apply, argv, db, keyArg, serviceAccount, slots

### Community 123 - "ReadReceiptsPanel"
Cohesion: 0.40
Nodes (4): getCommunicationDate(), ReadReceiptsPanel(), loadAllStats(), loadCommunications()

### Community 126 - "src/App.tsx"
Cohesion: 0.24
Nodes (9): CLASSROOM_CENTERS, ROLE_COLORS, ROLE_LABELS, mockData, Classroom, GraphData, Person, Relationship (+1 more)

### Community 132 - "documentReadReceipts.service.js"
Cohesion: 0.33
Nodes (3): DocumentReadReceiptsPanel(), documentReadReceiptsService, readReceiptsCollection

### Community 150 - "findOrphanDocumentReceipts.js"
Cohesion: 0.40
Nodes (3): APPLY, argv, keyArg

### Community 151 - "vite"
Cohesion: 0.67
Nodes (3): vite, vite, vite

### Community 152 - "institutionalGallery.service.js"
Cohesion: 0.17
Nodes (10): CAN_UPLOAD_TO_GALLERY, albumsCollection, categoriesByRoleCache, categoriesCollection, getCategoryCreatedAtMs(), mediaCollection, preloadedCategoryCovers, sortCategoriesByNewest() (+2 more)

### Community 153 - "TallerGallery.jsx"
Cohesion: 0.25
Nodes (7): TallerGallery, ALLOWED_EXTENSIONS, ALLOWED_MIME_PREFIXES, BLOCKED_EXTENSIONS, RESOURCE_ALLOWED_EXTENSIONS, RESOURCE_ALLOWED_MIME_TYPES, talleresService

### Community 154 - "appointmentSameDayReminder.js"
Cohesion: 0.06
Nodes (45): admin, brevoApiKey, collectAppointmentRecipientUids(), { defineSecret }, { escapeHtml }, { FieldPath }, formatAppointmentMode(), getArgentinaDayWindow() (+37 more)

### Community 156 - "ChildForm.jsx"
Cohesion: 0.31
Nodes (10): ChildForm(), cleanTerapias(), createEmptyRetiroAutorizado(), createEmptyTerapia(), DEFAULT_DATOS_MEDICOS, getRetiroAutorizados(), getTerapias(), normalizeAptoFisico() (+2 more)

### Community 159 - "storage.rules.test.js"
Cohesion: 0.15
Nodes (14): cleanupRulesTestEnvironment(), __dirname, getRulesTestEnvironment(), {
  PROJECT_ID,
  HOST,
  PORTS,
}, require, ROOT_DIR, admin, adminApps (+6 more)

## Knowledge Gaps
- **794 isolated node(s):** `firebase`, `admin`, `serviceAccount`, `auth`, `db` (+789 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `useAuth` to `galleryHelpers.js`, `TallerGallery.jsx`, `ChildForm.jsx`, `SocialPage.jsx`, `useAuth.jsx`, `ConfirmDialog.jsx`, `Icon.jsx`, `DocumentDetail.jsx`, `ChildFiles.jsx`, `db`, `TalleresManager.jsx`, `DocumentViewer.jsx`, `useDialog`, `FamilyDashboard.jsx`, `InstitutionalGallery.jsx`, `AppointmentsManager.jsx`, `Navbar.jsx`, `ClasesAbiertasManager.jsx`, `AdminConversationDetail.jsx`, `usePushNotifications.js`, `ROLES`, `EventCalendar.jsx`, `App.jsx`, `useNotifications.js`, `AdminNewConversation.jsx`, `ReadReceiptsPanel`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `db` connect `db` to `Navbar.jsx`, `src/config/firebase.js`, `SocialPage.jsx`, `useNotifications.js`, `ClasesAbiertasManager.jsx`, `documentReadReceipts.service.js`, `social.service.js`, `AdminConversationDetail.jsx`, `AdminNewConversation.jsx`, `documents.service.js`, `talleres.service.js`, `ROLES`, `institutionalGallery.service.js`, `FamilyDashboard.jsx`, `EventCalendar.jsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `runScheduled()` connect `appointmentSameDayReminder.js` to `wait-for-emulators.cjs`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `firebase`, `admin`, `serviceAccount` to the rest of the system?**
  _794 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Push Notifications System` be split into smaller, more focused modules?**
  _Cohesion score 0.08735632183908046 - nodes in this community are weakly interconnected._
- **Should `Roles and Permissions System` be split into smaller, more focused modules?**
  _Cohesion score 0.051418439716312055 - nodes in this community are weakly interconnected._
- **Should `galleryHelpers.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12063492063492064 - nodes in this community are weakly interconnected._