# 🧠 Guía para Agentes de IA — Puerto Nuevo Montessori

> **Naturaleza:** Reglas de decisión para asistente técnico.  
> **Principio:** Delimitar, no confiar en criterio.

---

## ⚖️ Jerarquía de Resolución de Conflictos

Cuando hay conflicto entre principios, el orden es:

1. **Seguridad y privacidad de menores** > todo lo demás
2. **Reglas de negocio Montessori** > reglas técnicas
3. **Seguridad del sistema** > velocidad de implementación
4. **Costo operativo justificado** > optimización prematura
5. **Simplicidad** > arquitectura sofisticada

### Ejemplos de aplicación

```
Conflicto: "Optimizar query duplicando índices"
Resolución: Si aumenta costo sin justificar ROI → rechazar

Conflicto: "Tallerista pide enviar comunicado urgente"
Resolución: Regla negocio = talleristas NO envían → rechazar

Conflicto: "Cachear info médica para performance"
Resolución: Seguridad > velocidad → rechazar
```

---

## 🛑 Zonas Rojas (Frenado Automático)

El agente **SIEMPRE frena y consulta** en estos casos, sin importar su confianza:

### 1. Migración de datos existentes
```
❌ Prohibido sugerir sin aprobación:
- Scripts que modifiquen colecciones completas
- Cambios de estructura en documentos con datos
- Renombrado de campos en producción
- Eliminación de campos legacy

✅ Debe hacer:
1. Detener
2. Documentar migración propuesta
3. Estimar impacto (N documentos afectados)
4. Solicitar aprobación explícita
```

### 2. Estructura de datos sensibles
```
❌ Prohibido modificar sin aprobación:
- Schema de /children (especialmente info médica)
- Estructura de custom claims
- Campos de responsables/contactos emergencia
- Documentos médicos en Storage

✅ Debe hacer:
1. Detener
2. Explicar por qué el cambio es necesario
3. Mostrar impacto en seguridad/privacidad
4. Esperar aprobación de coordinación
```

### 3. Cambios con impacto en costo
```
❌ Prohibido sin análisis de costo:
- Agregar triggers que escalen (onWrite global)
- Queries sin límite que multipliquen reads
- Funciones scheduled de alta frecuencia (< 1 hora)
- Duplicación de datos sin justificar

✅ Debe hacer:
1. Detener
2. Calcular costo estimado mensual
3. Comparar con alternativa más económica
4. Justificar si el costo vale la funcionalidad
```

### 4. Permisos y autenticación
```
❌ Prohibido sin revisión:
- Agregar/modificar custom claims
- Cambiar matriz de permisos en constants.js
- Modificar firestore.rules o storage.rules
- Crear nuevos roles

✅ Debe hacer:
1. Detener
2. Mostrar tabla "antes → después" de permisos
3. Listar casos de uso afectados
4. Esperar revisión de seguridad
```

### 5. Cuestiones legales o de compliance
```
❌ Prohibido opinar sobre:
- Retención de datos de menores
- Consentimiento parental
- GDPR / Protección de datos personales
- Contratos con proveedores

✅ Debe hacer:
1. Detener inmediatamente
2. Flaggear como "requiere asesoría legal"
3. No sugerir workarounds
```

---

## 💰 Criterios de Costo Operativo

Firebase cobra por:
- **Reads/Writes** de Firestore
- **Invocaciones** de Cloud Functions
- **GB de storage**
- **Ancho de banda** (egress)

### Reglas de optimización

```javascript
// ❌ MAL: Lee toda la colección cada vez
const allChildren = await db.collection('children').get();
const taller1 = allChildren.docs.filter(d => d.data().ambiente === 'taller1');
// Costo: N reads siempre

// ✅ BIEN: Query con índice
const taller1 = await db.collection('children')
  .where('ambiente', '==', 'taller1')
  .get();
// Costo: M reads (solo taller1)
```

### Triggers: evitar cascadas

```javascript
// ❌ MAL: Trigger que escribe → dispara otro trigger → ...
exports.onChildUpdate = functions.firestore
  .document('children/{id}')
  .onWrite(async (change) => {
    await db.collection('audit').add({ ... }); // Dispara onAuditCreate
  });

// ✅ BIEN: Batch write o consolidar lógica
```

### Decisión: nueva funcionalidad

Antes de sugerir algo que aumente costo, responder:

1. **¿Cuántas operaciones nuevas por día?**
2. **¿Hay alternativa con menos reads/writes?**
3. **¿El valor justifica el costo?**

Si la respuesta 3 no es clara → frenar y consultar.

---

## 🎯 Rol y Límites del Agente

### Puede hacer (sin confirmar)
- Generar código en `/src` siguiendo patrones
- Explicar sistema y responder preguntas
- Debuggear errores
- Proponer refactors de componentes
- Sugerir tests

### Requiere confirmación
- Modificar `firestore.rules` o `storage.rules`
- Crear colecciones nuevas en Firestore
- Instalar dependencias NPM
- Cambiar estructura de permisos
- Cualquier cosa en "Zonas Rojas"

### Prohibido (nunca automático)
- Ejecutar `firebase deploy`
- Tocar datos de producción
- Eliminar colecciones/documentos
- Ejecutar migraciones

---

## 🔒 Seguridad y Privacidad

Este sistema maneja datos de menores. Reglas estrictas:

### NO loguear nunca
- Información médica (alergias, tratamientos)
- Datos de menores (nombres, fechas de nacimiento)
- Teléfonos, emails personales
- UIDs en contextos públicos

### NO agregar al repo
- API keys
- Service accounts (`.json`)
- Variables `.env` con credenciales
- Tokens de terceros

### Siempre verificar
```javascript
// ✅ BIEN: Verificar permisos antes de exponer
if (!hasPermission(PERMISSIONS.VIEW_MEDICAL_INFO)) {
  return { ...child, alergias: undefined, tratamientos: undefined };
}
```

---

## 📦 Stack Técnico (referencia)

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite |
| Auth | Firebase Authentication |
| DB | Firestore (Native) |
| Storage | Firebase Storage |
| Backend | Cloud Functions v2 |
| Notificaciones | FCM + Resend |

**Plan actual:** Spark (gratuito, ~100 usuarios)

---

## 👥 Roles y Permisos

| Rol | Envía comunicados | Ve info médica | Gestiona turnos |
|-----|-------------------|----------------|-----------------|
| `superadmin` | ✅ | ✅ | ✅ |
| `coordinacion` | ✅ | ✅ | ✅ |
| `docente` | ✅ | ⚠️ Parcial | ❌ |
| `tallerista` | ❌ | ❌ | ❌ |
| `family` | ❌ | ✅ (solo sus hijos) | ❌ |
| `aspirante` | ❌ | ❌ | ❌ |

### Reglas de negocio críticas

1. **Talleristas NO envían comunicados** (Camila es nexo)
2. **Martes bloqueados para Taller 2** (turnos)
3. **Info médica restringida** por permiso explícito
4. **Turnos**: 30 min duración, 10 min buffer obligatorio

---

## 🗄️ Colecciones Firestore

```
/users              → Perfil + rol
/children           → Ficha alumno + responsables + info médica
/communications     → Comunicados (draft → pending → approved → sent)
/readReceipts       → Confirmaciones lectura
/documents          → Documentos institucionales
/appointments       → Turnos coordinación
/talleres           → Talleres especiales
/snacks             → Sistema snacks por taller
/aspirantes         → Familias en admisión
/conversations      → Mensajería familia ↔ escuela
```

---

## 🗂️ Estructura del Proyecto

```
src/
├── config/
│   ├── constants.js      # PERMISSIONS, ROLES
│   └── firebase.js
├── services/             # Lógica Firestore
├── hooks/
│   └── useAuth.js        # hasPermission(), canSendCommunications()
├── pages/
│   ├── admin/
│   ├── family/
│   ├── teacher/
│   └── ...
└── components/

functions/
├── index.js
└── src/
    ├── triggers/         # onWrite, onCreate
    ├── scheduled/        # Cron jobs
    └── notifications/    # FCM + email
```

---

## 🚀 Comandos (preparar, NO ejecutar)

```bash
# Desarrollo
npm run dev

# Build (agente prepara, humano ejecuta)
npm run build

# Deploy hosting
firebase deploy --only hosting

# Deploy functions
cd functions && npm install && firebase deploy --only functions

# Deploy reglas
firebase deploy --only firestore:rules,storage
```

> ⚠️ El agente **prepara** estos comandos, el humano **los ejecuta**.

---

## 🎯 Contexto de Dominio Montessori

- **Taller 1 y 2**: Ambientes (aulas)
- **Guías**: Así se llama a los docentes
- **Talleres especiales**: Robótica, Yoga, Teatro, Folclore, Inglés
- **Aspirantes**: Familias en proceso de admisión
- **Escuela pequeña**: ~50 familias, 6 docentes

---

## ✅ Checklist Pre-Sugerencia de Deploy

Antes de proponer `firebase deploy`, verificar:

- [ ] No hay `console.log()` con datos sensibles
- [ ] Reglas de Firestore/Storage revisadas (si tocaste)
- [ ] Cambios en permisos aprobados por coordinación
- [ ] Estimación de impacto en costo (si aplica)
- [ ] Tests locales pasando
- [ ] Documentación actualizada (si agregaste features)

---

## 📝 Codificación de Caracteres (UTF-8)

Este proyecto está en **español** y usa emojis. SIEMPRE mantener codificación UTF-8.

### ⚠️ REGLAS OBLIGATORIAS

```javascript
// ✅ SIEMPRE usar caracteres UTF-8 correctos
"¡Tu turno!"          // ¡ correcto
"← Volver"            // ← flecha correcta
"✓ Confirmar"         // ✓ check mark correcto
"✗ Rechazar"          // ✗ X mark correcto
"⚠️ Advertencia"      // ⚠️ emoji correcto
"📋 Historial"        // 📋 emoji correcto

// ❌ NUNCA permitir mojibake (caracteres corruptos)
"Â¡Tu turno!"         // ❌ corrupto
"? Volver"            // ❌ corrupto
"âœ" Confirmar"       // ❌ corrupto
"âš ï¸ Advertencia"   // ❌ corrupto
```

### Caracteres comunes en español

| Correcto | Descripción | NUNCA usar |
|----------|-------------|------------|
| `¡` | Exclamación apertura | `Â¡` |
| `¿` | Interrogación apertura | `Â¿` |
| `á é í ó ú` | Vocales acentuadas | `Ã¡ Ã© Ã­ Ã³ Ãº` |
| `ñ` | Eñe | `Ã±` |
| `←` | Flecha izquierda | `?` o `â†` |
| `✓` | Check mark | `âœ"` |
| `✗` | X mark | `âœ—` |
| `⚠️` | Advertencia | `âš ï¸` |
| `📋` | Clipboard | corrupciones |

### Cómo detectar problemas

```bash
# Buscar mojibake en archivos
grep -r "â\|Ã\|Â" src/

# Buscar caracteres problemáticos
grep -r "âœ\|âš\|â†" src/
```

### Cuando edites o crees archivos

1. **SIEMPRE verificar** que emojis y caracteres especiales se vean correctos
2. **NUNCA copiar** texto de fuentes con codificación diferente sin revisar
3. **SI ves** `â`, `Ã`, `Â` → es mojibake, corregir inmediatamente
4. **ANTES de commit** revisar que no hay caracteres corruptos

### Archivos más sensibles

- `src/pages/family/*` → interfaz en español para familias
- `src/pages/teacher/*` → mensajes a docentes
- `src/components/communications/*` → comunicados oficiales
- `src/pages/admin/*` → cualquier texto user-facing

### En caso de encontrar mojibake

```javascript
// 1. Identificar el carácter corrupto
"âš ï¸" // ← esto está mal

// 2. Buscar todas las ocurrencias
grep -n "âš ï¸" src/pages/family/MySnacks.jsx

// 3. Reemplazar con UTF-8 correcto
"⚠️" // ← esto está bien

// 4. Verificar en navegador que se ve correcto
```

---

## ⏰ Meta-Límite Temporal

> **Si este archivo tiene más de 3 meses desde su última actualización, el agente debe:**

1. Advertir al usuario que la información puede estar desactualizada
2. Sugerir verificar cambios recientes en el código antes de confiar en estas reglas
3. Proponer actualizar este documento si detecta inconsistencias

**Fecha de referencia:** Enero 2026  
**Umbral de advertencia:** 3 meses (Abril 2026)

---

*Última actualización: Enero 2026*  
*Versión: 2.0 (determinística)*
