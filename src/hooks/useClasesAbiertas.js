import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { clasesAbiertasService } from '../services/clasesAbiertas.service';

const TIPOS = ['ambiente_abierto', 'taller_abierto'];

/**
 * Carga convocatorias activas e inscripciones del grupo familiar.
 * Busca por familiaUid Y por hijoIds para que ambos responsables vean
 * las inscripciones realizadas por cualquiera de ellos.
 * @param {string[]} ambientes
 * @param {Array<{id:string}>} hijos — array de hijos para buscar por hijoId
 */
export function useClasesAbiertas(ambientes = [], hijos = []) {
  const { user } = useAuth();
  const [convocatorias, setConvocatorias] = useState({});
  const [inscripcionesPropia, setInscripcionesPropia] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const hijoIds = hijos.map((h) => h.id).filter(Boolean);

  const cargar = useCallback(async (silent = false) => {
    if (!ambientes.length) { setLoading(false); return; }
    if (!silent) setLoading(true);
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

      if (user?.uid) {
        const convIds = Object.values(nuevasConvocatorias).map((c) => c.id);

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
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [ambientes.join(','), user?.uid, hijoIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { cargar(); }, [cargar]);

  const recargar = useCallback(() => cargar(true), [cargar]); // eslint-disable-line react-hooks/exhaustive-deps
  return { convocatorias, inscripcionesPropia, loading, error, recargar };
}
