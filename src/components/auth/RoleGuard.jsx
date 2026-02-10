import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function RoleGuard({ allowedRoles, children }) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/portal/unauthorized" replace />;
  }

  return children;
}
