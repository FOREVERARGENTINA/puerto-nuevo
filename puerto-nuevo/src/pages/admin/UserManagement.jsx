import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usersService } from '../../services/users.service';
import { ROLES, AMBIENTES, ROUTES } from '../../config/constants';

export function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: ROLES.FAMILY,
    tallerAsignado: ''
  });

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

    if (formData.role === ROLES.TEACHER && !formData.tallerAsignado) {
      setError('Debes seleccionar un taller para guías');
      return;
    }

    const result = await usersService.createUserWithRole({
      email: formData.email,
      password: formData.password,
      displayName: formData.displayName || formData.email.split('@')[0],
      role: formData.role,
      tallerAsignado: formData.role === ROLES.TEACHER ? formData.tallerAsignado : null
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

  const handleChangeRole = async (uid, currentEmail, newRole) => {
    if (!confirm(`¿Cambiar rol de ${currentEmail} a ${newRole}?`)) return;

    const result = await usersService.setUserRole(uid, newRole);
    if (result.success) {
      setSuccess(`Rol actualizado a ${newRole} para ${currentEmail}`);
      await loadUsers();
    } else {
      setError('Error al cambiar rol: ' + result.error);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      [ROLES.DIRECCION]: 'Dirección',
      [ROLES.COORDINACION]: 'Coordinación',
      [ROLES.ADMIN]: 'Administrador',
      [ROLES.TEACHER]: 'Guía de Taller',
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
      <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card__header">
          <h1 className="card__title">Gestión de Usuarios</h1>
          <Link to={ROUTES.ADMIN_DASHBOARD} className="btn btn--outline">
            ← Volver al Dashboard
          </Link>
        </div>

        <div className="card__body">
          {error && (
            <div className="alert alert--error" style={{ marginBottom: 'var(--spacing-md)' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert--success" style={{ marginBottom: 'var(--spacing-md)' }}>
              {success}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <p><strong>Total de usuarios:</strong> {users.length}</p>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn--primary"
            >
              {showCreateForm ? 'Cancelar' : '+ Crear Usuario'}
            </button>
          </div>

          {showCreateForm && (
            <div className="card" style={{ marginBottom: 'var(--spacing-lg)', background: 'var(--color-background)' }}>
              <div className="card__body">
                <h3>Crear Nuevo Usuario</h3>
                <form onSubmit={handleCreateUser} style={{ marginTop: 'var(--spacing-md)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
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
                        <option value={ROLES.TEACHER}>Guía de Taller</option>
                        <option value={ROLES.TALLERISTA}>Tallerista</option>
                        <option value={ROLES.ADMIN}>Administrador</option>
                        <option value={ROLES.COORDINACION}>Coordinación</option>
                        <option value={ROLES.DIRECCION}>Dirección</option>
                        <option value={ROLES.ASPIRANTE}>Aspirante</option>
                      </select>
                    </div>

                    {formData.role === ROLES.TEACHER && (
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

                  <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)' }}>
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

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Nombre</th>
                  <th>Rol Actual</th>
                  <th>Taller</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.displayName || '-'}</td>
                    <td>
                      <span className="badge badge--primary">
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td>{getTallerLabel(u.tallerAsignado)}</td>
                    <td>
                      <span className={`badge ${u.disabled ? 'badge--error' : 'badge--success'}`}>
                        {u.disabled ? 'Deshabilitado' : 'Activo'}
                      </span>
                    </td>
                    <td>
                      <select
                        className="form-input"
                        style={{ minWidth: '150px' }}
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, u.email, e.target.value)}
                        disabled={u.id === user.uid}
                      >
                        <option value={ROLES.FAMILY}>Familia</option>
                        <option value={ROLES.TEACHER}>Guía de Taller</option>
                        <option value={ROLES.TALLERISTA}>Tallerista</option>
                        <option value={ROLES.ADMIN}>Administrador</option>
                        <option value={ROLES.COORDINACION}>Coordinación</option>
                        <option value={ROLES.DIRECCION}>Dirección</option>
                        <option value={ROLES.ASPIRANTE}>Aspirante</option>
                      </select>
                      {u.id === user.uid && (
                        <small style={{ display: 'block', color: 'var(--color-text-light)' }}>
                          (tu usuario)
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
