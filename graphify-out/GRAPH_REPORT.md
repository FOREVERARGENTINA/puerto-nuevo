# Graph Report - .  (2026-07-11)

## Corpus Check
- 305 files · ~251,871 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 297 nodes · 166 edges · 161 communities (14 shown, 147 thin omitted)
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Push Notifications & FCM
- Roles & Permissions
- Dev Practices & Architecture
- Brand Assets (Icons)
- Turnos por Taller
- Communications & Read Receipts
- Snacks System
- PWA & Security
- Clases Abiertas
- PWA Icons
- TypeScript Migration
- Push Notifications Plans
- Gallery Album Views
- Microsoft Tiles
- Testing Setup
- Project Status
- Children Management
- Index HTML
- LLMs.txt
- Mapa App
- OG Images
- Brand SVGs
- Tech Stack
- Album Content Mosaic
- Album View Options
- Mapa Classroom Type
- Mapa Graph Data Type
- Mapa Person Type
- Mapa Relationship Type
- Mapa Role Type
- Code.txt
- Robots.txt
- Encoding README
- DMs Feature Guard
- Login Form
- Protected Route
- Role Guard
- Social Feature Guard
- Alert Dialog
- Confirm Dialog
- Event Detail Modal
- File Selection List
- File Upload Selector
- Loading Modal
- Loading Screen
- Modal
- Modal Body
- Modal Footer
- Modal Header
- PWA Install Prompt
- Communication Card
- Communication Rich Content
- Communication Rich Text Editor
- Read Confirmation Modal
- Read Receipts Section
- View Communication Modal
- Document Mandatory Read Modal
- Document Read Receipts Panel
- Document Uploader
- Document Viewer
- Welcome Modal
- Album Manager
- Category Manager
- Media Grid
- Media Uploader
- Gallery Breadcrumbs
- Institutional Lightbox
- Album Grid
- Album Mosaic
- Category Grid
- Breadcrumbs
- Event Calendar
- Layout
- Navbar
- Notification Dropdown
- Sidebar
- Avatar
- Calendario Convocatoria
- Emoji Picker
- Icon
- Theme Toggle
- Ambiente Activities Config
- Constants
- Constants Test
- Document Categories
- Document Routes
- Firebase Config
- Data
- Use Admin Conversations
- Use Admin Summary
- Use Auth
- Use Clases Abiertas
- Use Communications
- Use Conversations
- Use Dialog
- Use Direct Messages
- Use Document Unread Count
- Use Notifications
- Use Push Notifications
- Use PWA Install
- Use Theme
- Main
- Auth Action
- Login
- Under Construction
- Admin Conversation Detail
- Admin Conversations
- Admin Dashboard
- Admin New Conversation
- Appointments Manager
- Children Manager
- Clases Abiertas Manager
- Documents Admin
- Events Manager
- Institutional Gallery Manager
- Read Receipts Panel
- Send Communication
- Snacks Calendar
- Snacks Lists
- Talleres List
- Talleres Manager
- User Management
- Aspirante Dashboard
- Ambiente Activities
- Book Appointment
- Child Profile
- Clases Abiertas
- Communication Detail
- Communications
- Direct Message Thread
- Direct Messages List
- Events Calendar
- Family Conversation Detail
- Family Conversations
- Family Dashboard
- Family Horarios Placeholder
- Family New Conversation
- My Snacks
- Talleres Especiales
- Ambiente Activities Manager
- Document Detail
- Documents
- Horario Semanal
- Institutional Gallery
- Social Page
- Document Manager
- My Taller Especial
- Taller Gallery
- Tallerista Dashboard
- Teacher Communication Detail
- Teacher Communications
- Teacher Dashboard
- Ambiente Activities Service
- Appointments Service
- Auth Service
- Children Service
- Clases Abiertas Service
- Communications Service
- Conversations Service
- Direct Messages Service
- Document Access Service

## God Nodes (most connected - your core abstractions)
1. `Roles and Permissions System` - 17 edges
2. `Guia para Agentes de IA` - 12 edges
3. `Guia Consolidada de Desarrollo Web Moderno 2026` - 12 edges
4. `Push Notifications System` - 12 edges
5. `Apple Touch Icon Default` - 9 edges
6. `Claude Code Project Configuration` - 8 edges
7. `Checklist Turnos por Taller` - 6 edges
8. `Communications System` - 5 edges
9. `Push Notifications Utility (Backend)` - 5 edges
10. `Favicon 128px` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Tiny Upload Test Fixture` --conceptually_related_to--> `Favicon 128px`  [INFERRED]
  tests/fixtures/tiny-upload.txt → public/favicon-128.png
- `Tiny Upload Test Fixture` --conceptually_related_to--> `Login Screen Logo`  [INFERRED]
  tests/fixtures/tiny-upload.txt → public/logo-login.png
- `Estado Real de Implementacion` --references--> `Guia para Agentes de IA`  [INFERRED]
  ESTADO-IMPLEMENTACION-REAL.md → docs/agents.md
- `Communications System` --references--> `onCommunicationCreated Trigger`  [EXTRACTED]
  ESTADO-ACTUAL.md → docs/plans/PLAN3.md
- `CSS Nesting Native` --conceptually_related_to--> `Claude Code Project Configuration`  [EXTRACTED]
  docs/guia.md → .claude.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Push Notifications Full-Stack Implementation** — system_push_notifications, hook_use_push_notifications, util_push_notifications, sw_firebase_messaging, component_notification_prompt, fcollection_fcm_tokens [INFERRED 0.85]
- **Role-Permission Matrix Implementation** — system_roles_permissions, role_superadmin, role_coordinacion, role_docente, permission_send_communications, config_constants [EXTRACTED 1.00]
- **Communication Read Receipt Flow** — system_communications, fcollection_read_receipts, service_communications, trigger_on_communication_created, comunicaciones_destinatarios_md [EXTRACTED 1.00]
- **Turnos por Taller Feature (plan + checklist + implementation)** — docs_plans_plan_turnospertaller_prompt, docs_plans_checklist_turnospertaller_prompt, docs_superpowers_plans_2026_03_21_turnos_por_taller [EXTRACTED 1.00]
- **Gallery Album Views Feature (plan + spec)** — docs_superpowers_plans_2026_03_11_gallery_album_views, docs_superpowers_specs_2026_03_11_gallery_album_views_design, docs_superpowers_plans_2026_03_11_gallery_album_views_albummosaic [EXTRACTED 1.00]
- **Clases Abiertas Feature (plan + spec + service)** — docs_superpowers_plans_2026_05_16_clases_abiertas, docs_superpowers_specs_2026_05_16_clases_abiertas_design, docs_superpowers_plans_2026_05_16_clases_abiertas_clasesabiertasservice [EXTRACTED 1.00]
- **Apple Touch Icon Multi-Resolution Set** — public_apple_touch_icon_png, public_apple_touch_icon_57x57_png, public_apple_touch_icon_60x60_png, public_apple_touch_icon_72x72_png, public_apple_touch_icon_76x76_png, public_apple_touch_icon_114x114_png, public_apple_touch_icon_120x120_png, public_apple_touch_icon_144x144_png, public_apple_touch_icon_152x152_png [INFERRED 0.95]
- **Favicon Multi-Resolution Set** — public_favicon_128_png, public_favicon_16x16_png, public_favicon_32x32_png, public_favicon_96x96_png, public_favicon_196x196_png [INFERRED 0.95]
- **Microsoft Tile Multi-Resolution Set** — public_mstile_310x310_png, public_mstile_144x144_png, public_mstile_150x150_png, public_mstile_310x150_png [INFERRED 0.95]
- **PWA Icon Family - multi-platform app icons derived from master source** — public_pwa_icon_master_png, public_pwa_icon_512_png, public_pwa_icon_512_maskable_png, public_pwa_icon_192_png, public_pwa_apple_touch_icon_png, public_mstile_70x70_png [INFERRED 0.90]
- **Open Graph Social Meta Images - same image in two formats** — public_og_image_jpg, public_og_image_png [INFERRED 0.90]
- **Vite and React Build Toolchain Branding Logos** — public_vite_svg, src_assets_react_svg [INFERRED 0.85]

## Communities (161 total, 147 thin omitted)

### Community 0 - "Push Notifications & FCM"
Cohesion: 0.11
Nodes (24): IOSInstallPrompt Component, NotificationPrompt Component, PwaInstallPrompt Component, Dedicated FCM Service Worker, Direct Trigger Notification Architecture, FCM Token Subcollection Architecture, iOS PWA Install Requirement, Notification Payload Privacy (+16 more)

### Community 1 - "Roles & Permissions"
Cohesion: 0.09
Nodes (23): Social Pilot Access Rollback Checkpoint, Granular Role-Based Permissions System, src/config/constants.js, Firestore /talleres Collection, useAuth Hook, approve_communications Permission, manage_appointments Permission, manage_talleres Permission (+15 more)

### Community 2 - "Dev Practices & Architecture"
Cohesion: 0.16
Nodes (19): Claude Code Project Configuration, GitHub Copilot Instructions, Web Accessibility (a11y), CSS Nesting Native, INP Optimization, isTestUser Flag, Mobile-First Design, Security Is Non-Negotiable (+11 more)

### Community 3 - "Brand Assets (Icons)"
Cohesion: 0.12
Nodes (16): Apple Touch Icon 114x114, Apple Touch Icon 120x120, Apple Touch Icon 144x144, Apple Touch Icon 152x152, Apple Touch Icon 57x57, Apple Touch Icon 60x60, Apple Touch Icon 72x72, Apple Touch Icon 76x76 (+8 more)

### Community 4 - "Turnos por Taller"
Cohesion: 0.20
Nodes (11): Checklist Turnos por Taller, AMBIENTES (TALLER_1, TALLER_2), Conflict Check Per Ambiente, Legacy Slot Cutoff, slotGroupKey, Plan Sobreturno Manual Reuniones, createManualSlot, Plan Turnos por Taller (+3 more)

### Community 5 - "Communications & Read Receipts"
Cohesion: 0.40
Nodes (6): Comunicaciones Destinatarios and Read Receipts, Read Receipts Client-Side Calculation, Firestore /communications Collection, Firestore /readReceipts Collection, Communications Service, Communications System

### Community 6 - "Snacks System"
Cohesion: 0.33
Nodes (6): Cost-Conscious Optimization, Firestore /snacks Collection, Snacks Service, Sistema de Calendario de Snacks, Snacks Calendar System, sendSnacksReminder Cloud Function

### Community 7 - "PWA & Security"
Cohesion: 0.33
Nodes (6): PWA Push Notifications Plan, FCM Tokens Subcollection, Payload Privacy Rule, usePushNotifications Hook, Track 0 Security Audit, Service Account Key Audit

### Community 8 - "Clases Abiertas"
Cohesion: 0.40
Nodes (6): Clases Abiertas Implementation Plan, clasesAbiertasService, Convocatoria Activa Deterministic Index, Cupo Desnormalized Counter, Clases Abiertas Design Spec, Reinicial Anual Pattern

### Community 9 - "PWA Icons"
Cohesion: 0.47
Nodes (6): Microsoft Tile Icon 70x70, Apple Touch Icon for iOS, PWA Icon 192x192, PWA Maskable Icon 512x512, PWA Icon 512x512, PWA Master Icon Source

### Community 10 - "TypeScript Migration"
Cohesion: 0.40
Nodes (5): TypeScript Package Upgrade Plan, TypeScript Package Upgrade Progress, TypeScript Package Upgrade Summary, TypeScript Package Upgrade Migration, 131 Tests Passing

### Community 11 - "Push Notifications Plans"
Cohesion: 0.60
Nodes (5): Push Notifications Design Document, Push Notifications Implementation Plan, Push Notifications Final Unified Plan, Push Notifications Final Execution Plan, Push Notifications Unified Plan

### Community 12 - "Gallery Album Views"
Cohesion: 0.50
Nodes (4): Gallery Album Views Plan, AlbumGrid Feed List, AlbumMosaic Component, Gallery Album Views Design Spec

### Community 13 - "Microsoft Tiles"
Cohesion: 0.50
Nodes (4): Microsoft Tile 144x144, Microsoft Tile 150x150, Microsoft Tile 310x150, Microsoft Tile 310x310

## Knowledge Gaps
- **213 isolated node(s):** `Role`, `Classroom`, `Person`, `Relationship`, `GraphData` (+208 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **147 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Roles and Permissions System` connect `Roles & Permissions` to `Dev Practices & Architecture`, `Communications & Read Receipts`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `Guia para Agentes de IA` connect `Dev Practices & Architecture` to `Roles & Permissions`, `Snacks System`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `Communications System` connect `Communications & Read Receipts` to `Push Notifications & FCM`, `Roles & Permissions`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Guia para Agentes de IA` (e.g. with `Guia Consolidada de Desarrollo Web Moderno 2026` and `Estado Real de Implementacion`) actually correct?**
  _`Guia para Agentes de IA` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `Apple Touch Icon Default` (e.g. with `Apple Touch Icon 114x114` and `Apple Touch Icon 120x120`) actually correct?**
  _`Apple Touch Icon Default` has 9 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Role`, `Classroom`, `Person` to the rest of the system?**
  _226 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Push Notifications & FCM` be split into smaller, more focused modules?**
  _Cohesion score 0.11231884057971014 - nodes in this community are weakly interconnected._