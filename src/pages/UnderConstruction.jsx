import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/under-construction.css';

export const UnderConstruction = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const targetDate = new Date('2026-02-23T17:00:00');

    const calculateTimeLeft = () => {
      const difference = targetDate - new Date();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

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

        <div className="under-construction__countdown" aria-label="Cuenta regresiva">
          <div className="countdown-item">
            <span className="countdown-value">{timeLeft.days}</span>
            <span className="countdown-label">Días</span>
          </div>
          <div className="countdown-item">
            <span className="countdown-value">{String(timeLeft.hours).padStart(2, '0')}</span>
            <span className="countdown-label">Horas</span>
          </div>
          <div className="countdown-item">
            <span className="countdown-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
            <span className="countdown-label">Min</span>
          </div>
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
