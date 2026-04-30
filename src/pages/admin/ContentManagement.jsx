import { useState, useRef } from 'react';
import {
  FileText, Plus, Edit2, Trash2, X, Save, CheckCircle,
  BookOpen, ChevronDown, ChevronUp, Info, Upload, Eye,
} from 'lucide-react';
import { LEVEL1_PAGES, LEVEL2_PAGES, LEVEL3_PAGES, LEVELS } from '../../utils/levelData';

const CONTENT_KEY = 'rqa_custom_content';

const DEFAULT_PAGES = {
  1: LEVEL1_PAGES,
  2: LEVEL2_PAGES,
  3: LEVEL3_PAGES,
};

function deepClone(pages) {
  return pages.map(p => ({ ...p, sections: p.sections.map(s => ({ ...s })) }));
}

function loadContent() {
  try {
    const saved = JSON.parse(localStorage.getItem(CONTENT_KEY) || '{}');
    return {
      1: saved[1] || deepClone(DEFAULT_PAGES[1]),
      2: saved[2] || deepClone(DEFAULT_PAGES[2]),
      3: saved[3] || deepClone(DEFAULT_PAGES[3]),
    };
  } catch {
    return {
      1: deepClone(DEFAULT_PAGES[1]),
      2: deepClone(DEFAULT_PAGES[2]),
      3: deepClone(DEFAULT_PAGES[3]),
    };
  }
}

function saveContent(d) { localStorage.setItem(CONTENT_KEY, JSON.stringify(d)); }

const LEVEL_COLORS = {
  1: { from: '#3BC0EF', to: '#1E3A8A' },
  2: { from: '#8B5CF6', to: '#6d28d9' },
  3: { from: '#10B981', to: '#047857' },
};

/* ── Section Editor ── */
function SectionEditor({ sections, onChange }) {
  const add = () => onChange([...sections, { heading: '', body: '' }]);
  const remove = i => onChange(sections.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const next = [...sections];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {sections.map((sec, i) => (
        <div key={i} className="bg-slate-50 rounded-xl p-4 space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Section {i + 1}</span>
            <button onClick={() => remove(i)} className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
              <X size={13} />
            </button>
          </div>
          <input value={sec.heading} onChange={e => update(i, 'heading', e.target.value)}
            placeholder="Section heading…"
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          <textarea value={sec.body} onChange={e => update(i, 'body', e.target.value)}
            placeholder="Section body… (use **bold** for emphasis)"
            rows={4}
            className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
        </div>
      ))}
      <button onClick={add}
        className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-semibold text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors flex items-center justify-center gap-1.5">
        <Plus size={13} /> Add Section
      </button>
    </div>
  );
}

/* ── Page Modal ── */
function PageModal({ levelId, page, onSave, onClose }) {
  const [form, setForm] = useState(page
    ? {
        title:   page.title,
        type:    page.type || 'text',
        sections:(page.sections || []).map(s => ({ ...s })),
        pdfData: page.pdfData || '',
        pdfName: page.pdfName || '',
      }
    : { title: '', type: 'text', sections: [{ heading: '', body: '' }], pdfData: '', pdfName: '' });
  const [pdfDrag, setPdfDrag] = useState(false);

  const processPdf = (file) => {
    if (!file || file.type !== 'application/pdf') return;
    const reader = new FileReader();
    reader.onload = e => setForm(p => ({ ...p, pdfData: e.target.result, pdfName: file.name }));
    reader.readAsDataURL(file);
  };

  const canSave = form.title.trim() && (form.type === 'text' || form.pdfData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            {page ? 'Edit Content Page' : 'Add Content Page'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Page Title <span className="text-red-400">*</span></label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. What is Robotics?"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>

          {/* Content type tab */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">Content Type</label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {[{ key: 'text', label: '📝 Text Content' }, { key: 'pdf', label: '📄 Upload PDF' }].map(tab => (
                <button key={tab.key} onClick={() => setForm(p => ({ ...p, type: tab.key }))}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${form.type === tab.key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text content */}
          {form.type === 'text' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">Content Sections</label>
              <SectionEditor sections={form.sections} onChange={secs => setForm(p => ({ ...p, sections: secs }))} />
            </div>
          )}

          {/* PDF upload */}
          {form.type === 'pdf' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">PDF File <span className="text-red-400">*</span></label>
              {form.pdfData ? (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <FileText size={22} className="text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{form.pdfName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">PDF ready · click Preview to verify</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => window.open(form.pdfData, '_blank')}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                      <Eye size={12} /> Preview
                    </button>
                    <button onClick={() => setForm(p => ({ ...p, pdfData: '', pdfName: '' }))}
                      className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  onDragOver={e => { e.preventDefault(); setPdfDrag(true); }}
                  onDragLeave={() => setPdfDrag(false)}
                  onDrop={e => { e.preventDefault(); setPdfDrag(false); processPdf(e.dataTransfer.files[0]); }}
                  className={`block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${pdfDrag ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}>
                  <Upload size={30} className={`mx-auto mb-2 ${pdfDrag ? 'text-indigo-500' : 'text-slate-300'}`} />
                  <p className="text-sm font-semibold text-slate-600">Drop your PDF here</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse · PDF files only</p>
                  <input type="file" accept=".pdf,application/pdf" className="hidden"
                    onChange={e => processPdf(e.target.files[0])} />
                </label>
              )}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => canSave && onSave(levelId, form, page)}
            disabled={!canSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <Save size={14} /> Save Page
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Level Section ── */
function LevelSection({ levelId, pages, onEdit, onDelete, onAdd }) {
  const [expanded, setExpanded] = useState(levelId === 1);
  const level = LEVELS.find(l => l.id === levelId);
  const colors = LEVEL_COLORS[levelId];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="relative p-5 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${colors.from}15, ${colors.to}08)`, borderBottom: `1px solid ${colors.from}20` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
            {levelId}
          </div>
          <div>
            <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{level?.title}</h3>
            <p className="text-xs text-slate-500">{pages.length} content page{pages.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onAdd(levelId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
            <Plus size={12} /> Add Page
          </button>
          <button onClick={() => setExpanded(p => !p)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Pages list */}
      {expanded && (
        <div className="p-4 space-y-3">
          {pages.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <FileText size={28} className="text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No content pages yet</p>
              <p className="text-xs text-slate-300 mt-0.5">Students will go directly to the quiz</p>
            </div>
          ) : pages.map((pg, i) => (
            <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{pg.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{pg.sections?.length || 0} section{pg.sections?.length !== 1 ? 's' : ''}</p>
                {pg.sections?.slice(0, 2).map((s, si) => (
                  <p key={si} className="text-xs text-slate-400 truncate mt-0.5">· {s.heading}</p>
                ))}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEdit(levelId, pg, i)} className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => onDelete(levelId, i)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── MAIN ── */
export default function ContentManagement() {
  const [content, setContent] = useState(loadContent);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleSave = (levelId, form, existingPage) => {
    const next = { ...content };
    if (existingPage !== null && existingPage !== undefined) {
      const idx = next[levelId].findIndex(p => p.title === existingPage.title);
      if (idx >= 0) next[levelId][idx] = { ...existingPage, ...form };
      else next[levelId].push({ page: next[levelId].length + 1, ...form });
    } else {
      next[levelId] = [...(next[levelId] || []), { page: (next[levelId]?.length || 0) + 1, ...form }];
    }
    setContent(next);
    saveContent(next);
    setModal(null);
    showToast('Content page saved');
  };

  const handleDelete = (levelId, idx) => {
    const next = { ...content };
    next[levelId] = next[levelId].filter((_, i) => i !== idx);
    setContent(next);
    saveContent(next);
    showToast('Page deleted');
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-5">

      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg">
          <CheckCircle size={14} /> {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Content Management</h1>
        <p className="text-sm text-slate-400 mt-0.5">Manage study material for each exam level</p>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0" />
        <p className="text-xs text-blue-700">
          Students read content pages before taking the quiz for each level. Edit or delete pages here — changes are reflected immediately for students. If all pages for a level are deleted, students go directly to the quiz.
        </p>
      </div>

      {/* Level sections */}
      <div className="space-y-4">
        {[1, 2, 3].map(lvl => (
          <LevelSection
            key={lvl}
            levelId={lvl}
            pages={content[lvl] || []}
            onAdd={levelId => setModal({ type: 'add', levelId })}
            onEdit={(levelId, page) => setModal({ type: 'edit', levelId, page })}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {modal?.type === 'add'  && <PageModal levelId={modal.levelId} page={null}       onSave={handleSave} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <PageModal levelId={modal.levelId} page={modal.page} onSave={handleSave} onClose={() => setModal(null)} />}
    </div>
  );
}
