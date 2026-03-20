import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../config/constants';
import { directMessagesService } from '../../services/directMessages.service';
import { canAccessDMs } from '../../utils/dmAccess';

export function DMsFeatureGuard({ children }) {
  const { role, user } = useAuth();
  // null = todavía cargando, objeto = cargado
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let mounted = true;
    directMessagesService
      .getDMsModuleConfig()
      .then((c) => { if (mounted) setConfig(c); })
      .catch(() => { if (mounted) setConfig({ enabled: false, pilotFamilyUids: [] }); });
    return () => { mounted = false; };
  }, []);

  // Gate sincrónico: rol equivocado → redirige sin esperar config
  if (role !== ROLES.FAMILY) {
    return <Navigate to="/portal/unauthorized" replace />;
  }

  // Mientras config carga, renderiza children directamente.
  // Ellos ya muestran su propio skeleton; no necesitamos uno extra aquí.
  if (config === null) return children;

  // Config disponible: validar acceso al piloto
  if (!canAccessDMs({ role, uid: user?.uid, config })) {
    return <Navigate to="/portal/unauthorized" replace />;
  }

  return children;
}
