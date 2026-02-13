import { Link } from 'react-router-dom';
import '../styles/under-construction.css';

export const UnderConstruction = () => {
  return (
    <div className="under-construction">
      <div className="under-construction__content">
        <div className="under-construction__image-container">
          <img
            src="/datos/imagenes/construccion.webp"
            alt="Sitio en construcción"
            className="under-construction__image"
          />
        </div>

        <div className="under-construction__text">
          <h1 className="under-construction__title">Sitio en Construcción</h1>
          <p className="under-construction__subtitle">
            Estamos trabajando en nuestro nuevo sitio web institucional. Pronto podrás conocer más sobre nuestra misión, visión e historia.
          </p>
        </div>

        <div className="under-construction__actions">
          <Link to="/portal/login" className="under-construction__button">
            Ingresar al Portal
          </Link>
        </div>

        <div className="under-construction__footer">
          <p className="under-construction__info">
            Si ya tienes una cuenta, puedes acceder al portal de gestión.
          </p>
        </div>
      </div>
    </div>
  );
};
