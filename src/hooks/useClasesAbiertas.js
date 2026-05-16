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
