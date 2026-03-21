import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { conversationsService } from '../../services/conversations.service';
import { CONVERSATION_STATUS, ESCUELA_AREAS, ROUTES, ROLES } from '../../config/constants';
import { emitConversationRead } from '../../utils/conversationEvents';
import Icon from '../../components/ui/Icon';
import {
  getAreaLabel,
  getCategoryLabel,
  getConversationStatusBadge,
  getConversationStatusLabel
} from '../../utils/conversationHelpers';
import { formatDateTimeBuenosAires } from '../../utils/dateHelpers';
import { FileSelectionList, FileUploadSelector } from '../../components/common/FileUploadSelector';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

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
  const [reassigning, setReassigning] = useState(false);
  const [reassignFeedback, setReassignFeedback] = useState(null);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);

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
      setConversation((prev) => (prev ? { ...prev, mensajesSinLeerEscuela: 0 } : prev));
      emitConversationRead(conversation.id, 'school');
      conversationsService.markConversationRead(conversation.id, 'school').catch(() => {
        // no-op: el listener remoto corrige estado final
      });
    }
  }, [conversation, user]);

  useEffect(() => {
    if (!reassignFeedback) return;
    const timeoutId = setTimeout(() => setReassignFeedback(null), 2800);
    return () => clearTimeout(timeoutId);
  }, [reassignFeedback]);

  const isClosed = conversation?.estado === CONVERSATION_STATUS.CERRADA;

  const getMsgReceipt = (msg) => {
    if (msg.autorRol === 'family') return null;
    if (!msg.creadoAt) return 'sent';
    let visto;
    if (conversation?.esGrupal && conversation?.ultimoMensajeVisto) {
      // "leído" si al menos un participante lo vio
      const timestamps = Object.values(conversation.ultimoMensajeVisto).filter(Boolean);
      if (timestamps.length === 0) return 'sent';
      const toMs = (t) => typeof t.toMillis === 'function' ? t.toMillis() : (t.seconds || 0) * 1000;
      const maxMs = Math.max(...timestamps.map(toMs));
      const msgMs = toMs(msg.creadoAt);
      return msgMs <= maxMs ? 'read' : 'sent';
    }
    visto = conversation?.ultimoMensajeVistoPorFamilia;
    if (!visto) return 'sent';
    const msgMs = typeof msg.creadoAt.toMillis === 'function' ? msg.creadoAt.toMillis() : (msg.creadoAt.seconds || 0) * 1000;
    const vistoMs = typeof visto.toMillis === 'function' ? visto.toMillis() : (visto.seconds || 0) * 1000;
    return msgMs <= vistoMs ? 'read' : 'sent';
  };

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
    const result = await conversationsService.closeConversation(conversation.id, user.uid);
    if (!result.success) {
      setError(result.error || 'No se pudo cerrar');
    }
  };

  const handleReassign = async () => {
    if (!conversation || !reassignTo || reassigning) return;
    setReassigning(true);
    setReassignFeedback(null);
    const result = await conversationsService.reassignConversation(conversation.id, reassignTo);
    if (!result.success) {
      setError(result.error || 'No se pudo reasignar');
      setReassignFeedback({
        type: 'error',
        message: result.error || 'No se pudo reasignar la conversación'
      });
    } else {
      setError(null);
      setReassignFeedback({
        type: 'success',
        message: `Conversación reasignada a ${getAreaLabel(reassignTo)}.`
      });
      setReassignTo('');
    }
    setReassigning(false);
  };

  const headerMeta = useMemo(() => {
    if (!conversation) return '';
    return `${getAreaLabel(conversation.destinatarioEscuela)} · ${getCategoryLabel(conversation.categoria)}`;
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
        <button className="btn btn--outline btn--back mt-md" onClick={() => navigate(ROUTES.ADMIN_CONVERSATIONS)}>
          <Icon name="chevron-left" size={16} />
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div className="dashboard-header dashboard-header--compact conversation-header-layout">
        <div className="conversation-header-layout__main">
          <h1 className="dashboard-title">{conversation.familiaDisplayName || conversation.familiaEmail || 'Familia'}</h1>
          {conversation.esGrupal && conversation.participantes && (
            <p className="conversation-header__participants text-muted">
              {Object.values(conversation.participantes)
                .map(p => p.displayName || p.email)
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          <div className="conversation-header__meta">
            {[CONVERSATION_STATUS.PENDIENTE, CONVERSATION_STATUS.CERRADA].includes(conversation.estado) && (
              <span className={getConversationStatusBadge(conversation.estado)}>
                {getConversationStatusLabel(conversation.estado, role)}
              </span>
            )}
            <span className="text-muted">{headerMeta}</span>
          </div>
          <p className="dashboard-subtitle">Asunto: {conversation.asunto || 'Sin asunto'}</p>
        </div>
        <div className="conversation-header-layout__center">
          <div className="conversation-management-card">
            <label htmlFor="reassign-area" className="conversation-management-card__label">Reasignar a</label>
            <div className="conversation-header__reassign-controls conversation-header__reassign-controls--inline">
              <select
                id="reassign-area"
                className="form-select"
                value={reassignTo}
                onChange={(e) => setReassignTo(e.target.value)}
                disabled={isClosed || reassigning}
              >
                <option value="">Seleccionar área</option>
                <option value={ESCUELA_AREAS.COORDINACION}>Coordinación</option>
                <option value={ESCUELA_AREAS.ADMINISTRACION}>Administración</option>
                <option value={ESCUELA_AREAS.DIRECCION}>Dirección</option>
              </select>
              <button
                className="btn btn--outline"
                type="button"
                onClick={handleReassign}
                disabled={!reassignTo || isClosed || reassigning}
              >
                {reassigning ? 'Reasignando...' : 'Reasignar'}
              </button>
              <button
                className="btn btn--danger-outline conversation-management-card__close"
                type="button"
                onClick={() => setIsCloseDialogOpen(true)}
                disabled={isClosed}
              >
                Marcar como resuelta o cerrar
              </button>
            </div>
          </div>
        </div>
        <div className="conversation-header__actions conversation-header-layout__actions">
          <Link to={ROUTES.ADMIN_CONVERSATIONS} className="btn btn--outline btn--back">
            <Icon name="chevron-left" size={16} />
            Volver
          </Link>
        </div>
      </div>

      {reassignFeedback && (
        <div
          className={`alert conversation-reassign-feedback ${
            reassignFeedback.type === 'error' ? 'alert--error' : 'alert--success'
          }`}
          role="status"
          aria-live="polite"
        >
          {reassignFeedback.message}
        </div>
      )}

      <ConfirmDialog
        isOpen={isCloseDialogOpen}
        onClose={() => setIsCloseDialogOpen(false)}
        onConfirm={handleClose}
        title="Cerrar conversación"
        message="Esta conversación se marcará como resuelta y cerrada."
        confirmText="Cerrar conversación"
        cancelText="Cancelar"
        type="danger"
      />

      <div className="conversation-thread">
        {messages.length === 0 ? (
          <div className="empty-state--card">
            <p>No hay mensajes en esta conversación.</p>
          </div>
        ) : (
          messages.map(msg => {
            const isOwn = msg.autorUid === user?.uid;
            const createdLabel = formatDateTimeBuenosAires(msg.creadoAt) || '-';
            return (
              <div key={msg.id} className={`message-bubble ${isOwn ? 'message-bubble--own' : ''}`}>
                <div className="message-bubble__header">
                  <strong>{msg.autorDisplayName || (msg.autorRol === 'family' ? 'Familia' : 'Escuela')}</strong>
                  <span className="message-bubble__meta">
                    {createdLabel}
                    {getMsgReceipt(msg) && (
                      <span
                        className={`msg-receipt msg-receipt--${getMsgReceipt(msg)}`}
                        title={getMsgReceipt(msg) === 'read' ? 'Leído por la familia' : 'Enviado'}
                        aria-label={getMsgReceipt(msg) === 'read' ? 'Leído' : 'Enviado'}
                      >
                        <svg width="18" height="11" viewBox="0 0 18 11" fill="none" aria-hidden="true">
                          <path d="M1 5.5L4.5 9L10.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M7 5.5L10.5 9L16.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </span>
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

      <form className="conversation-composer conversation-composer--admin" onSubmit={handleSend}>
        <div className="conversation-composer__shell">
          <textarea
            className="conversation-composer__input"
            placeholder={isClosed ? 'Conversación cerrada' : 'Escribí tu respuesta...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            disabled={sending || isClosed}
          />
          <button
            className="conversation-composer__send"
            type="submit"
            disabled={sending || isClosed || (!text.trim() && !file)}
            aria-label={sending ? 'Enviando mensaje' : 'Enviar mensaje'}
            title={sending ? 'Enviando mensaje' : 'Enviar mensaje'}
          >
            <Icon name="send" size={18} />
          </button>
        </div>
        <div className="conversation-composer__attachment">
          <FileUploadSelector
            id="admin-conversation-file"
            multiple={false}
            onFilesSelected={(files) => setFile(Array.isArray(files) ? files[0] || null : null)}
            disabled={sending || isClosed}
            hint="Adjunto opcional"
          />
          {file && (
            <FileSelectionList files={[file]} onRemove={() => setFile(null)} />
          )}
        </div>
        {error && <div className="alert alert--error mt-sm">{error}</div>}
      </form>
    </div>
  );
}
