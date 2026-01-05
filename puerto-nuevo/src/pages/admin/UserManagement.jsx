import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usersService } from '../../services/users.service';
import { ROLES, AMBIENTES, ROUTES } from '../../config/constants';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingModal } from '../../components/common/LoadingModal';
import { useDialog } from '../../hooks/useDialog';

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

  const filteredUsers = searchTerm
    ? users.filter(u => {
        const q = searchTerm.toLowerCase();
        return (u.email || '').toLowerCase().includes(q) ||
               (u.displayName || '').toLowerCase().includes(q) ||
               (u.role || '').toLowerCase().includes(q);
      })
    : users;

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

    if (formData.role === ROLES.DOCENTE && !formData.tallerAsignado) {
      setError('Debes seleccionar un taller para docentes');
      return;
    }

    const result = await usersService.createUserWithRole({
      email: formData.email,
      password: formData.password,
      displayName: formData.displayName || formData.email.split('@')[0],
      role: formData.role,
      tallerAsignado: formData.role === ROLES.DOCENTE ? formData.tallerAsignado : null
    });

    if (result.success) {
      setSuccess(`Usuario ${formData.email} creado exitosamente con rol ${formData.role}`);
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
    setUpdating(true);

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

  const getRoleLabel = (role) => {
    const labels = {
      [ROLES.SUPERADMIN]: 'SuperAdmin',
      [ROLES.COORDINACION]: 'Coordinación',
      [ROLES.DOCENTE]: 'Docente',
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
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Gestión de Usuarios</h1>
          <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline">
            ← Volver al Dashboard
          </Link>
        </div>

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

          <div className="user-stats user-stats--compact">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <p style={{ margin: 0 }}><strong>Total:</strong> {users.length} {searchTerm ? `· Mostrando ${filteredUsers.length}` : ''}</p>
              <input
                type="text"
                className="form-input form-input--sm"
                placeholder="Buscar por email, nombre o rol..."
                value={searchTerm}
                onChange={handleSearchChange}
                aria-label="Buscar usuarios"
                style={{ width: 260 }}
              />
              {searchTerm && (
                <button type="button" className="btn btn--sm btn--outline" onClick={() => setSearchTerm('')}>
                  Limpiar
                </button>
              )}
            </div>

            <div>
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
                        <option value={ROLES.FAMILY}>Familia</option>
                        <option value={ROLES.DOCENTE}>Docente</option>
                        <option value={ROLES.TALLERISTA}>Tallerista</option>
                        <option value={ROLES.COORDINACION}>Coordinación</option>
                        <option value={ROLES.SUPERADMIN}>SuperAdmin</option>
                        <option value={ROLES.ASPIRANTE}>Aspirante</option>
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
                        <option value={ROLES.FAMILY}>Familia</option>
                        <option value={ROLES.DOCENTE}>Docente</option>
                        <option value={ROLES.TALLERISTA}>Tallerista</option>
                        <option value={ROLES.COORDINACION}>Coordinación</option>
                        <option value={ROLES.SUPERADMIN}>SuperAdmin</option>
                        <option value={ROLES.ASPIRANTE}>Aspirante</option>
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
                    <td style={{ width: 100 }}>
                      {isAdmin ? (
                        <button
                          className="btn btn--sm btn--outline"
                          onClick={() => openEditUser(u)}
                          disabled={u.id === user.uid}
                        >
                          Editar
                        </button>
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
      />

      <LoadingModal
        isOpen={updating}
        message="Actualizando usuario..."
      />
    </div>
  );
}
