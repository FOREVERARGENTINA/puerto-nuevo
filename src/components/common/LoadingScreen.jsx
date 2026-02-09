export function LoadingScreen({ message = 'Cargando...', isExiting = false }) {
  return (
    <div
      className={`loading-screen${isExiting ? ' loading-screen--exit' : ''}`}
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-screen__content">
        <div className="loading-screen__logo-container">
          <img
            src="/logo-login.png"
            alt="Montessori Puerto Nuevo"
            className="loading-screen__logo"
          />
        </div>
        <p className="loading-screen__message">{message}</p>
      </div>
    </div>
  );
}
