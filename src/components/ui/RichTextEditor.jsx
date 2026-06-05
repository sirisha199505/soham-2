import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect, useCallback } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Code2,
  AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Undo2, Redo2, Minus,
} from 'lucide-react';

// ── Toolbar Button ────────────────────────────────────────────────────────────
function ToolBtn({ onClick, active, title, disabled, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded-lg transition-all text-sm
        ${active
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}
        ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Sep() {
  return <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />;
}

// ── RichTextEditor ────────────────────────────────────────────────────────────
export default function RichTextEditor({ value, onChange, placeholder = 'Write section content…', minHeight = 180 }) {
  const editor = useEditor({
    extensions: [
      // Newer @tiptap/starter-kit bundles its own link & underline extensions;
      // disable them here so our explicitly-configured ones below are the only
      // copy (otherwise tiptap warns about duplicate extension names).
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: false, underline: false }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-indigo-600 underline cursor-pointer' } }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-sm max-w-none',
        style: `min-height:${minHeight}px; padding: 14px 16px;`,
      },
    },
  });

  // Sync external value changes (e.g. when editing an existing page)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== undefined && value !== current) {
      editor.commands.setContent(value || '', false);
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url  = window.prompt('Enter URL', prev || 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50">

        {/* History */}
        <ToolBtn title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 size={14} />
        </ToolBtn>
        <ToolBtn title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 size={14} />
        </ToolBtn>

        <Sep />

        {/* Headings */}
        <ToolBtn title="Heading 1" active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 size={14} />
        </ToolBtn>
        <ToolBtn title="Heading 2" active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 size={14} />
        </ToolBtn>
        <ToolBtn title="Heading 3" active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 size={14} />
        </ToolBtn>

        <Sep />

        {/* Inline marks */}
        <ToolBtn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </ToolBtn>
        <ToolBtn title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={14} />
        </ToolBtn>
        <ToolBtn title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} />
        </ToolBtn>
        <ToolBtn title="Inline Code" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code size={14} />
        </ToolBtn>

        <Sep />

        {/* Lists */}
        <ToolBtn title="Bullet List" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolBtn>
        <ToolBtn title="Numbered List" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolBtn>

        <Sep />

        {/* Block */}
        <ToolBtn title="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote size={14} />
        </ToolBtn>
        <ToolBtn title="Code Block" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code2 size={14} />
        </ToolBtn>
        <ToolBtn title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus size={14} />
        </ToolBtn>

        <Sep />

        {/* Alignment */}
        <ToolBtn title="Align Left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft size={14} />
        </ToolBtn>
        <ToolBtn title="Align Center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter size={14} />
        </ToolBtn>
        <ToolBtn title="Align Right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight size={14} />
        </ToolBtn>

        <Sep />

        {/* Link */}
        <ToolBtn title="Insert / Edit Link" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon size={14} />
        </ToolBtn>
      </div>

      {/* ── Editor area ── */}
      <EditorContent editor={editor} />

      {/* ── Prose styles injected inline so they work without @tailwindcss/typography ── */}
      <style>{`
        .tiptap p { margin: 0 0 0.5em; line-height: 1.65; }
        .tiptap h1 { font-size: 1.4em; font-weight: 700; margin: 0.6em 0 0.3em; color: #1e293b; }
        .tiptap h2 { font-size: 1.2em; font-weight: 700; margin: 0.6em 0 0.3em; color: #1e293b; }
        .tiptap h3 { font-size: 1.05em; font-weight: 600; margin: 0.5em 0 0.25em; color: #334155; }
        .tiptap ul  { list-style: disc;    padding-left: 1.4em; margin: 0.4em 0; }
        .tiptap ol  { list-style: decimal; padding-left: 1.4em; margin: 0.4em 0; }
        .tiptap li  { margin: 0.15em 0; }
        .tiptap blockquote { border-left: 3px solid #6366f1; padding-left: 1em; color: #64748b; margin: 0.5em 0; font-style: italic; }
        .tiptap code { background: #f1f5f9; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.85em; font-family: monospace; color: #6366f1; }
        .tiptap pre  { background: #1e293b; color: #e2e8f0; padding: 1em; border-radius: 10px; overflow-x: auto; margin: 0.6em 0; }
        .tiptap pre code { background: none; padding: 0; color: inherit; font-size: 0.88em; }
        .tiptap hr   { border: none; border-top: 2px solid #e2e8f0; margin: 1em 0; }
        .tiptap p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; float: left; height: 0; }
      `}</style>
    </div>
  );
}
