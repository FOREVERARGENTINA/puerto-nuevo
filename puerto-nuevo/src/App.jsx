import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleGuard } from './components/auth/RoleGuard';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { SendCommunication } from './pages/admin/SendCommunication';
import { ReadReceiptsPanel } from './pages/admin/ReadReceiptsPanel';
import ChildrenManager from './pages/admin/ChildrenManager';
import AppointmentsManager from './pages/admin/AppointmentsManager';
import TalleresManager from './pages/admin/TalleresManager';
import { SnacksCalendar } from './pages/admin/SnacksCalendar';
import { FamilyDashboard } from './pages/family/FamilyDashboard';
import { Communications } from './pages/family/Communications';
import ChildProfile from './pages/family/ChildProfile';
import BookAppointment from './pages/family/BookAppointment';
import { TalleresEspeciales } from './pages/family/TalleresEspeciales';
import { MySnacks } from './pages/family/MySnacks';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { TalleristaDashboard } from './pages/tallerista/TalleristaDashboard';
import { MyTallerEspecial } from './pages/tallerista/MyTallerEspecial';
import { TallerGallery } from './pages/tallerista/TallerGallery';
import { DocumentManager } from './pages/tallerista/DocumentManager';
import { DocumentsAdmin } from './pages/admin/DocumentsAdmin';
import { Documents } from './pages/shared/Documents';
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
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <AdminDashboard />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/usuarios"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <UserManagement />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/comunicar"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION, ROLES.DOCENTE]}>
                    <SendCommunication />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/confirmaciones"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <ReadReceiptsPanel />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/alumnos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <ChildrenManager />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/turnos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <AppointmentsManager />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/talleres"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <TalleresManager />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/snacks"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <SnacksCalendar />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/documentos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <DocumentsAdmin />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Family Routes */}
          <Route
            path="/familia"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <FamilyDashboard />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/familia/comunicados"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <Communications />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/familia/hijos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <ChildProfile />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/familia/turnos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <BookAppointment />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/familia/talleres"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <TalleresEspeciales />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/familia/snacks"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <MySnacks />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Family Documents Route */}
          <Route
            path="/familia/documentos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <Documents />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/docente"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.DOCENTE]}>
                    <TeacherDashboard />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/docente/documentos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.DOCENTE]}>
                    <Documents />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Tallerista Routes */}
          <Route
            path="/tallerista"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                    <TalleristaDashboard />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tallerista/mi-taller"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                    <MyTallerEspecial />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tallerista/galeria"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                    <TallerGallery />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tallerista/documentos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                    <DocumentManager />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Aspirante Routes */}
          <Route
            path="/aspirante"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.ASPIRANTE]}>
                    <AspiranteDashboard />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/aspirante/documentos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.ASPIRANTE]}>
                    <Documents />
                  </RoleGuard>
                </Layout>
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
