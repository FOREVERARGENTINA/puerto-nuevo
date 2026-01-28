import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useDialog } from '../../hooks/useDialog';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { conversationsService } from '../../services/conversations.service';
import { ROUTES, CONVERSATION_STATUS, ROLES } from '../../config/constants';
import {
  getAreaLabel,
  getCategoryLabel,
  getConversationStatusLabel
} from '../../utils/conversationHelpers';

export function FamilyConversationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { isOpen, openDialog, closeDialog } = useDialog();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);

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
    if ((conversation.mensajesSinLeerFamilia || 0) > 0) {
      conversationsService.markConversationRead(conversation.id, 'family');
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
      autorRol: 'family',
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

  const handleCloseConversation = () => {
    openDialog();
  };

  const confirmClose = async () => {
    if (!conversation || !user || closing) return;
    
    setClosing(true);
    setError(null);
    
    const result = await conversationsService.closeConversation(conversation.id, user.uid);
    
    if (!result.success) {
      setError(result.error || 'No se pudo cerrar la conversación');
    }
    
    setClosing(false);
  };

  const headerMeta = useMemo(() => {
    if (!conversation) return '';
    const status = getConversationStatusLabel(conversation.estado, ROLES.FAMILY);
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
        <button className="btn btn--outline mt-md" onClick={() => navigate(ROUTES.FAMILY_CONVERSATIONS)}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="family-conversations-page">
      <div className="conversations-header">
        <div className="conversations-header__content">
          <div>
            <h1 className="conversations-title">{conversation.asunto || 'Sin asunto'}</h1>
            <div className="conversation-detail-meta">
              <span className={`conversation-status-tag conversation-status-tag--${conversation.estado}`}>
                {getConversationStatusLabel(conversation.estado, role)}
              </span>
              <span className="conversation-meta-item">{getAreaLabel(conversation.destinatarioEscuela)}</span>
              <span className="conversation-meta-divider">·</span>
              <span className="conversation-meta-item">{getCategoryLabel(conversation.categoria)}</span>
            </div>
          </div>
          <div className="conversations-header__actions">
            {!isClosed && (
              <button 
                type="button" 
                className="btn btn--outline-danger btn--sm"
                onClick={handleCloseConversation}
                disabled={closing}
              >
                {closing ? 'Cerrando...' : 'Cerrar conversación'}
              </button>
            )}
            <Link to={ROUTES.FAMILY_CONVERSATIONS} className="btn btn--outline btn--sm">
              ← Volver
            </Link>
          </div>
        </div>
      </div>

      <div className="conversation-messages">
        {messages.length === 0 ? (
          <div className="conversation-empty">
            <p>No hay mensajes en esta conversación.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.autorUid === user?.uid;
            const createdAt = msg.creadoAt?.toDate?.() || new Date();
            return (
              <div key={msg.id} className={`chat-message ${isOwn ? 'chat-message--sent' : 'chat-message--received'}`}>
                <div className="chat-message__content">
                  <div className="chat-message__header">
                    <span className="chat-message__author">
                      {msg.autorDisplayName || (msg.autorRol === 'family' ? 'Familia' : 'Escuela')}
                    </span>
                    <span className="chat-message__time">
                      {createdAt.toLocaleString('es-AR', { 
                        day: 'numeric', 
                        month: 'short',
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                  {msg.texto && <p className="chat-message__text">{msg.texto}</p>}
                  {Array.isArray(msg.adjuntos) && msg.adjuntos.length > 0 && (
                    <div className="chat-message__attachments">
                      {msg.adjuntos.map((a, idx) => (
                        <a key={idx} href={a.url} target="_blank" rel="noreferrer" className="chat-attachment">
                          {a.name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {!isClosed && (
        <form className="conversation-reply" onSubmit={handleSend}>
          <textarea
            className="conversation-reply__input"
            placeholder="Escribí tu mensaje..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            disabled={sending}
          />
          <div className="conversation-reply__footer">
            <label className="conversation-reply__file">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={sending}
              />
              <span className="conversation-reply__file-text">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                {file ? file.name : 'Adjuntar archivo'}
              </span>
            </label>
            <button className="btn btn--primary" type="submit" disabled={sending || (!text.trim() && !file)}>
              {sending ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
          {error && <div className="alert alert--error mt-sm">{error}</div>}
        </form>
      )}

      {isClosed && (
        <div className="conversation-closed-notice">
          Esta conversación está cerrada
        </div>
      )}

      <ConfirmDialog
        isOpen={isOpen}
        onClose={closeDialog}
        onConfirm={confirmClose}
        title="Cerrar conversación"
        message="¿Estás seguro de que querés cerrar esta conversación? No podrás enviar más mensajes."
        confirmText="Cerrar"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}
