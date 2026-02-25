import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usersService } from '../../services/users.service';
import { ROLES, AMBIENTES, ROUTES } from '../../config/constants';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingModal } from '../../components/common/LoadingModal';
import { useDialog } from '../../hooks/useDialog';
import Icon from '../../components/ui/Icon';

const USER_ROLE_OPTIONS = [
  { value: ROLES.FAMILY, label: 'Familia' },
  { value: ROLES.DOCENTE, label: 'Docente' },
  { value: ROLES.FACTURACION, label: 'Facturación' },
  { value: ROLES.TALLERISTA, label: 'Tallerista' },
  { value: ROLES.COORDINACION, label: 'Coordinación' },
  { value: ROLES.SUPERADMIN, label: 'SuperAdmin' },
  { value: ROLES.ASPIRANTE, label: 'Aspirante' }
];

export function UserManagement() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);

  // Edit user modal
  const [editingUser, setEditingUser] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    email: '',
    displayName: '',
    role: ROLES.FAMILY,
    tallerAsignado: '',
    disabled: false
  });

  // Update: allow coordinacion (isAdmin) to edit users
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Actualizando usuario...');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const confirmDialog = useDialog();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: ROLES.FAMILY,
    tallerAsignado: ''
  });

  // Search / filter
  const [searchTerm, setSearchTerm] = useState('');
  const handleSearchChange = (e) => setSearchTerm(e.target.value.trimStart());
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tallerFilter, setTallerFilter] = useState('');
  const hasFilters = Boolean(searchTerm || roleFilter || statusFilter || tallerFilter);
  const isCoordinacion = user?.role === ROLES.COORDINACION;
  const assignableRoleOptions = isCoordinacion
    ? USER_ROLE_OPTIONS.filter(option => option.value !== ROLES.SUPERADMIN)
    : USER_ROLE_OPTIONS;

  const canManageTargetUser = (targetUser) => {
    if (!isAdmin || !targetUser?.id) return false;
    if (targetUser.id === user?.uid) return false;
    if (isCoordinacion && targetUser.role === ROLES.SUPERADMIN) return false;
    return true;
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
    setTallerFilter('');
  };

  const filteredUsers = useMemo(() => {
    const filtered = users.filter((u) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q);
      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesStatus = !statusFilter ||
        (statusFilter === 'active' ? !u.disabled : !!u.disabled);
      const matchesTaller = !tallerFilter || u.tallerAsignado === tallerFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesTaller;
    });

    return filtered.sort((a, b) => {
      const aLabel = (a.displayName || a.email || '').trim().toLowerCase();
      const bLabel = (b.displayName || b.email || '').trim().toLowerCase();
      return aLabel.localeCompare(bLabel, 'es', { sensitivity: 'base' });
    });
  }, [users, searchTerm, roleFilter, statusFilter, tallerFilter]);

  const loadUsers = async () => {
    setLoading(true);
    const result = await usersService.getAllUsers();
    if (result.success) {
      setUsers(result.users);
    } else {
      setError('Error al cargar usuarios: ' + result.error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.email || !formData.password || !formData.role) {
      setError('Email, contraseña y rol son obligatorios');
      return;
    }

    if (isCoordinacion && formData.role === ROLES.SUPERADMIN) {
      setError('Coordinación no puede crear usuarios con rol SuperAdmin');
      return;
    }

    if (formData.role === ROLES.DOCENTE && !formData.tallerAsignado) {
      setError('Debes seleccionar un taller para docentes');
      return;
    }

    setLoadingMessage('Creando usuario...');
    setCreating(true);
    const result = await usersService.createUserWithRole({
      email: formData.email,
      password: formData.password,
      displayName: formData.displayName || formData.email.split('@')[0],
      role: formData.role,
      tallerAsignado: formData.role === ROLES.DOCENTE ? formData.tallerAsignado : null
    });
    setCreating(false);

    if (result.success) {
      setSuccess(`Usuario ${formData.email} creado exitosamente con rol ${formData.role}`);
      setTimeout(() => setSuccess(''), 2500);
      setFormData({
        email: '',
        password: '',
        displayName: '',
        role: ROLES.FAMILY,
        tallerAsignado: ''
      });
      setShowCreateForm(false);
      await loadUsers();
    } else {
      setError('Error al crear usuario: ' + result.error);
    }
  };

  // Abrir modal de edición (solo superadmin)
  const openEditUser = (u) => {
    if (!canManageTargetUser(u)) {
      setError('No tienes permisos para editar este usuario');
      return;
    }

    setEditingUser(u);
    setEditFormData({
      email: u.email || '',
      displayName: u.displayName || '',
      role: u.role || ROLES.FAMILY,
      tallerAsignado: u.tallerAsignado || '',
      disabled: !!u.disabled
    });
    setShowEditForm(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveUserEdits = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSuccess('');
    setLoadingMessage('Actualizando usuario...');
    setUpdating(true);

    if (!canManageTargetUser(editingUser)) {
      setError('No tienes permisos para editar este usuario');
      setUpdating(false);
      return;
    }

    if (isCoordinacion && editFormData.role === ROLES.SUPERADMIN) {
      setError('Coordinación no puede asignar rol SuperAdmin');
      setUpdating(false);
      return;
    }

    try {
      // If email or displayName changed, update in Auth first
      const emailChanged = editFormData.email && editFormData.email !== editingUser.email;
      const displayNameChanged = editFormData.displayName !== editingUser.displayName;

      if (emailChanged || displayNameChanged) {
        const authRes = await usersService.updateUserAuth(editingUser.id, {
          email: editFormData.email,
          displayName: editFormData.displayName
        });
        if (!authRes.success) throw new Error('Error actualizando Auth: ' + authRes.error);
      }

      const updates = {
        email: editFormData.email,
        displayName: editFormData.displayName,
        tallerAsignado: editFormData.role === ROLES.DOCENTE ? editFormData.tallerAsignado : null,
        disabled: !!editFormData.disabled
      };

      // Si cambió el rol, use callable to set custom claim
      if (editFormData.role && editFormData.role !== editingUser.role) {
        const roleRes = await usersService.setUserRole(editingUser.id, editFormData.role);
        if (!roleRes.success) throw new Error('No se pudo actualizar rol: ' + roleRes.error);
      }

      const res = await usersService.updateUser(editingUser.id, updates);
      if (!res.success) throw new Error(res.error);

      setSuccess('Usuario actualizado.');
      setShowEditForm(false);
      setEditingUser(null);
      await loadUsers();

    } catch (err) {
      setError(err.message || 'Error actualizando usuario');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = (u) => {
    if (!u?.id) return;
    if (!canManageTargetUser(u)) {
      setError('No tienes permisos para eliminar este usuario');
      return;
    }
    confirmDialog.openDialog({
      title: 'Eliminar usuario',
      message: `¿Seguro que deseas eliminar a ${u.email}? Esta acción eliminará su acceso y su perfil.`,
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      onConfirm: async () => {
        setError('');
        setSuccess('');
        setLoadingMessage('Eliminando usuario...');
        setUpdating(true);
        const result = await usersService.deleteUser(u.id);
        if (result.success) {
          setSuccess(`Usuario ${u.email} eliminado correctamente.`);
          await loadUsers();
        } else {
          setError('Error al eliminar usuario: ' + result.error);
        }
        setUpdating(false);
      }
    });
  };

  const getRoleLabel = (role) => {
    const labels = {
      [ROLES.SUPERADMIN]: 'SuperAdmin',
      [ROLES.COORDINACION]: 'Coordinación',
      [ROLES.DOCENTE]: 'Docente',
      [ROLES.FACTURACION]: 'Facturación',
      [ROLES.TALLERISTA]: 'Tallerista',
      [ROLES.FAMILY]: 'Familia',
      [ROLES.ASPIRANTE]: 'Aspirante'
    };
    return labels[role] || role;
  };

  const getTallerLabel = (taller) => {
    if (!taller) return '-';
    return taller === AMBIENTES.TALLER_1 ? 'Taller 1' : 'Taller 2';
  };

  if (loading) {
    return (
      <div className="container page-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Usuarios</h1>
          <p className="dashboard-subtitle">Crear usuarios y roles</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline btn--back">
            <Icon name="chevron-left" size={16} />
            Volver
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          {error && (
            <div className="alert alert--error mb-md">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert--success mb-md">
              {success}
            </div>
          )}

          <div className="user-toolbar">
            <div className="user-toolbar__left">
              <div className="user-toolbar__summary">
                <p style={{ margin: 0 }}><strong>Total:</strong> {users.length} {hasFilters ? `· Mostrando ${filteredUsers.length}` : ''}</p>
                <input
                  type="text"
                  className="form-input form-input--sm"
                  placeholder="Buscar por email, nombre o rol..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  aria-label="Buscar usuarios"
                  style={{ width: 240 }}
                />
              </div>

              <div className="user-filter">
                <label htmlFor="filterRole">Rol</label>
                <select
                  id="filterRole"
                  className="form-input form-input--sm"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">Todos los roles</option>
                  <option value={ROLES.FAMILY}>Familia</option>
                  <option value={ROLES.DOCENTE}>Docente</option>
                  <option value={ROLES.FACTURACION}>Facturación</option>
                  <option value={ROLES.TALLERISTA}>Tallerista</option>
                  <option value={ROLES.COORDINACION}>Coordinación</option>
                  <option value={ROLES.SUPERADMIN}>SuperAdmin</option>
                  <option value={ROLES.ASPIRANTE}>Aspirante</option>
                </select>
              </div>

              <div className="user-filter">
                <label htmlFor="filterStatus">Estado</label>
                <select
                  id="filterStatus"
                  className="form-input form-input--sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="active">Activo</option>
                  <option value="disabled">Deshabilitado</option>
                </select>
              </div>

              <div className="user-filter">
                <label htmlFor="filterTaller">Taller</label>
                <select
                  id="filterTaller"
                  className="form-input form-input--sm"
                  value={tallerFilter}
                  onChange={(e) => setTallerFilter(e.target.value)}
                >
                  <option value="">Todos los talleres</option>
                  <option value={AMBIENTES.TALLER_1}>Taller 1</option>
                  <option value={AMBIENTES.TALLER_2}>Taller 2</option>
                </select>
              </div>

              {hasFilters && (
                <button type="button" className="btn btn--sm btn--outline" onClick={handleClearFilters}>
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className="user-toolbar__actions">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="btn btn--primary"
              >
                {showCreateForm ? 'Cancelar' : '+ Crear Usuario'}
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div className="card create-form-card">
              <div className="card__body">
                <h3>Crear Nuevo Usuario</h3>
                <form onSubmit={handleCreateUser} className="form-grid">
                  <div className="grid-cards">
                    <div className="form-group">
                      <label htmlFor="email">Email *</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                        placeholder="usuario@ejemplo.com"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="password">Contraseña *</label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                        minLength={6}
                        className="form-input"
                        placeholder="Mínimo 6 caracteres"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="displayName">Nombre completo</label>
                      <input
                        type="text"
                        id="displayName"
                        name="displayName"
                        value={formData.displayName}
                        onChange={handleInputChange}
                        className="form-input"
                        placeholder="Opcional"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="role">Rol *</label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        required
                        className="form-input"
                      >
                        {assignableRoleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.role === ROLES.DOCENTE && (
                      <div className="form-group">
                        <label htmlFor="tallerAsignado">Taller Asignado *</label>
                        <select
                          id="tallerAsignado"
                          name="tallerAsignado"
                          value={formData.tallerAsignado}
                          onChange={handleInputChange}
                          required
                          className="form-input"
                        >
                          <option value="">Seleccionar...</option>
                          <option value={AMBIENTES.TALLER_1}>Taller 1</option>
                          <option value={AMBIENTES.TALLER_2}>Taller 2</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex-row mt-md">
                    <button type="submit" className="btn btn--primary">
                      Crear Usuario
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="btn btn--outline"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit user modal (superadmin only) */}
          {showEditForm && editingUser && (
            <div className="card create-form-card">
              <div className="card__body">
                <h3>Editar Usuario: {editingUser.email}</h3>
                <form onSubmit={handleSaveUserEdits} className="form-grid">
                  <div className="grid-cards">
                    <div className="form-group">
                      <label htmlFor="editEmail">Email</label>
                      <input
                        type="email"
                        id="editEmail"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditInputChange}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="editDisplayName">Nombre completo</label>
                      <input
                        type="text"
                        id="editDisplayName"
                        name="displayName"
                        value={editFormData.displayName}
                        onChange={handleEditInputChange}
                        className="form-input"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="editRole">Rol</label>
                      <select
                        id="editRole"
                        name="role"
                        value={editFormData.role}
                        onChange={handleEditInputChange}
                        className="form-input"
                      >
                        {assignableRoleOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {editFormData.role === ROLES.DOCENTE && (
                      <div className="form-group">
                        <label htmlFor="editTaller">Taller Asignado</label>
                        <select
                          id="editTaller"
                          name="tallerAsignado"
                          value={editFormData.tallerAsignado}
                          onChange={handleEditInputChange}
                          className="form-input"
                        >
                          <option value="">Seleccionar...</option>
                          <option value={AMBIENTES.TALLER_1}>Taller 1</option>
                          <option value={AMBIENTES.TALLER_2}>Taller 2</option>
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          name="disabled"
                          checked={!!editFormData.disabled}
                          onChange={handleEditInputChange}
                        />{' '}
                        Deshabilitado
                      </label>
                    </div>
                  </div>

                  <div className="flex-row mt-md">
                    <button type="submit" className="btn btn--primary">
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowEditForm(false); setEditingUser(null); }}
                      className="btn btn--outline"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="table-container">
            <table className="table table--compact">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u.id}>
                    <td style={{ width: 240 }}>{u.email}</td>
                    <td style={{ width: 180 }}>{u.displayName || '-'}</td>
                    <td style={{ width: 160 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="badge badge--primary">
                          {getRoleLabel(u.role)}
                        </span>
                        {u.tallerAsignado && (
                          <span className="badge badge--info">
                            {getTallerLabel(u.tallerAsignado)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ width: 110 }}>
                      <span className={`badge ${u.disabled ? 'badge--error' : 'badge--success'}`}>
                        {u.disabled ? 'Deshabilitado' : 'Activo'}
                      </span>
                    </td>
                    <td style={{ width: 180 }}>
                      {isAdmin ? (
                        canManageTargetUser(u) ? (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              className="btn btn--sm btn--outline"
                              onClick={() => openEditUser(u)}
                            >
                              Editar
                            </button>
                            <button
                              className="btn btn--sm btn--danger"
                              onClick={() => handleDeleteUser(u)}
                            >
                              Eliminar
                            </button>
                          </div>
                        ) : (
                          <span>-</span>
                        )
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.closeDialog}
        onConfirm={confirmDialog.dialogData.onConfirm}
        title={confirmDialog.dialogData.title}
        message={confirmDialog.dialogData.message}
        type={confirmDialog.dialogData.type}
        confirmText={confirmDialog.dialogData.confirmText}
        cancelText={confirmDialog.dialogData.cancelText}
      />

      <LoadingModal
        isOpen={updating || creating}
        message={loadingMessage}
      />
    </div>
  );
}
