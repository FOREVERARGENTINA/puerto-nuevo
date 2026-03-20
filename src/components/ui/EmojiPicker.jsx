import { useEffect, useRef, useState } from 'react';

const EMOJIS = [
  '😊','😂','❤️','👍','🙏','😭','🎉','👏','🥰','😅',
  '🤔','😍','✨','💪','🌟','👋','🙌','💬','😘','🤗',
  '😎','🥳','😁','💯','🔥','👌','🤝','😢','😆','🙂',
  '😴','🤦','🙈','💕','🌈','☀️','🍀','⭐','🎈','🤣',
];

export function EmojiPicker({ onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="emoji-picker" ref={ref}>
      <button
        type="button"
        className="btn btn--ghost emoji-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Insertar emoji"
        title="Emojis"
      >
        😊
      </button>

      {open && (
        <div className="emoji-picker__panel" role="dialog" aria-label="Selector de emojis">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="emoji-picker__btn"
              onClick={() => { onSelect(emoji); setOpen(false); }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
