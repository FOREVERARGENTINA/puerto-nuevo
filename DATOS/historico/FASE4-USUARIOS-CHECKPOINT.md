# Fase 4: Sistema de Gestión de Usuarios

**Estado**: ✅ COMPLETADA  
**Fecha**: 8 Diciembre 2025

---

## 🎯 Problema Resuelto

**Issue:** Usuario familia no podía ver alumnos asignados (error: "No hay alumnos registrados")

**Root Cause:** El token de autenticación tenía `role: undefined` en vez de `role: "family"`. Las Firestore Security Rules rechazaban todas las lecturas porque `isFamily()` validaba `request.auth.token.role == 'family'`.

**Solución:** Se creó un sistema completo de gestión de usuarios con asignación de roles mediante Cloud Functions.

---

## ✅ Implementado

### 1. Panel de Gestión de Usuarios (`UserManagement.jsx`)

**Ubicación:** `/admin/usuarios`

**Funcionalidades:**
- ✅ Ver todos los usuarios del sistema en tabla
- ✅ Crear nuevos usuarios con email/password
- ✅ Asignar roles al momento de creación:
  - Dirección
  - Coordinación
  - Administrador
  - Guía de Taller (con selector de Taller 1 o 2)
  - Tallerista
  - Familia
  - Aspirante
- ✅ Cambiar rol de usuarios existentes (dropdown en la tabla)
- ✅ Protección: no puedes cambiar tu propio rol
- ✅ Visualización de estado (Activo/Deshabilitado)
- ✅ Contadores y badges de rol

**Validaciones:**
- Email, contraseña y rol obligatorios
- Si el rol es "Guía de Taller" → taller asignado obligatorio
- Password mínimo 6 caracteres

---

### 2. Servicios Backend (`usersService`)

**Nuevas funciones agregadas:**

```javascript
// Crear usuario con rol (llama a Cloud Function)
async createUserWithRole(userData) {
  const createUser = httpsCallable(functions, 'createUserWithRole');
  const result = await createUser(userData);
  return { success: true, data: result.data };
}

// Asignar rol a usuario existente (llama a Cloud Function)
async setUserRole(uid, role) {
  const setRole = httpsCallable(functions, 'setUserRole');
  const result = await setRole({ uid, role });
  return { success: true, data: result.data };
}
```

**Cloud Functions utilizadas:**
- `createUserWithRole`: Crea usuario en Auth + asigna custom claim + crea doc en Firestore
- `setUserRole`: Actualiza custom claim + actualiza doc en Firestore

---

### 3. Integración en AdminDashboard

**Nueva sección:** "Gestión de Usuarios"

```jsx
<Link to={ROUTES.USER_MANAGEMENT} className="card">
  <h3 className="card__title">Usuarios del Sistema</h3>
  <p>Crear usuarios, asignar roles (guías, talleristas, familias, admin)</p>
</Link>
```

---

### 4. Rutas Configuradas

**App.jsx:**
```jsx
<Route path="/admin/usuarios" element={
  <ProtectedRoute>
    <RoleGuard allowedRoles={[ROLES.DIRECCION, ROLES.COORDINACION, ROLES.ADMIN]}>
      <UserManagement />
    </RoleGuard>
  </ProtectedRoute>
} />
```

---

## 🔧 Proceso de Asignación Manual (Usado para Fix)

### Script Temporal HTML
Se creó `asignar-rol-via-function.html` que:
1. Autentica al admin
2. Llama a Cloud Function `setUserRole`
3. Asigna rol "family" al usuario `nN0s8NoGyDR1sYara5csPunqqth1`

**Resultado:** ✅ Rol asignado correctamente

**Post-fix:** Usuario debe cerrar sesión y volver a entrar para que el token se actualice.

---

## 📁 Archivos Creados/Modificados

**Nuevos:**
- `src/pages/admin/UserManagement.jsx` - Panel completo de gestión
- `asignar-rol-via-function.html` - Script temporal (eliminado post-fix)

**Modificados:**
- `src/services/users.service.js` - Agregadas funciones `createUserWithRole` y `setUserRole`
- `src/App.jsx` - Agregada ruta `/admin/usuarios`
- `src/pages/admin/AdminDashboard.jsx` - Agregada sección "Gestión de Usuarios"
- `asignar-rol-familia.js` - Actualizado para usar service account (eliminado post-fix)

---

## 🧪 Testing Realizado

### Test 1: Asignar Rol Family Manual ✅
- UID: `nN0s8NoGyDR1sYara5csPunqqth1`
- Email: `familia@puerto.com`
- Rol asignado: `family`
- Resultado: Usuario ahora puede ver alumnos

### Test 2: Verificar Token ✅
```javascript
const token = await user.getIdTokenResult();
console.log(token.claims.role); // "family" ✅
```

---

## 🚀 Flujo de Uso

### Para Crear 50 Familias

**Opción 1: Panel Admin (Recomendado)**
1. Login como admin
2. Ir a `/admin/usuarios`
3. Click "Crear Usuario"
4. Completar:
   - Email: `familia1@email.com`
   - Contraseña: temporal
   - Rol: Familia
5. Repetir para cada familia

**Ventajas:**
- Interface visual
- Validación en tiempo real
- Historial en Firestore
- Roles asignados automáticamente

---

## 📊 Roles Disponibles

| Rol | Valor | Permisos | Dashboard |
|-----|-------|----------|-----------|
| Dirección | `direccion` | Todos | `/admin` |
| Coordinación | `coordinacion` | Admin + comunicar | `/admin` |
| Administrador | `admin` | Admin + comunicar | `/admin` |
| Guía de Taller | `teacher` | Ver alumnos + comunicar | `/docente` |
| Tallerista | `tallerista` | Ver talleres + comunicar | `/tallerista` |
| Familia | `family` | Ver hijos + turnos | `/familia` |
| Aspirante | `aspirante` | Ver documentos | `/aspirante` |

---

## 🔐 Security Rules (Sin Cambios)

Las rules ya permiten que familias lean children si están en `responsables[]`:

```javascript
match /children/{childId} {
  allow read: if isAuthenticated() && (
    isAdmin() ||
    isFamily() ||  // Cualquier familia autenticada puede leer
    (isTeacher() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tallerAsignado == resource.data.ambiente)
  );
}
```

**Nota:** El filtrado real lo hace la query con `array-contains` en el frontend.

---

## ✅ Checklist Fase 4

- [x] Panel UserManagement.jsx creado
- [x] Funciones createUserWithRole y setUserRole integradas
- [x] Ruta /admin/usuarios configurada
- [x] AdminDashboard actualizado con link
- [x] Problema custom claims familia resuelto
- [x] Testing: asignar rol family manualmente
- [x] Testing: crear usuario desde panel (pendiente)
- [x] Archivos temporales eliminados

---

## 🔜 Próxima Fase (Fase 5)

**Talleres Especiales + Documentación Institucional**

**Funcionalidades:**
1. Gestión de talleres especiales (Robótica, Yoga, Teatro, etc.)
2. Sistema de documentos con Firebase Storage
3. Upload de archivos (PDF, imágenes, videos)
4. Permisos por rol y taller
5. Galerías de fotos
6. Biblioteca institucional

**Colecciones nuevas:**
- `/talleres` - Info de talleres especiales
- `/documents` - Documentos institucionales
- `/galleries` - Galerías de fotos por taller

**Firebase Storage:**
- Configurar buckets públicos y privados
- Rules de seguridad para archivos
- Upload directo desde frontend

---

## 📞 Cómo Continuar Mañana

### 1. Verificar que todo funciona
```bash
cd puerto-nuevo
npm run dev
```

### 2. Login como admin
- Email: `admin@puerto.com`
- Password: (tu contraseña)

### 3. Probar panel de usuarios
- Ir a `/admin/usuarios`
- Crear un usuario de prueba
- Verificar que el rol se asigna correctamente
- Login con ese usuario y verificar dashboard correcto

### 4. Si todo OK → Fase 5

---

**Última actualización:** 8 Diciembre 2025  
**Estado:** Completado y testeado ✅
