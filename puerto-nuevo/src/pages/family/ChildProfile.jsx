import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { childrenService } from '../../services/children.service';
import ChildCard from '../../components/children/ChildCard';

const ChildProfile = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadChildren = async () => {
    setLoading(true);
    console.log('🔍 DEBUG: Usuario completo:', user);
    console.log('🔍 DEBUG: Buscando hijos para UID:', user.uid);
    
    // Verificar token y claims
    const token = await user.getIdTokenResult();
    console.log('🔍 DEBUG: Token claims:', token.claims);
    console.log('🔍 DEBUG: Role en token:', token.claims.role);
    
    const result = await childrenService.getChildrenByResponsable(user.uid);
    console.log('🔍 DEBUG: Resultado de búsqueda:', result);
    if (result.success) {
      console.log('🔍 DEBUG: Hijos encontrados:', result.children);
      setChildren(result.children);
    } else {
      console.error('❌ ERROR al cargar alumnos:', result.error);
      alert('Error al cargar información de alumnos: ' + result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
      loadChildren();
    }
  }, [user]);

  if (loading) {
    return <div className="loading">Cargando información...</div>;
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Fichas de Alumnos</h1>
      </div>

      {children.length === 0 ? (
        <div className="empty-state card">
          <p>No hay alumnos registrados a tu nombre.</p>
          <p>Si crees que esto es un error, contacta a la administración.</p>
        </div>
      ) : (
        <div className="children-grid">
          {children.map(child => (
            <ChildCard
              key={child.id}
              child={child}
              isAdmin={false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChildProfile;
