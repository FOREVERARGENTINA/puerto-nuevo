import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../hooks/useAuth';
import { useDirectMessageThread } from '../../hooks/useDirectMessages';
import { directMessagesService } from '../../services/directMessages.service';
import Avatar from '../../components/ui/Avatar';
import { EmojiPicker } from '../../components/ui/EmojiPicker';

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  return null;
}

function isMessageReadByOther(msg, thread, otherUid) {
  const readTs = thread?.lastReadAt?.[otherUid];
  if (!readTs || !msg?.createdAt) return false;
  const msgMs = typeof msg.createdAt?.toMillis === 'function' ? msg.createdAt.toMillis() : null;
  const readMs = typeof readTs?.toMillis === 'function' ? readTs.toMillis() : null;
  if (!msgMs || !readMs) return false;
  return msgMs <= readMs;
}

function MessageTicks({ read }) {
  const color = read ? '#53bdeb' : 'rgba(255,255,255,0.55)';
  return (
    <svg
      viewBox="0 0 16 11"
      width="16"
      height="11"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
      aria-hidden="true"
    >
      <polyline points="1,6 4.5,9.5 10,2" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="5,6 8.5,9.5 15,2" stroke={color} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatTime(value) {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function DirectMessageThread() {
  const { convId } = useParams();
  const { user } = useAuth();
  const { messages, loading } = useDirectMessageThread(convId);

  const [thread, setThread] = useState(null);
  const [otherName, setOtherName] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [otherAllowsMessages, setOtherAllowsMessages] = useState(true);
  const [otherPhotoUrl, setOtherPhotoUrl] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Derivar otherUid directamente del convId, sin depender del documento cargado.
  // convId siempre tiene la forma "uidMenor_uidMayor" (sort lexicografico).
  const otherUid = (() => {
    if (!convId || !user?.uid) return null;
    const idx = convId.indexOf('_');
    if (idx < 0) return null;
    const part1 = convId.slice(0, idx);
    const part2 = convId.slice(idx + 1);
    return part1 === user.uid ? part2 : part1;
  })();

  // Suscripcion en tiempo real al documento del hilo (P2 + refleja bloqueo remoto)
  useEffect(() => {
    if (!convId || !user?.uid) return;
    return onSnapshot(
      doc(db, 'directMessages', convId),
      (snap) => setThread(snap.exists() ? { id: snap.id, ...snap.data() } : null),
      () => setThread(null)
    );
  }, [convId, user?.uid]);

  // Cargar nombre del otro participante
  useEffect(() => {
    if (!otherUid) return;
    let mounted = true;
    getDoc(doc(db, 'users', otherUid)).then((snap) => {
      if (mounted && snap.exists()) {
        setOtherName(snap.data().displayName || 'Familia');
      }
    });
    return () => { mounted = false; };
  }, [otherUid]);

  // Suscripcion en tiempo real al perfil social del otro (allowMessages + foto)
  useEffect(() => {
    if (!otherUid) return;
    return onSnapshot(
      doc(db, 'socialProfiles', otherUid),
      (snap) => {
        const data = snap.exists() ? snap.data() : {};
        setOtherAllowsMessages(data.allowMessages !== false);
        setOtherPhotoUrl(data.photoUrl || null);
      },
      () => { setOtherAllowsMessages(true); setOtherPhotoUrl(null); }
    );
  }, [otherUid]);

  // Marcar leido al abrir el hilo y cada vez que lleguen mensajes nuevos mientras esta abierto
  const myUnreadCount = thread?.unreadCount?.[user?.uid] ?? 0;
  useEffect(() => {
    if (convId && user?.uid && thread && myUnreadCount > 0) {
      directMessagesService.markThreadRead(convId, user.uid);
    }
  }, [convId, user?.uid, thread?.id, myUnreadCount]);

  // Scroll al ultimo mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isBlocked = thread?.status === 'blocked';

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !otherUid || !otherAllowsMessages) return;
    setSending(true);
    setError('');

    // Si el hilo no existe aun, crearlo atomicamente con el primer mensaje
    const result = thread
      ? await directMessagesService.sendMessage({
          convId,
          myUid: user.uid,
          myName: user.displayName || '',
          text: trimmed
        })
      : await directMessagesService.startThreadWithFirstMessage({
          myUid: user.uid,
          myName: user.displayName || '',
          otherUid,
          otherName,
          text: trimmed
        });

    setSending(false);
    if (result.success) {
      setText('');
    } else {
      setError('No se pudo enviar el mensaje. Intenta de nuevo.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBlock = async () => {
    await directMessagesService.blockThread(convId, user.uid);
    setShowBlockConfirm(false);
    // El onSnapshot actualiza thread automaticamente
  };

  const handleUnblock = async () => {
    if (thread?.blockedBy !== user.uid) return;
    await directMessagesService.unblockThread(convId);
    // El onSnapshot actualiza thread automaticamente
  };

  const handleEmojiSelect = (emoji) => {
    const el = textareaRef.current;
    if (!el) { setText((v) => v + emoji); return; }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    // Restaurar el cursor justo despues del emoji insertado
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const composerDisabledReason = isBlocked
    ? 'Esta conversacion esta bloqueada.'
    : !otherAllowsMessages
    ? 'Esta familia ya no acepta mensajes nuevos.'
    : null;

  return (
    <div className="container page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div
        className="dashboard-header dashboard-header--compact"
        style={{ flexShrink: 0, flexWrap: 'nowrap', alignItems: 'center' }}
      >
        {/* Izquierda: avatar + nombre */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: 0 }}>
          <Avatar name={otherName} photoUrl={otherPhotoUrl} size={36} />
          <div style={{ minWidth: 0 }}>
            <h1
              className="dashboard-title"
              style={{ fontSize: 'var(--font-size-md)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {otherName || 'Cargando...'}
            </h1>
            {isBlocked && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error)' }}>
                Bloqueada
              </span>
            )}
          </div>
        </div>

        {/* Derecha: acciones de bloqueo */}
        <div style={{ flexShrink: 0 }}>
          {!isBlocked && (
            !showBlockConfirm ? (
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setShowBlockConfirm(true)}
                style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}
              >
                Bloquear
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', whiteSpace: 'nowrap' }}>¿Bloquear?</span>
                <button className="btn btn--danger btn--sm" onClick={handleBlock}>Sí</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setShowBlockConfirm(false)}>No</button>
              </div>
            )
          )}
          {isBlocked && thread?.blockedBy === user?.uid && (
            <button className="btn btn--secondary btn--sm" onClick={handleUnblock}>
              Desbloquear
            </button>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)'
        }}
      >
        {loading ? (
          <div className="card" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
            <div className="card__body" style={{ padding: 'var(--spacing-xl) 0' }}>
              <div className="documents-loading-state documents-loading-state--inline" role="status" aria-live="polite">
                <span className="documents-loading-state__icon" aria-hidden="true">...</span>
                <div className="documents-loading-state__body">
                  <p className="documents-loading-state__title">Cargando conversación</p>
                  <p className="documents-loading-state__hint">Sincronizando mensajes en tiempo real.</p>
                </div>
                <span className="documents-loading-state__bar" aria-hidden="true" />
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            Comenza la conversacion.
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.authorUid === user?.uid;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '72%',
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: isMe ? 'var(--color-primary)' : 'var(--color-surface-secondary)',
                    color: isMe ? '#fff' : 'var(--color-text)',
                    fontSize: 'var(--font-size-sm)',
                    wordBreak: 'break-word'
                  }}
                >
                  <p style={{ margin: 0 }}>{msg.text}</p>
                  <span style={{ fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, marginTop: 2 }}>
                    <span style={{ opacity: 0.7 }}>{formatTime(msg.createdAt)}</span>
                    {isMe && <MessageTicks read={isMessageReadByOther(msg, thread, otherUid)} />}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="dm-composer">
        {composerDisabledReason ? (
          <p className="dm-composer__disabled">{composerDisabledReason}</p>
        ) : (
          <>
            {error && <p className="dm-composer__error">{error}</p>}
            <div className="dm-composer__bar">
              {/* Iconos izquierda */}
              <div className="dm-composer__left">
                <EmojiPicker onSelect={handleEmojiSelect} />
              </div>

              {/* Input */}
              <textarea
                ref={textareaRef}
                className="dm-composer__input"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mensaje..."
                rows={1}
                maxLength={2000}
                disabled={sending}
              />

              {/* Botón enviar */}
              <button
                className="dm-composer__send"
                onClick={handleSend}
                disabled={!text.trim() || sending}
                aria-label="Enviar"
              >
                {sending
                  ? <div className="spinner spinner--sm" />
                  : <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
