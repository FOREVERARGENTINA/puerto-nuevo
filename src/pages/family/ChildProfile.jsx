import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { childrenService } from '../../services/children.service';
import { usersService } from '../../services/users.service';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import ChildCard from '../../components/children/ChildCard';

const ChildProfile = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [familyUsers, setFamilyUsers] = useState({});
  const [loading, setLoading] = useState(true);

  const loadChildren = async () => {
    if (!user) return;

    setLoading(true);
    const result = await childrenService.getChildrenByResponsable(user.uid);
    
    if (result.success) {
      setChildren(result.children);

      // Cargar información de todas las familias responsables
      const uniqueResponsableIds = [...new Set(
        result.children.flatMap(child => child.responsables || [])
      )];

      const familyUsersData = {};
      for (const responsableId of uniqueResponsableIds) {
        const userResult = await usersService.getUserById(responsableId);
        if (userResult.success) {
          familyUsersData[responsableId] = userResult.user;
        } else {
          // Agregar un placeholder para que no quede "Cargando..."
          familyUsersData[responsableId] = {
            displayName: 'Usuario no encontrado',
            email: 'Sin datos'
          };
        }
      }
      setFamilyUsers(familyUsersData);
    } else {
      console.error('Error al cargar alumnos:', result.error);
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
    return <LoadingScreen message="Cargando información de alumnos..." />;
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
              familyUsers={familyUsers}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChildProfile;
