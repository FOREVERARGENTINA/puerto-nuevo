import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  ROLES,
  PERMISSIONS,
  getRolePermissions,
  ADMIN_ROLES,
  CAN_SEND_COMMUNICATIONS,
  CAN_APPROVE_COMMUNICATIONS,
  CAN_VIEW_MEDICAL_INFO,
  CAN_MANAGE_APPOINTMENTS
} from '../config/constants';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Obtener custom claims del token
        const tokenResult = await firebaseUser.getIdTokenResult();
        const userRole = tokenResult.claims.role || ROLES.FAMILY;

        setUser(firebaseUser);
        setRole(userRole);
        setPermissions(getRolePermissions(userRole));
      } else {
        setUser(null);
        setRole(null);
        setPermissions([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Forzar refresh del token (útil después de asignar roles)
  const refreshToken = async () => {
    if (user) {
      await user.getIdToken(true); // Force refresh
      const tokenResult = await user.getIdTokenResult();
      const userRole = tokenResult.claims.role || ROLES.FAMILY;
      setRole(userRole);
      setPermissions(getRolePermissions(userRole));
    }
  };

  // Helper para verificar si el usuario tiene un permiso específico
  const checkPermission = (permission) => {
    return permissions.includes(permission);
  };

  const value = {
    user: user ? { ...user, role } : null,
    role,
    permissions,
    loading,
    refreshToken,

    // Verificadores de roles
    isSuperAdmin: role === ROLES.SUPERADMIN,
    isCoordinacion: role === ROLES.COORDINACION,
    isDocente: role === ROLES.DOCENTE,
    isTallerista: role === ROLES.TALLERISTA,
    isFamily: role === ROLES.FAMILY,
    isAspirante: role === ROLES.ASPIRANTE,

    // Roles administrativos (SuperAdmin y Coordinación)
    isAdmin: role && ADMIN_ROLES.includes(role),

    // Verificadores de permisos específicos
    canSendCommunications: role && CAN_SEND_COMMUNICATIONS.includes(role),
    canApproveCommunications: role && CAN_APPROVE_COMMUNICATIONS.includes(role),
    canViewMedicalInfo: role && CAN_VIEW_MEDICAL_INFO.includes(role),
    canManageAppointments: role && CAN_MANAGE_APPOINTMENTS.includes(role),

    // Verificador genérico de permisos
    hasPermission: checkPermission,

    // Verificar si tiene alguno de varios permisos
    hasAnyPermission: (permissionList) => {
      return permissionList.some(p => checkPermission(p));
    },

    // Verificar si tiene todos los permisos de una lista
    hasAllPermissions: (permissionList) => {
      return permissionList.every(p => checkPermission(p));
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};
