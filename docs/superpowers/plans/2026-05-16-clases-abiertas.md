# Clases Abiertas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar la sección "Clases Abiertas" al portal de Puerto Nuevo, permitiendo que Admin/Coordinación configure convocatorias de Ambiente Abierto y Taller Abierto por taller, y que las familias se inscriban según el ambiente de sus hijos.

**Architecture:** Colección Firestore `/clasesAbiertas` independiente con subcolección `/inscripciones`. Los días se guardan como array embebido en el documento de convocatoria. El control de cupo de Ambiente Abierto se implementa con una transacción Firestore. Toda la UI es inline (sin modales), respetando el design system existente.

**Tech Stack:** React 18, Firebase 10 (Firestore, Auth), React Router v6, CSS custom properties (design-system.css)

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `src/config/constants.js` | Modificar | Agregar constantes de rutas ADMIN_CLASES_ABIERTAS y FAMILY_CLASES_ABIERTAS |
| `src/services/clasesAbiertas.service.js` | Crear | CRUD de convocatorias, días e inscripciones |
| `src/hooks/useClasesAbiertas.js` | Crear | Carga de convocatorias activas y inscripciones propias |
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
node -e "require('./src/config/constants.js')" 2>&1
```

Resultado esperado: sin output (sin errores).

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
  query,
  where,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebase';

const clasesAbiertasCollection = collection(db, 'clasesAbiertas');
const inscripcionesCollection = (convocatoriaId) =>
  collection(db, 'clasesAbiertas', convocatoriaId, 'inscripciones');

const generateDiaId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const clasesAbiertasService = {
  // ── Convocatorias ──────────────────────────────────────────────

  async getConvocatoriaActiva(tipo, ambiente) {
    try {
      const q = query(
        clasesAbiertasCollection,
        where('tipo', '==', tipo),
        where('ambiente', '==', ambiente),
        where('activo', '==', true)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return { success: true, convocatoria: null };
      const docSnap = snapshot.docs[0];
      return { success: true, convocatoria: { id: docSnap.id, ...docSnap.data() } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async createConvocatoria(tipo, ambiente, uid) {
    try {
      const docRef = await addDoc(clasesAbiertasCollection, {
        tipo,
        ambiente,
        activo: true,
        dias: [],
        creadoPor: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async toggleConvocatoria(convocatoriaId, activo) {
    try {
      await updateDoc(doc(clasesAbiertasCollection, convocatoriaId), {
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
      const nuevoDia = { ...dia, id: generateDiaId() };
      await updateDoc(doc(clasesAbiertasCollection, convocatoriaId), {
        dias: arrayUnion(nuevoDia),
        updatedAt: serverTimestamp()
      });
      return { success: true, dia: nuevoDia };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async updateDia(convocatoriaId, diaId, cambios) {
    try {
      const convRef = doc(clasesAbiertasCollection, convocatoriaId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) return { success: false, error: 'Convocatoria no encontrada' };

      const dias = convSnap.data().dias || [];
      const diasActualizados = dias.map((d) =>
        d.id === diaId ? { ...d, ...cambios } : d
      );
      await updateDoc(convRef, { dias: diasActualizados, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteDia(convocatoriaId, diaId) {
    try {
      const convRef = doc(clasesAbiertasCollection, convocatoriaId);
      const convSnap = await getDoc(convRef);
      if (!convSnap.exists()) return { success: false, error: 'Convocatoria no encontrada' };

      const dias = convSnap.data().dias || [];
      const diasFiltrados = dias.filter((d) => d.id !== diaId);
      await updateDoc(convRef, { dias: diasFiltrados, updatedAt: serverTimestamp() });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ── Inscripciones ───────────────────────────────────────────────

  async getInscripcionesByConvocatoria(convocatoriaId) {
    try {
      const snapshot = await getDocs(inscripcionesCollection(convocatoriaId));
      const inscripciones = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { success: true, inscripciones };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getInscripcionesByFamilia(convocatoriaId, familiaUid) {
    try {
      const q = query(
        inscripcionesCollection(convocatoriaId),
        where('familiaUid', '==', familiaUid)
      );
      const snapshot = await getDocs(q);
      const inscripciones = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      return { success: true, inscripciones };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async inscribirAmbienteAbierto(convocatoriaId, payload) {
    // payload: { diaId, familiaUid, familiaNombre, hijoId, hijoNombre, ambiente }
    try {
      const colRef = inscripcionesCollection(convocatoriaId);

      const result = await runTransaction(db, async (transaction) => {
        // 1. Contar inscripciones para este día
        const porDiaQ = query(colRef, where('diaId', '==', payload.diaId));
        const porDiaSnap = await getDocs(porDiaQ);
        if (porDiaSnap.size >= 2) {
          return { success: false, error: 'Este día ya tiene el cupo completo.', code: 'CUPO_COMPLETO' };
        }

        // 2. Verificar que la familia no esté ya inscripta en esta convocatoria
        const porFamiliaQ = query(colRef, where('familiaUid', '==', payload.familiaUid));
        const porFamiliaSnap = await getDocs(porFamiliaQ);
        if (!porFamiliaSnap.empty) {
          return { success: false, error: 'Ya estás anotada en esta convocatoria.', code: 'YA_INSCRIPTA' };
        }

        // 3. Crear inscripción
        const newDocRef = doc(colRef);
        transaction.set(newDocRef, {
          ...payload,
          createdAt: serverTimestamp()
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
      // Verificar que no esté ya inscripta en este día
      const q = query(
        inscripcionesCollection(convocatoriaId),
        where('diaId', '==', payload.diaId),
        where('familiaUid', '==', payload.familiaUid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return { success: false, error: 'Ya estás anotada en este día.', code: 'YA_INSCRIPTA' };
      }

      const docRef = await addDoc(inscripcionesCollection(convocatoriaId), {
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
git commit -m "feat: add clasesAbiertas Firestore service with transaction-based quota control"
```

---

## Task 3: Hook useClasesAbiertas

**Files:**
- Create: `src/hooks/useClasesAbiertas.js`

- [ ] **Step 1: Crear el hook**

```js
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { clasesAbiertasService } from '../services/clasesAbiertas.service';

const TIPOS = ['ambiente_abierto', 'taller_abierto'];

/**
 * Carga convocatorias activas e inscripciones propias de la familia.
 * @param {string[]} ambientes - ['taller1'] | ['taller2'] | ['taller1', 'taller2']
 */
export function useClasesAbiertas(ambientes = []) {
  const { user } = useAuth();
  // convocatorias: { 'taller1_ambiente_abierto': {id, tipo, ambiente, activo, dias[]}, ... }
  const [convocatorias, setConvocatorias] = useState({});
  // inscripcionesPropia: { [convocatoriaId]: [{id, diaId, ...}] }
  const [inscripcionesPropia, setInscripcionesPropia] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    if (!ambientes.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const pairs = ambientes.flatMap((ambiente) =>
        TIPOS.map((tipo) => ({ ambiente, tipo }))
      );

      const results = await Promise.all(
        pairs.map(({ tipo, ambiente }) =>
          clasesAbiertasService.getConvocatoriaActiva(tipo, ambiente)
        )
      );

      const nuevasConvocatorias = {};
      results.forEach((res, i) => {
        if (res.success && res.convocatoria) {
          const { tipo, ambiente } = pairs[i];
          nuevasConvocatorias[`${ambiente}_${tipo}`] = res.convocatoria;
        }
      });
      setConvocatorias(nuevasConvocatorias);

      // Cargar inscripciones propias (solo para familias)
      if (user?.uid) {
        const convIds = Object.values(nuevasConvocatorias).map((c) => c.id);
        const inscResults = await Promise.all(
          convIds.map((id) =>
            clasesAbiertasService.getInscripcionesByFamilia(id, user.uid)
          )
        );
        const nuevasInscripciones = {};
        convIds.forEach((id, i) => {
          if (inscResults[i].success) {
            nuevasInscripciones[id] = inscResults[i].inscripciones;
          }
        });
        setInscripcionesPropia(nuevasInscripciones);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ambientes.join(','), user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { convocatorias, inscripcionesPropia, loading, error, recargar: cargar };
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/hooks/useClasesAbiertas.js
git commit -m "feat: add useClasesAbiertas hook"
```

---

## Task 4: Reglas Firestore

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Agregar las reglas al final del bloque principal**

En `firestore.rules`, antes del cierre `}` final del bloque `match /databases/{database}/documents`, agregar:

```
    // Colección: /clasesAbiertas (convocatorias de clases abiertas)
    match /clasesAbiertas/{convocatoriaId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdmin();

      match /inscripciones/{inscripcionId} {
        allow read: if isAdmin() ||
                       (isFamily() && resource.data.familiaUid == request.auth.uid);
        allow create: if isFamily() &&
                         request.resource.data.familiaUid == request.auth.uid;
        allow delete: if isFamily() &&
                         resource.data.familiaUid == request.auth.uid;
        allow update: if false;
      }
    }
```

- [ ] **Step 2: Verificar sintaxis de las reglas**

```powershell
cd "D:\Aideas\PUERTO NUEVO"
npx firebase-tools rules:test firestore.rules 2>&1
```

Si `firebase-tools` no está instalado globalmente, verificar visualmente que la indentación y llaves coincidan con el resto del archivo.

- [ ] **Step 3: Commit**

```powershell
git add firestore.rules
git commit -m "feat: add Firestore security rules for clasesAbiertas collection"
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

const TIPO_LABELS = {
  ambiente_abierto: 'Ambiente Abierto',
  taller_abierto: 'Taller Abierto'
};

const AMBIENTE_LABELS = {
  taller1: 'Taller 1',
  taller2: 'Taller 2'
};

const TIPOS = ['ambiente_abierto', 'taller_abierto'];
const AMBIENTES = ['taller1', 'taller2'];

const formatFechaDisplay = (fechaValue) => {
  if (!fechaValue) return '';
  const d = fechaValue?.toDate ? fechaValue.toDate() : new Date(fechaValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const formatFechaInput = (fechaValue) => {
  if (!fechaValue) return '';
  const d = fechaValue?.toDate ? fechaValue.toDate() : new Date(fechaValue);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

function PanelConvocatoria({ tipo, ambiente }) {
  const { user } = useAuth();
  const [convocatoria, setConvocatoria] = useState(null);
  const [inscripciones, setInscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Estado para agregar día
  const [newDia, setNewDia] = useState({ fecha: '', horario: '', nombreTaller: '' });
  // Estado para edición inline de día
  const [editingDiaId, setEditingDiaId] = useState('');
  const [editDia, setEditDia] = useState({ fecha: '', horario: '', nombreTaller: '' });
  // Estado para confirmación de borrado inline
  const [deletingDiaId, setDeletingDiaId] = useState('');
  // Estado para expandir inscriptos por día
  const [expandedDiaId, setExpandedDiaId] = useState('');

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(''), 4000);
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    const res = await clasesAbiertasService.getConvocatoriaActiva(tipo, ambiente);
    if (res.success) {
      setConvocatoria(res.convocatoria);
      if (res.convocatoria) {
        const inscRes = await clasesAbiertasService.getInscripcionesByConvocatoria(res.convocatoria.id);
        if (inscRes.success) setInscripciones(inscRes.inscripciones);
      }
    }
    setLoading(false);
  }, [tipo, ambiente]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCrearConvocatoria = async () => {
    setSubmitting(true);
    const res = await clasesAbiertasService.createConvocatoria(tipo, ambiente, user.uid);
    if (res.success) {
      showMessage('Convocatoria creada.');
      cargar();
    } else {
      showError(res.error);
    }
    setSubmitting(false);
  };

  const handleToggle = async () => {
    if (!convocatoria) return;
    setSubmitting(true);
    const res = await clasesAbiertasService.toggleConvocatoria(convocatoria.id, !convocatoria.activo);
    if (res.success) {
      showMessage(`Convocatoria ${!convocatoria.activo ? 'activada' : 'desactivada'}.`);
      cargar();
    } else {
      showError(res.error);
    }
    setSubmitting(false);
  };

  const handleAddDia = async (e) => {
    e.preventDefault();
    if (!newDia.fecha || !newDia.horario) {
      showError('La fecha y el horario son obligatorios.');
      return;
    }
    if (tipo === 'taller_abierto' && !newDia.nombreTaller.trim()) {
      showError('El nombre del taller es obligatorio.');
      return;
    }
    setSubmitting(true);
    const diaData = {
      fecha: new Date(newDia.fecha + 'T12:00:00'),
      horario: newDia.horario.trim(),
      ...(tipo === 'taller_abierto' ? { nombreTaller: newDia.nombreTaller.trim() } : {})
    };
    const res = await clasesAbiertasService.addDia(convocatoria.id, diaData);
    if (res.success) {
      showMessage('Día agregado.');
      setNewDia({ fecha: '', horario: '', nombreTaller: '' });
      cargar();
    } else {
      showError(res.error);
    }
    setSubmitting(false);
  };

  const handleStartEdit = (dia) => {
    setEditingDiaId(dia.id);
    setEditDia({
      fecha: formatFechaInput(dia.fecha),
      horario: dia.horario || '',
      nombreTaller: dia.nombreTaller || ''
    });
    setDeletingDiaId('');
  };

  const handleSaveEdit = async (diaId) => {
    if (!editDia.fecha || !editDia.horario) {
      showError('La fecha y el horario son obligatorios.');
      return;
    }
    setSubmitting(true);
    const cambios = {
      fecha: new Date(editDia.fecha + 'T12:00:00'),
      horario: editDia.horario.trim(),
      ...(tipo === 'taller_abierto' ? { nombreTaller: editDia.nombreTaller.trim() } : {})
    };
    const res = await clasesAbiertasService.updateDia(convocatoria.id, diaId, cambios);
    if (res.success) {
      showMessage('Día actualizado.');
      setEditingDiaId('');
      cargar();
    } else {
      showError(res.error);
    }
    setSubmitting(false);
  };

  const handleConfirmDelete = async (diaId) => {
    setSubmitting(true);
    const res = await clasesAbiertasService.deleteDia(convocatoria.id, diaId);
    if (res.success) {
      showMessage('Día eliminado.');
      setDeletingDiaId('');
      cargar();
    } else {
      showError(res.error);
    }
    setSubmitting(false);
  };

  const getInscriptosPorDia = (diaId) =>
    inscripciones.filter((i) => i.diaId === diaId);

  if (loading) {
    return <p style={{ color: 'var(--color-text-light)', padding: 'var(--spacing-md)' }}>Cargando...</p>;
  }

  return (
    <div>
      {message && (
        <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>
          {message}
        </div>
      )}
      {error && (
        <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>
          {error}
        </div>
      )}

      {!convocatoria ? (
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <p style={{ color: 'var(--color-text-light)', marginBottom: 'var(--spacing-md)' }}>
              No hay una convocatoria activa para {TIPO_LABELS[tipo]} — {AMBIENTE_LABELS[ambiente]}.
            </p>
            <button
              className="btn btn--primary"
              onClick={handleCrearConvocatoria}
              disabled={submitting}
            >
              Crear convocatoria
            </button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card__title">
              {TIPO_LABELS[tipo]} — {AMBIENTE_LABELS[ambiente]}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <span style={{
                fontSize: 'var(--font-size-sm)',
                color: convocatoria.activo ? 'var(--color-success)' : 'var(--color-text-light)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                {convocatoria.activo ? 'Activa' : 'Inactiva'}
              </span>
              <button
                className="btn btn--secondary"
                style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                onClick={handleToggle}
                disabled={submitting}
              >
                {convocatoria.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>

          <div className="card__body">
            {/* Lista de días */}
            {convocatoria.dias && convocatoria.dias.length > 0 ? (
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text)' }}>
                  Días programados
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {convocatoria.dias.map((dia) => {
                    const inscriptosDia = getInscriptosPorDia(dia.id);
                    const isEditing = editingDiaId === dia.id;
                    const isDeleting = deletingDiaId === dia.id;
                    const isExpanded = expandedDiaId === dia.id;

                    return (
                      <div
                        key={dia.id}
                        style={{
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                          padding: 'var(--spacing-md)',
                          background: 'var(--color-background-alt)'
                        }}
                      >
                        {isEditing ? (
                          /* Formulario de edición inline */
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Fecha</label>
                              <input
                                type="date"
                                className="form-input"
                                value={editDia.fecha}
                                onChange={(e) => setEditDia((p) => ({ ...p, fecha: e.target.value }))}
                              />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <label className="form-label">Horario</label>
                              <input
                                type="text"
                                className="form-input"
                                placeholder="ej: 10:00 - 11:00"
                                value={editDia.horario}
                                onChange={(e) => setEditDia((p) => ({ ...p, horario: e.target.value }))}
                              />
                            </div>
                            {tipo === 'taller_abierto' && (
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label">Taller</label>
                                <input
                                  type="text"
                                  className="form-input"
                                  placeholder="ej: Teatro"
                                  value={editDia.nombreTaller}
                                  onChange={(e) => setEditDia((p) => ({ ...p, nombreTaller: e.target.value }))}
                                />
                              </div>
                            )}
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                              <button
                                className="btn btn--primary"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                                onClick={() => handleSaveEdit(dia.id)}
                                disabled={submitting}
                              >
                                Guardar
                              </button>
                              <button
                                className="btn btn--ghost"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                                onClick={() => setEditingDiaId('')}
                                disabled={submitting}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : isDeleting ? (
                          /* Confirmación de borrado inline */
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--color-text)', fontSize: 'var(--font-size-sm)' }}>
                              ¿Eliminar {formatFechaDisplay(dia.fecha)}?
                              {inscriptosDia.length > 0 && (
                                <strong style={{ color: 'var(--color-error)' }}>
                                  {' '}Hay {inscriptosDia.length} inscripción{inscriptosDia.length > 1 ? 'es' : ''} que se perderán.
                                </strong>
                              )}
                            </span>
                            <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                              <button
                                className="btn btn--danger"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                                onClick={() => handleConfirmDelete(dia.id)}
                                disabled={submitting}
                              >
                                Eliminar
                              </button>
                              <button
                                className="btn btn--ghost"
                                style={{ fontSize: 'var(--font-size-sm)' }}
                                onClick={() => setDeletingDiaId('')}
                                disabled={submitting}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Fila normal */
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                              <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize' }}>
                                  {formatFechaDisplay(dia.fecha)}
                                </span>
                                <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
                                  {dia.horario}
                                </span>
                                {tipo === 'taller_abierto' && dia.nombreTaller && (
                                  <span className="badge badge--info">{dia.nombreTaller}</span>
                                )}
                                {tipo === 'ambiente_abierto' && (
                                  <span style={{ fontSize: 'var(--font-size-sm)', color: inscriptosDia.length >= 2 ? 'var(--color-error)' : 'var(--color-success)' }}>
                                    {inscriptosDia.length}/2 inscriptos
                                  </span>
                                )}
                                {tipo === 'taller_abierto' && inscriptosDia.length > 0 && (
                                  <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                                    {inscriptosDia.length} inscripto{inscriptosDia.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
                                {inscriptosDia.length > 0 && (
                                  <button
                                    className="btn btn--ghost"
                                    style={{ fontSize: 'var(--font-size-sm)' }}
                                    onClick={() => setExpandedDiaId(isExpanded ? '' : dia.id)}
                                  >
                                    {isExpanded ? 'Ocultar' : 'Ver inscriptos'}
                                  </button>
                                )}
                                <button
                                  className="btn btn--secondary"
                                  style={{ fontSize: 'var(--font-size-sm)' }}
                                  onClick={() => handleStartEdit(dia)}
                                >
                                  Editar
                                </button>
                                <button
                                  className="btn btn--ghost"
                                  style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }}
                                  onClick={() => { setDeletingDiaId(dia.id); setEditingDiaId(''); }}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>

                            {/* Lista de inscriptos expandida */}
                            {isExpanded && (
                              <div style={{ marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border)' }}>
                                {inscriptosDia.map((insc) => (
                                  <div key={insc.id} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)', padding: 'var(--spacing-xs) 0' }}>
                                    <strong>{insc.familiaNombre}</strong> — {insc.hijoNombre}
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
              <p style={{ color: 'var(--color-text-light)', marginBottom: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)' }}>
                No hay días cargados todavía.
              </p>
            )}

            {/* Formulario agregar día */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-lg)' }}>
              <h4 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--spacing-sm)', color: 'var(--color-text)' }}>
                Agregar día
              </h4>
              <form onSubmit={handleAddDia} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Fecha</label>
                  <input
                    type="date"
                    className="form-input"
                    value={newDia.fecha}
                    onChange={(e) => setNewDia((p) => ({ ...p, fecha: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Horario</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="ej: 10:00 - 11:00"
                    value={newDia.horario}
                    onChange={(e) => setNewDia((p) => ({ ...p, horario: e.target.value }))}
                    required
                  />
                </div>
                {tipo === 'taller_abierto' && (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Nombre del taller</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ej: Teatro"
                      value={newDia.nombreTaller}
                      onChange={(e) => setNewDia((p) => ({ ...p, nombreTaller: e.target.value }))}
                      required
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={submitting}
                >
                  Agregar día
                </button>
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
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
          Clases Abiertas
        </h1>
        <p style={{ color: 'var(--color-text-light)', marginTop: 'var(--spacing-xs)' }}>
          Gestioná las convocatorias de Ambiente Abierto y Taller Abierto.
        </p>
      </div>

      {/* Tabs tipo */}
      <div className="tabs" style={{ marginBottom: 'var(--spacing-md)' }}>
        {TIPOS.map((tipo) => (
          <button
            key={tipo}
            className={`tab${tipoActivo === tipo ? ' tab--active' : ''}`}
            onClick={() => setTipoActivo(tipo)}
          >
            {TIPO_LABELS[tipo]}
          </button>
        ))}
      </div>

      {/* Tabs ambiente */}
      <div className="tabs" style={{ marginBottom: 'var(--spacing-lg)' }}>
        {AMBIENTES.map((ambiente) => (
          <button
            key={ambiente}
            className={`tab${ambienteActivo === ambiente ? ' tab--active' : ''}`}
            onClick={() => setAmbienteActivo(ambiente)}
          >
            {AMBIENTE_LABELS[ambiente]}
          </button>
        ))}
      </div>

      <PanelConvocatoria
        key={`${tipoActivo}_${ambienteActivo}`}
        tipo={tipoActivo}
        ambiente={ambienteActivo}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```powershell
git add src/pages/admin/ClasesAbiertasManager.jsx
git commit -m "feat: add ClasesAbiertasManager admin component"
```

---

## Task 6: Componente Familia — ClasesAbiertas

**Files:**
- Create: `src/pages/family/ClasesAbiertas.jsx`

- [ ] **Step 1: Crear el componente**

```jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useClasesAbiertas } from '../../hooks/useClasesAbiertas';
import { clasesAbiertasService } from '../../services/clasesAbiertas.service';
import { childrenService } from '../../services/children.service';

const AMBIENTE_LABELS = { taller1: 'Taller 1', taller2: 'Taller 2' };

const formatFechaDisplay = (fechaValue) => {
  if (!fechaValue) return '';
  const d = fechaValue?.toDate ? fechaValue.toDate() : new Date(fechaValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

function SelectorHijo({ hijos, onSeleccionar, onCancelar }) {
  const [hijoSeleccionado, setHijoSeleccionado] = useState(hijos[0]?.id || '');

  return (
    <div style={{
      marginTop: 'var(--spacing-sm)',
      padding: 'var(--spacing-md)',
      background: 'var(--color-primary-soft)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--spacing-sm)',
      alignItems: 'center'
    }}>
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>¿Para qué hijo?</span>
      <select
        className="form-input"
        style={{ width: 'auto' }}
        value={hijoSeleccionado}
        onChange={(e) => setHijoSeleccionado(e.target.value)}
      >
        {hijos.map((h) => (
          <option key={h.id} value={h.id}>{h.nombreCompleto}</option>
        ))}
      </select>
      <button
        className="btn btn--primary"
        style={{ fontSize: 'var(--font-size-sm)' }}
        onClick={() => {
          const hijo = hijos.find((h) => h.id === hijoSeleccionado);
          if (hijo) onSeleccionar(hijo);
        }}
      >
        Confirmar
      </button>
      <button
        className="btn btn--ghost"
        style={{ fontSize: 'var(--font-size-sm)' }}
        onClick={onCancelar}
      >
        Cancelar
      </button>
    </div>
  );
}

function SeccionAmbienteAbierto({ convocatoria, inscripciones, hijos, ambiente, onRecargar }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [seleccionandoDiaId, setSeleccionandoDiaId] = useState('');

  const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 4000); };
  const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const inscripcionFamilia = inscripciones?.find((i) => i.familiaUid === user?.uid);

  const getConteo = (diaId) =>
    (inscripciones || []).filter((i) => i.diaId === diaId).length;

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
    if (res.success) {
      showMessage('¡Te anotaste correctamente!');
      onRecargar();
    } else {
      showError(res.error);
    }
    setSubmitting(false);
  };

  if (!convocatoria) {
    return (
      <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
        Sin fechas disponibles por el momento.
      </p>
    );
  }

  const dias = convocatoria.dias || [];

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}

      {dias.length === 0 ? (
        <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
          Sin fechas disponibles por el momento.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {dias.map((dia) => {
            const conteo = getConteo(dia.id);
            const esMiDia = inscripcionFamilia?.diaId === dia.id;
            const completo = conteo >= 2;
            const yaInscripta = !!inscripcionFamilia;

            return (
              <div
                key={dia.id}
                style={{
                  border: `1px solid ${esMiDia ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--spacing-md)',
                  background: esMiDia ? 'var(--color-primary-soft)' : 'var(--color-background-alt)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                  <div>
                    <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize' }}>
                      {formatFechaDisplay(dia.fecha)}
                    </span>
                    <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-sm)' }}>
                      {dia.horario}
                    </span>
                  </div>
                  <div>
                    {esMiDia ? (
                      <span className="badge badge--success">Anotada</span>
                    ) : completo ? (
                      <span className="badge badge--error">Completo</span>
                    ) : yaInscripta ? (
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-light)' }}>
                        Ya tenés una fecha elegida
                      </span>
                    ) : (
                      <button
                        className="btn btn--primary"
                        style={{ fontSize: 'var(--font-size-sm)' }}
                        disabled={submitting}
                        onClick={() => {
                          if (hijos.length === 1) {
                            handleAnotarme(dia, hijos[0]);
                          } else {
                            setSeleccionandoDiaId(dia.id);
                          }
                        }}
                      >
                        Anotarme
                      </button>
                    )}
                  </div>
                </div>

                {seleccionandoDiaId === dia.id && (
                  <SelectorHijo
                    hijos={hijos}
                    onSeleccionar={(hijo) => handleAnotarme(dia, hijo)}
                    onCancelar={() => setSeleccionandoDiaId('')}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SeccionTallerAbierto({ convocatoria, inscripciones, hijos, ambiente, onRecargar }) {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [seleccionandoDiaId, setSeleccionandoDiaId] = useState('');

  const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 4000); };
  const showMessage = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

  const getMiInscripcion = (diaId) =>
    (inscripciones || []).find((i) => i.diaId === diaId && i.familiaUid === user?.uid);

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
    if (res.success) {
      showMessage('¡Te anotaste correctamente!');
      onRecargar();
    } else {
      showError(res.error);
    }
    setSubmitting(false);
  };

  const handleDesanotarme = async (convocatoriaId, inscripcionId) => {
    setSubmitting(true);
    const res = await clasesAbiertasService.cancelarInscripcion(convocatoriaId, inscripcionId);
    if (res.success) {
      showMessage('Inscripción cancelada.');
      onRecargar();
    } else {
      showError(res.error);
    }
    setSubmitting(false);
  };

  if (!convocatoria) {
    return (
      <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
        Sin fechas disponibles por el momento.
      </p>
    );
  }

  const dias = convocatoria.dias || [];

  return (
    <div>
      {message && <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>{message}</div>}
      {error && <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>{error}</div>}

      {dias.length === 0 ? (
        <p style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)' }}>
          Sin fechas disponibles por el momento.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {dias.map((dia) => {
            const miInscripcion = getMiInscripcion(dia.id);

            return (
              <div
                key={dia.id}
                style={{
                  border: `1px solid ${miInscripcion ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--spacing-md)',
                  background: miInscripcion ? 'var(--color-primary-soft)' : 'var(--color-background-alt)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                  <div>
                    <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-text)', textTransform: 'capitalize' }}>
                      {formatFechaDisplay(dia.fecha)}
                    </span>
                    <span style={{ color: 'var(--color-text-light)', fontSize: 'var(--font-size-sm)', marginLeft: 'var(--spacing-sm)' }}>
                      {dia.horario}
                    </span>
                    {dia.nombreTaller && (
                      <span className="badge badge--info" style={{ marginLeft: 'var(--spacing-sm)' }}>
                        {dia.nombreTaller}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                    {miInscripcion ? (
                      <>
                        <span className="badge badge--success">Anotada</span>
                        <button
                          className="btn btn--ghost"
                          style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-error)' }}
                          disabled={submitting}
                          onClick={() => handleDesanotarme(convocatoria.id, miInscripcion.id)}
                        >
                          Desanotarme
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn--primary"
                        style={{ fontSize: 'var(--font-size-sm)' }}
                        disabled={submitting}
                        onClick={() => {
                          if (hijos.length === 1) {
                            handleAnotarme(dia, hijos[0]);
                          } else {
                            setSeleccionandoDiaId(dia.id);
                          }
                        }}
                      >
                        Anotarme
                      </button>
                    )}
                  </div>
                </div>

                {seleccionandoDiaId === dia.id && (
                  <SelectorHijo
                    hijos={hijos}
                    onSeleccionar={(hijo) => handleAnotarme(dia, hijo)}
                    onCancelar={() => setSeleccionandoDiaId('')}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PanelAmbiente({ ambiente, convocatorias, inscripcionesPropia, hijos, onRecargar }) {
  const convAmbienteAbierto = convocatorias[`${ambiente}_ambiente_abierto`] || null;
  const convTallerAbierto = convocatorias[`${ambiente}_taller_abierto`] || null;

  const inscAAId = convAmbienteAbierto?.id;
  const inscTAId = convTallerAbierto?.id;

  const inscAA = inscAAId ? (inscripcionesPropia[inscAAId] || []) : [];
  const inscTA = inscTAId ? (inscripcionesPropia[inscTAId] || []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Ambiente Abierto</h3>
        </div>
        <div className="card__body">
          <SeccionAmbienteAbierto
            convocatoria={convAmbienteAbierto}
            inscripciones={inscAA}
            hijos={hijos}
            ambiente={ambiente}
            onRecargar={onRecargar}
          />
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <h3 className="card__title">Taller Abierto</h3>
        </div>
        <div className="card__body">
          <SeccionTallerAbierto
            convocatoria={convTallerAbierto}
            inscripciones={inscTA}
            hijos={hijos}
            ambiente={ambiente}
            onRecargar={onRecargar}
          />
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
    if (ambientes.length && !ambienteActivo) {
      setAmbienteActivo(ambientes[0]);
    }
  }, [ambientes.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loadingHijos || loading) {
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <p style={{ color: 'var(--color-text-light)' }}>Cargando...</p>
      </div>
    );
  }

  if (!ambientes.length) {
    return (
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="card">
          <div className="card__body">
            <p style={{ color: 'var(--color-text-light)' }}>No se encontraron alumnos asociados a tu cuenta.</p>
          </div>
        </div>
      </div>
    );
  }

  const hijosPorAmbiente = (ambiente) => hijos.filter((h) => h.ambiente === ambiente);

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text)' }}>
          Clases Abiertas
        </h1>
        <p style={{ color: 'var(--color-text-light)', marginTop: 'var(--spacing-xs)' }}>
          Anotate a las fechas disponibles.
        </p>
      </div>

      {ambientes.length > 1 && (
        <div className="tabs" style={{ marginBottom: 'var(--spacing-lg)' }}>
          {ambientes.map((amb) => (
            <button
              key={amb}
              className={`tab${ambienteActivo === amb ? ' tab--active' : ''}`}
              onClick={() => setAmbienteActivo(amb)}
            >
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
          hijos={hijosPorAmbiente(ambienteActivo)}
          onRecargar={recargar}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar que `childrenService.getChildrenByResponsable` existe**

```powershell
Select-String -Path "src\services\children.service.js" -Pattern "getChildrenByResponsable"
```

Si no existe, agregar el método al servicio en `src/services/children.service.js`:

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

- [ ] **Step 3: Commit**

```powershell
git add src/pages/family/ClasesAbiertas.jsx src/services/children.service.js
git commit -m "feat: add ClasesAbiertas family component"
```

---

## Task 7: Navegación — Sidebar y App.jsx

**Files:**
- Modify: `src/components/layout/Sidebar.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Agregar ítem en Sidebar para admin**

En `src/components/layout/Sidebar.jsx`, en el array de `ROLES.SUPERADMIN`, agregar después del ítem de `actividades`:

```js
{ path: '/portal/admin/clases-abiertas', icon: 'calendar', label: 'Clases Abiertas' },
```

Hacer lo mismo en el array de `ROLES.COORDINACION`.

- [ ] **Step 2: Agregar ítem en Sidebar para familia**

En el array de `ROLES.FAMILY`, agregar después del ítem de `actividades`:

```js
{ path: '/portal/familia/clases-abiertas', icon: 'calendar', label: 'Clases Abiertas' },
```

- [ ] **Step 3: Agregar lazy import y rutas en App.jsx**

Agregar el lazy import con los demás imports admin en `src/App.jsx`:

```js
const ClasesAbiertasManager = lazy(() => import('./pages/admin/ClasesAbiertasManager'));
```

Y con los imports de familia:

```js
const ClasesAbiertas = lazy(() => import('./pages/family/ClasesAbiertas'));
```

Agregar la ruta admin después de la ruta de `/portal/admin/actividades`:

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

Agregar la ruta familia después de la ruta de `/portal/familia/actividades`:

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

- [ ] **Step 4: Verificar que el servidor de desarrollo levanta sin errores**

```powershell
cd "D:\Aideas\PUERTO NUEVO"
npm run dev 2>&1 | Select-Object -First 20
```

Resultado esperado: `VITE ready` sin errores de compilación.

- [ ] **Step 5: Commit**

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
4. Crear convocatoria para Ambiente Abierto / Taller 1
5. Agregar 2 días con fecha y horario
6. Crear convocatoria para Taller Abierto / Taller 1
7. Agregar 2 días con fecha, horario y nombre de taller
8. Editar un día inline — verificar que los campos se pre-llenan y guardan correctamente
9. Eliminar un día — verificar confirmación inline y que desaparece

- [ ] **Step 3: Verificar vista Familia**

1. Loguearse como familia con hijo en Taller 1
2. Verificar que "Clases Abiertas" aparece en el sidebar
3. Navegar a `/portal/familia/clases-abiertas`
4. Anotarse a un día de Ambiente Abierto — verificar que el día queda marcado "Anotada" y los otros días muestran "Ya tenés una fecha elegida"
5. Anotarse a múltiples días de Taller Abierto — verificar botón "Desanotarme"
6. Desanotarse de un taller — verificar que el botón "Anotarme" vuelve a aparecer

- [ ] **Step 4: Verificar control de cupo**

1. Con dos familias distintas anotarse al mismo día de Ambiente Abierto
2. Intentar con una tercera familia — verificar que el día muestra "Completo"
3. Desde admin verificar que el día muestra "2/2 inscriptos"

---

## Self-review del plan

### Cobertura del spec

| Requisito | Task |
|---|---|
| Colección `/clasesAbiertas` con tipo, ambiente, activo, dias[] | Task 2 |
| Subcolección `/inscripciones` | Task 2 |
| `getConvocatoriaActiva`, `createConvocatoria`, `toggleConvocatoria` | Task 2 |
| `addDia`, `updateDia`, `deleteDia` | Task 2 |
| `inscribirAmbienteAbierto` con transacción (cupo + unicidad) | Task 2 |
| `inscribirTallerAbierto` sin cupo | Task 2 |
| `cancelarInscripcion` | Task 2 |
| Hook `useClasesAbiertas(ambientes)` | Task 3 |
| Reglas Firestore con ownership | Task 4 |
| Admin: tabs tipo + ambiente, CRUD días inline, lista inscriptos | Task 5 |
| Admin: confirmación borrado inline | Task 5 |
| Admin: toggle activo/inactivo | Task 5 |
| Familia: tabs por ambiente (solo si tiene hijos en ambos) | Task 6 |
| Familia: Ambiente Abierto con estado Disponible/Completo/Anotada | Task 6 |
| Familia: Taller Abierto con Anotarme/Desanotarme | Task 6 |
| Familia: selector de hijo inline si tiene más de uno en el ambiente | Task 6 |
| Sidebar + rutas App.jsx | Task 7 |
| Constantes de rutas | Task 1 |
| Design system: variables CSS, clases btn/card/badge/tabs/form | Todos |
| Todo inline, sin modales | Todos |
