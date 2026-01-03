export function LoadingScreen({ message = 'Cargando...' }) {
  return (
    <div className="loading-screen">
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
