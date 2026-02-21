import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { conversationsService } from '../../services/conversations.service';
import { ROUTES, CONVERSATION_STATUS } from '../../config/constants';
import { emitConversationRead } from '../../utils/conversationEvents';
import Icon from '../../components/ui/Icon';
import { FileSelectionList, FileUploadSelector } from '../../components/common/FileUploadSelector';
import {
  getAreaLabel,
  getCategoryLabel,
  getConversationStatusLabel
} from '../../utils/conversationHelpers';

export function FamilyConversationDetail() {
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
      setConversation((prev) => (prev ? { ...prev, mensajesSinLeerFamilia: 0 } : prev));
      emitConversationRead(conversation.id, 'family');
      conversationsService.markConversationRead(conversation.id, 'family').catch(() => {
        // no-op: el listener remoto corrige estado final
      });
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
        <button className="btn btn--outline btn--back mt-md" onClick={() => navigate(ROUTES.FAMILY_CONVERSATIONS)}>
          <Icon name="chevron-left" size={16} />
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="container page-container family-conversations-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">{conversation.asunto || 'Sin asunto'}</h1>
          <div className="conversation-detail-meta">
            {[CONVERSATION_STATUS.PENDIENTE, CONVERSATION_STATUS.CERRADA].includes(conversation.estado) && (
              <span className={`conversation-status-tag conversation-status-tag--${conversation.estado}`}>
                {getConversationStatusLabel(conversation.estado, role)}
              </span>
            )}
            <span className="conversation-meta-item">{getAreaLabel(conversation.destinatarioEscuela)}</span>
            <span className="conversation-meta-divider">·</span>
            <span className="conversation-meta-item">{getCategoryLabel(conversation.categoria)}</span>
          </div>
        </div>
        <div className="conversations-header__actions">
          <Link to={ROUTES.FAMILY_CONVERSATIONS} className="btn btn--outline btn--back btn--sm">
            <Icon name="chevron-left" size={16} />
            Volver
          </Link>
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
            <div style={{ width: '100%' }}>
              <FileUploadSelector
                id="family-conversation-file"
                multiple={false}
                onFilesSelected={(files) => setFile(Array.isArray(files) ? files[0] || null : null)}
                disabled={sending}
                hint="Adjunto opcional"
              />
              {file && (
                <FileSelectionList files={[file]} onRemove={() => setFile(null)} />
              )}
            </div>
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

    </div>
  );
}
