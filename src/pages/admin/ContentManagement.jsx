import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileText, Plus, Edit2, Trash2, X, Save, CheckCircle,
  BookOpen, ChevronDown, ChevronUp, Info, Upload, Eye, Loader2,
  AlertTriangle, Video,
} from 'lucide-react';
import { api } from '../../utils/api';
import { isYouTubeUrl, youtubeEmbedUrl } from '../../utils/helpers';
import RichTextEditor from '../../components/ui/RichTextEditor';

const PALETTE = [
  { from: '#3BC0EF', to: '#1E3A8A' },
  { from: '#8B5CF6', to: '#6d28d9' },
  { from: '#10B981', to: '#047857' },
  { from: '#F59E0B', to: '#D97706' },
  { from: '#EF4444', to: '#B91C1C' },
  { from: '#EC4899', to: '#BE185D' },
];
const levelColors = (order) => PALETTE[(order - 1) % PALETTE.length];

/* ── Section Editor ── */
function SectionEditor({ sections, onChange, errors = [] }) {
  const add = () => onChange([...sections, { heading: '', body: '' }]);
  const remove = i => onChange(sections.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const next = [...sections];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {sections.map((sec, i) => (
        <div key={i} className="bg-slate-50 rounded-xl p-4 space-y-3 relative border border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Section {i + 1}</span>
            <button onClick={() => remove(i)} className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
              <X size={13} />
            </button>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Heading</label>
            <input value={sec.heading} onChange={e => update(i, 'heading', e.target.value)}
              placeholder="Section heading…"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Body <span className="text-red-400">*</span></label>
            <div className={errors.includes(i) ? 'rounded-xl ring-2 ring-red-300' : ''}>
              <RichTextEditor
                value={sec.body}
                onChange={val => update(i, 'body', val)}
                placeholder="Write section content — use the toolbar for headings, bold, lists, links…"
                minHeight={160}
              />
            </div>
            {errors.includes(i) && <p className="text-[11px] text-red-500 mt-1">Body content is required.</p>}
          </div>
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
function PageModal({ levelId, page, pageIdx, onSave, onClose }) {
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  // Indices of sections whose Body is empty (flagged on a failed save attempt).
  const [sectionErrors, setSectionErrors] = useState([]);

  // A rich-text body counts as empty when it has no text once tags/&nbsp; are stripped.
  const isEmptyBody = (html) => !html || !String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, '').trim();

  const processPdf = async (file) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const { id, presignedUrl, url } = await api.getPresignedUrl(file.name, file.type);
      await api.uploadToS3(presignedUrl, file);
      await api.confirmUpload(id);
      setForm(p => ({ ...p, pdfData: url, pdfName: file.name }));
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            {page ? 'Edit Content' : 'Add Content'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Title <span className="text-red-400">*</span></label>
            <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setSaveMsg(''); }}
              placeholder="e.g. What is Robotics?"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>

          {/* Content type tab */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">Content Type</label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              {[{ key: 'text', label: '📝 Text Content' }, { key: 'pdf', label: '📄 Upload PDF' }, { key: 'video', label: '🎬 Video Link' }].map(tab => (
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
              <SectionEditor sections={form.sections} errors={sectionErrors}
                onChange={secs => { setForm(p => ({ ...p, sections: secs })); setSaveMsg(''); setSectionErrors([]); }} />
            </div>
          )}

          {/* PDF upload */}
          {form.type === 'pdf' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">PDF / Image File <span className="text-red-400">*</span></label>
              {uploading ? (
                <div className="flex items-center justify-center gap-3 border-2 border-dashed border-indigo-200 bg-indigo-50 rounded-2xl py-10">
                  <Loader2 size={22} className="animate-spin text-indigo-500" />
                  <span className="text-sm font-semibold text-indigo-600">Uploading to cloud…</span>
                </div>
              ) : form.pdfData ? (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <FileText size={22} className="text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{form.pdfName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Uploaded · click Preview to verify</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => {
                      if (form.pdfData.startsWith('http')) {
                        window.open(form.pdfData, '_blank');
                        return;
                      }
                      try {
                        const arr  = form.pdfData.split(',');
                        const mime = arr[0].match(/:(.*?);/)[1];
                        const bstr = atob(arr[1]);
                        const u8   = new Uint8Array(bstr.length);
                        for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
                        const blobUrl = URL.createObjectURL(new Blob([u8], { type: mime }));
                        window.open(blobUrl, '_blank');
                      } catch { window.open(form.pdfData, '_blank'); }
                    }}
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
                  <p className="text-sm font-semibold text-slate-600">Drop your file here</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse · images, PDFs accepted</p>
                  <input type="file" accept="*/*" className="hidden"
                    onChange={e => processPdf(e.target.files[0])} />
                </label>
              )}
              {uploadError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={11} /> {uploadError}
                </p>
              )}
            </div>
          )}

          {/* Video link — the URL is stored in pdfData (reuses the existing
              column; content_type 'video' distinguishes it). Students see an
              embedded player plus a link that opens in a new tab. */}
          {form.type === 'video' && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                YouTube Video Link <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Video size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" />
                <input value={form.pdfData}
                  onChange={e => { setForm(p => ({ ...p, pdfData: e.target.value, pdfName: 'Video' })); setSaveMsg(''); }}
                  placeholder="https://www.youtube.com/watch?v=…"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              </div>
              {form.pdfData?.trim() && !isYouTubeUrl(form.pdfData) && (
                <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={11} /> Not a recognised YouTube link — it will be saved as a clickable link (no inline player).
                </p>
              )}
              {youtubeEmbedUrl(form.pdfData) && (
                <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 bg-black aspect-video">
                  <iframe src={youtubeEmbedUrl(form.pdfData)} title="Video preview"
                    className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen />
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-2">
                Students & trainers will see this video embedded on the content page, with a link to open it in a new tab.
              </p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-red-500">{saveMsg}</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
            <button
              onClick={() => {
                if (!form.title.trim())                        { setSaveMsg('Please add a title name.'); return; }
                if (form.type === 'pdf' && !form.pdfData)      { setSaveMsg('Please add PDF / image content.'); return; }
                if (form.type === 'video') {
                  const u = (form.pdfData || '').trim();
                  if (!u)                          { setSaveMsg('Please add a YouTube video link.'); return; }
                  if (!/^https?:\/\//i.test(u))    { setSaveMsg('Enter a valid link starting with http:// or https://'); return; }
                }
                if (form.type === 'text') {
                  const bad = form.sections.reduce((acc, s, i) => (isEmptyBody(s.body) ? [...acc, i] : acc), []);
                  if (bad.length) {
                    setSectionErrors(bad);
                    setSaveMsg(`Body is required — fill section ${bad.map(i => i + 1).join(', ')}.`);
                    return;
                  }
                }
                if (uploading) return;
                const clean = form.type === 'video' ? { ...form, pdfData: form.pdfData.trim() } : form;
                onSave(levelId, clean, pageIdx);
              }}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Add Content Level Modal (title only — NOT an exam level) ── */
function AddTopicModal({ onSave, onClose, saving }) {
  const [title, setTitle] = useState('');
  const canSave = title.trim().length > 0 && !saving;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Add Content Level</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-3">
          <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Title <span className="text-red-400">*</span></label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && canSave && onSave(title.trim())}
            placeholder="e.g. Introduction to Robotics"
            autoFocus
            className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
          <p className="text-[11px] text-slate-400">
            This is a content-only section. It is <span className="font-semibold">not</span> an exam level and creates no question bank.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => canSave && onSave(title.trim())} disabled={!canSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Content Level Confirm Modal ── */
function DeleteTopicModal({ title, pageCount, onConfirm, onClose, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg" style={{ fontFamily: 'Space Grotesk' }}>Delete "{title}"?</h3>
          <p className="text-sm text-slate-500">
            This removes this content level{pageCount > 0 && <> and its <span className="font-semibold text-slate-700">{pageCount} page{pageCount !== 1 ? 's' : ''}</span></>}.
            {' '}It does <span className="font-semibold text-slate-700">not</span> affect any exam level or question bank.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Content Topic Section ── */
function TopicSection({ topic, order, expanded, onToggle, onEdit, onDeletePage, onAddPage, onDeleteTopic }) {
  const colors = levelColors(order);
  const pages = topic.pages || [];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="relative p-5 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${colors.from}15, ${colors.to}08)`, borderBottom: `1px solid ${colors.from}20` }}>
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{topic.title}</h3>
            <p className="text-xs text-slate-500">{pages.length} content</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onAddPage(topic.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
            <Plus size={12} /> Add
          </button>
          {/* Delete this content level — content only; never touches exam levels/QB. */}
          <button onClick={() => onDeleteTopic(topic)}
            className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
            title="Delete content level">
            <Trash2 size={15} />
          </button>
          <button onClick={onToggle} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
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
              <p className="text-sm text-slate-400">No content yet</p>
              <p className="text-xs text-slate-300 mt-0.5">Click "Add" to create a page for students to read</p>
            </div>
          ) : pages.map((pg, i) => (
            <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl p-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{pg.title}</p>
                {pg.type === 'video' ? (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">🎬 Video link · <span className="text-indigo-500">{pg.pdfData}</span></p>
                ) : pg.type === 'pdf' ? (
                  <p className="text-xs text-slate-400 mt-0.5 truncate">📄 {pg.pdfName || 'PDF / file'}</p>
                ) : (
                  <>
                    <p className="text-xs text-slate-400 mt-0.5">{pg.sections?.length || 0} section{pg.sections?.length !== 1 ? 's' : ''}</p>
                    {pg.sections?.slice(0, 2).map((s, si) => (
                      <p key={si} className="text-xs text-slate-400 truncate mt-0.5">· {s.heading}</p>
                    ))}
                  </>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => onEdit(topic.id, pg, i)} className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                  <Edit2 size={13} />
                </button>
                <button onClick={() => onDeletePage(topic.id, i)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
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
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  // Accordion: only one topic open at a time.
  const [openId, setOpenId] = useState(null);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api.getContentTopics()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setTopics(list);
        setOpenId(cur => cur ?? (list[0]?.id ?? null));
      })
      .catch(err => console.error('Failed to load content topics:', err))
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Persist a topic's pages to the backend (content only — never touches exam/QB).
  const persistTopic = async (topicId, pages) => {
    try {
      await api.saveContentTopic(topicId, pages);
      return true;
    } catch (err) {
      console.error('Failed to save content:', err);
      showToast('Save failed — check connection');
      return false;
    }
  };

  const handleSavePage = async (topicId, form, pageIdx) => {
    let nextPages;
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      const pages = [...(t.pages || [])];
      if (pageIdx !== null && pageIdx !== undefined && pageIdx >= 0) {
        pages[pageIdx] = { ...pages[pageIdx], ...form };
      } else {
        pages.push({ page: pages.length + 1, ...form });
      }
      nextPages = pages;
      return { ...t, pages };
    }));
    const saved = await persistTopic(topicId, nextPages || []);
    setModal(null);
    if (saved) showToast('Content page saved');
  };

  const handleDeletePage = async (topicId, idx) => {
    let nextPages;
    setTopics(prev => prev.map(t => {
      if (t.id !== topicId) return t;
      nextPages = (t.pages || []).filter((_, i) => i !== idx);
      return { ...t, pages: nextPages };
    }));
    const saved = await persistTopic(topicId, nextPages || []);
    if (saved) showToast('Page deleted');
  };

  const handleAddTopic = async (title) => {
    setSaving(true);
    try {
      const created = await api.createContentTopic(title);
      setTopics(prev => [...prev, { ...created, pages: created.pages || [] }]);
      setOpenId(created.id);
      setModal(null);
      showToast(`"${created.title}" added`);
    } catch (err) {
      showToast(err.message || 'Failed to add content level');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTopic = async () => {
    const t = modal?.topic;
    if (!t) return;
    setSaving(true);
    try {
      await api.deleteContentTopic(t.id);
      setTopics(prev => prev.filter(x => x.id !== t.id));
      setModal(null);
      showToast('Content level deleted');
    } catch (err) {
      showToast(err.message || 'Failed to delete content level');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-5">

      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg">
          <CheckCircle size={14} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-30 -mt-6 py-4 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Content Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Standalone study material — independent of exam levels &amp; question banks</p>
        </div>
        <button
          onClick={() => setModal({ type: 'addTopic' })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus size={15} /> Add Level
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <Info size={14} className="text-blue-500 shrink-0" />
        <p className="text-xs text-blue-700">
          Add content levels and pages here for students to read anytime. Adding or deleting here does <span className="font-semibold">not</span> affect any exam level or question bank.
        </p>
      </div>

      {/* Topic sections */}
      <div className="space-y-4">
        {topics.map((topic, idx) => (
          <TopicSection
            key={topic.id}
            topic={topic}
            order={idx + 1}
            expanded={openId === topic.id}
            onToggle={() => setOpenId(cur => cur === topic.id ? null : topic.id)}
            onAddPage={topicId => setModal({ type: 'add', topicId })}
            onEdit={(topicId, page, pageIdx) => setModal({ type: 'edit', topicId, page, pageIdx })}
            onDeletePage={handleDeletePage}
            onDeleteTopic={topic => setModal({ type: 'deleteTopic', topic })}
          />
        ))}
        {topics.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <BookOpen size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">No content levels yet</p>
            <p className="text-xs text-slate-300 mt-1">Click "Add Level" above to create your first content level</p>
          </div>
        )}
      </div>

      {modal?.type === 'add'  && <PageModal levelId={modal.topicId} page={null}       pageIdx={null}         onSave={handleSavePage} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <PageModal levelId={modal.topicId} page={modal.page} pageIdx={modal.pageIdx} onSave={handleSavePage} onClose={() => setModal(null)} />}
      {modal?.type === 'addTopic' && (
        <AddTopicModal saving={saving} onSave={handleAddTopic} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'deleteTopic' && (
        <DeleteTopicModal title={modal.topic.title} pageCount={(modal.topic.pages || []).length}
          saving={saving} onConfirm={handleDeleteTopic} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
