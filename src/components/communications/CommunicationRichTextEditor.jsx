import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import {
  normalizeCommunicationEditorValue,
  sanitizeCommunicationHtml,
} from '../../utils/communicationRichText';

function normalizeEditorText(text) {
  return String(text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function LinkSymbol() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.8 12.1h6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 4.75c1.7 1.9 2.7 4.45 2.7 7.25S13.7 17.35 12 19.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 4.75c-1.7 1.9-2.7 4.45-2.7 7.25S10.3 17.35 12 19.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ToolbarGroup({ children }) {
  return <div className="sc-editor__toolbar-group">{children}</div>;
}

function ToolbarButton({
  editor,
  label,
  symbol,
  onClick,
  isActive = false,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`sc-editor__toolbar-btn${isActive ? ' is-active' : ''}`}
      onClick={onClick}
      disabled={disabled || !editor}
      title={label}
      aria-label={label}
    >
      <span className="sc-editor__toolbar-symbol" aria-hidden="true">{symbol}</span>
      <span className="sc-editor__toolbar-label">{label}</span>
    </button>
  );
}

export function CommunicationRichTextEditor({
  value = '',
  disabled = false,
  error = '',
  onChange,
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [3],
        },
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: normalizeCommunicationEditorValue(value),
    onUpdate: ({ editor: currentEditor }) => {
      const html = sanitizeCommunicationHtml(currentEditor.getHTML());
      const text = normalizeEditorText(
        currentEditor.getText({ blockSeparator: '\n\n' })
      );
      onChange?.({ html, text });
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;

    const nextValue = normalizeCommunicationEditorValue(value);
    const currentValue = normalizeCommunicationEditorValue(editor.getHTML());
    if (nextValue === currentValue) return;

    editor.commands.setContent(nextValue, false);
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('Pega el enlace (http o https)', previousUrl);

    if (url === null) return;

    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('invalid-protocol');
      }

      editor.chain().focus().extendMarkRange('link').setLink({
        href: parsed.toString(),
        target: '_blank',
        rel: 'noopener noreferrer',
      }).run();
    } catch {
      window.alert('El enlace debe empezar con http:// o https://');
    }
  };

  return (
    <div className={`sc-editor${error ? ' sc-editor--error' : ''}`}>
      <div className="sc-editor__toolbar" role="toolbar" aria-label="Formato del comunicado">
        <ToolbarGroup>
          <ToolbarButton
            editor={editor}
            label="Parrafo"
            symbol="P"
            onClick={() => editor?.chain().focus().setParagraph().run()}
            isActive={editor?.isActive('paragraph')}
            disabled={disabled}
          />
          <ToolbarButton
            editor={editor}
            label="Titulo"
            symbol="T"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor?.isActive('heading', { level: 3 })}
            disabled={disabled}
          />
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            editor={editor}
            label="Negrita"
            symbol="N"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            isActive={editor?.isActive('bold')}
            disabled={disabled}
          />
          <ToolbarButton
            editor={editor}
            label="Cursiva"
            symbol="I"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            isActive={editor?.isActive('italic')}
            disabled={disabled}
          />
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            editor={editor}
            label="Lista"
            symbol="•"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            isActive={editor?.isActive('bulletList')}
            disabled={disabled}
          />
          <ToolbarButton
            editor={editor}
            label="Numerada"
            symbol="1."
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            isActive={editor?.isActive('orderedList')}
            disabled={disabled}
          />
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton
            editor={editor}
            label="Link"
            symbol={<LinkSymbol />}
            onClick={setLink}
            isActive={editor?.isActive('link')}
            disabled={disabled}
          />
          <ToolbarButton
            editor={editor}
            label="Limpiar"
            symbol="X"
            onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
            disabled={disabled}
          />
        </ToolbarGroup>
      </div>

      <EditorContent editor={editor} className="sc-editor__content" />

      <div className="sc-editor__footer">
        <span>Formato disponible: titulo, negrita, cursiva, listas y links.</span>
        {error ? <span className="form-error">{error}</span> : null}
      </div>
    </div>
  );
}
