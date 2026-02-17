import { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Breadcrumbs } from './Breadcrumbs';
import '../../styles/layout.css';

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
      <Navbar
        onToggleSidebar={toggleSidebar}
        onCloseSidebar={closeSidebar}
        isSidebarOpen={sidebarOpen}
      />
      <div className="layout-container">
        {sidebarOpen && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Cerrar menú"
            onClick={closeSidebar}
          />
        )}
        <Sidebar isOpen={sidebarOpen} onNavigate={closeSidebar} />
        <div className="layout-main">
          <Breadcrumbs />
          <main className="main-content">{children}</main>
          <footer className="layout-footer">
            <div className="layout-footer__content">
              <span className="layout-footer__text">
                &copy; 2026 Montessori Puerto Nuevo
              </span>
              <span className="layout-footer__text">
                Diseño y desarrollo:{' '}
                <a 
                  href="https://www.frandoweb.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="layout-footer__link"
                  aria-label="Visitar Frandoweb - Diseño y desarrollo del sitio"
                >
                  www.Frandoweb.com
                </a>
              </span>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}


