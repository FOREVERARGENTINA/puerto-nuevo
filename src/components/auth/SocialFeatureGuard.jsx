import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../config/constants';
import { socialService } from '../../services/social.service';
import { canAccessSocial } from '../../utils/socialAccess';

const SOCIAL_ALLOWED_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.COORDINACION,
  ROLES.DOCENTE,
  ROLES.TALLERISTA,
  ROLES.FAMILY
];

export function SocialFeatureGuard({ children }) {
  const { role, user } = useAuth();
  // null = todavía cargando, objeto = cargado
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let mounted = true;
    socialService
      .getSocialModuleConfig()
      .then((c) => { if (mounted) setConfig(c); })
      .catch(() => { if (mounted) setConfig({ enabled: false, pilotFamilyUids: [] }); });
    return () => { mounted = false; };
  }, []);

  // Gate sincrónico: rol no permitido → redirige sin esperar config
  if (!SOCIAL_ALLOWED_ROLES.includes(role)) {
    return <Navigate to="/portal/unauthorized" replace />;
  }

  // Mientras config carga, renderiza children directamente.
  if (config === null) return children;

  // Config disponible: validar acceso
  if (!canAccessSocial({ role, uid: user?.uid, config })) {
    return <Navigate to="/portal/unauthorized" replace />;
  }

  return children;
}
