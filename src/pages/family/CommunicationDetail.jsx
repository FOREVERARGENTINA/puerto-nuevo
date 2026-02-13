import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { usersService } from '../../services/users.service';
import { readReceiptsService } from '../../services/readReceipts.service';
import { ROUTES } from '../../config/constants';
import Icon from '../../components/ui/Icon';

export function CommunicationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [communication, setCommunication] = useState(null);
  const [hasRead, setHasRead] = useState(false);
  const [senderName, setSenderName] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSender, setLoadingSender] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(null);

  // Cargar comunicado
  useEffect(() => {
    if (!id) return;

    const commRef = doc(db, 'communications', id);
    const unsubscribe = onSnapshot(
      commRef,
      (snap) => {
        if (snap.exists()) {
          setCommunication({ id: snap.id, ...snap.data() });
        } else {
          setCommunication(null);
          setError('Comunicado no encontrado');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error cargando comunicado:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  // Verificar si ya fue leído
  useEffect(() => {
    if (!communication || !user) return;

    const checkReadStatus = async () => {
      const result = await readReceiptsService.hasUserRead(communication.id, user.uid);
      if (result.success) {
        setHasRead(result.hasRead);
      }
    };

    checkReadStatus();
  }, [communication, user]);

  // Marcar como leído automáticamente al abrir el comunicado.
  useEffect(() => {
    if (!communication || !user || hasRead || communication.requiereLecturaObligatoria) return;

    let cancelled = false;

    const markOpenedCommunicationAsRead = async () => {
      const result = await readReceiptsService.markAsRead(
        communication.id,
        user.uid,
        user.displayName || user.email
      );

      if (!cancelled && result.success) {
        setHasRead(true);
      }
    };

    markOpenedCommunicationAsRead();

    return () => {
      cancelled = true;
    };
  }, [communication, user, hasRead]);

  // Cargar nombre del remitente
  useEffect(() => {
    if (!communication || senderName || !communication.sentBy) return;

    const loadSender = async () => {
      setLoadingSender(true);
      try {
        const res = await usersService.getUserById(communication.sentBy);
        if (res.success) {
          setSenderName(res.user.displayName || res.user.email || '—');
        }
      } catch (err) {
        console.error('Error cargando remitente:', err);
      } finally {
        setLoadingSender(false);
      }
    };

    loadSender();
  }, [communication, senderName]);

  const handleMarkAsRead = async () => {
    if (!user || !communication) return;

    setConfirming(true);
    try {
      const result = await readReceiptsService.markAsRead(
        communication.id,
        user.uid,
        user.displayName || user.email
      );

      if (result.success) {
        setHasRead(true);
      } else {
        console.error('Error marcando como leído:', result.error);
      }
    } catch (error) {
      console.error('Error al confirmar lectura:', error);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="container page-container">
        <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
          <div className="spinner spinner--lg"></div>
        </div>
      </div>
    );
  }

  if (error || !communication) {
    return (
      <div className="container page-container">
        <div className="alert alert--error">
          {error || 'Comunicado no encontrado'}
        </div>
        <Link to={ROUTES.COMMUNICATIONS} className="btn btn--outline btn--back" style={{ marginTop: 'var(--spacing-md)' }}>
          <Icon name="chevron-left" size={16} />
          Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <Link to={ROUTES.COMMUNICATIONS} className="btn btn--outline btn--back" style={{ marginBottom: 'var(--spacing-xs)' }}>
            <Icon name="chevron-left" size={16} />
            Volver
          </Link>
          <h1 className="dashboard-title">{communication.title}</h1>
          <p className="dashboard-subtitle">
            {communication.createdAt && (
              <>
                {new Date(communication.createdAt.toDate()).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                <span style={{ margin: '0 0.5rem' }}>•</span>
              </>
            )}
            {loadingSender ? 'Cargando remitente...' : `Enviado por ${senderName || communication.sentByDisplayName || '—'}`}
          </p>
        </div>
        <div>
          {communication.requiereLecturaObligatoria && (
            hasRead ? (
              <span className="badge badge--success">
                <Icon name="check" size={14} />
                Leído
              </span>
            ) : (
              <span className="badge badge--warning">
                <Icon name="alert" size={14} />
                Requiere lectura
              </span>
            )
          )}
        </div>
      </div>

      <div className="card">
        <div className="card__body">
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{communication.body}</p>

          {communication.attachments && communication.attachments.length > 0 && (
            <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border)' }}>
              <strong style={{ display: 'block', marginBottom: 'var(--spacing-sm)' }}>Archivos adjuntos:</strong>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {communication.attachments.map((attachment, i) => (
                  <li key={i} style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn--text"
                      style={{ padding: 'var(--spacing-xs) 0' }}
                      title={attachment.name || `Archivo adjunto ${i + 1}`}
                    >
                      <Icon name="file" size={16} />
                      {`Archivo adjunto ${i + 1}`}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {communication.requiereLecturaObligatoria && !hasRead && (
        <div className="card" style={{ marginTop: 'var(--spacing-md)', textAlign: 'center' }}>
          <div className="card__body">
            <p style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-text-light)' }}>
              Este comunicado requiere confirmación de lectura
            </p>
            <button
              className="btn btn--primary btn--lg"
              onClick={handleMarkAsRead}
              disabled={confirming}
              style={{ minWidth: '200px' }}
            >
              {confirming ? 'Confirmando...' : 'Confirmar Lectura'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
