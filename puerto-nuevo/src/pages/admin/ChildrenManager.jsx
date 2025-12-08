import { useState, useEffect } from 'react';
import { childrenService } from '../../services/children.service';
import { usersService } from '../../services/users.service';
import ChildForm from '../../components/children/ChildForm';
import ChildCard from '../../components/children/ChildCard';

const ChildrenManager = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [filterAmbiente, setFilterAmbiente] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [familyUsers, setFamilyUsers] = useState({});

  const loadChildren = async () => {
    setLoading(true);
    const result = await childrenService.getAllChildren();
    if (result.success) {
      setChildren(result.children);
    } else {
      alert('Error al cargar alumnos: ' + result.error);
    }
    setLoading(false);
  };

  const loadFamilyUsers = async () => {
    const result = await usersService.getUsersByRole('family');
    if (result.success) {
      const usersMap = {};
      result.users.forEach(user => {
        usersMap[user.id] = user;
      });
      setFamilyUsers(usersMap);
    }
  };

  const loadData = async () => {
    await Promise.all([loadChildren(), loadFamilyUsers()]);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    loadData();
  }, []);

  const handleCreate = () => {
    setEditingChild(null);
    setShowForm(true);
  };

  const handleEdit = (child) => {
    setEditingChild(child);
    setShowForm(true);
  };

  const handleSubmit = async (data) => {
    let result;
    if (editingChild) {
      result = await childrenService.updateChild(editingChild.id, data);
    } else {
      result = await childrenService.createChild(data);
    }

    if (result.success) {
      alert(editingChild ? 'Alumno actualizado exitosamente' : 'Alumno creado exitosamente');
      setShowForm(false);
      setEditingChild(null);
      loadData();
    } else {
      alert('Error: ' + result.error);
    }
  };

  const handleDelete = async (childId) => {
    if (!confirm('¿Estás seguro de eliminar este alumno? Esta acción no se puede deshacer.')) {
      return;
    }

    const result = await childrenService.deleteChild(childId);
    if (result.success) {
      alert('Alumno eliminado exitosamente');
      loadData();
    } else {
      alert('Error al eliminar: ' + result.error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingChild(null);
  };

  const filteredChildren = children.filter(child => {
    const matchesAmbiente = filterAmbiente === 'all' || child.ambiente === filterAmbiente;
    const matchesSearch = child.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesAmbiente && matchesSearch;
  });

  if (loading) {
    return <div className="loading">Cargando alumnos...</div>;
  }

  if (showForm) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1>{editingChild ? 'Editar Alumno' : 'Nuevo Alumno'}</h1>
        </div>
        <ChildForm
          child={editingChild}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gestión de Alumnos</h1>
        <button onClick={handleCreate} className="btn btn-primary">
          + Nuevo Alumno
        </button>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label htmlFor="search">Buscar:</label>
          <input
            type="text"
            id="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nombre del alumno..."
          />
        </div>

        <div className="filter-group">
          <label htmlFor="ambiente">Ambiente:</label>
          <select
            id="ambiente"
            value={filterAmbiente}
            onChange={(e) => setFilterAmbiente(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="taller1">Taller 1 (6-9)</option>
            <option value="taller2">Taller 2 (9-12)</option>
          </select>
        </div>

        <div className="filter-stats">
          <span className="stat">
            Total: <strong>{filteredChildren.length}</strong>
          </span>
        </div>
      </div>

      {filteredChildren.length === 0 ? (
        <div className="empty-state">
          <p>No se encontraron alumnos</p>
          <button onClick={handleCreate} className="btn btn-primary">
            Crear primer alumno
          </button>
        </div>
      ) : (
        <div className="children-grid">
          {filteredChildren.map(child => (
            <ChildCard
              key={child.id}
              child={child}
              familyUsers={familyUsers}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isAdmin={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ChildrenManager;
