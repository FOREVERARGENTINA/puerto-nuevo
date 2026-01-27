import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { conversationsService } from '../../services/conversations.service';
import { CONVERSATION_STATUS, ESCUELA_AREAS, ROUTES, ROLES } from '../../config/constants';
import {
  getAreaLabel,
  getCategoryLabel,
  getConversationStatusBadge,
  getConversationStatusLabel
} from '../../utils/conversationHelpers';

export function AdminConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [reassignTo, setReassignTo] = useState('');

  useEffect(() => {
    if (!id) return;
    const convRef = doc(db, 'conversations', id);
    const unsubConv = onSnapshot(convRef, (snap) => {
      if (snap.exists()) {
        setConversation({ id: snap.id, ...snap.data() });
      } else {
        setConversation(null);
      }
    });

    const msgsQuery = query(
      collection(db, 'conversations', id, 'messages'),
      orderBy('creadoAt', 'asc')
    );
    const unsubMsgs = onSnapshot(msgsQuery, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(data);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    return () => {
      unsubConv();
      unsubMsgs();
    };
  }, [id]);

  useEffect(() => {
    if (!conversation || !user) return;
    if ((conversation.mensajesSinLeerEscuela || 0) > 0) {
      conversationsService.markConversationRead(conversation.id, 'school');
    }
  }, [conversation, user]);

  const isClosed = conversation?.estado === CONVERSATION_STATUS.CERRADA;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!conversation || !user || sending) return;
    if (text.trim().length === 0 && !file) return;

    setSending(true);
    setError(null);

    const result = await conversationsService.sendMessage(conversation.id, {
      autorUid: user.uid,
      autorDisplayName: user.displayName || user.email,
      autorRol: role,
      texto: text.trim(),
      archivos: file ? [file] : []
    });

    if (!result.success) {
      setError(result.error || 'No se pudo enviar el mensaje');
      setSending(false);
      return;
    }

    setText('');
    setFile(null);
    setSending(false);
  };

  const handleClose = async () => {
    if (!conversation || !user) return;
    const confirmed = window.confirm('¿Cerrar esta conversación?');
    if (!confirmed) return;
    const result = await conversationsService.closeConversation(conversation.id, user.uid);
    if (!result.success) {
      setError(result.error || 'No se pudo cerrar');
    }
  };

  const handleReassign = async () => {
    if (!conversation || !reassignTo) return;
    const result = await conversationsService.reassignConversation(conversation.id, reassignTo);
    if (!result.success) {
      setError(result.error || 'No se pudo reasignar');
    } else {
      setReassignTo('');
    }
  };

  const headerMeta = useMemo(() => {
    if (!conversation) return '';
    const status = getConversationStatusLabel(conversation.estado, ROLES.SUPERADMIN);
    return `${getAreaLabel(conversation.destinatarioEscuela)} · ${getCategoryLabel(conversation.categoria)} · ${status}`;
  }, [conversation]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
        <div className="spinner spinner--lg"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container page-container">
        <div className="alert alert--error">Conversación no encontrada</div>
        <button className="btn btn--outline mt-md" onClick={() => navigate(ROUTES.ADMIN_CONVERSATIONS)}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact">
        <div className="conversation-header">
          <Link to={ROUTES.ADMIN_CONVERSATIONS} className="btn btn--link">← Volver</Link>
          <div className="conversation-header__main">
            <h1 className="dashboard-title">{conversation.familiaDisplayName || conversation.familiaEmail || 'Familia'}</h1>
            <div className="conversation-header__meta">
              <span className={getConversationStatusBadge(conversation.estado)}>
                {getConversationStatusLabel(conversation.estado, role)}
              </span>
              <span className="text-muted">{headerMeta}</span>
            </div>
            <div className="text-muted">Asunto: {conversation.asunto || 'Sin asunto'}</div>
          </div>
        </div>
      </div>

      <div className="conversation-thread">
        {messages.length === 0 ? (
          <div className="empty-state--card">
            <p>No hay mensajes en esta conversación.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.autorUid === user?.uid;
            const createdAt = msg.creadoAt?.toDate?.() || new Date();
            return (
              <div key={msg.id} className={`message-bubble ${isOwn ? 'message-bubble--own' : ''}`}>
                <div className="message-bubble__header">
                  <strong>{msg.autorDisplayName || (msg.autorRol === 'family' ? 'Familia' : 'Escuela')}</strong>
                  <span>{createdAt.toLocaleString('es-AR')}</span>
                </div>
                {msg.texto && <p>{msg.texto}</p>}
                {Array.isArray(msg.adjuntos) && msg.adjuntos.length > 0 && (
                  <div className="message-bubble__attachments">
                    {msg.adjuntos.map((a, idx) => (
                      <a key={idx} href={a.url} target="_blank" rel="noreferrer">{a.name}</a>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="conversation-admin-actions">
        <div className="form-group">
          <label>Reasignar a</label>
          <div className="flex gap-sm">
            <select
              className="form-select"
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              disabled={isClosed}
            >
              <option value="">Seleccionar área</option>
              <option value={ESCUELA_AREAS.COORDINACION}>Coordinación</option>
              <option value={ESCUELA_AREAS.ADMINISTRACION}>Administración</option>
              <option value={ESCUELA_AREAS.DIRECCION}>Dirección</option>
            </select>
            <button className="btn btn--outline" type="button" onClick={handleReassign} disabled={!reassignTo || isClosed}>
              Reasignar
            </button>
          </div>
        </div>
        <button className="btn btn--danger" type="button" onClick={handleClose} disabled={isClosed}>
          Marcar como resuelta y cerrar
        </button>
      </div>

      <form className="conversation-compose" onSubmit={handleSend}>
        <textarea
          className="form-textarea"
          placeholder={isClosed ? 'Conversación cerrada' : 'Escribí tu respuesta...'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          disabled={sending || isClosed}
        />
        <div className="conversation-compose__actions">
          <input
            type="file"
            className="form-input"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={sending || isClosed}
          />
          <button className="btn btn--primary" type="submit" disabled={sending || isClosed}>
            {sending ? 'Enviando...' : 'Enviar mensaje'}
          </button>
        </div>
        {error && <div className="alert alert--error mt-sm">{error}</div>}
      </form>
    </div>
  );
}
