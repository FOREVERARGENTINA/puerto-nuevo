import { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';

/**
 * Layout - Wrapper global para páginas autenticadas
 * Estructura tipo campus universitario con navbar, sidebar y breadcrumbs
 */
export function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <Navbar onToggleSidebar={toggleSidebar} isSidebarOpen={sidebarOpen} />
      <div className="layout-container">
        <Sidebar isOpen={sidebarOpen} onNavigate={closeSidebar} />
        <div className="layout-main">
          <Breadcrumbs />
          <main className="main-content">{children}</main>
        </div>
      </div>
    </>
  );
}
