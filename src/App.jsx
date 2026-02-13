import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { RoleGuard } from './components/auth/RoleGuard';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { AuthAction } from './pages/AuthAction';
import { LoadingScreen } from './components/common/LoadingScreen';
import { ROLES } from './config/constants';
import { PwaInstallPrompt } from './components/common/PwaInstallPrompt';

// Lazy load páginas admin
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const UserManagement = lazy(() => import('./pages/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const ReadReceiptsPanel = lazy(() => import('./pages/admin/ReadReceiptsPanel').then(m => ({ default: m.ReadReceiptsPanel })));
const SendCommunication = lazy(() => import('./pages/admin/SendCommunication').then(m => ({ default: m.SendCommunication })));
const ChildrenManager = lazy(() => import('./pages/admin/ChildrenManager'));
const AppointmentsManager = lazy(() => import('./pages/admin/AppointmentsManager'));
const TalleresList = lazy(() => import('./pages/admin/TalleresList'));
const TalleresManager = lazy(() => import('./pages/admin/TalleresManager'));
const SnacksCalendar = lazy(() => import('./pages/admin/SnacksCalendar').then(m => ({ default: m.SnacksCalendar })));
const SnacksLists = lazy(() => import('./pages/admin/SnacksLists').then(m => ({ default: m.SnacksLists })));
const DocumentsAdmin = lazy(() => import('./pages/admin/DocumentsAdmin').then(m => ({ default: m.DocumentsAdmin })));
const EventsManager = lazy(() => import('./pages/admin/EventsManager').then(m => ({ default: m.EventsManager })));
const AdminConversations = lazy(() => import('./pages/admin/AdminConversations').then(m => ({ default: m.AdminConversations })));
const AdminNewConversation = lazy(() => import('./pages/admin/AdminNewConversation').then(m => ({ default: m.AdminNewConversation })));
const AdminConversationDetail = lazy(() => import('./pages/admin/AdminConversationDetail').then(m => ({ default: m.AdminConversationDetail })));
const InstitutionalGalleryManager = lazy(() => import('./pages/admin/InstitutionalGalleryManager'));

// Lazy load páginas familia
const FamilyDashboard = lazy(() => import('./pages/family/FamilyDashboard').then(m => ({ default: m.FamilyDashboard })));
const Communications = lazy(() => import('./pages/family/Communications').then(m => ({ default: m.Communications })));
const CommunicationDetail = lazy(() => import('./pages/family/CommunicationDetail').then(m => ({ default: m.CommunicationDetail })));
const ChildProfile = lazy(() => import('./pages/family/ChildProfile'));
const BookAppointment = lazy(() => import('./pages/family/BookAppointment'));
const TalleresEspeciales = lazy(() => import('./pages/family/TalleresEspeciales').then(m => ({ default: m.TalleresEspeciales })));
const MySnacks = lazy(() => import('./pages/family/MySnacks').then(m => ({ default: m.MySnacks })));
const EventsCalendar = lazy(() => import('./pages/family/EventsCalendar').then(m => ({ default: m.EventsCalendar })));
const FamilyConversations = lazy(() => import('./pages/family/FamilyConversations').then(m => ({ default: m.FamilyConversations })));
const FamilyNewConversation = lazy(() => import('./pages/family/FamilyNewConversation').then(m => ({ default: m.FamilyNewConversation })));
const FamilyConversationDetail = lazy(() => import('./pages/family/FamilyConversationDetail').then(m => ({ default: m.FamilyConversationDetail })));

// Lazy load páginas docente
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));

// Lazy load páginas tallerista
const TalleristaDashboard = lazy(() => import('./pages/tallerista/TalleristaDashboard').then(m => ({ default: m.TalleristaDashboard })));
const MyTallerEspecial = lazy(() => import('./pages/tallerista/MyTallerEspecial').then(m => ({ default: m.MyTallerEspecial })));
const TallerGallery = lazy(() => import('./pages/tallerista/TallerGallery').then(m => ({ default: m.TallerGallery })));
const DocumentManager = lazy(() => import('./pages/tallerista/DocumentManager').then(m => ({ default: m.DocumentManager })));

// Lazy load páginas compartidas
const Documents = lazy(() => import('./pages/shared/Documents').then(m => ({ default: m.Documents })));
const HorarioSemanal = lazy(() => import('./pages/shared/HorarioSemanal').then(m => ({ default: m.HorarioSemanal })));
const InstitutionalGallery = lazy(() => import('./pages/shared/InstitutionalGallery'));

// Lazy load páginas aspirante
const AspiranteDashboard = lazy(() => import('./pages/aspirante/AspiranteDashboard').then(m => ({ default: m.AspiranteDashboard })));
const UnderConstruction = lazy(() => import('./pages/UnderConstruction').then(m => ({ default: m.UnderConstruction })));

// Importar CSS
import './styles/design-system.css';
import './styles/global.css';
import './styles/components.css';
import './styles/sections/gallery.css';

// Componente de loading
const PageLoader = () => <LoadingScreen message="Cargando..." />;

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
        <PwaInstallPrompt />
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Landing Page */}
          <Route path="/" element={<UnderConstruction />} />

          {/* Login */}
          <Route path="/portal/login" element={<Login />} />
          <Route path="/portal/auth/accion" element={<AuthAction />} />

          {/* Admin Routes */}
          <Route
            path="/portal/admin"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION, ROLES.FACTURACION]}>
                    <AdminDashboard />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/usuarios"
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
            path="/portal/admin/comunicar"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION, ROLES.DOCENTE, ROLES.FACTURACION]}>
                    <ReadReceiptsPanel />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/comunicar/nuevo"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION, ROLES.DOCENTE, ROLES.FACTURACION]}>
                    <SendCommunication />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/confirmaciones"
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
            path="/portal/admin/alumnos"
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
            path="/portal/admin/turnos"
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
            path="/portal/admin/talleres"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <TalleresList />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/talleres/:tallerId"
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
            path="/portal/admin/snacks"
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
            path="/portal/admin/snacks/listas"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <SnacksLists />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/documentos"
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
          <Route
            path="/portal/admin/galeria-institucional"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION, ROLES.DOCENTE]}>
                    <InstitutionalGalleryManager />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/eventos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <EventsManager />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/conversaciones"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION, ROLES.FACTURACION]}>
                    <AdminConversations />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/conversaciones/nuevo"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION, ROLES.FACTURACION]}>
                    <AdminNewConversation />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/conversaciones/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION, ROLES.FACTURACION]}>
                    <AdminConversationDetail />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/admin/horarios"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.SUPERADMIN, ROLES.COORDINACION]}>
                    <HorarioSemanal />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Family Routes */}
          <Route
            path="/portal/familia"
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
            path="/portal/familia/comunicados"
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
            path="/portal/familia/comunicados/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <CommunicationDetail />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/familia/conversaciones"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <FamilyConversations />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/familia/conversaciones/nueva"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <FamilyNewConversation />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/familia/conversaciones/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <FamilyConversationDetail />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/familia/hijos"
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
            path="/portal/familia/turnos"
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
            path="/portal/familia/eventos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <EventsCalendar />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/familia/talleres"
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
            path="/portal/familia/snacks"
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
            path="/portal/familia/documentos"
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
          <Route
            path="/portal/familia/horarios"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <HorarioSemanal />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/familia/galeria"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.FAMILY]}>
                    <InstitutionalGallery />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Teacher Routes */}
          <Route
            path="/portal/docente"
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
            path="/portal/docente/documentos"
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
          <Route
            path="/portal/docente/eventos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.DOCENTE]}>
                    <EventsCalendar />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/docente/horarios"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.DOCENTE]}>
                    <HorarioSemanal />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/docente/galeria"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.DOCENTE]}>
                    <InstitutionalGallery />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Tallerista Routes */}
          <Route
            path="/portal/tallerista"
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
            path="/portal/tallerista/mi-taller"
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
            path="/portal/tallerista/galeria"
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
            path="/portal/tallerista/documentos"
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
          <Route
            path="/portal/tallerista/eventos"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                    <EventsCalendar />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/tallerista/horarios"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                    <HorarioSemanal />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portal/tallerista/galeria-institucional"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.TALLERISTA]}>
                    <InstitutionalGallery />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Aspirante Routes */}
          <Route
            path="/portal/aspirante"
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
            path="/portal/aspirante/documentos"
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
          <Route
            path="/portal/aspirante/galeria"
            element={
              <ProtectedRoute>
                <Layout>
                  <RoleGuard allowedRoles={[ROLES.ASPIRANTE]}>
                    <InstitutionalGallery />
                  </RoleGuard>
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Unauthorized */}
          <Route
            path="/portal/unauthorized"
            element={
              <div className="container" style={{ paddingTop: 'var(--spacing-xl)' }}>
                <div className="card">
                  <div className="card__header">
                    <h1 className="card__title">Acceso Denegado</h1>
                  </div>
                  <div className="card__body">
                    <p>No tienes permisos para acceder a esta sección.</p>
                    <a href="/portal/login" className="btn btn--primary" style={{ marginTop: 'var(--spacing-md)' }}>
                      Volver al Login
                    </a>
                  </div>
                </div>
              </div>
            }
          />

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
                    <a href="/" className="btn btn--primary" style={{ marginTop: 'var(--spacing-md)' }}>
                      Ir al inicio
                    </a>
                  </div>
                </div>
              </div>
            }
          />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
