import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';

/**
 * Layout - Wrapper global para páginas autenticadas
 * Estructura tipo campus universitario con navbar, sidebar y breadcrumbs
 */
export function Layout({ children }) {
  return (
    <>
      <Navbar />
      <div className="layout-container">
        <Sidebar />
        <div className="layout-main">
          <Breadcrumbs />
          <main className="main-content">{children}</main>
        </div>
      </div>
    </>
  );
}
