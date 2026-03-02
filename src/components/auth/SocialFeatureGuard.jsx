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
  const [config, setConfig] = useState({ enabled: false, pilotFamilyUids: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadConfig = async () => {
      setLoading(true);
      try {
        const nextConfig = await socialService.getSocialModuleConfig();
        if (!isMounted) return;
        setConfig(nextConfig);
      } catch {
        if (!isMounted) return;
        setConfig({ enabled: false, pilotFamilyUids: [] });
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!SOCIAL_ALLOWED_ROLES.includes(role)) {
    return <Navigate to="/portal/unauthorized" replace />;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--spacing-xl)' }}>
        <div className="spinner spinner--lg"></div>
      </div>
    );
  }

  if (!canAccessSocial({ role, uid: user?.uid, config })) {
    return <Navigate to="/portal/unauthorized" replace />;
  }

  return children;
}
