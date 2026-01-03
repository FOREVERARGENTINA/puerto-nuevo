import { Navbar } from './Navbar';

/**
 * Layout - Wrapper global para páginas autenticadas
 * Incluye navbar sticky y área de contenido principal
 */
export function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="main-content">{children}</main>
    </>
  );
}
