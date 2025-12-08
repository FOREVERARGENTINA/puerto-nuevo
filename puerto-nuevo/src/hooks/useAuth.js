import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Obtener custom claims del token
        const tokenResult = await firebaseUser.getIdTokenResult();
        setUser(firebaseUser);
        setRole(tokenResult.claims.role || 'family'); // Default family
      } else {
        setUser(null);
        setRole(null);
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
      setRole(tokenResult.claims.role || 'family');
    }
  };

  const value = {
    user,
    role,
    loading,
    refreshToken,
    isAdmin: role && ['direccion', 'coordinacion', 'admin'].includes(role),
    canSendCommunications: role && ['direccion', 'coordinacion', 'admin', 'teacher', 'tallerista'].includes(role)
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
