import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleGuard } from './components/auth/RoleGuard';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { SendCommunication } from './pages/admin/SendCommunication';
import { ReadReceiptsPanel } from './pages/admin/ReadReceiptsPanel';
import ChildrenManager from './pages/admin/ChildrenManager';
import AppointmentsManager from './pages/admin/AppointmentsManager';
import TalleresManager from './pages/admin/TalleresManager';
import { FamilyDashboard } from './pages/family/FamilyDashboard';
import { Communications } from './pages/family/Communications';
import ChildProfile from './pages/family/ChildProfile';
import BookAppointment from './pages/family/BookAppointment';
import { TalleresEspeciales } from './pages/family/TalleresEspeciales';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TalleristaDashboard } from './pages/tallerista/TalleristaDashboard';
import { MyTallerEspecial } from './pages/tallerista/MyTallerEspecial';
import { TallerGallery } from './pages/tallerista/TallerGallery';
import { DocumentManager } from './pages/tallerista/DocumentManager';
import { AspiranteDashboard } from './pages/aspirante/AspiranteDashboard';
import { ROLES } from './config/constants';

// Importar CSS
import './styles/design-system.css';
import './styles/global.css';
import './styles/components.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Login */}
          <Route path="/login" element={<Login />} />

          {/* Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.DIRECCION, ROLES.COORDINACION, ROLES.ADMIN]}>
                  <AdminDashboard />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.DIRECCION, ROLES.COORDINACION, ROLES.ADMIN]}>
                  <UserManagement />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/comunicar"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.DIRECCION, ROLES.COORDINACION, ROLES.ADMIN, ROLES.TEACHER, ROLES.TALLERISTA]}>
                  <SendCommunication />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/confirmaciones"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.DIRECCION, ROLES.COORDINACION, ROLES.ADMIN]}>
                  <ReadReceiptsPanel />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/alumnos"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.DIRECCION, ROLES.COORDINACION, ROLES.ADMIN]}>
                  <ChildrenManager />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/turnos"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.DIRECCION, ROLES.COORDINACION, ROLES.ADMIN]}>
                  <AppointmentsManager />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/talleres"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.DIRECCION, ROLES.COORDINACION, ROLES.ADMIN]}>
                  <TalleresManager />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Family Routes */}
          <Route
            path="/familia"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                  <FamilyDashboard />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/familia/comunicados"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                  <Communications />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/familia/hijos"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                  <ChildProfile />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/familia/turnos"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                  <BookAppointment />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/familia/talleres"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                  <TalleresEspeciales />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/docente"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.TEACHER]}>
                  <TeacherDashboard />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Tallerista Routes */}
          <Route
            path="/tallerista"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                  <TalleristaDashboard />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tallerista/mi-taller"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                  <MyTallerEspecial />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tallerista/galeria"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                  <TallerGallery />
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tallerista/documentos"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                  <DocumentManager />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Aspirante Routes */}
          <Route
            path="/aspirante"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={[ROLES.ASPIRANTE]}>
                  <AspiranteDashboard />
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Unauthorized */}
          <Route
            path="/unauthorized"
            element={
              <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
                <div className="card">
                  <div className="card__header">
                    <h1 className="card__title">Acceso Denegado</h1>
                  </div>
                  <div className="card__body">
                    <p>No tienes permisos para acceder a esta sección.</p>
                    <a href="/login" className="btn btn--primary" style={{ marginTop: 'var(--spacing-md)' }}>
                      Volver al Login
                    </a>
                  </div>
                </div>
              </div>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
                <div className="card">
                  <div className="card__header">
                    <h1 className="card__title">Página no encontrada</h1>
                  </div>
                  <div className="card__body">
                    <p>La página que buscas no existe.</p>
                    <a href="/login" className="btn btn--primary" style={{ marginTop: 'var(--spacing-md)' }}>
                      Ir al inicio
                    </a>
                  </div>
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
