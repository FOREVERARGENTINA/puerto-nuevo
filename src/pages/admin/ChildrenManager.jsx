import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { childrenService } from '../../services/children.service';
import { usersService } from '../../services/users.service';
import { appointmentsService } from '../../services/appointments.service';
import { ROUTES } from '../../config/constants';
import { LoadingModal } from '../../components/common/LoadingModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { AlertDialog } from '../../components/common/AlertDialog';
import { useDialog } from '../../hooks/useDialog';
import ChildForm from '../../components/children/ChildForm';
import ChildCard from '../../components/children/ChildCard';
import Icon from '../../components/ui/Icon';

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
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [notesByChildId, setNotesByChildId] = useState({});
  const [notesLoadingByChildId, setNotesLoadingByChildId] = useState({});

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

  const filteredChildren = useMemo(() => (
    children.filter(child => {
      const matchesAmbiente = filterAmbiente === 'all' || child.ambiente === filterAmbiente;
      const matchesSearch = child.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesAmbiente && matchesSearch;
    })
  ), [children, filterAmbiente, searchTerm]);

  const visibleChildren = useMemo(() => (
    filteredChildren.slice(0, visibleCount)
  ), [filteredChildren, visibleCount]);

  const hasMoreChildren = filteredChildren.length > visibleChildren.length;

  useEffect(() => {
    if (!visibleChildren.length) {
      if (selectedChildId !== null) setSelectedChildId(null);
      return;
    }
    const stillVisible = filteredChildren.some(child => child.id === selectedChildId);
    if (!selectedChildId || !stillVisible) {
      setSelectedChildId(visibleChildren[0].id);
    }
  }, [filteredChildren, selectedChildId, visibleChildren]);

  const handleShowMore = () => {
    setVisibleCount(prev => Math.min(prev + CHILDREN_PAGE_SIZE, filteredChildren.length));
  };

  const getAmbienteLabel = (ambiente) => (
    ambiente === 'taller1' ? 'Taller 1' : 'Taller 2'
  );

  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getFamilyNames = (child) => {
    if (!child.responsables) return [];
    return child.responsables
      .map((id) => familyUsers[id])
      .filter(Boolean)
      .map((user) => user.displayName || user.email)
      .filter(Boolean);
  };

  const hasMedicalAlerts = (child) => (
    !!(child.datosMedicos && (child.datosMedicos.alergias || child.datosMedicos.medicamentos))
  );

  const selectedChild = filteredChildren.find(child => child.id === selectedChildId) || null;
  const selectedChildNotes = selectedChildId ? (notesByChildId[selectedChildId] || []) : [];
  const selectedChildNotesLoading = selectedChildId ? !!notesLoadingByChildId[selectedChildId] : false;
  const selectedChildNotesLoaded = selectedChildId
    ? Object.prototype.hasOwnProperty.call(notesByChildId, selectedChildId)
    : false;

  const loadNotesForChild = async (childId) => {
    if (!childId) return;
    setNotesLoadingByChildId(prev => ({ ...prev, [childId]: true }));

    const appointmentsResult = await appointmentsService.getAppointmentsByChild(childId);
    if (!appointmentsResult.success) {
      setNotesByChildId(prev => ({ ...prev, [childId]: [] }));
      setNotesLoadingByChildId(prev => ({ ...prev, [childId]: false }));
      return;
    }

    const attended = appointmentsResult.appointments.filter(app => app.estado === 'asistio');
    if (attended.length === 0) {
      setNotesByChildId(prev => ({ ...prev, [childId]: [] }));
      setNotesLoadingByChildId(prev => ({ ...prev, [childId]: false }));
      return;
    }

    const noteResults = await Promise.all(
      attended.map(app => appointmentsService.getAppointmentNote(app.id))
    );
    const notes = [];
    attended.forEach((app, index) => {
      const result = noteResults[index];
      if (result.success && result.note) {
        notes.push({ appointment: app, note: result.note });
      }
    });

    setNotesByChildId(prev => ({ ...prev, [childId]: notes }));
    setNotesLoadingByChildId(prev => ({ ...prev, [childId]: false }));
  };

  useEffect(() => {
    if (!selectedChildId) return;
    if (notesByChildId[selectedChildId] !== undefined) return;
    loadNotesForChild(selectedChildId);
  }, [selectedChildId, notesByChildId]);


  if (loading) {
    return (
      <div className="container page-container children-page">
        <div className="dashboard-header dashboard-header--compact">
          <div>
            <h1 className="dashboard-title">Alumnos</h1>
            <p className="dashboard-subtitle">Datos principales y responsables.</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline btn--back">
              <Icon name="chevron-left" size={16} />
              Volver
            </Link>
          </div>
        </div>
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <div className="spinner spinner--lg"></div>
            <p style={{ marginTop: 'var(--spacing-sm)' }}>Cargando alumnos...</p>
          </div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="container page-container children-page">
        <div className="dashboard-header dashboard-header--compact">
          <div>
            <h1 className="dashboard-title">{editingChild ? 'Editar alumno' : 'Nuevo alumno'}</h1>
            <p className="dashboard-subtitle">Actualizá la información del alumno y sus responsables.</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
            <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline btn--back">
              <Icon name="chevron-left" size={16} />
              Volver
            </Link>
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
    <div className="container page-container children-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Alumnos</h1>
          <p className="dashboard-subtitle">Organizá familias, datos médicos y responsables desde un mismo lugar.</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline btn--back">
            <Icon name="chevron-left" size={16} />
            Volver
          </Link>
          <button onClick={handleCreate} className="btn btn--primary">
            + Nuevo Alumno
          </button>
        </div>
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
        <div className="children-layout">
          <div className="children-table card">
            <div className="children-table__header">
              <p className="muted-text">Seleccioná un alumno para ver el detalle completo.</p>
            </div>
            <div className="table-container">
              <table className="table table--compact children-table__table">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Ambiente</th>
                    <th>Responsables</th>
                    <th>Info médica</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleChildren.map(child => {
                    const age = calculateAge(child.fechaNacimiento);
                    const familyNames = getFamilyNames(child);
                    const familyCount = child.responsables ? child.responsables.length : 0;
                    const previewNames = familyNames.slice(0, 2).join(' · ');
                    const extraFamilies = familyCount > 2 ? `+${familyCount - 2}` : '';
                    const hasAlerts = hasMedicalAlerts(child);
                    const isSelected = child.id === selectedChildId;

                    return (
                      <tr
                        key={child.id}
                        className={`children-table__row ${isSelected ? 'children-table__row--selected' : ''}`}
                        onClick={() => setSelectedChildId(child.id)}
                      >
                        <td>
                          <div className="children-table__name">{child.nombreCompleto}</div>
                          <div className="children-table__meta">
                            {age !== null ? `${age} años` : 'Edad no indicada'}
                          </div>
                        </td>
                        <td>
                          <span className="badge badge--primary">{getAmbienteLabel(child.ambiente)}</span>
                        </td>
                        <td>
                          <div className="children-table__families">
                            <span className="children-table__families-count">{familyCount} responsables</span>
                            {previewNames && (
                              <span className="children-table__families-preview">
                                {previewNames}{extraFamilies ? ` · ${extraFamilies}` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {hasAlerts ? (
                            <span className="badge badge--warning">Info médica</span>
                          ) : (
                            <span className="badge badge--success">OK</span>
                          )}
                        </td>
                        <td>
                          <div className="children-table__actions">
                            <button
                              type="button"
                              className="btn btn--sm btn--outline"
                              onClick={(e) => { e.stopPropagation(); handleEdit(child); }}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm btn--text btn--danger"
                              onClick={(e) => { e.stopPropagation(); handleDelete(child.id); }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {hasMoreChildren && (
              <div className="children-table__footer">
                <span className="muted-text">
                  Mostrando {visibleChildren.length} de {filteredChildren.length} alumnos
                </span>
                <button type="button" onClick={handleShowMore} className="btn btn--secondary btn--sm">
                  Ver más alumnos
                </button>
              </div>
            )}
          </div>

          <div className="children-detail">
            {selectedChild ? (
              <ChildCard
                child={selectedChild}
                familyUsers={familyUsers}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isAdmin={true}
                meetingNotes={selectedChildNotes}
                meetingNotesLoading={selectedChildNotesLoading}
                meetingNotesLoaded={selectedChildNotesLoaded}
              />
            ) : (
              <div className="empty-state empty-state--card card">
                <p>Seleccioná un alumno para ver el detalle.</p>
              </div>
            )}
          </div>
        </div>
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
