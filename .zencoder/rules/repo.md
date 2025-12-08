---
description: Repository Information Overview
alwaysApply: true
---

# Puerto Nuevo Montessori Platform Information

## Repository Summary
Educational intranet + institutional portal for Montessori school. Firebase-based full-stack platform with React frontend, Cloud Functions backend, and multi-role authentication system.

## Repository Structure
- **DATOS/**: Original documentation and guides
- **functions/**: Firebase Cloud Functions backend
- **puerto-nuevo/**: React frontend application
- **firebase.json**: Firebase services configuration
- **firestore.rules/storage.rules**: Security rules
- **ESTADO-ACTUAL.md**: Current project status

### Main Repository Components
- **Frontend**: React 18 + Vite 5 single-page application
- **Backend**: Firebase Cloud Functions with admin/user role management
- **Database**: Firestore with custom security rules
- **Storage**: Firebase Storage with file upload capabilities
- **Authentication**: Firebase Auth with custom claims and role-based access

## Projects

### Frontend (puerto-nuevo/)
**Configuration File**: `puerto-nuevo/package.json`

#### Language & Runtime
**Language**: JavaScript (JSX)  
**Version**: Node.js 20+  
**Build System**: Vite 7.2.4  
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- react: ^19.2.0
- react-dom: ^19.2.0  
- react-router-dom: ^7.10.1
- firebase: ^12.6.0

**Development Dependencies**:
- @vitejs/plugin-react: ^5.1.1
- eslint: ^9.39.1
- vite: ^7.2.4

#### Build & Installation
```bash
cd puerto-nuevo
npm install
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Code linting
```

### Backend (functions/)
**Configuration File**: `functions/package.json`

#### Language & Runtime
**Language**: JavaScript (Node.js)  
**Version**: Node.js 20  
**Runtime**: Firebase Cloud Functions v2  
**Package Manager**: npm

#### Dependencies
**Main Dependencies**:
- firebase-admin: ^12.0.0
- firebase-functions: ^5.0.0

**Development Dependencies**:
- firebase-functions-test: ^3.1.0

#### Build & Installation
```bash
cd functions
npm install
npm run serve        # Local emulator
npm run deploy       # Deploy to Firebase
npm run logs         # View function logs
```

### Firebase Configuration
**Type**: Backend-as-a-Service Platform

#### Specification & Tools
**Type**: Firebase project configuration  
**Version**: Firebase CLI v12+  
**Required Tools**: firebase-tools (global install)

#### Key Resources
**Main Files**:
- `firebase.json`: Project configuration
- `firestore.rules`: Database security rules  
- `firestore.indexes.json`: Database indexes
- `storage.rules`: File storage security rules

**Configuration Structure**:
- Hosting points to `puerto-nuevo/dist`
- Functions source in `functions/` directory
- Firestore and Storage rules defined separately

#### Usage & Operations
**Key Commands**:
```bash
firebase login
firebase use puerto-nuevo-montessori
firebase deploy                        # Deploy everything
firebase deploy --only hosting         # Frontend only
firebase deploy --only functions       # Backend only
firebase deploy --only "firestore,storage"  # Rules only
```

**Integration Points**:
- Frontend consumes Firebase SDK for auth and data
- Cloud Functions handle admin operations and user management
- Firestore stores user profiles, roles, and application data
- Firebase Hosting serves the built React application

#### Validation
**Quality Checks**: ESLint for frontend code quality
**Testing Approach**: No automated tests configured (manual testing approach)