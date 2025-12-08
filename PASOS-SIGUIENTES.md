# Pasos Siguientes - Configuración Firebase

## 1. Autenticar Firebase CLI

```bash
firebase login
```

Esto abrirá tu navegador. Inicia sesión con la cuenta de Google que usaste para crear el proyecto Firebase.

## 2. Seleccionar el proyecto

```bash
firebase use puerto-nuevo-montessori
```

## 3. Desplegar Firestore Rules, Storage Rules y Cloud Functions

```bash
firebase deploy
```

Este comando desplegará:
- ✅ Firestore Security Rules
- ✅ Storage Security Rules
- ✅ Cloud Functions (setUserRole, createUserWithRole)

## 4. Crear primer usuario admin

Ve a Firebase Console → Authentication → Users → Add user

- **Email:** admin@puertenuevo.com (o el que prefieras)
- **Password:** (elige una contraseña temporal segura)

Anota el **UID** del usuario creado (lo verás en la lista de usuarios).

## 5. Asignar rol admin al usuario

Una vez desplegadas las Cloud Functions, ejecuta este script para asignar el rol:

Crea un archivo temporal `assign-admin.js` en la raíz del proyecto:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json'); // Ver paso 5.1

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'REEMPLAZAR_CON_EL_UID_DEL_USUARIO';

admin.auth().setCustomUserClaims(uid, { role: 'admin' })
  .then(() => {
    return admin.firestore().collection('users').doc(uid).set({
      role: 'admin',
      email: 'admin@puertenuevo.com',
      displayName: 'Administrador',
      children: [],
      fcmTokens: [],
      disabled: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  })
  .then(() => {
    console.log('✅ Rol admin asignado correctamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
```

### 5.1 Obtener Service Account Key

1. Firebase Console → Configuración del proyecto (⚙️) → Service accounts
2. Click "Generar nueva clave privada"
3. Guarda el archivo JSON como `service-account-key.json` en la raíz del proyecto
4. **IMPORTANTE:** Agrega este archivo al `.gitignore` (ya está incluido)

### 5.2 Ejecutar el script

```bash
node assign-admin.js
```

## 6. Iniciar servidor de desarrollo

```bash
cd puerto-nuevo
npm run dev
```

La app estará en http://localhost:5173

## 7. Probar el login

1. Abre http://localhost:5173
2. Ingresa con:
   - Email: admin@puertenuevo.com
   - Password: (la que creaste en el paso 4)
3. Deberías ser redirigido a `/admin` (Dashboard Administrativo)

## Resumen de comandos (en orden)

```bash
# 1. Login Firebase
firebase login

# 2. Seleccionar proyecto
firebase use puerto-nuevo-montessori

# 3. Desplegar todo
firebase deploy

# 4. Crear usuario en Firebase Console (manual)

# 5. Obtener service account key (manual)

# 6. Asignar rol admin
node assign-admin.js

# 7. Iniciar dev server
cd puerto-nuevo
npm run dev
```

## Siguiente: Fase 1 completada ✅

Una vez que logres hacer login como admin, habremos completado la **Fase 1: Fundamentos MVP**:

- ✅ Proyecto Firebase configurado
- ✅ React + Vite funcionando
- ✅ Sistema de autenticación con roles
- ✅ Security Rules desplegadas
- ✅ Cloud Functions para gestión de usuarios

**Próxima Fase:** Comunicación segmentada + confirmación de lectura obligatoria.
