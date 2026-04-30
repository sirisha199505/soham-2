import { useState, useMemo, useRef } from 'react';
import {
  HelpCircle, Plus, Edit2, Trash2, Search, X, Save,
  CheckCircle, Image as ImageIcon, AlertTriangle, RotateCcw,
  ShieldCheck, BookOpen, ChevronDown, ChevronUp, Copy,
} from 'lucide-react';
import { LEVELS } from '../../utils/levelData';
import {
  loadAllAdminQuestions,
  setLevelQuestions,
  resetLevelToDefaults,
} from '../../utils/adminQuestions';

/* ── constants ── */
const TYPE_LABELS  = { mcq: 'MCQ', tf: 'True / False' };
const DIFF_COLOR   = { easy: '#10B981', medium: '#F59E0B', hard: '#EF4444' };
const DIFF_BG      = { easy: '#f0fdf4', medium: '#fffbeb', hard: '#fef2f2' };
const LEVEL_COLORS = { 1: { from: '#3BC0EF', to: '#1E3A8A' }, 2: { from: '#8B5CF6', to: '#6d28d9' }, 3: { from: '#10B981', to: '#047857' } };

/* ── blank form ── */
const blank = () => ({
  type: 'mcq',
  difficulty: 'easy',
  text: '',
  options: ['', '', '', ''],
  correct: 0,
  image: '',
});

/* ── Question Modal ── */
function QuestionModal({ levelId, question, onSave, onClose }) {
  const [form, setForm] = useState(
    question
      ? { ...question, options: [...(question.options || ['', '', '', ''])] }
      : blank()
  );
  const fileRef = useRef();
  const isEdit = !!question;
  const lc = LEVEL_COLORS[levelId];

  const handleImage = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(p => ({ ...p, image: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const valid = form.text.trim() &&
    (form.type === 'tf' || form.options.filter(o => o.trim()).length >= 2);

  const handleSave = () => {
    if (!valid) return;
    const q = {
      ...form,
      id: question?.id || `aq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      options: form.type === 'tf' ? ['True', 'False'] : form.options.map(o => o.trim()),
      correct: Number(form.correct),
    };
    onSave(q, isEdit);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 shrink-0"
          style={{ background: `linear-gradient(135deg, ${lc.from}12, ${lc.to}06)` }}>
          <div className="w-8 h-8 rounded-xl text-white flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: `linear-gradient(135deg, ${lc.from}, ${lc.to})` }}>
            {isEdit ? <Edit2 size={14} /> : <Plus size={14} />}
          </div>
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            {isEdit ? 'Edit Question' : 'Add New Question'} — Level {levelId}
          </h3>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">

          {/* Type + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Question Type</label>
              <div className="flex gap-2">
                {['mcq', 'tf'].map(t => (
                  <button key={t} onClick={() => setForm(p => ({ ...p, type: t, correct: 0 }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      form.type === t ? 'text-white border-transparent' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                    style={form.type === t ? { background: `linear-gradient(135deg, ${lc.from}, ${lc.to})` } : {}}>
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Difficulty</label>
              <div className="flex gap-1.5">
                {['easy', 'medium', 'hard'].map(d => (
                  <button key={d} onClick={() => setForm(p => ({ ...p, difficulty: d }))}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold border-2 capitalize transition-all ${
                      form.difficulty === d ? 'border-transparent text-white' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                    style={form.difficulty === d ? { background: DIFF_COLOR[d] } : {}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Question text */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
              Question Text <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.text}
              onChange={e => setForm(p => ({ ...p, text: e.target.value }))}
              rows={3}
              placeholder="Type the question here…"
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none"
            />
          </div>

          {/* MCQ options */}
          {form.type === 'mcq' && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
                Answer Options — click circle to mark correct
              </label>
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <button
                      onClick={() => setForm(p => ({ ...p, correct: i }))}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                        form.correct === i
                          ? 'border-transparent text-white'
                          : 'border-slate-200 hover:border-green-300 text-slate-400'
                      }`}
                      style={form.correct === i ? { background: DIFF_COLOR.easy } : {}}
                    >
                      {form.correct === i
                        ? <CheckCircle size={14} className="text-white" />
                        : <span className="text-xs font-bold">{String.fromCharCode(65 + i)}</span>}
                    </button>
                    <input
                      value={opt}
                      onChange={e => {
                        const opts = [...form.options];
                        opts[i] = e.target.value;
                        setForm(p => ({ ...p, options: opts }));
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className={`flex-1 px-3.5 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all ${
                        form.correct === i
                          ? 'bg-green-50 border-green-300 font-semibold text-green-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    />
                    {form.correct === i && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full shrink-0">
                        Correct
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* T/F correct */}
          {form.type === 'tf' && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">Correct Answer</label>
              <div className="flex gap-3">
                {['True', 'False'].map((v, i) => (
                  <button key={v} onClick={() => setForm(p => ({ ...p, correct: i }))}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                      form.correct === i
                        ? 'text-white border-transparent shadow-sm'
                        : 'border-slate-200 text-slate-500 bg-slate-50 hover:bg-slate-100'
                    }`}
                    style={form.correct === i ? { background: `linear-gradient(135deg, ${lc.from}, ${lc.to})` } : {}}>
                    {v} {form.correct === i && '✓'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Image upload */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-2">
              Question Image <span className="text-slate-300">(optional)</span>
            </label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            {form.image ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
                <img src={form.image} alt="preview" className="w-full max-h-40 object-cover" />
                <button
                  onClick={() => setForm(p => ({ ...p, image: '' }))}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-5 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center gap-1.5 text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors"
              >
                <ImageIcon size={20} />
                <span className="text-xs font-semibold">Click to upload image</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50/50">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${lc.from}, ${lc.to})` }}
          >
            <Save size={14} /> {isEdit ? 'Update Question' : 'Add Question'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete confirm ── */
function DeleteModal({ question, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <h3 className="font-bold text-slate-800">Delete Question?</h3>
        </div>
        <p className="text-sm text-slate-500 mb-1 line-clamp-2 italic">"{question?.text}"</p>
        <p className="text-xs text-red-400 mb-5">This cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ── Reset confirm ── */
function ResetModal({ levelId, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <RotateCcw size={18} className="text-amber-500" />
          </div>
          <h3 className="font-bold text-slate-800">Reset Level {levelId}?</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5">
          All custom edits will be discarded and Level {levelId} questions will be restored to the original built-in set.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors">Reset</button>
        </div>
      </div>
    </div>
  );
}

/* ── Difficulty badge ── */
function DiffBadge({ d }) {
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize"
      style={{ background: DIFF_BG[d], color: DIFF_COLOR[d] }}>
      {d}
    </span>
  );
}

/* ── Stats bar ── */
function StatsBar({ questions, levelId }) {
  const lc = LEVEL_COLORS[levelId];
  const counts = { easy: 0, medium: 0, hard: 0, mcq: 0, tf: 0 };
  questions.forEach(q => {
    counts[q.difficulty]++;
    counts[q.type === 'tf' ? 'tf' : 'mcq']++;
  });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {[
        { label: 'Total',  value: questions.length, color: lc.from },
        { label: 'Easy',   value: counts.easy,   color: DIFF_COLOR.easy },
        { label: 'Medium', value: counts.medium, color: DIFF_COLOR.medium },
        { label: 'Hard',   value: counts.hard,   color: DIFF_COLOR.hard },
        { label: 'MCQ',    value: counts.mcq,    color: '#4F46E5' },
      ].map(s => (
        <div key={s.label} className="bg-white rounded-xl border border-slate-100 px-3 py-2 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase">{s.label}</p>
          </div>
          <div className="w-1.5 h-6 rounded-full" style={{ background: s.color }} />
        </div>
      ))}
    </div>
  );
}

/* ── MAIN ── */
export default function QuestionManagement() {
  const [banks, setBanks]       = useState(() => loadAllAdminQuestions());
  const [activeLevel, setActive] = useState(1);
  const [search, setSearch]     = useState('');
  const [diffFilter, setDiff]   = useState('all');
  const [typeFilter, setType]   = useState('all');
  const [showAdd, setShowAdd]   = useState(false);
  const [editQ, setEditQ]       = useState(null);
  const [deleteQ, setDeleteQ]   = useState(null);
  const [resetLvl, setResetLvl] = useState(null);
  const [toast, setToast]       = useState('');
  const [expanded, setExpanded] = useState({});

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const questions = banks[activeLevel] || [];

  const filtered = useMemo(() => questions.filter(q => {
    const ms = !search || q.text.toLowerCase().includes(search.toLowerCase());
    const md = diffFilter === 'all' || q.difficulty === diffFilter;
    const mt = typeFilter === 'all' || q.type === typeFilter;
    return ms && md && mt;
  }), [questions, search, diffFilter, typeFilter]);

  /* ── CRUD helpers ── */
  const save = (lvl, qs) => {
    setBanks(p => ({ ...p, [lvl]: qs }));
    setLevelQuestions(lvl, qs);
  };

  const handleSave = (q, isEdit) => {
    const qs = isEdit
      ? questions.map(x => x.id === q.id ? q : x)
      : [...questions, q];
    save(activeLevel, qs);
    setShowAdd(false); setEditQ(null);
    showToast(isEdit ? `Question updated` : `Question added to Level ${activeLevel}`);
  };

  const handleDelete = () => {
    save(activeLevel, questions.filter(q => q.id !== deleteQ.id));
    setDeleteQ(null);
    showToast('Question deleted');
  };

  const handleReset = () => {
    resetLevelToDefaults(resetLvl);
    setBanks(loadAllAdminQuestions());
    setResetLvl(null);
    showToast(`Level ${resetLvl} reset to defaults`);
  };

  const handleDuplicate = q => {
    const copy = { ...q, id: `aq_copy_${Date.now()}`, text: q.text + ' (copy)' };
    save(activeLevel, [...questions, copy]);
    showToast('Question duplicated');
  };

  const toggleExpand = id => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-5">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg">
          <CheckCircle size={14} /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck size={18} className="text-indigo-500" />
            <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
              Question Bank
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            All questions are admin-managed. Students see only what you set here.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${LEVEL_COLORS[activeLevel].from}, ${LEVEL_COLORS[activeLevel].to})` }}
        >
          <Plus size={15} /> Add Question
        </button>
      </div>

      {/* Level tabs */}
      <div className="flex gap-2 flex-wrap">
        {LEVELS.map(l => {
          const lc = LEVEL_COLORS[l.id];
          const cnt = (banks[l.id] || []).length;
          const active = activeLevel === l.id;
          return (
            <button key={l.id} onClick={() => { setActive(l.id); setSearch(''); setDiff('all'); setType('all'); }}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                active ? 'text-white border-transparent shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              style={active ? { background: `linear-gradient(135deg, ${lc.from}, ${lc.to})` } : {}}>
              <BookOpen size={14} />
              {l.title}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stats */}
      <StatsBar questions={questions} levelId={activeLevel} />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search questions…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-4 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 w-44" />
          </div>
          {/* Diff filter */}
          <div className="flex gap-1">
            {['all', 'easy', 'medium', 'hard'].map(d => (
              <button key={d} onClick={() => setDiff(d)}
                className={`px-3 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                  diffFilter === d ? 'text-white border-transparent' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
                style={diffFilter === d && d !== 'all' ? { background: DIFF_COLOR[d] } :
                       diffFilter === d ? { background: '#4F46E5' } : {}}>
                {d === 'all' ? 'All' : d}
              </button>
            ))}
          </div>
          {/* Type filter */}
          <div className="flex gap-1">
            {['all', 'mcq', 'tf'].map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border capitalize transition-all ${
                  typeFilter === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}>
                {t === 'all' ? 'All Types' : TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Reset to defaults */}
        <button onClick={() => setResetLvl(activeLevel)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-amber-600 bg-amber-50 text-xs font-bold hover:bg-amber-100 transition-colors shrink-0">
          <RotateCcw size={12} /> Reset Level {activeLevel}
        </button>
      </div>

      {/* Source badge */}
      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">
        <ShieldCheck size={13} className="text-indigo-500 shrink-0" />
        <p className="text-xs text-indigo-700 font-medium">
          <span className="font-bold">Admin-controlled:</span> Questions shown to students in Level {activeLevel} quiz come exclusively from this bank ({questions.length} questions loaded).
        </p>
      </div>

      {/* Questions list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-700">
            {filtered.length} question{filtered.length !== 1 ? 's' : ''}
            {(search || diffFilter !== 'all' || typeFilter !== 'all') && (
              <span className="text-slate-400 font-normal"> (filtered)</span>
            )}
          </p>
          <p className="text-xs text-slate-400">Level {activeLevel} · Admin Question Bank</p>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <HelpCircle size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-500 font-semibold">No questions found</p>
            <p className="text-slate-400 text-sm mt-1">
              {questions.length === 0
                ? `Level ${activeLevel} has no questions. Add some or reset to defaults.`
                : 'Try adjusting your filters.'}
            </p>
            {questions.length === 0 && (
              <button onClick={() => setResetLvl(activeLevel)}
                className="mt-4 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold hover:bg-amber-100 transition-colors">
                Reset to Defaults
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((q, i) => {
              const isExp = expanded[q.id];
              const lc = LEVEL_COLORS[activeLevel];
              return (
                <div key={q.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Row */}
                  <div className="flex items-center gap-3 px-5 py-4">
                    {/* Number */}
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ background: `linear-gradient(135deg, ${lc.from}, ${lc.to})` }}>
                      {i + 1}
                    </div>

                    {/* Question text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{q.text}</p>
                      {q.image && <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-0.5"><ImageIcon size={10} /> has image</span>}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700">
                        {TYPE_LABELS[q.type]}
                      </span>
                      <DiffBadge d={q.difficulty} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleExpand(q.id)} title="Preview"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => handleDuplicate(q)} title="Duplicate"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 transition-colors">
                        <Copy size={13} />
                      </button>
                      <button onClick={() => setEditQ(q)} title="Edit"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteQ(q)} title="Delete"
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded preview */}
                  {isExp && (
                    <div className="px-5 pb-4 ml-10">
                      {q.image && (
                        <img src={q.image} alt="" className="w-full max-h-32 object-cover rounded-xl mb-3 border border-slate-200" />
                      )}
                      <div className={`grid gap-2 ${q.type === 'tf' ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
                        {q.options.map((opt, oi) => (
                          <div key={oi}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${
                              q.correct === oi
                                ? 'border-transparent text-white font-bold'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                            style={q.correct === oi ? { background: `linear-gradient(135deg, ${lc.from}, ${lc.to})` } : {}}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                              q.correct === oi ? 'bg-white/25 text-white' : 'bg-white border border-slate-300 text-slate-400'
                            }`}>
                              {q.correct === oi ? '✓' : String.fromCharCode(65 + oi)}
                            </span>
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd  && <QuestionModal levelId={activeLevel} question={null}  onSave={handleSave} onClose={() => setShowAdd(false)} />}
      {editQ    && <QuestionModal levelId={activeLevel} question={editQ} onSave={handleSave} onClose={() => setEditQ(null)} />}
      {deleteQ  && <DeleteModal question={deleteQ} onConfirm={handleDelete} onClose={() => setDeleteQ(null)} />}
      {resetLvl && <ResetModal levelId={resetLvl} onConfirm={handleReset} onClose={() => setResetLvl(null)} />}
    </div>
  );
}
