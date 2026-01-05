import { useState, useEffect } from 'react';
import { childrenService } from '../../services/children.service';
import { usersService } from '../../services/users.service';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { LoadingModal } from '../../components/common/LoadingModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import ChildForm from '../../components/children/ChildForm';
import ChildCard from '../../components/children/ChildCard';

const CHILDREN_PAGE_SIZE = 12;

const ChildrenManager = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [filterAmbiente, setFilterAmbiente] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [familyUsers, setFamilyUsers] = useState({});
  const [visibleCount, setVisibleCount] = useState(CHILDREN_PAGE_SIZE);

  const confirmDialog = useDialog();
  const alertDialog = useDialog();

  const loadChildren = async () => {
    setLoading(true);
    const result = await childrenService.getAllChildren();
    if (result.success) {
      setChildren(result.children);
    } else {
      alertDialog.openDialog({
        title: 'Error',
        message: 'Error al cargar alumnos: ' + result.error,
        type: 'error'
      });
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

  useEffect(() => {
    setVisibleCount(CHILDREN_PAGE_SIZE);
  }, [filterAmbiente, searchTerm]);

  const handleCreate = () => {
    setEditingChild(null);
    setShowForm(true);
  };

  const handleEdit = (child) => {
    setEditingChild(child);
    setShowForm(true);
  };

  const handleSubmit = async (data) => {
    setSaving(true);
    let result;
    try {
      if (editingChild) {
        result = await childrenService.updateChild(editingChild.id, data);
      } else {
        result = await childrenService.createChild(data);
      }

      if (result.success) {
        alertDialog.openDialog({
          title: 'Éxito',
          message: editingChild ? 'Alumno actualizado exitosamente' : 'Alumno creado exitosamente',
          type: 'success'
        });
        setShowForm(false);
        setEditingChild(null);
        loadData();
      } else {
        alertDialog.openDialog({
          title: 'Error',
          message: 'Error: ' + result.error,
          type: 'error'
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (childId) => {
    confirmDialog.openDialog({
      title: 'Eliminar Alumno',
      message: '¿Estás seguro de eliminar este alumno? Esta acción no se puede deshacer.',
      type: 'danger',
      onConfirm: async () => {
        const result = await childrenService.deleteChild(childId);
        if (result.success) {
          alertDialog.openDialog({
            title: 'Éxito',
            message: 'Alumno eliminado exitosamente',
            type: 'success'
          });
          loadData();
        } else {
          alertDialog.openDialog({
            title: 'Error',
            message: 'Error al eliminar: ' + result.error,
            type: 'error'
          });
        }
      }
    });
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

  const visibleChildren = filteredChildren.slice(0, visibleCount);
  const hasMoreChildren = filteredChildren.length > visibleChildren.length;

  const handleShowMore = () => {
    setVisibleCount(prev => Math.min(prev + CHILDREN_PAGE_SIZE, filteredChildren.length));
  };

  if (loading) {
    return <LoadingScreen message="Cargando información de alumnos..." />;
  }

  if (showForm) {
    return (
      <div className="page-container">
        <div className="page-header page-header--spaced">
          <div>
            <h1>{editingChild ? 'Editar Alumno' : 'Nuevo Alumno'}</h1>
            <p className="muted-text">Actualizá la información del alumno y sus responsables.</p>
          </div>
        </div>
        <div className="card new-form-card">
          <ChildForm
            child={editingChild}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header page-header--spaced">
        <div>
          <h1>Gestión de Alumnos</h1>
          <p className="muted-text">Organizá familias, datos médicos y responsables desde un mismo lugar.</p>
        </div>
        <button onClick={handleCreate} className="btn btn--primary btn--lg">
          + Nuevo Alumno
        </button>
      </div>

      <div className="filters-card card">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="search" className="form-label">Buscar</label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              placeholder="Nombre del alumno..."
            />
          </div>

          <div className="filter-group">
            <label htmlFor="ambiente" className="form-label">Ambiente</label>
            <select
              id="ambiente"
              value={filterAmbiente}
              onChange={(e) => setFilterAmbiente(e.target.value)}
              className="form-select"
            >
              <option value="all">Todos</option>
            <option value="taller1">Taller 1</option>
            <option value="taller2">Taller 2</option>
            </select>
          </div>

          <div className="filter-stats">
            <div className="stat-card">
              <p className="stat-label">Alumnos totales</p>
              <p className="stat-value">{filteredChildren.length}</p>
            </div>
            <div className="stat-card">
              <p className="stat-label">Mostrando</p>
              <p className="stat-value">{visibleChildren.length}</p>
            </div>
          </div>
        </div>
      </div>

      {filteredChildren.length === 0 ? (
        <div className="empty-state empty-state--card card">
          <p>No se encontraron alumnos</p>
          <button onClick={handleCreate} className="btn btn--primary btn--lg">
            Crear primer alumno
          </button>
        </div>
      ) : (
        <>
          <div className="children-grid">
            {visibleChildren.map(child => (
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
          {hasMoreChildren && (
            <div className="children-grid__footer">
              <span className="muted-text">
                Mostrando {visibleChildren.length} de {filteredChildren.length} alumnos
              </span>
              <button type="button" onClick={handleShowMore} className="btn btn--secondary btn--sm">
                Ver más alumnos
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.closeDialog}
        onConfirm={confirmDialog.dialogData.onConfirm}
        title={confirmDialog.dialogData.title}
        message={confirmDialog.dialogData.message}
        type={confirmDialog.dialogData.type}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={alertDialog.closeDialog}
        title={alertDialog.dialogData.title}
        message={alertDialog.dialogData.message}
        type={alertDialog.dialogData.type}
      />

      <LoadingModal
        isOpen={saving}
        message={editingChild ? 'Actualizando alumno...' : 'Creando alumno...'}
      />
    </div>
  );
};

export default ChildrenManager;
