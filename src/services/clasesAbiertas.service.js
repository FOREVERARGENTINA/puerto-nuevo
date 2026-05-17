import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
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
const activeConvocatoriaRef = (tipo, ambiente) =>
  doc(db, 'clasesAbiertasActivas', `${tipo}_${ambiente}`);

const generateDiaId = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const hasDia = (convData, diaId) =>
  convData?.diaIds?.[diaId] === true ||
  (convData?.dias || []).some((dia) => dia.id === diaId);

const validateConvocatoriaForInscripcion = (convData, tipoEsperado, payload) => {
  if (!convData?.activo) {
    return { valid: false, error: 'La convocatoria no está activa.', code: 'CONVOCATORIA_INACTIVA' };
  }
  if (convData.tipo !== tipoEsperado || convData.ambiente !== payload.ambiente) {
    return { valid: false, error: 'La convocatoria no corresponde al ambiente solicitado.', code: 'CONVOCATORIA_INVALIDA' };
  }
  if (!hasDia(convData, payload.diaId)) {
    return { valid: false, error: 'La fecha seleccionada ya no está disponible.', code: 'DIA_INVALIDO' };
  }
  return { valid: true };
};

const buildAmbienteAbiertoState = (inscripciones) => {
  const cupos = {};
  const familiasDia = {};
  const hijosDia = {};

  inscripciones.forEach((inscripcion) => {
    if (!inscripcion?.diaId || !inscripcion?.familiaUid) return;

    cupos[inscripcion.diaId] = (cupos[inscripcion.diaId] || 0) + 1;
    familiasDia[inscripcion.familiaUid] = inscripcion.diaId;

    if (inscripcion.hijoId && !hijosDia[inscripcion.hijoId]) {
      hijosDia[inscripcion.hijoId] = inscripcion.diaId;
    }
  });

  return { cupos, familiasDia, hijosDia };
};

export const clasesAbiertasService = {
  // ── Convocatorias ──────────────────────────────────────────────

  async getConvocatoriaActiva(tipo, ambiente) {
    try {
      const activeSnap = await getDoc(activeConvocatoriaRef(tipo, ambiente));
      const activeId = activeSnap.exists() ? activeSnap.data().convocatoriaId : null;
      if (!activeId) return { success: true, convocatoria: null };

      const convSnap = await getDoc(doc(clasesAbiertasCol, activeId));
      if (!convSnap.exists() || convSnap.data().activo !== true) {
        return { success: true, convocatoria: null };
      }
      return { success: true, convocatoria: { id: convSnap.id, ...convSnap.data() } };
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
      await runTransaction(db, async (transaction) => {
        const targetRef = doc(clasesAbiertasCol, convocatoriaId);
        const targetSnap = await transaction.get(targetRef);
        if (!targetSnap.exists()) throw new Error('Convocatoria no encontrada');

        const { tipo, ambiente } = targetSnap.data();
        const activeRef = activeConvocatoriaRef(tipo, ambiente);
        const activeSnap = await transaction.get(activeRef);
        const currentId = activeSnap.exists() ? activeSnap.data().convocatoriaId : null;

        if (currentId && currentId !== convocatoriaId) {
          const currentRef = doc(clasesAbiertasCol, currentId);
          const currentSnap = await transaction.get(currentRef);
          if (currentSnap.exists()) {
            transaction.update(currentRef, { activo: false, updatedAt: serverTimestamp() });
          }
        }

        transaction.update(targetRef, { activo: true, updatedAt: serverTimestamp() });
        transaction.set(activeRef, {
          tipo,
          ambiente,
          convocatoriaId,
          updatedAt: serverTimestamp()
        });
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Crea un doc nuevo limpio y desactiva la convocatoria anterior si existe.
  async createNuevaConvocatoria(tipo, ambiente, uid, convocatoriaAnteriorId = null) {
    try {
      let newId = null;
      await runTransaction(db, async (transaction) => {
        const activeRef = activeConvocatoriaRef(tipo, ambiente);
        const activeSnap = await transaction.get(activeRef);
        const currentId = activeSnap.exists() ? activeSnap.data().convocatoriaId : convocatoriaAnteriorId;

        if (currentId) {
          const currentRef = doc(clasesAbiertasCol, currentId);
          const currentSnap = await transaction.get(currentRef);
          if (currentSnap.exists()) {
            transaction.update(currentRef, { activo: false, updatedAt: serverTimestamp() });
          }
        }

        const newRef = doc(clasesAbiertasCol);
        newId = newRef.id;
        transaction.set(newRef, {
          tipo,
          ambiente,
          activo: true,
          dias: [],
          diaIds: {},
          cupos: {},
          familiasDia: {},
          hijosDia: {},
          creadoPor: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        transaction.set(activeRef, {
          tipo,
          ambiente,
          convocatoriaId: newRef.id,
          updatedAt: serverTimestamp()
        });
      });

      return { success: true, id: newId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async toggleConvocatoria(convocatoriaId, activo) {
    try {
      if (activo) {
        return clasesAbiertasService.reactivateConvocatoria(convocatoriaId);
      }

      await runTransaction(db, async (transaction) => {
        const convRef = doc(clasesAbiertasCol, convocatoriaId);
        const convSnap = await transaction.get(convRef);
        if (!convSnap.exists()) throw new Error('Convocatoria no encontrada');

        const { tipo, ambiente } = convSnap.data();
        const activeRef = activeConvocatoriaRef(tipo, ambiente);
        const activeSnap = await transaction.get(activeRef);
        const currentId = activeSnap.exists() ? activeSnap.data().convocatoriaId : null;

        transaction.update(convRef, { activo: false, updatedAt: serverTimestamp() });
        if (currentId === convocatoriaId) {
          transaction.delete(activeRef);
        }
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
        [`diaIds.${nuevoDia.id}`]: true,
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

      const familiasDia = convData.familiasDia || {};
      const familiasDelDia = Object.entries(familiasDia)
        .filter(([, did]) => did === diaId)
        .map(([uid]) => uid);

      const hijosDia = convData.hijosDia || {};
      const hijosDelDia = Object.entries(hijosDia)
        .filter(([, did]) => did === diaId)
        .map(([hijoId]) => hijoId);

      const batch = writeBatch(db);

      inscSnap.docs.forEach((d) => batch.delete(d.ref));

      const updatePayload = {
        dias: diasFiltrados,
        [`diaIds.${diaId}`]: deleteField(),
        [`cupos.${diaId}`]: deleteField(),
        updatedAt: serverTimestamp()
      };
      familiasDelDia.forEach((uid) => {
        updatePayload[`familiasDia.${uid}`] = deleteField();
      });
      hijosDelDia.forEach((hijoId) => {
        updatePayload[`hijosDia.${hijoId}`] = deleteField();
      });

      batch.update(convRef, updatePayload);
      await batch.commit();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // ── Inscripciones ───────────────────────────────────────────────

  async getInscripcionesByConvocatoria(convocatoriaId) {
    try {
      const snap = await getDocs(inscripcionesCol(convocatoriaId));
      return { success: true, inscripciones: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getInscripcionesByHijoIds(convocatoriaId, hijoIds) {
    try {
      if (!hijoIds?.length) return { success: true, inscripciones: [] };
      const q = query(inscripcionesCol(convocatoriaId), where('hijoId', 'in', hijoIds));
      const snap = await getDocs(q);
      return { success: true, inscripciones: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getInscripcionesByFamilia(convocatoriaId, familiaUid) {
    try {
      const q = query(inscripcionesCol(convocatoriaId), where('familiaUid', '==', familiaUid));
      const snap = await getDocs(q);
      return { success: true, inscripciones: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async recalcularEstadoConvocatoria(convocatoriaId) {
    try {
      const convRef = doc(clasesAbiertasCol, convocatoriaId);
      const [convSnap, inscSnap] = await Promise.all([
        getDoc(convRef),
        getDocs(inscripcionesCol(convocatoriaId))
      ]);

      if (!convSnap.exists()) {
        return { success: false, error: 'Convocatoria no encontrada.' };
      }

      if (convSnap.data().tipo !== 'ambiente_abierto') {
        return { success: false, error: 'La resincronización de cupos aplica solo a Ambiente Abierto.' };
      }

      const state = buildAmbienteAbiertoState(inscSnap.docs.map((d) => d.data()));
      await updateDoc(convRef, {
        ...state,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async inscribirAmbienteAbierto(convocatoriaId, payload) {
    try {
      const convRef = doc(clasesAbiertasCol, convocatoriaId);
      const colRef = inscripcionesCol(convocatoriaId);

      const result = await runTransaction(db, async (transaction) => {
        const convSnap = await transaction.get(convRef);
        if (!convSnap.exists()) {
          return { success: false, error: 'Convocatoria no encontrada.' };
        }

        const convData = convSnap.data();
        const validation = validateConvocatoriaForInscripcion(convData, 'ambiente_abierto', payload);
        if (!validation.valid) return validation;

        const cupos = convData.cupos || {};
        const cupoUsado = cupos[payload.diaId] || 0;
        if (cupoUsado >= 2) {
          return { success: false, error: 'Este día ya tiene el cupo completo.', code: 'CUPO_COMPLETO' };
        }

        const familiasDia = convData.familiasDia || {};
        if (familiasDia[payload.familiaUid]) {
          return { success: false, error: 'Ya estás anotada en esta convocatoria.', code: 'YA_INSCRIPTA' };
        }

        const hijosDia = convData.hijosDia || {};
        if (hijosDia[payload.hijoId]) {
          return { success: false, error: 'Este alumno ya tiene una fecha elegida en esta convocatoria.', code: 'HIJO_YA_INSCRIPTO' };
        }

        const newDocRef = doc(colRef, payload.familiaUid);
        transaction.set(newDocRef, { ...payload, createdAt: serverTimestamp() });
        transaction.update(convRef, {
          [`cupos.${payload.diaId}`]: cupoUsado + 1,
          [`familiasDia.${payload.familiaUid}`]: payload.diaId,
          [`hijosDia.${payload.hijoId}`]: payload.diaId,
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
    try {
      const convRef = doc(clasesAbiertasCol, convocatoriaId);
      const inscripcionId = `${payload.familiaUid}_${payload.diaId}`;
      const inscRef = doc(inscripcionesCol(convocatoriaId), inscripcionId);

      const result = await runTransaction(db, async (transaction) => {
        const [convSnap, inscSnap] = await Promise.all([
          transaction.get(convRef),
          transaction.get(inscRef)
        ]);

        if (!convSnap.exists()) {
          return { success: false, error: 'Convocatoria no encontrada.' };
        }

        const validation = validateConvocatoriaForInscripcion(convSnap.data(), 'taller_abierto', payload);
        if (!validation.valid) return validation;

        if (inscSnap.exists()) {
          return { success: false, error: 'Ya estás anotada en este día.', code: 'YA_INSCRIPTA' };
        }

        transaction.set(inscRef, { ...payload, createdAt: serverTimestamp() });
        return { success: true, id: inscRef.id };
      });

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async cancelarInscripcion(convocatoriaId, inscripcionId) {
    try {
      const convRef = doc(clasesAbiertasCol, convocatoriaId);
      const inscRef = doc(db, 'clasesAbiertas', convocatoriaId, 'inscripciones', inscripcionId);
      const currentSnap = await getDoc(inscRef);
      if (!currentSnap.exists()) {
        return { success: false, error: 'Inscripción no encontrada.' };
      }

      const currentInscripcion = currentSnap.data();
      const sameChildRefs = currentInscripcion.hijoId
        ? (await getDocs(query(inscripcionesCol(convocatoriaId), where('hijoId', '==', currentInscripcion.hijoId))))
          .docs
          .filter((d) => d.id !== inscripcionId)
          .map((d) => d.ref)
        : [];

      const result = await runTransaction(db, async (transaction) => {
        const [convSnap, inscSnap, ...sameChildSnaps] = await Promise.all([
          transaction.get(convRef),
          transaction.get(inscRef),
          ...sameChildRefs.map((ref) => transaction.get(ref))
        ]);

        if (!inscSnap.exists()) {
          return { success: false, error: 'Inscripción no encontrada.' };
        }

        const inscripcion = inscSnap.data();
        transaction.delete(inscRef);

        if (convSnap.exists() && convSnap.data().tipo === 'ambiente_abierto') {
          const convData = convSnap.data();
          const cupoActual = convData.cupos?.[inscripcion.diaId] || 0;
          const remainingChildInscription = sameChildSnaps
            .find((snap) => snap.exists() && snap.data().hijoId === inscripcion.hijoId);
          const updatePayload = {
            [`cupos.${inscripcion.diaId}`]: cupoActual > 1 ? cupoActual - 1 : deleteField(),
            [`familiasDia.${inscripcion.familiaUid}`]: deleteField(),
            updatedAt: serverTimestamp()
          };

          if (inscripcion.hijoId) {
            updatePayload[`hijosDia.${inscripcion.hijoId}`] = remainingChildInscription
              ? remainingChildInscription.data().diaId
              : deleteField();
          }

          transaction.update(convRef, {
            ...updatePayload
          });
        }

        return { success: true };
      });

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
