import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { clasesAbiertasService } from '../services/clasesAbiertas.service';

const TIPOS = ['ambiente_abierto', 'taller_abierto'];

/**
 * Carga convocatorias activas e inscripciones del grupo familiar.
 * Las convocatorias activas se piden en una sola consulta apenas monta el hook,
 * en paralelo con la carga de hijos del componente; solo las inscripciones
 * esperan a conocer ambientes e hijos.
 * Busca inscripciones por familiaUid Y por hijoIds para que ambos responsables
 * vean las inscripciones realizadas por cualquiera de ellos.
 * @param {string[]} ambientes
 * @param {Array<{id:string}>} hijos — array de hijos para buscar por hijoId
 */
export function useClasesAbiertas(ambientes = [], hijos = []) {
  const { user } = useAuth();
  const [activas, setActivas] = useState(null); // { `${ambiente}_${tipo}`: conv } | null mientras carga
  const [inscripcionesPropia, setInscripcionesPropia] = useState({});
  const [error, setError] = useState('');
  // Para qué ambientes/hijos corresponden los datos cargados: evita reportar
  // "listo" con datos viejos en el render previo a que arranque la nueva carga.
  const [loadedKey, setLoadedKey] = useState(null);

  const hijoIds = useMemo(() => hijos.map((h) => h.id).filter(Boolean), [hijos]);

  // Claves estables: las props llegan como arrays nuevos en cada render, asi que
  // dependemos del contenido serializado y no de la identidad del array.
  const ambientesKey = ambientes.join(',');
  const hijoIdsKey = hijoIds.join(',');
  const requestKey = `${ambientesKey}|${hijoIdsKey}|${user?.uid || ''}`;

  const cargarActivas = useCallback(async () => {
    const res = await clasesAbiertasService.getConvocatoriasActivas();
    if (!res.success) setError(res.error);
    setActivas(res.success ? res.convocatorias : {});
  }, []);

  useEffect(() => { cargarActivas(); }, [cargarActivas]);

  const convocatorias = useMemo(() => {
    const result = {};
    ambientes.forEach((ambiente) => TIPOS.forEach((tipo) => {
      const conv = activas?.[`${ambiente}_${tipo}`];
      if (conv) result[`${ambiente}_${tipo}`] = conv;
    }));
    return result;
  }, [activas, ambientesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const convIdsKey = Object.values(convocatorias).map((c) => c.id).join(',');

  // Las recargas (misma requestKey) son silenciosas: se mantienen los datos visibles.
  const cargarInscripciones = useCallback(async () => {
    if (activas === null) return; // todavía cargando convocatorias
    try {
      const convIds = convIdsKey ? convIdsKey.split(',') : [];
      if (user?.uid && convIds.length) {
        // Para cada convocatoria: buscar por familiaUid Y por hijoIds, mergear sin duplicados
        const inscResults = await Promise.all(
          convIds.map(async (id) => {
            const [porFamilia, porHijos] = await Promise.all([
              clasesAbiertasService.getInscripcionesByFamilia(id, user.uid),
              hijoIds.length
                ? clasesAbiertasService.getInscripcionesByHijoIds(id, hijoIds)
                : { success: true, inscripciones: [] }
            ]);
            const vistas = new Set();
            const merged = [];
            for (const insc of [
              ...(porFamilia.success ? porFamilia.inscripciones : []),
              ...(porHijos.success ? porHijos.inscripciones : [])
            ]) {
              if (!vistas.has(insc.id)) { vistas.add(insc.id); merged.push(insc); }
            }
            return merged;
          })
        );
        const nuevasInscripciones = {};
        convIds.forEach((id, i) => { nuevasInscripciones[id] = inscResults[i]; });
        setInscripcionesPropia(nuevasInscripciones);
      } else {
        setInscripcionesPropia({});
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadedKey(requestKey);
    }
  }, [activas, convIdsKey, user?.uid, hijoIdsKey, requestKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargarInscripciones(); }, [cargarInscripciones]);

  // Tras inscribirse/cancelar: refrescar cupos (doc de convocatoria) e inscripciones.
  // Las inscripciones se recargan solas cuando cambia `activas`.
  const recargar = useCallback(() => cargarActivas(), [cargarActivas]);

  return {
    convocatorias,
    inscripcionesPropia,
    loading: activas === null || loadedKey !== requestKey,
    error,
    recargar
  };
}
