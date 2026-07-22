import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  FileText, Plus, Edit2, Trash2, X, Save, CheckCircle,
  BookOpen, ChevronDown, ChevronUp, Info, Upload, Eye, Loader2,
  AlertTriangle, Video,
} from 'lucide-react';
import { useLevel } from '../../context/LevelContext';
import { api } from '../../utils/api';
import { compareLevels, isYouTubeUrl, youtubeEmbedUrl } from '../../utils/helpers';
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

/* ── Add Level Modal ── */
function AddLevelModal({ onSave, onClose, saving }) {
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState(10);
  // Time limit must be a positive whole number of minutes (1–180). Negative/zero
  // and out-of-range values are rejected as the user types.
  const canSave = title.trim().length > 0 && Number(timeLimit) >= 1 && !saving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Add New Level</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Level Title <span className="text-red-400">*</span></label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canSave && onSave({ title: title.trim(), timeLimit })}
              placeholder="e.g. Advanced Robotics"
              autoFocus
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Time Limit (minutes)</label>
            <input
              type="number"
              min={1}
              max={180}
              step={1}
              value={timeLimit}
              onChange={e => {
                const v = e.target.value;
                if (v === '') { setTimeLimit(''); return; }   // allow clearing to retype
                const n = Math.floor(Number(v));
                if (Number.isNaN(n)) return;
                setTimeLimit(Math.max(1, Math.min(180, n)));  // clamp — no negatives/zero
              }}
              onBlur={() => { if (Number(timeLimit) < 1) setTimeLimit(1); }}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => canSave && onSave({ title: title.trim(), timeLimit })}
            disabled={!canSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add Level
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Level Confirm Modal ── */
function DeleteLevelModal({ levelTitle, pageCount, onConfirm, onClose, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
            <AlertTriangle size={22} className="text-red-500" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg" style={{ fontFamily: 'Space Grotesk' }}>Delete Level?</h3>
          <p className="text-sm text-slate-500">
            This will permanently delete <span className="font-semibold text-slate-700">"{levelTitle}"</span>
            {pageCount > 0 && <> and its <span className="font-semibold text-slate-700">{pageCount} content page{pageCount !== 1 ? 's' : ''}</span></>}.
            This action cannot be undone.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Level Section ── */
function LevelSection({ levelId, levelTitle, levelOrder, pages, expanded, onToggle, onEdit, onDelete, onAdd, onDeleteLevel }) {
  const colors = levelColors(levelOrder);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="relative p-5 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${colors.from}15, ${colors.to}08)`, borderBottom: `1px solid ${colors.from}20` }}>
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{levelTitle || `Level ${levelId}`}</h3>
            <p className="text-xs text-slate-500">{pages.length} content</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onAdd(levelId)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
            style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}>
            <Plus size={12} /> Add
          </button>
          <button onClick={() => onDeleteLevel(levelId, levelTitle, pages.length)}
            className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
            title="Delete level">
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
              <p className="text-xs text-slate-300 mt-0.5">Students will go directly to the quiz</p>
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
  const { user } = useAuth();
  const { levelSettings, levelSettingsLoaded, createLevel, deleteLevel } = useLevel();
  const [content, setContent] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  // Accordion: only one level open at a time. `undefined` = not yet initialised
  // (defaults to the first level once levels load); `null` = all collapsed.
  const [openLevelId, setOpenLevelId] = useState(undefined);

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  // Sorted levels from LevelContext
  const sortedLevels = Object.values(levelSettings)
    .sort(compareLevels);

  // Open the first level by default, once levels are available.
  useEffect(() => {
    if (openLevelId === undefined && sortedLevels.length) setOpenLevelId(sortedLevels[0].id);
  }, [openLevelId, sortedLevels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!user?.id || !levelSettingsLoaded) return;
    if (sortedLevels.length === 0) { setLoading(false); return; }
    setLoading(true);
    Promise.all(sortedLevels.map(l => api.getContent(l.id)))
      .then(results => {
        const map = {};
        sortedLevels.forEach((l, i) => { map[l.id] = results[i] || []; });
        setContent(map);
      })
      .catch(err => console.error('Failed to load content:', err))
      .finally(() => setLoading(false));
  }, [user?.id, levelSettingsLoaded, sortedLevels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const persistLevel = async (levelId, pages) => {
    try {
      await api.saveContent(levelId, pages);
      return true;
    } catch (err) {
      console.error('Failed to save content:', err);
      showToast('Save failed — check connection');
      return false;
    }
  };

  const handleSave = async (levelId, form, pageIdx) => {
    const next = { ...content };
    if (pageIdx !== null && pageIdx !== undefined && pageIdx >= 0) {
      const pages = [...(next[levelId] || [])];
      pages[pageIdx] = { ...pages[pageIdx], ...form };
      next[levelId] = pages;
    } else {
      next[levelId] = [...(next[levelId] || []), { page: (next[levelId]?.length || 0) + 1, ...form }];
    }
    setContent(next);
    const saved = await persistLevel(levelId, next[levelId]);
    setModal(null);
    if (saved) showToast('Content page saved');
  };

  const handleDelete = async (levelId, idx) => {
    const next = { ...content };
    next[levelId] = next[levelId].filter((_, i) => i !== idx);
    setContent(next);
    const saved = await persistLevel(levelId, next[levelId]);
    if (saved) showToast('Page deleted');
  };

  const handleAddLevel = async (data) => {
    setSaving(true);
    try {
      const newLevel = await createLevel(data);
      setContent(prev => ({ ...prev, [newLevel.id]: [] }));
      setModal(null);
      showToast(`Level "${newLevel.title}" added`);
    } catch (err) {
      showToast(err.message || 'Failed to add level');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLevel = async () => {
    if (!modal?.levelId) return;
    setSaving(true);
    try {
      await deleteLevel(modal.levelId);
      setContent(prev => { const next = { ...prev }; delete next[modal.levelId]; return next; });
      setModal(null);
      showToast('Level deleted');
    } catch (err) {
      showToast(err.message || 'Failed to delete level');
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
          <p className="text-sm text-slate-400 mt-0.5">Manage study material for each exam level</p>
        </div>
        <button
          onClick={() => setModal({ type: 'addLevel' })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus size={15} /> Add Level
        </button>
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
        {sortedLevels.map((lvl, idx) => (
          <LevelSection
            key={lvl.id}
            levelId={lvl.id}
            levelTitle={lvl.title || `Level ${lvl.id}`}
            levelOrder={idx + 1}
            pages={content[lvl.id] || []}
            expanded={openLevelId === lvl.id}
            onToggle={() => setOpenLevelId(cur => cur === lvl.id ? null : lvl.id)}
            onAdd={levelId => setModal({ type: 'add', levelId })}
            onEdit={(levelId, page, pageIdx) => setModal({ type: 'edit', levelId, page, pageIdx })}
            onDelete={handleDelete}
            onDeleteLevel={(levelId, levelTitle, pageCount) =>
              setModal({ type: 'deleteLevel', levelId, levelTitle, pageCount })}
          />
        ))}
        {sortedLevels.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <BookOpen size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">No levels configured yet</p>
            <p className="text-xs text-slate-300 mt-1">Click "Add Level" above to create your first level</p>
          </div>
        )}
      </div>

      {modal?.type === 'add'  && <PageModal levelId={modal.levelId} page={null}       pageIdx={null}           onSave={handleSave} onClose={() => setModal(null)} />}
      {modal?.type === 'edit' && <PageModal levelId={modal.levelId} page={modal.page} pageIdx={modal.pageIdx}   onSave={handleSave} onClose={() => setModal(null)} />}
      {modal?.type === 'addLevel' && (
        <AddLevelModal saving={saving} onSave={handleAddLevel} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'deleteLevel' && (
        <DeleteLevelModal
          levelTitle={modal.levelTitle}
          pageCount={modal.pageCount}
          saving={saving}
          onConfirm={handleDeleteLevel}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
