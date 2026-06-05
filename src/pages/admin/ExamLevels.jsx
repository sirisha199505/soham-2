import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Edit2, CheckCircle, Lock, Users, Clock,
  BookOpen, X, Save, ToggleLeft, ToggleRight, Zap,
  Plus, Trash2, AlertCircle, Loader2, Layers,
} from 'lucide-react';
import { useLevel } from '../../context/LevelContext';
import { api } from '../../utils/api';
import { normalizeName, compareLevels, LEVEL_AUDIENCES } from '../../utils/helpers';

const DEFAULT_COLORS = [
  { from: '#3BC0EF', to: '#1E3A8A' },
  { from: '#8B5CF6', to: '#6d28d9' },
  { from: '#10B981', to: '#047857' },
  { from: '#F59E0B', to: '#D97706' },
  { from: '#EF4444', to: '#B91C1C' },
  { from: '#EC4899', to: '#BE185D' },
];
const levelColor = (order) => DEFAULT_COLORS[(order - 1) % DEFAULT_COLORS.length];

/* ── Add Level Modal ── */
function AddLevelModal({ onSave, onClose, existingTitles = [] }) {
  const [form, setForm] = useState({ title: '', subtitle: '', description: '', timeLimit: 10, questionCount: 20, audience: 'both' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    // Exam names must be globally unique (case/space/punctuation-insensitive).
    const norm = normalizeName(form.title);
    if (existingTitles.some(t => normalizeName(t) === norm)) {
      setError('An exam with this name already exists. Please use a unique exam name.');
      return;
    }
    if (!form.questionCount || Number(form.questionCount) < 1) { setError('Question count must be at least 1'); return; }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create level');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Add New Level</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Level Title <span className="text-red-400">*</span></label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Level 4, Advanced Robotics…"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Subtitle</label>
            <input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))}
              placeholder="Short description…"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Time Limit (minutes)</label>
              <input type="number" min="1" max="120" value={form.timeLimit}
                onChange={e => setForm(p => ({ ...p, timeLimit: Number(e.target.value) }))}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Questions per Quiz <span className="text-red-400">*</span></label>
              <input type="number" min="1" max="500" value={form.questionCount}
                onChange={e => setForm(p => ({ ...p, questionCount: e.target.value }))}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Access Control — who can take this level</label>
            <div className="grid grid-cols-1 gap-2">
              {LEVEL_AUDIENCES.map(opt => {
                const selected = (form.audience || 'both') === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setForm(p => ({ ...p, audience: opt.value }))}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 text-left transition-all ${
                      selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? 'border-indigo-500' : 'border-slate-300'}`}>
                      {selected && <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.label}</span>
                      <span className="block text-[11px] text-slate-400">{opt.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100 text-sm text-red-600">
              <AlertCircle size={14} />{error}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? 'Creating…' : 'Create Level'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Confirm Modal ── */
function DeleteModal({ level, onConfirm, onClose }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle size={18} className="text-red-500" />
            </div>
            <h3 className="font-bold text-slate-800">Delete {level?.title}?</h3>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            This will permanently delete <span className="font-semibold text-slate-700">{level?.title}</span> including all
            student progress and content for this level. This cannot be undone.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false); }}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors">
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Deleting…' : 'Delete Level'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Modal ── */
function EditModal({ levelId, settings, onSave, onClose, otherTitles = [] }) {
  const s = settings[levelId] || {};
  const [form, setForm] = useState({
    title:         s.title         || '',
    subtitle:      s.subtitle      || '',
    description:   s.description   || '',
    timeLimit:     s.timeLimit     ?? 10,
    questionCount: s.questionCount ?? 20,
    active:        s.active        ?? true,
    audience:      s.audience      || 'both',
  });
  const [error, setError] = useState('');
  const f = v => e => setForm(p => ({ ...p, [v]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    const norm = normalizeName(form.title);
    if (otherTitles.some(t => normalizeName(t) === norm)) {
      setError('An exam with this name already exists. Please use a unique exam name.');
      return;
    }
    onSave(levelId, form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            Edit Level Settings
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Level Title <span className="text-red-400">*</span></label>
            <input value={form.title} onChange={f('title')}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Subtitle</label>
            <input value={form.subtitle} onChange={f('subtitle')}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Description</label>
            <textarea value={form.description} onChange={f('description')} rows={3}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Time Limit (minutes)</label>
              <input type="number" min="1" max="120" value={form.timeLimit} onChange={f('timeLimit')}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Questions per Quiz <span className="text-red-400">*</span></label>
              <input type="number" min="1" max="500" value={form.questionCount} onChange={f('questionCount')}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Access Control — who can take this level</label>
            <div className="grid grid-cols-1 gap-2">
              {LEVEL_AUDIENCES.map(opt => {
                const selected = (form.audience || 'both') === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => setForm(p => ({ ...p, audience: opt.value }))}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 text-left transition-all ${
                      selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selected ? 'border-indigo-500' : 'border-slate-300'}`}>
                      {selected && <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.label}</span>
                      <span className="block text-[11px] text-slate-400">{opt.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-700">Level Active</p>
              <p className="text-xs text-slate-400">When off, no one can access this level</p>
            </div>
            <button onClick={() => setForm(p => ({ ...p, active: !p.active }))}
              className={`transition-colors ${form.active ? 'text-indigo-500' : 'text-slate-300'}`}>
              {form.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </label>
        </div>
        {error && (
          <div className="mx-6 mb-1 flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100 text-sm text-red-600">
            <AlertCircle size={14} />{error}
          </div>
        )}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={submit}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Level Card ── */
function LevelCard({ levelId, isFirst, settings, stats, onEdit, onDelete }) {
  const s = settings[levelId] || {};
  const color = levelColor(s.order || levelId);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="relative p-5 pb-4 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-[40px] bg-white" />
        <div className="relative z-10 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-0.5">
              {s.active ? 'Active' : 'Inactive'}
            </p>
            <h3 className="text-xl font-bold text-white truncate" style={{ fontFamily: 'Space Grotesk' }}>
              {s.title || `Level ${levelId}`}
            </h3>
            <p className="text-white/80 text-sm mt-0.5">{s.subtitle || ''}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.active ? 'bg-white/20 text-white' : 'bg-black/20 text-white/60'}`}>
              {s.active ? '● LIVE' : '○ OFF'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white whitespace-nowrap">
              {{ student: '👨‍🎓 Students', trainer: '🧑‍🏫 Trainers' }[s.audience] || '👥 Both'}
            </span>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-1.5 mt-3">
          {isFirst ? (
            <><Zap size={12} className="text-white/70" /><span className="text-white/60 text-xs">Admin must unlock for students/Trainers</span></>
          ) : (
            <><Lock size={12} className="text-white/70" /><span className="text-white/60 text-xs">Admin must unlock for students/Trainers</span></>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {s.description && (
          <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{s.description}</p>
        )}

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <BookOpen size={12} />, label: 'Questions',   val: `${s.questionCount ?? 20} Qs` },
            { icon: <Clock size={12} />,    label: 'Time Limit',  val: `${s.timeLimit ?? 10} min` },
            { icon: <Users size={12} />,    label: 'Completions', val: stats?.completed ?? 0 },
          ].map(m => (
            <div key={m.label} className="bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-slate-400 shrink-0">{m.icon}</span>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 truncate">{m.label}</p>
                <p className="text-xs font-bold text-slate-700">{m.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Question Bank mapping + availability (each exam level pulls ONLY from
            the QB level of the same name in the single Question Bank) */}
        {(() => {
          const required  = Number(s.questionCount ?? 20);
          const available = Number(s.availableQuestions ?? 0);
          const mapped    = s.mappedQbLevel;
          const ok = mapped && available >= required;
          return (
            <div className={`rounded-xl px-3 py-2.5 border text-xs ${ok ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-600 flex items-center gap-1.5"><Layers size={12} /> Question Bank Level</span>
                <span className={`font-bold ${mapped ? 'text-slate-700' : 'text-amber-600'}`}>{mapped || 'Not mapped'}</span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="text-slate-500">Questions available</span>
                <span className={`font-bold ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>{available} / {required}</span>
              </div>
              {!ok && (
                <p className="text-[11px] text-amber-600 mt-1 leading-snug">
                  {mapped
                    ? 'Insufficient questions — students cannot attempt this level until enough are added to this QB level.'
                    : 'No Question Bank level with this exact name. Add a QB level named the same to map it.'}
                </p>
              )}
            </div>
          );
        })()}

        <div className="flex gap-2">
          <button onClick={() => onEdit(levelId)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all">
            <Edit2 size={13} /> Edit Settings
          </button>
          <button onClick={() => onDelete(levelId)}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function ExamLevels() {
  const { user } = useAuth();
  const { setLevelActive, levelSettings, refreshLevelSettings, createLevel, deleteLevel } = useLevel();
  const [editing,     setEditing]    = useState(null);
  const [deletingId,  setDeletingId] = useState(null);
  const [showAdd,     setShowAdd]    = useState(false);
  const [saved,       setSaved]      = useState(false);
  const [levelStats,  setLevelStats] = useState({});
  const [, setLoading]               = useState(false);

  // Sorted level IDs from levelSettings
  const levelIds = Object.values(levelSettings)
    .sort(compareLevels)
    .map(l => l.id);

  useEffect(() => {
    if (!user?.id) return;
    api.getStudents().then(students => {
      const totals = {};
      students.forEach(student => {
        Object.entries(student.levels || {}).forEach(([lid, lp]) => {
          const id = Number(lid);
          if (!totals[id]) totals[id] = { completed: 0, scoreSum: 0 };
          if (lp?.status === 'completed') {
            totals[id].completed++;
            totals[id].scoreSum += (lp.score || 0);
          }
        });
      });
      const stats = {};
      Object.entries(totals).forEach(([lid, { completed, scoreSum }]) => {
        stats[Number(lid)] = { completed, avg: completed > 0 ? Math.round(scoreSum / completed) : 0 };
      });
      setLevelStats(stats);
    }).catch(() => {});
  }, [user?.id]);  

  const handleSave = async (levelId, form) => {
    await setLevelActive(levelId, {
      title:         form.title,
      subtitle:      form.subtitle,
      description:   form.description,
      timeLimit:     Number(form.timeLimit) || 10,
      questionCount: Number(form.questionCount) || 20,
      active:        form.active,
      audience:      form.audience || 'both',
    });
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCreate = async (form) => {
    setLoading(true);
    try {
      await createLevel({
        title:         form.title,
        subtitle:      form.subtitle,
        description:   form.description,
        timeLimit:     Number(form.timeLimit) || 10,
        questionCount: Number(form.questionCount) || 20,
        audience:      form.audience || 'both',
      });

      // Auto-sync: create a matching QB level so the Question Bank stays in step
      try {
        const banks = await api.getQuestionBanks().catch(() => []);
        let bankId = Array.isArray(banks) && banks.length > 0 ? banks[0].id : null;
        if (!bankId) {
          const newBank = await api.createQuestionBank({ name: 'Main Question Bank' });
          bankId = newBank?.id;
        }
        if (bankId) {
          await api.createQbLevel({ bankId, name: form.title });
        }
      } catch { /* QB sync failure is non-fatal */ }

      await refreshLevelSettings();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (levelId) => {
    try {
      await deleteLevel(levelId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setDeletingId(null);
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {saved && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg">
          <CheckCircle size={14} /> Changes saved!
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Exam Level Management</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configure and manage the sequential exam system</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus size={16} /> Add Level
        </button>
      </div>

      {/* Level cards */}
      {levelIds.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <Layers size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-400">No levels yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Create exam levels to get started</p>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
            <Plus size={15} /> Add First Level
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {levelIds.map((levelId, i) => (
            <LevelCard
              key={levelId}
              levelId={levelId}
              isFirst={i === 0}
              settings={levelSettings}
              stats={levelStats[levelId]}
              onEdit={setEditing}
              onDelete={setDeletingId}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditModal
          levelId={editing}
          settings={levelSettings}
          onSave={handleSave}
          onClose={() => setEditing(null)}
          otherTitles={levelIds.filter(id => id !== editing).map(id => levelSettings[id]?.title || '')}
        />
      )}

      {showAdd && (
        <AddLevelModal
          onSave={handleCreate}
          onClose={() => setShowAdd(false)}
          existingTitles={levelIds.map(id => levelSettings[id]?.title || '')}
        />
      )}

      {deletingId && (
        <DeleteModal
          level={levelSettings[deletingId]}
          onConfirm={() => handleDelete(deletingId)}
          onClose={() => setDeletingId(null)}
        />
      )}
    </div>
  );
}
