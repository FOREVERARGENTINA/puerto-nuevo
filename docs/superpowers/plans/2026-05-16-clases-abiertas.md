# Clases Abiertas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar la sección "Clases Abiertas" al portal de Puerto Nuevo, permitiendo que Admin/Coordinación configure convocatorias de Ambiente Abierto y Taller Abierto por taller, y que las familias se inscriban según el ambiente de sus hijos.

**Architecture:** Colección Firestore `/clasesAbiertas` independiente con subcolección `/inscripciones`. Los días se guardan como array embebido en el documento de convocatoria. El cupo se controla con `transaction.get` sobre el doc padre (campos `cupos` y `familiasDia`). La UI familia deriva "Completo" leyendo `convocatoria.cupos[diaId]` del doc padre — sin necesidad de leer inscripciones de terceros, evitando el conflicto con las reglas de seguridad. Toda la UI es inline (sin modales).

**Tech Stack:** React 19, Firebase 12 (Firestore, Auth), React Router v7, CSS custom properties (design-system.css)

---

## Decisiones de arquitectura clave

### Cupo sin leer inscripciones de terceros
El campo `cupos: { [diaId]: number }` en el doc de convocatoria actúa como contador desnormalizado. La familia puede leer el doc de convocatoria (regla de padre) y derivar el estado "Completo" de ahí. No necesita acceso a inscripciones de otras familias.

### Reinicio anual
Dos flujos distintos para admin cuando hay una convocatoria inactiva:
- **Reactivar:** reactiva el doc existente con sus días e inscripciones intactos. Útil si se desactivó por error o temporalmente.
- **Nueva convocatoria:** crea un doc nuevo limpio (días `[]`, cupos `{}`, familiasDia `{}`), desactiva la anterior. Útil para el ciclo anual.

Cuando no hay convocatoria previa, solo aparece "Crear convocatoria" (path directo a `createNuevaConvocatoria`).

### `deleteDia` limpia estado del doc padre
El batch que borra inscripciones también elimina `cupos[diaId]` y `familiasDia[familiaUid]` de las familias que tenían ese día, dejando el doc padre consistente.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/config/constants.js` | Modificar | Agregar rutas ADMIN_CLASES_ABIERTAS y FAMILY_CLASES_ABIERTAS |
| `src/services/clasesAbiertas.service.js` | Crear | CRUD de convocatorias, días e inscripciones |
| `src/hooks/useClasesAbiertas.js` | Crear | Carga de convocatorias activas e inscripciones propias |
| `firestore.rules` | Modificar | Reglas para /clasesAbiertas y /inscripciones |
| `src/pages/admin/ClasesAbiertasManager.jsx` | Crear | Panel admin: gestión de convocatorias, días e inscriptos |
| `src/pages/family/ClasesAbiertas.jsx` | Crear | Vista familia: inscripción/desanotación |
| `src/components/layout/Sidebar.jsx` | Modificar | Agregar ítem "Clases Abiertas" en admin y familia |
| `src/App.jsx` | Modificar | Agregar 2 rutas nuevas con lazy imports |

---

## Task 1: Constantes de rutas

**Files:**
- Modify: `src/config/constants.js`

- [ ] **Step 1: Agregar las rutas en el objeto ROUTES**

En `src/config/constants.js`, dentro del objeto `ROUTES`, agregar después de `ADMIN_ACTIVITIES`:

```js
ADMIN_CLASES_ABIERTAS: '/portal/admin/clases-abiertas',
```

Y dentro del bloque `// Family`, después de `FAMILY_ACTIVITIES`:

```js
FAMILY_CLASES_ABIERTAS: '/portal/familia/clases-abiertas',
```

- [ ] **Step 2: Verificar que no hay errores de sintaxis**

```powershell
cd "D:\Aideas\PUERTO NUEVO"
node -e "import('./src/config/constants.js').then(() => console.log('OK'))" 2>&1
```

Resultado esperado: `OK`

- [ ] **Step 3: Commit**

```powershell
git add src/config/constants.js
git commit -m "feat: add ADMIN_CLASES_ABIERTAS and FAMILY_CLASES_ABIERTAS routes to constants"
```

---

## Task 2: Servicio Firestore

**Files:**
- Create: `src/services/clasesAbiertas.service.js`

- [ ] **Step 1: Crear el archivo del servicio**

```js
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  runTransaction,
  deleteField
} from 'firebase/firestore';
import { db } from '../config/firebase';

const clasesAbiertasCol = collection(db, 'clasesAbiertas');
const inscripcionesCol = (convocatoriaId) =>
  collection(db, 'clasesAbiertas', convocatoriaId, 'inscripciones');

const generateDiaId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const clasesAbiertasService = {
  // ── Convocatorias ──────────────────────────────────────────────

  async getConvocatoriaActiva(tipo, ambiente) {
    try {
      const q = query(
        clasesAbiertasCol,
        where('tipo', '==', tipo),
        where('ambiente', '==', ambiente),
        where('activo', '==', true)
      );
      const snap = await getDocs(q);
      if (snap.empty) return { success: true, convocatoria: null };
      const d = snap.docs[0];
      return { success: true, convocatoria: { id: d.id, ...d.data() } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Busca la convocatoria más reciente (activa o no) para ese tipo+ambiente.
  // Usada por el admin para mostrar la opción de reactivar o arrancar nueva.
  async getConvocatoriaReciente(tipo, ambiente) {
    try {
      const q = query(
        clasesAbiertasCol,
        where('tipo', '==', tipo),
        where('ambiente', '==', ambiente)
      );
      const snap = await getDocs(q);
      if (snap.empty) return { success: true, convocatoria: null };
      // Si hay varias, tomamos la más nueva por createdAt
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return tb - ta;
      });
      return { success: true, convocatoria: docs[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Reactiva el doc existente con sus días e inscripciones intactos.
  async reactivateConvocatoria(convocatoriaId) {
    try {
      await updateDoc(doc(clasesAbiertasCol, convocatoriaId), {
        activo: true,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Crea un doc nuevo limpio y desactiva la convocatoria anterior si existe.
  async createNuevaConvocatoria(tipo, ambiente, uid, convocatoriaAnteriorId = null) {
    try {
      const batch = writeBatch(db);

      if (convocatoriaAnteriorId) {
        batch.update(doc(clasesAbiertasCol, convocatoriaAnteriorId), {
          activo: false,
          updatedAt: serverTimestamp()
        });
      }

      const newRef = doc(clasesAbiertasCol);
      batch.set(newRef, {
        tipo,
        ambiente,
        activo: true,
        dias: [],
        cupos: {},       // { [diaId]: number } — contador desnormalizado para control de cupo
        familiasDia: {}, // { [familiaUid]: diaId } — qué día eligió cada familia
        creadoPor: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await batch.commit();
      return { success: true, id: newRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async toggleConvocatoria(convocatoriaId, activo) {
    try {
      await updateDoc(doc(clasesAbiertasCol, convocatoriaId), {
        activo,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ── Días (array embebido) ───────────────────────────────────────

  async addDia(convocatoriaId, dia) {
    try {
      const convRef = doc(clasesAbiertasCol, convocatoriaId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) return { success: false, error: 'Convocatoria no encontrada' };

      const nuevoDia = { ...dia, id: generateDiaId() };
      const dias = convSnap.data().dias || [];
      await updateDoc(convRef, {
        dias: [...dias, nuevoDia],
        updatedAt: serverTimestamp()
      });
      return { success: true, dia: nuevoDia };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateDia(convocatoriaId, diaId, cambios) {
    try {
      const convRef = doc(clasesAbiertasCol, convocatoriaId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) return { success: false, error: 'Convocatoria no encontrada' };

      const dias = (convSnap.data().dias || []).map((d) =>
        d.id === diaId ? { ...d, ...cambios } : d
      );
      await updateDoc(convRef, { dias, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Elimina el día del array, borra sus inscripciones Y limpia cupos/familiasDia
  // del doc padre para ese día, dejando el estado transaccional consistente.
  async deleteDia(convocatoriaId, diaId) {
    try {
      const convRef = doc(clasesAbiertasCol, convocatoriaId);
      const [convSnap, inscSnap] = await Promise.all([
        getDoc(convRef),
        getDocs(query(inscripcionesCol(convocatoriaId), where('diaId', '==', diaId)))
      ]);

      if (!convSnap.exists()) return { success: false, error: 'Convocatoria no encontrada' };

      const convData = convSnap.data();
      const diasFiltrados = (convData.dias || []).filter((d) => d.id !== diaId);

      // Familias que tenían este día reservado en familiasDia
      const familiasDia = convData.familiasDia || {};
      const familiasDelDia = Object.entries(familiasDia)
        .filter(([, did]) => did === diaId)
        .map(([uid]) => uid);

      const batch = writeBatch(db);

      // Borrar inscripciones huérfanas
      inscSnap.docs.forEach((d) => batch.delete(d.ref));

      // Limpiar el estado del doc padre
      const updatePayload = {
        dias: diasFiltrados,
        [`cupos.${diaId}`]: deleteField(),
        updatedAt: serverTimestamp()
      };
      familiasDelDia.forEach((uid) => {
        updatePayload[`familiasDia.${uid}`] = deleteField();
      });

      batch.update(convRef, updatePayload);
      await batch.commit();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ── Inscripciones ───────────────────────────────────────────────

  // Para admin: todas las inscripciones de la convocatoria.
  async getInscripcionesByConvocatoria(convocatoriaId) {
    try {
      const snap = await getDocs(inscripcionesCol(convocatoriaId));
      return { success: true, inscripciones: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Para familia: solo las propias.
  async getInscripcionesByFamilia(convocatoriaId, familiaUid) {
    try {
      const q = query(inscripcionesCol(convocatoriaId), where('familiaUid', '==', familiaUid));
      const snap = await getDocs(q);
      return { success: true, inscripciones: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Usa transaction.get sobre el doc de convocatoria para control de cupo sin carrera.
  // Mismo patrón que bookSlot en appointments.service.js (transaction.get, no getDocs).
  async inscribirAmbienteAbierto(convocatoriaId, payload) {
    // payload: { diaId, familiaUid, familiaNombre, hijoId, hijoNombre, ambiente }
    try {
      const convRef = doc(clasesAbiertasCol, convocatoriaId);
      const colRef = inscripcionesCol(convocatoriaId);

      const result = await runTransaction(db, async (transaction) => {
        const convSnap = await transaction.get(convRef);
        if (!convSnap.exists()) {
          return { success: false, error: 'Convocatoria no encontrada.' };
        }

        const cupos = convSnap.data().cupos || {};
        const cupoUsado = cupos[payload.diaId] || 0;
        if (cupoUsado >= 2) {
          return { success: false, error: 'Este día ya tiene el cupo completo.', code: 'CUPO_COMPLETO' };
        }

        const familiasDia = convSnap.data().familiasDia || {};
        if (familiasDia[payload.familiaUid]) {
          return { success: false, error: 'Ya estás anotada en esta convocatoria.', code: 'YA_INSCRIPTA' };
        }

        const newDocRef = doc(colRef);
        transaction.set(newDocRef, { ...payload, createdAt: serverTimestamp() });
        transaction.update(convRef, {
          [`cupos.${payload.diaId}`]: cupoUsado + 1,
          [`familiasDia.${payload.familiaUid}`]: payload.diaId,
          updatedAt: serverTimestamp()
        });

        return { success: true, id: newDocRef.id };
      });

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async inscribirTallerAbierto(convocatoriaId, payload) {
    // payload: { diaId, familiaUid, familiaNombre, hijoId, hijoNombre, ambiente }
    try {
      const q = query(
        inscripcionesCol(convocatoriaId),
        where('diaId', '==', payload.diaId),
        where('familiaUid', '==', payload.familiaUid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { success: false, error: 'Ya estás anotada en este día.', code: 'YA_INSCRIPTA' };
      }
      const docRef = await addDoc(inscripcionesCol(convocatoriaId), {
        ...payload,
        createdAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async cancelarInscripcion(convocatoriaId, inscripcionId) {
    try {
      await deleteDoc(doc(db, 'clasesAbiertas', convocatoriaId, 'inscripciones', inscripcionId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
```

- [ ] **Step 2: Commit**

```powershell
git add src/services/clasesAbiertas.service.js
git commit -m "feat: add clasesAbiertas service with split reactivate/nueva-convocatoria and consistent cupo state"
```

---

## Task 3: Hook useClasesAbiertas

**Files:**
- Create: `src/hooks/useClasesAbiertas.js`

El hook carga solo las inscripciones propias de la familia. El cupo se deriva de `convocatoria.cupos[diaId]`, que está en el doc padre que familia sí puede leer. No hay conflicto con las reglas de seguridad.

- [ ] **Step 1: Crear el hook**

```js
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { clasesAbiertasService } from '../services/clasesAbiertas.service';

const TIPOS = ['ambiente_abierto', 'taller_abierto'];

/**
 * Carga convocatorias activas e inscripciones propias de la familia autenticada.
 * El cupo se deriva de convocatoria.cupos[diaId] — no requiere leer inscripciones de terceros.
 * @param {string[]} ambientes — ['taller1'] | ['taller2'] | ['taller1', 'taller2']
 */
export function useClasesAbiertas(ambientes = []) {
  const { user } = useAuth();
  // convocatorias: { 'taller1_ambiente_abierto': {id, tipo, ambiente, activo, dias[], cupos, familiasDia}, ... }
  const [convocatorias, setConvocatorias] = useState({});
  // inscripcionesPropia: { [convocatoriaId]: [{id, diaId, familiaUid, ...}] }
  const [inscripcionesPropia, setInscripcionesPropia] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (!ambientes.length) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const pairs = ambientes.flatMap((ambiente) =>
        TIPOS.map((tipo) => ({ ambiente, tipo }))
      );

      const convResults = await Promise.all(
        pairs.map(({ tipo, ambiente }) =>
          clasesAbiertasService.getConvocatoriaActiva(tipo, ambiente)
        )
      );

      const nuevasConvocatorias = {};
      convResults.forEach((res, i) => {
        if (res.success && res.convocatoria) {
          const { tipo, ambiente } = pairs[i];
          nuevasConvocatorias[`${ambiente}_${tipo}`] = res.convocatoria;
        }
      });
      setConvocatorias(nuevasConvocatorias);

      // Solo inscripciones propias — familia tiene permiso de leer las suyas
      if (user?.uid) {
        const convIds = Object.values(nuevasConvocatorias).map((c) => c.id);
        const inscResults = await Promise.all(
          convIds.map((id) =>
            clasesAbiertasService.getInscripcionesByFamilia(id, user.uid)
          )
        );
        const nuevasInscripciones = {};
        convIds.forEach((id, i) => {
          if (inscResults[i].success) nuevasInscripciones[id] = inscResults[i].inscripciones;
        });
        setInscripcionesPropia(nuevasInscripciones);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ambientes.join(','), user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(); }, [cargar]);

  return { convocatorias, inscripcionesPropia, loading, error, recargar: cargar };
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/hooks/useClasesAbiertas.js
git commit -m "feat: add useClasesAbiertas hook — cupo from doc field, only own inscriptions"
```

---

## Task 4: Reglas Firestore

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Agregar las reglas antes del último `}` de cierre del bloque principal**

```
    // Colección: /clasesAbiertas
    match /clasesAbiertas/{convocatoriaId} {
      // Familia puede leer el doc de convocatoria para ver días, horarios y cupos.
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();

      match /inscripciones/{inscripcionId} {
        // Admin lee todas; familia solo las suyas.
        allow read: if isAdmin() ||
                       (isFamily() && resource.data.familiaUid == request.auth.uid);

        // Familia puede crear inscripción si:
        //   1. familiaUid es el propio uid
        //   2. hijoId le pertenece (isResponsibleFamilyForChild verifica esto en /children)
        //   3. el ambiente del payload coincide con el del hijo en /children
        allow create: if isFamily() &&
                         request.resource.data.familiaUid == request.auth.uid &&
                         isResponsibleFamilyForChild(
                           request.resource.data.hijoId,
                           request.auth.uid
                         ) &&
                         get(/databases/$(database)/documents/children/$(request.resource.data.hijoId)).data.ambiente
                           == request.resource.data.ambiente;

        // Admin puede borrar cualquier inscripción (para correcciones manuales).
        // Familia solo puede desanotarse en taller_abierto.
        allow delete: if isAdmin() ||
                         (isFamily() &&
                          resource.data.familiaUid == request.auth.uid &&
                          get(/databases/$(database)/documents/clasesAbiertas/$(convocatoriaId)).data.tipo == 'taller_abierto');

        allow update: if false;
      }
    }
```

- [ ] **Step 2: Verificar sintaxis**

```powershell
cd "D:\Aideas\PUERTO NUEVO"
npm run test:rules 2>&1 | Select-Object -First 30
```

Resultado esperado: tests existentes siguen pasando, sin errores de parse.

- [ ] **Step 3: Commit**

```powershell
git add firestore.rules
git commit -m "feat: add Firestore rules for clasesAbiertas — admin delete, ambiente validation, taller_abierto delete for family"
```

---

## Task 5: Componente Admin — ClasesAbiertasManager

**Files:**
- Create: `src/pages/admin/ClasesAbiertasManager.jsx`

- [ ] **Step 1: Crear el componente**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { clasesAbiertasService } from '../../services/clasesAbiertas.service';

const TIPO_LABELS = { ambiente_abierto: 'Ambiente Abierto', taller_abierto: 'Taller Abierto' };
const AMBIENTE_LABELS = { taller1: 'Taller 1', taller2: 'Taller 2' };
const TIPOS = ['ambiente_abierto', 'taller_abierto'];
const AMBIENTES = ['taller1', 'taller2'];

const formatFechaDisplay = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const formatFechaInput = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function PanelConvocatoria({ tipo, ambiente }) {
  const { user } = useAuth();
  const [convocatoria, setConvocatoria] = useState(null);
  // convocatoriaPasada: la más reciente aunque esté inactiva (para ofrecer reactivar)
  const [convocatoriaPasada, setConvocatoriaPasada] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newDia, setNewDia] = useState({ fecha: '', horario: '', nombreTaller: '' });
  const [editingDiaId, setEditingDiaId] = useState('');
  const [editDia, setEditDia] = useState({ fecha: '', horario: '', nombreTaller: '' });
  const [deletingDiaId, setDeletingDiaId] = useState('');
  const [expandedDiaId, setExpandedDiaId] = useState('');

  const showMsg = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };
  const showErr = (m) => { setError(m); setTimeout(() => setError(''), 4000); };

  const cargar = useCallback(async () => {
    setLoading(true);
    const [activaRes, recienteRes] = await Promise.all([
      clasesAbiertasService.getConvocatoriaActiva(tipo, ambiente),
      clasesAbiertasService.getConvocatoriaReciente(tipo, ambiente)
    ]);
    if (activaRes.success) {
      setConvocatoria(activaRes.convocatoria);
      if (activaRes.convocatoria) {
        const ir = await clasesAbiertasService.getInscripcionesByConvocatoria(activaRes.convocatoria.id);
        if (ir.success) setInscripciones(ir.inscripciones);
      }
    }
    // convocatoriaPasada: útil solo cuando no hay activa (para ofrecer reactivar)
    if (recienteRes.success && recienteRes.convocatoria && !activaRes.convocatoria) {
      setConvocatoriaPasada(recienteRes.convocatoria);
    } else {
      setConvocatoriaPasada(null);
    }
    setLoading(false);
  }, [tipo, ambiente]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleNuevaConvocatoria = async () => {
    setSubmitting(true);
    const anteriorId = convocatoria?.id || convocatoriaPasada?.id || null;
    const res = await clasesAbiertasService.createNuevaConvocatoria(tipo, ambiente, user.uid, anteriorId);
    if (res.success) { showMsg('Nueva convocatoria creada.'); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleReactivar = async () => {
    if (!convocatoriaPasada) return;
    setSubmitting(true);
    const res = await clasesAbiertasService.reactivateConvocatoria(convocatoriaPasada.id);
    if (res.success) { showMsg('Convocatoria reactivada.'); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleToggle = async () => {
    if (!convocatoria) return;
    setSubmitting(true);
    const res = await clasesAbiertasService.toggleConvocatoria(convocatoria.id, !convocatoria.activo);
    if (res.success) { showMsg(`Convocatoria ${!convocatoria.activo ? 'activada' : 'desactivada'}.`); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleAddDia = async (e) => {
    e.preventDefault();
    if (!newDia.fecha || !newDia.horario.trim()) { showErr('La fecha y el horario son obligatorios.'); return; }
    if (tipo === 'taller_abierto' && !newDia.nombreTaller.trim()) { showErr('El nombre del taller es obligatorio.'); return; }
    setSubmitting(true);
    const diaData = {
      fecha: new Date(newDia.fecha + 'T12:00:00'),
      horario: newDia.horario.trim(),
      ...(tipo === 'taller_abierto' ? { nombreTaller: newDia.nombreTaller.trim() } : {})
    };
    const res = await clasesAbiertasService.addDia(convocatoria.id, diaData);
    if (res.success) { showMsg('Día agregado.'); setNewDia({ fecha: '', horario: '', nombreTaller: '' }); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleStartEdit = (dia) => {
    setEditingDiaId(dia.id);
    setEditDia({ fecha: formatFechaInput(dia.fecha), horario: dia.horario || '', nombreTaller: dia.nombreTaller || '' });
    setDeletingDiaId('');
  };

  const handleSaveEdit = async (diaId) => {
    if (!editDia.fecha || !editDia.horario.trim()) { showErr('La fecha y el horario son obligatorios.'); return; }
    setSubmitting(true);
    const cambios = {
      fecha: new Date(editDia.fecha + 'T12:00:00'),
      horario: editDia.horario.trim(),
      ...(tipo === 'taller_abierto' ? { nombreTaller: editDia.nombreTaller.trim() } : {})
    };
    const res = await clasesAbiertasService.updateDia(convocatoria.id, diaId, cambios);
    if (res.success) { showMsg('Día actualizado.'); setEditingDiaId(''); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleConfirmDelete = async (diaId) => {
    setSubmitting(true);
    const res = await clasesAbiertasService.deleteDia(convocatoria.id, diaId);
    if (res.success) { showMsg('Día eliminado.'); setDeletingDiaId(''); cargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const inscriptosPorDia = (diaId) => inscripciones.filter((i) => i.diaId === diaId);
  // cupo viene del campo desnormalizado del doc padre
  const cupoPorDia = (diaId) => convocatoria?.cupos?.[diaId] || 0;

  if (loading) return <p style={{ color: 'var(--color-text-light)', padding: 'var(--spacing-md)' }}>Cargando...</p>;

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}

      {!convocatoria ? (
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <p style={{ color: 'var(--color-text-light)', marginBottom: 'var(--spacing-md)' }}>
              No hay convocatoria activa para {TIPO_LABELS[tipo]} — {AMBIENTE_LABELS[ambiente]}.
            </p>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn--primary" onClick={handleNuevaConvocatoria} disabled={submitting}>
                Nueva convocatoria
              </button>
              {convocatoriaPasada && (
                <button className="btn btn--secondary" onClick={handleReactivar} disabled={submitting}>
                  Reactivar convocatoria anterior
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card__title">{TIPO_LABELS[tipo]} — {AMBIENTE_LABELS[ambiente]}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)', color: convocatoria.activo ? 'var(--color-success)' : 'var(--color-text-light)' }}>
                {convocatoria.activo ? 'Activa' : 'Inactiva'}
              </span>
              <button className="btn btn--secondary" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={handleToggle} disabled={submitting}>
                {convocatoria.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)' }} onClick={handleNuevaConvocatoria} disabled={submitting}>
                Nueva convocatoria
              </button>
            </div>
          </div>

          <div className="card__body">
            {(convocatoria.dias || []).length > 0 ? (
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text)' }}>
                  Días programados
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {convocatoria.dias.map((dia) => {
                    const insc = inscriptosPorDia(dia.id);
                    const cupo = cupoPorDia(dia.id);
                    const isEditing = editingDiaId === dia.id;
                    const isDeleting = deletingDiaId === dia.id;
                    const isExpanded = expandedDiaId === dia.id;

                    return (
                      <div key={dia.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', background: 'var(--color-background-alt)' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Fecha</label>
                              <input type="date" className="form-input" value={editDia.fecha} onChange={(e) => setEditDia((p) => ({ ...p, fecha: e.target.value }))} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Horario</label>
                              <input type="text" className="form-input" placeholder="ej: 10:00 - 11:00" value={editDia.horario} onChange={(e) => setEditDia((p) => ({ ...p, horario: e.target.value }))} />
                            </div>
                            {tipo === 'taller_abierto' && (
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Taller</label>
                                <input type="text" className="form-input" placeholder="ej: Teatro" value={editDia.nombreTaller} onChange={(e) => setEditDia((p) => ({ ...p, nombreTaller: e.target.value }))} />
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                              <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => handleSaveEdit(dia.id)} disabled={submitting}>Guardar</button>
                              <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => setEditingDiaId('')} disabled={submitting}>Cancelar</button>
                            </div>
                          </div>
                        ) : isDeleting ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                              ¿Eliminar {formatFechaDisplay(dia.fecha)}?
                              {insc.length > 0 && <strong style={{ color: 'var(--color-error)' }}> Se borrarán {insc.length} inscripción{insc.length !== 1 ? 'es' : ''}.</strong>}
                            </span>
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                              <button className="btn btn--danger" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => handleConfirmDelete(dia.id)} disabled={submitting}>Eliminar</button>
                              <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => setDeletingDiaId('')} disabled={submitting}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                              <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize' }}>{formatFechaDisplay(dia.fecha)}</span>
                                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>{dia.horario}</span>
                                {tipo === 'taller_abierto' && dia.nombreTaller && (
                                  <span className="badge badge--info">{dia.nombreTaller}</span>
                                )}
                                <span style={{ fontSize: 'var(--font-size-sm)', color: tipo === 'ambiente_abierto' && cupo >= 2 ? 'var(--color-error)' : 'var(--color-success)' }}>
                                  {tipo === 'ambiente_abierto' ? `${cupo}/2 inscriptos` : `${insc.length} inscripto${insc.length !== 1 ? 's' : ''}`}
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                {insc.length > 0 && (
                                  <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => setExpandedDiaId(isExpanded ? '' : dia.id)}>
                                    {isExpanded ? 'Ocultar' : 'Ver inscriptos'}
                                  </button>
                                )}
                                <button className="btn btn--secondary" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => handleStartEdit(dia)}>Editar</button>
                                <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }} onClick={() => { setDeletingDiaId(dia.id); setEditingDiaId(''); }}>Eliminar</button>
                              </div>
                            </div>
                            {isExpanded && (
                              <div style={{ marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border)' }}>
                                {insc.map((i) => (
                                  <div key={i.id} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', padding: 'var(--spacing-xs) 0' }}>
                                    <strong>{i.familiaNombre}</strong> — {i.hijoNombre}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-light)', marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)' }}>No hay días cargados todavía.</p>
            )}

            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-lg)' }}>
              <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text)' }}>Agregar día</h4>
              <form onSubmit={handleAddDia} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-input" value={newDia.fecha} onChange={(e) => setNewDia((p) => ({ ...p, fecha: e.target.value }))} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Horario</label>
                  <input type="text" className="form-input" placeholder="ej: 10:00 - 11:00" value={newDia.horario} onChange={(e) => setNewDia((p) => ({ ...p, horario: e.target.value }))} required />
                </div>
                {tipo === 'taller_abierto' && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nombre del taller</label>
                    <input type="text" className="form-input" placeholder="ej: Teatro" value={newDia.nombreTaller} onChange={(e) => setNewDia((p) => ({ ...p, nombreTaller: e.target.value }))} required />
                  </div>
                )}
                <button type="submit" className="btn btn--primary" disabled={submitting}>Agregar día</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClasesAbiertasManager() {
  const [tipoActivo, setTipoActivo] = useState('ambiente_abierto');
  const [ambienteActivo, setAmbienteActivo] = useState('taller1');

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>Clases Abiertas</h1>
        <p style={{ color: 'var(--color-text-light)', marginTop: 'var(--spacing-xs)' }}>Gestioná las convocatorias de Ambiente Abierto y Taller Abierto.</p>
      </div>
      <div className="tabs__header" style={{ marginBottom: 'var(--spacing-md)' }}>
        {TIPOS.map((tipo) => (
          <button key={tipo} className={`tabs__tab${tipoActivo === tipo ? ' tabs__tab--active' : ''}`} onClick={() => setTipoActivo(tipo)}>
            {TIPO_LABELS[tipo]}
          </button>
        ))}
      </div>
      <div className="tabs__header" style={{ marginBottom: 'var(--spacing-lg)' }}>
        {AMBIENTES.map((amb) => (
          <button key={amb} className={`tabs__tab${ambienteActivo === amb ? ' tabs__tab--active' : ''}`} onClick={() => setAmbienteActivo(amb)}>
            {AMBIENTE_LABELS[amb]}
          </button>
        ))}
      </div>
      <PanelConvocatoria key={`${tipoActivo}_${ambienteActivo}`} tipo={tipoActivo} ambiente={ambienteActivo} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/pages/admin/ClasesAbiertasManager.jsx
git commit -m "feat: add ClasesAbiertasManager with reactivar/nueva-convocatoria split"
```

---

## Task 6: Componente Familia — ClasesAbiertas

**Files:**
- Create: `src/pages/family/ClasesAbiertas.jsx`

- [ ] **Step 1: Verificar que `childrenService.getChildrenByResponsable` existe**

```powershell
Select-String -Path "src\services\children.service.js" -Pattern "getChildrenByResponsable"
```

Si no existe, agregar al objeto `childrenService` en `src/services/children.service.js`:

```js
async getChildrenByResponsable(familiaUid) {
  try {
    const q = query(
      childrenCollection,
      where('responsables', 'array-contains', familiaUid)
    );
    const snapshot = await getDocs(q);
    const children = snapshot.docs.map((d) => ({
      id: d.id,
      ...fixMojibakeDeep(d.data())
    }));
    return { success: true, children };
  } catch (error) {
    return { success: false, error: error.message };
  }
},
```

- [ ] **Step 2: Crear el componente**

La UI deriva "Completo" de `convocatoria.cupos[diaId] >= 2`, que viene del doc padre (legible por familia). No necesita inscripciones de terceros.

```jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClasesAbiertas } from '../../hooks/useClasesAbiertas';
import { clasesAbiertasService } from '../../services/clasesAbiertas.service';
import { childrenService } from '../../services/children.service';

const AMBIENTE_LABELS = { taller1: 'Taller 1', taller2: 'Taller 2' };

const formatFechaDisplay = (v) => {
  if (!v) return '';
  const d = v?.toDate ? v.toDate() : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

function SelectorHijo({ hijos, onSeleccionar, onCancelar }) {
  const [hijoId, setHijoId] = useState(hijos[0]?.id || '');
  return (
    <div style={{ marginTop: 'var(--spacing-sm)', padding: 'var(--spacing-md)', background: 'var(--color-primary-soft)', borderRadius: 'var(--radius-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>¿Para qué alumno?</span>
      <select className="form-input" style={{ width: 'auto' }} value={hijoId} onChange={(e) => setHijoId(e.target.value)}>
        {hijos.map((h) => <option key={h.id} value={h.id}>{h.nombreCompleto}</option>)}
      </select>
      <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => { const h = hijos.find((x) => x.id === hijoId); if (h) onSeleccionar(h); }}>
        Confirmar
      </button>
      <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)' }} onClick={onCancelar}>Cancelar</button>
    </div>
  );
}

function SeccionAmbienteAbierto({ convocatoria, inscripcionesPropia, hijos, ambiente, onRecargar }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [seleccionandoDiaId, setSeleccionandoDiaId] = useState('');

  const showErr = (m) => { setError(m); setTimeout(() => setError(''), 4000); };
  const showMsg = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };

  const miInscripcion = inscripcionesPropia?.find((i) => i.familiaUid === user?.uid);

  // "Completo" se deriva del campo desnormalizado cupos del doc padre — no requiere leer inscripciones de terceros
  const estaCompleto = (diaId) => (convocatoria?.cupos?.[diaId] || 0) >= 2;

  const handleAnotarme = async (dia, hijo) => {
    setSubmitting(true);
    setSeleccionandoDiaId('');
    const res = await clasesAbiertasService.inscribirAmbienteAbierto(convocatoria.id, {
      diaId: dia.id,
      familiaUid: user.uid,
      familiaNombre: user.displayName || user.email,
      hijoId: hijo.id,
      hijoNombre: hijo.nombreCompleto,
      ambiente
    });
    if (res.success) { showMsg('¡Te anotaste correctamente!'); onRecargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  if (!convocatoria) return <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Sin fechas disponibles por el momento.</p>;
  const dias = convocatoria.dias || [];
  if (!dias.length) return <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Sin fechas disponibles por el momento.</p>;

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {dias.map((dia) => {
          const esMiDia = miInscripcion?.diaId === dia.id;
          const completo = estaCompleto(dia.id);
          const yaInscripta = !!miInscripcion;

          return (
            <div key={dia.id} style={{ border: `1px solid ${esMiDia ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', background: esMiDia ? 'var(--color-primary-soft)' : 'var(--color-background-alt)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                <div>
                  <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize' }}>{formatFechaDisplay(dia.fecha)}</span>
                  <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-sm)' }}>{dia.horario}</span>
                </div>
                <div>
                  {esMiDia ? (
                    <span className="badge badge--success">Anotada</span>
                  ) : completo ? (
                    <span className="badge badge--error">Completo</span>
                  ) : yaInscripta ? (
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>Ya tenés una fecha elegida</span>
                  ) : (
                    <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} disabled={submitting} onClick={() => { if (hijos.length === 1) handleAnotarme(dia, hijos[0]); else setSeleccionandoDiaId(dia.id); }}>
                      Anotarme
                    </button>
                  )}
                </div>
              </div>
              {seleccionandoDiaId === dia.id && (
                <SelectorHijo hijos={hijos} onSeleccionar={(h) => handleAnotarme(dia, h)} onCancelar={() => setSeleccionandoDiaId('')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SeccionTallerAbierto({ convocatoria, inscripcionesPropia, hijos, ambiente, onRecargar }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [seleccionandoDiaId, setSeleccionandoDiaId] = useState('');

  const showErr = (m) => { setError(m); setTimeout(() => setError(''), 4000); };
  const showMsg = (m) => { setMessage(m); setTimeout(() => setMessage(''), 3000); };

  const getMiInscripcion = (diaId) => (inscripcionesPropia || []).find((i) => i.diaId === diaId);

  const handleAnotarme = async (dia, hijo) => {
    setSubmitting(true);
    setSeleccionandoDiaId('');
    const res = await clasesAbiertasService.inscribirTallerAbierto(convocatoria.id, {
      diaId: dia.id,
      familiaUid: user.uid,
      familiaNombre: user.displayName || user.email,
      hijoId: hijo.id,
      hijoNombre: hijo.nombreCompleto,
      ambiente
    });
    if (res.success) { showMsg('¡Te anotaste correctamente!'); onRecargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  const handleDesanotarme = async (inscripcionId) => {
    setSubmitting(true);
    const res = await clasesAbiertasService.cancelarInscripcion(convocatoria.id, inscripcionId);
    if (res.success) { showMsg('Inscripción cancelada.'); onRecargar(); }
    else showErr(res.error);
    setSubmitting(false);
  };

  if (!convocatoria) return <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Sin fechas disponibles por el momento.</p>;
  const dias = convocatoria.dias || [];
  if (!dias.length) return <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>Sin fechas disponibles por el momento.</p>;

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {dias.map((dia) => {
          const miInscripcion = getMiInscripcion(dia.id);
          return (
            <div key={dia.id} style={{ border: `1px solid ${miInscripcion ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', background: miInscripcion ? 'var(--color-primary-soft)' : 'var(--color-background-alt)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                <div>
                  <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize' }}>{formatFechaDisplay(dia.fecha)}</span>
                  <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-sm)' }}>{dia.horario}</span>
                  {dia.nombreTaller && <span className="badge badge--info" style={{ marginLeft: 'var(--spacing-sm)' }}>{dia.nombreTaller}</span>}
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                  {miInscripcion ? (
                    <>
                      <span className="badge badge--success">Anotada</span>
                      <button className="btn btn--ghost" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }} disabled={submitting} onClick={() => handleDesanotarme(miInscripcion.id)}>
                        Desanotarme
                      </button>
                    </>
                  ) : (
                    <button className="btn btn--primary" style={{ fontSize: 'var(--font-size-sm)' }} disabled={submitting} onClick={() => { if (hijos.length === 1) handleAnotarme(dia, hijos[0]); else setSeleccionandoDiaId(dia.id); }}>
                      Anotarme
                    </button>
                  )}
                </div>
              </div>
              {seleccionandoDiaId === dia.id && (
                <SelectorHijo hijos={hijos} onSeleccionar={(h) => handleAnotarme(dia, h)} onCancelar={() => setSeleccionandoDiaId('')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelAmbiente({ ambiente, convocatorias, inscripcionesPropia, hijos, onRecargar }) {
  const convAA = convocatorias[`${ambiente}_ambiente_abierto`] || null;
  const convTA = convocatorias[`${ambiente}_taller_abierto`] || null;
  const inscAA = convAA ? (inscripcionesPropia[convAA.id] || []) : [];
  const inscTA = convTA ? (inscripcionesPropia[convTA.id] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header"><h3 className="card__title">Ambiente Abierto</h3></div>
        <div className="card__body">
          <SeccionAmbienteAbierto convocatoria={convAA} inscripcionesPropia={inscAA} hijos={hijos} ambiente={ambiente} onRecargar={onRecargar} />
        </div>
      </div>
      <div className="card">
        <div className="card__header"><h3 className="card__title">Taller Abierto</h3></div>
        <div className="card__body">
          <SeccionTallerAbierto convocatoria={convTA} inscripcionesPropia={inscTA} hijos={hijos} ambiente={ambiente} onRecargar={onRecargar} />
        </div>
      </div>
    </div>
  );
}

export default function ClasesAbiertas() {
  const { user } = useAuth();
  const [hijos, setHijos] = useState([]);
  const [loadingHijos, setLoadingHijos] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    childrenService.getChildrenByResponsable(user.uid).then((res) => {
      if (res.success) setHijos(res.children);
      setLoadingHijos(false);
    });
  }, [user?.uid]);

  const ambientes = [...new Set(hijos.map((h) => h.ambiente).filter(Boolean))];
  const { convocatorias, inscripcionesPropia, loading, recargar } = useClasesAbiertas(ambientes);

  const [ambienteActivo, setAmbienteActivo] = useState('');
  useEffect(() => {
    if (ambientes.length && !ambienteActivo) setAmbienteActivo(ambientes[0]);
  }, [ambientes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadingHijos || loading) {
    return <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}><p style={{ color: 'var(--color-text-light)' }}>Cargando...</p></div>;
  }

  if (!ambientes.length) {
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card"><div className="card__body"><p style={{ color: 'var(--color-text-light)' }}>No se encontraron alumnos asociados a tu cuenta.</p></div></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>Clases Abiertas</h1>
        <p style={{ color: 'var(--color-text-light)', marginTop: 'var(--spacing-xs)' }}>Anotate a las fechas disponibles.</p>
      </div>
      {ambientes.length > 1 && (
        <div className="tabs__header" style={{ marginBottom: 'var(--spacing-lg)' }}>
          {ambientes.map((amb) => (
            <button key={amb} className={`tabs__tab${ambienteActivo === amb ? ' tabs__tab--active' : ''}`} onClick={() => setAmbienteActivo(amb)}>
              {AMBIENTE_LABELS[amb]}
            </button>
          ))}
        </div>
      )}
      {ambienteActivo && (
        <PanelAmbiente
          ambiente={ambienteActivo}
          convocatorias={convocatorias}
          inscripcionesPropia={inscripcionesPropia}
          hijos={hijos.filter((h) => h.ambiente === ambienteActivo)}
          onRecargar={recargar}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```powershell
git add src/pages/family/ClasesAbiertas.jsx src/services/children.service.js
git commit -m "feat: add ClasesAbiertas family component — cupo from doc field"
```

---

## Task 7: Navegación — Sidebar y App.jsx

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Agregar ítem en Sidebar para admin**

En `src/components/layout/Sidebar.jsx`, en los arrays de `ROLES.SUPERADMIN` y `ROLES.COORDINACION`, agregar después del ítem `/portal/admin/actividades`:

```js
{ path: '/portal/admin/clases-abiertas', icon: 'calendar', label: 'Clases Abiertas' },
```

- [ ] **Step 2: Agregar ítem en Sidebar para familia**

En el array de `ROLES.FAMILY`, agregar después del ítem `/portal/familia/actividades`:

```js
{ path: '/portal/familia/clases-abiertas', icon: 'calendar', label: 'Clases Abiertas' },
```

- [ ] **Step 3: Agregar lazy imports en App.jsx**

```js
// junto a los imports admin:
const ClasesAbiertasManager = lazy(() => import('./pages/admin/ClasesAbiertasManager'));
// junto a los imports familia:
const ClasesAbiertas = lazy(() => import('./pages/family/ClasesAbiertas'));
```

- [ ] **Step 4: Agregar ruta admin después de `/portal/admin/actividades`**

```jsx
<Route
  path="/portal/admin/clases-abiertas"
  element={
    <ProtectedRoute>
      <Layout>
        <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
          <ClasesAbiertasManager />
        </RoleGuard>
      </Layout>
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 5: Agregar ruta familia después de `/portal/familia/actividades`**

```jsx
<Route
  path="/portal/familia/clases-abiertas"
  element={
    <ProtectedRoute>
      <Layout>
        <RoleGuard allowedRoles={[ROLES.FAMILY]}>
          <ClasesAbiertas />
        </RoleGuard>
      </Layout>
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 6: Verificar dev server**

```powershell
npm run dev 2>&1 | Select-Object -First 20
```

Resultado esperado: `VITE ready` sin errores de compilación.

- [ ] **Step 7: Commit**

```powershell
git add src/components/layout/Sidebar.jsx src/App.jsx
git commit -m "feat: wire ClasesAbiertas routes and sidebar navigation"
```

---

## Task 8: Verificación manual en el navegador

- [ ] **Step 1: Iniciar dev server**

```powershell
npm run dev
```

- [ ] **Step 2: Verificar vista Admin**

1. Loguearse como admin/coordinacion
2. Verificar que "Clases Abiertas" aparece en el sidebar
3. Navegar a `/portal/admin/clases-abiertas`
4. Crear nueva convocatoria para Ambiente Abierto / Taller 1 → verificar mensaje "Nueva convocatoria creada"
5. Agregar 3 días con fecha y horario
6. Editar un día inline → verificar que los campos se pre-llenan y guardan
7. Desactivar la convocatoria → verificar badge "Inactiva"
8. Verificar que aparecen dos botones: "Nueva convocatoria" y "Reactivar convocatoria anterior"
9. Reactivar → verificar que vuelven los días intactos
10. Crear Nueva convocatoria (ciclo anual) → verificar que se crea limpia y la anterior queda desactivada
11. Repetir con Taller Abierto / Taller 1 → verificar campo "Nombre del taller"

- [ ] **Step 3: Verificar vista Familia**

1. Loguearse como familia con hijo en Taller 1
2. Verificar "Clases Abiertas" en sidebar
3. Navegar a `/portal/familia/clases-abiertas`
4. Anotarse a un día de Ambiente Abierto → badge "Anotada"; otros días muestran "Ya tenés una fecha elegida"
5. Anotarse a múltiples días de Taller Abierto → cada uno muestra badge "Anotada"
6. Desanotarse de un taller → botón "Anotarme" vuelve a aparecer

- [ ] **Step 4: Verificar cupo y "Completo" (requiere dos cuentas familia)**

1. Familia A se anota a un día de Ambiente Abierto
2. Familia B se anota al mismo día → toma el segundo lugar
3. Familia C intenta el mismo día → ve badge "Completo" (derivado de `convocatoria.cupos[diaId] >= 2`)
4. Desde admin el día muestra "2/2 inscriptos"
5. Admin elimina ese día → verificar que las inscripciones desaparecen y el campo `cupos` del doc queda limpio (no hay entradas viejas)

---

## Cobertura del spec

| Requisito | Task |
|---|---|
| Colección `/clasesAbiertas` con tipo, ambiente, activo, dias[], cupos, familiasDia | Task 2 |
| Subcolección `/inscripciones` | Task 2 |
| `getConvocatoriaActiva` | Task 2 |
| `getConvocatoriaReciente` (para ofrecer reactivar) | Task 2 |
| `reactivateConvocatoria` (días e inscripciones intactos) | Task 2 |
| `createNuevaConvocatoria` (limpia, desactiva anterior) | Task 2 |
| `toggleConvocatoria` | Task 2 |
| `addDia`, `updateDia` | Task 2 |
| `deleteDia` con batch: inscripciones + cupos + familiasDia | Task 2 |
| `inscribirAmbienteAbierto` con `transaction.get` (sin carrera) | Task 2 |
| `inscribirTallerAbierto` | Task 2 |
| `cancelarInscripcion` | Task 2 |
| Hook: solo inscripciones propias; cupo via doc padre | Task 3 |
| Regla: familia lee doc padre (cupos visibles) | Task 4 |
| Regla: familia lee solo sus inscripciones | Task 4 |
| Regla: create valida hijoId + ambiente del hijo | Task 4 |
| Regla: admin puede borrar inscripciones individuales | Task 4 |
| Regla: delete familia solo en taller_abierto | Task 4 |
| Admin: botones "Nueva convocatoria" y "Reactivar anterior" | Task 5 |
| Admin: CRUD días inline, confirmar borrado con advertencia | Task 5 |
| Admin: toggle activo/inactivo | Task 5 |
| Admin: ver inscriptos expand/collapse; cupo desde campo doc | Task 5 |
| Familia: tabs solo si tiene hijos en ambos ambientes | Task 6 |
| Familia: "Completo" desde `convocatoria.cupos[diaId]` | Task 6 |
| Familia: Taller Abierto con Anotarme/Desanotarme | Task 6 |
| Familia: selector de hijo inline si tiene más de uno | Task 6 |
| Sidebar + rutas App.jsx | Task 7 |
| Constantes de rutas | Task 1 |
| Tech stack: React 19, Firebase 12, Router 7 | Header |
| CSS: `.tabs__tab` / `.tabs__tab--active` | Tasks 5, 6 |
| Comando test reglas: `npm run test:rules` | Task 4 |
