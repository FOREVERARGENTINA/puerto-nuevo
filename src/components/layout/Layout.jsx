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
          <footer style={{ 
            textAlign: 'center', 
            padding: 'var(--spacing-sm)', 
            fontSize: 'var(--font-size-xs)', 
            color: 'var(--color-text-light)',
            opacity: 0.6,
            marginTop: 'var(--spacing-xl)'
          }}>
            &copy; 2026 Puerto Nuevo. Dise&ntilde;o y desarrollo{' '}
            <a 
              href="https://www.frandoweb.com" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                color: 'var(--color-primary)', 
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.8'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              www.Frandoweb.com
            </a>
          </footer>
        </div>
      </div>
    </>
  );
}


