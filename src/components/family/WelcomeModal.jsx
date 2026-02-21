import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import Icon from '../ui/Icon';

const STORAGE_KEY = (uid) => `pn_welcome_${uid}`;

const FEATURES = [
  {
    icon: 'send',
    label: 'Comunicados',
    desc: 'Avisos y circulares oficiales',
    color: 'accent',
  },
  {
    icon: 'chat',
    label: 'Conversaciones',
    desc: 'Consultas privadas con la escuela',
    color: 'info',
  },
  {
    icon: 'calendar',
    label: 'Reuniones',
    desc: 'Reservar turnos con docentes',
    color: 'success',
  },
  {
    icon: 'user',
    label: 'Alumnos',
    desc: 'Perfil, talleres, galería y más',
    color: 'primary',
  },
];

export function WelcomeModal({ user }) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handleClose = useCallback(async () => {
    setAnimating(false);

    // Esperar que termine la animación de salida antes de desmontar
    setTimeout(async () => {
      setVisible(false);

      if (!user?.uid) return;

      // 1. Guardar en localStorage (sincrónico, respuesta inmediata)
      localStorage.setItem(STORAGE_KEY(user.uid), '1');

      // 2. Guardar en Firestore (asíncrono, backup cross-device)
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await updateDoc(userDocRef, {
          portalWelcomeSeen: serverTimestamp()
        });
      } catch (error) {
        // Si el documento no existe, intentar crearlo
        if (error.code === 'not-found') {
          try {
            const { setDoc } = await import('firebase/firestore');
            await setDoc(userDocRef, {
              portalWelcomeSeen: serverTimestamp()
            }, { merge: true });
          } catch (setError) {
            console.error('Error al crear documento de usuario:', setError);
          }
        } else {
          console.error('Error al guardar welcome modal en Firestore:', error);
        }
      }
    }, 280);
  }, [user?.uid]);

  // Verificar si debe mostrarse el modal
  useEffect(() => {
    if (!user?.uid) return;

    let timer;

    const checkWelcomeSeen = async () => {
      // Modo preview: ?welcomePreview=1 en la URL fuerza el modal (solo desarrollo)
      const isPreview = new URLSearchParams(window.location.search).get('welcomePreview') === '1';

      if (!isPreview) {
        // 1. Verificar localStorage primero (instantáneo)
        const seenLocal = localStorage.getItem(STORAGE_KEY(user.uid));
        if (seenLocal) return;

        // 2. Verificar Firestore como backup cross-device
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists() && userDocSnap.data().portalWelcomeSeen) {
            // Existe en Firestore pero no en localStorage → sincronizar
            localStorage.setItem(STORAGE_KEY(user.uid), '1');
            return;
          }
        } catch (error) {
          console.error('Error al verificar welcome modal en Firestore:', error);
          // Si falla Firestore, continuar mostrando el modal
        }
      }

      // No está marcado en ningún lado (o es preview) → mostrar modal
      timer = setTimeout(() => {
        setVisible(true);
        requestAnimationFrame(() => setAnimating(true));
      }, 800);
    };

    checkWelcomeSeen();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [user?.uid]);

  // Listener para tecla Escape
  useEffect(() => {
    if (!visible) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [visible, handleClose]);

  if (!visible) return null;
  const greeting = '¡Bienvenida, Familia!';

  return (
    <div
      className={`welcome-modal__overlay${animating ? ' welcome-modal__overlay--in' : ''}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Modal de bienvenida"
    >
      {/* Wrapper relativo: sostiene la X fuera del overflow:hidden del card */}
      <div className="welcome-modal__wrapper">
        {/* Botón cerrar — fuera del card para no ser clippeado */}
        <button
          className="welcome-modal__close"
          onClick={handleClose}
          aria-label="Cerrar bienvenida"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>

        <div
          className={`welcome-modal__card${animating ? ' welcome-modal__card--in' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Línea decorativa superior */}
          <div className="welcome-modal__accent-bar" aria-hidden="true" />

        {/* Marca institucional */}
        <p className="welcome-modal__brand">Montessori Puerto Nuevo</p>

        {/* Saludo personalizado */}
        <h2 className="welcome-modal__title">{greeting}</h2>
        <p className="welcome-modal__subtitle">
          Este es su espacio privado en la comunidad escolar.
        </p>

        {/* Separador */}
        <div className="welcome-modal__divider">
          <span>Desde aquí pueden</span>
        </div>

        {/* Features */}
        <ul className="welcome-modal__features" role="list">
          {FEATURES.map(({ icon, label, desc, color }) => (
            <li key={icon} className={`welcome-modal__feature welcome-modal__feature--${color}`}>
              <span className={`welcome-modal__feature-icon welcome-modal__feature-icon--${color}`}>
                <Icon name={icon} size={16} />
              </span>
              <span className="welcome-modal__feature-text">
                <strong>{label}</strong>
                <span>{desc}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          className="welcome-modal__cta btn btn--accent btn--full"
          onClick={handleClose}
        >
          Comenzar en el portal
        </button>
        </div>{/* .welcome-modal__card */}
      </div>{/* .welcome-modal__wrapper */}
    </div>
  );
}


