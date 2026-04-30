import { useState } from 'react';
import {
  Layers, Edit2, CheckCircle, Lock, Users, Clock,
  Target, BookOpen, X, Save, ToggleLeft, ToggleRight,
  ChevronRight, Zap, Unlock, AlertTriangle, Globe,
} from 'lucide-react';
import { LEVELS } from '../../utils/levelData';
import { loadQuestionBank } from '../../utils/questionBank';
import { useLevel } from '../../context/LevelContext';

const SETTINGS_KEY     = 'rqa_level_settings';
const GLOBAL_ACCESS_KEY = 'rqa_global_level_access';

function loadGlobalAccess() {
  try { return JSON.parse(localStorage.getItem(GLOBAL_ACCESS_KEY) || '{}'); }
  catch { return {}; }
}
function saveGlobalAccess(g) {
  localStorage.setItem(GLOBAL_ACCESS_KEY, JSON.stringify(g));
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return LEVELS.reduce((acc, l) => {
      acc[l.id] = {
        title: l.title,
        subtitle: l.subtitle,
        description: l.description,
        timeLimit: 10,
        passingMark: 50,
        active: true,
        ...saved[l.id],
      };
      return acc;
    }, {});
  } catch { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function getLevelStats(levelId) {
  const progress = JSON.parse(localStorage.getItem('rqa_level_progress') || '{}');
  let completed = 0, passed = 0, scores = [];
  Object.values(progress).forEach(p => {
    if (p[levelId]?.status === 'completed') {
      completed++;
      const pct = p[levelId].score?.pct;
      if (pct !== undefined) { scores.push(pct); if (pct >= 50) passed++; }
    }
  });
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  return { completed, passed, avg };
}

/* ── Edit Modal ── */
function EditModal({ levelId, settings, onSave, onClose }) {
  const [form, setForm] = useState({ ...settings[levelId] });
  const f = v => e => setForm(p => ({ ...p, [v]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            Edit Level {levelId} Settings
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Level Title</label>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Time Limit (minutes)</label>
              <input type="number" min="1" max="60" value={form.timeLimit} onChange={f('timeLimit')}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Passing Mark (%)</label>
              <input type="number" min="1" max="100" value={form.passingMark} onChange={f('passingMark')}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
            </div>
          </div>

          <label className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-700">Level Active</p>
              <p className="text-xs text-slate-400">Students can access and take this level</p>
            </div>
            <button onClick={() => setForm(p => ({ ...p, active: !p.active }))}
              className={`transition-colors ${form.active ? 'text-indigo-500' : 'text-slate-300'}`}>
              {form.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </label>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => onSave(levelId, form)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Level Card ── */
function LevelCard({ level, settings, stats, globalAccess, onEdit }) {
  const s = settings[level.id];
  const bank   = loadQuestionBank();
  const qCount = Object.values(bank).flat().filter(q => q.status === 'active').length;
  const isGlobalOpen = level.id !== 1 && globalAccess[level.id] === true;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden
      ${isGlobalOpen ? 'border-amber-200 ring-1 ring-amber-200' : 'border-slate-100'}`}>
      {/* Gradient header */}
      <div className="relative p-5 pb-4 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})` }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-[40px] bg-white" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-0.5">
              {s?.active ? 'Active' : 'Inactive'}
            </p>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>{s?.title || level.title}</h3>
            <p className="text-white/80 text-sm mt-0.5">{s?.subtitle || level.subtitle}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold
              ${s?.active ? 'bg-white/20 text-white' : 'bg-black/20 text-white/60'}`}>
              {s?.active ? '● LIVE' : '○ OFF'}
            </div>
            {isGlobalOpen && (
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/30 text-white">
                ⚡ OPEN ALL
              </div>
            )}
          </div>
        </div>

        {/* Unlock chain */}
        <div className="relative z-10 flex items-center gap-1.5 mt-3">
          {level.id === 1 ? (
            <><Zap size={12} className="text-white/70" /><span className="text-white/60 text-xs">Unlocked by default</span></>
          ) : isGlobalOpen ? (
            <><Unlock size={12} className="text-white/70" /><span className="text-white/60 text-xs">Globally open — all students can access</span></>
          ) : (
            <><Lock size={12} className="text-white/70" /><span className="text-white/60 text-xs">Unlocks after Level {level.id - 1}</span></>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{s?.description || level.description}</p>

        {/* Config grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <BookOpen size={12} />, label: 'Question Bank', val: `${qCount} active` },
            { icon: <Clock size={12} />,    label: 'Time Limit', val: `${s?.timeLimit ?? 10} min` },
            { icon: <Target size={12} />,   label: 'Pass Mark',  val: `${s?.passingMark ?? 50}%` },
            { icon: <Users size={12} />,    label: 'Completions', val: stats.completed },
          ].map(m => (
            <div key={m.label} className="bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-slate-400">{m.icon}</span>
              <div>
                <p className="text-[10px] text-slate-400">{m.label}</p>
                <p className="text-xs font-bold text-slate-700">{m.val}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats row */}
        {stats.completed > 0 && (
          <div className="flex gap-3 text-center bg-slate-50 rounded-xl px-4 py-3">
            <div className="flex-1">
              <p className="text-lg font-bold text-green-600" style={{ fontFamily: 'Space Grotesk' }}>{stats.passed}</p>
              <p className="text-[10px] text-slate-400">Passed</p>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="flex-1">
              <p className="text-lg font-bold text-red-500" style={{ fontFamily: 'Space Grotesk' }}>{stats.completed - stats.passed}</p>
              <p className="text-[10px] text-slate-400">Failed</p>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="flex-1">
              <p className="text-lg font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>{stats.avg}%</p>
              <p className="text-[10px] text-slate-400">Avg Score</p>
            </div>
          </div>
        )}

        {/* Edit button */}
        <button onClick={() => onEdit(level.id)}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all">
          <Edit2 size={13} /> Edit Settings
        </button>
      </div>
    </div>
  );
}

/* ── Global Access Toggle Row ── */
function GlobalAccessRow({ levelId, label, globalAccess, onToggle }) {
  const isOpen = globalAccess[levelId] === true;
  return (
    <div className={`flex items-center justify-between rounded-2xl px-5 py-4 border transition-all
      ${isOpen
        ? 'bg-amber-50 border-amber-200'
        : 'bg-white border-slate-100'}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
          ${isOpen ? 'bg-amber-100' : 'bg-slate-100'}`}>
          {isOpen
            ? <Unlock size={15} className="text-amber-600" />
            : <Lock   size={15} className="text-slate-400" />}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">{label}</p>
          {isOpen ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <AlertTriangle size={11} className="text-amber-500" />
              <p className="text-xs text-amber-700 font-semibold">
                Open for ALL students — sequential requirement bypassed
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">
              Students must complete the previous level to unlock
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => onToggle(levelId)}
        className={`flex-shrink-0 transition-colors ${isOpen ? 'text-amber-500' : 'text-slate-300'}`}
        title={isOpen ? 'Click to lock' : 'Click to open for all students'}
      >
        {isOpen ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
      </button>
    </div>
  );
}

/* ── MAIN ── */
export default function ExamLevels() {
  const { setLevelActive, setGlobalAccess: ctxSetGlobalAccess } = useLevel();
  const [settings, setSettings] = useState(loadSettings);
  const [globalAccess, setLocalGlobalAccess] = useState(loadGlobalAccess);
  const [editing, setEditing] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSave = (levelId, form) => {
    const next = { ...settings, [levelId]: form };
    setSettings(next);
    saveSettings(next);
    setLevelActive(levelId, form.active);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGlobalToggle = (levelId) => {
    const newVal = !globalAccess[levelId];
    const next = { ...globalAccess, [levelId]: newVal };
    setLocalGlobalAccess(next);
    saveGlobalAccess(next);
    ctxSetGlobalAccess(levelId, newVal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const stats = LEVELS.reduce((acc, l) => { acc[l.id] = getLevelStats(l.id); return acc; }, {});
  const anyOpen = globalAccess[2] || globalAccess[3];

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* Toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg">
          <CheckCircle size={14} /> Settings saved!
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Exam Level Management</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configure and manage the 3-level sequential exam system</p>
      </div>

      {/* Global Access Control */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className={`px-5 py-4 border-b flex items-center justify-between
          ${anyOpen ? 'bg-amber-50 border-amber-100' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <Globe size={16} className={anyOpen ? 'text-amber-600' : 'text-slate-500'} />
            <h2 className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Space Grotesk' }}>
              Global Level Access Control
            </h2>
            {anyOpen && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                OVERRIDES ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Override sequential unlock for all students at once
          </p>
        </div>
        <div className="p-4 space-y-3">
          <GlobalAccessRow
            levelId={2}
            label="Level 2 — Open for All Students"
            globalAccess={globalAccess}
            onToggle={handleGlobalToggle}
          />
          <GlobalAccessRow
            levelId={3}
            label="Level 3 — Open for All Students"
            globalAccess={globalAccess}
            onToggle={handleGlobalToggle}
          />
          {anyOpen && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
              <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>Warning:</strong> Globally opened levels allow all students to start that level regardless of whether they passed the previous one. Turn off the toggle to restore the normal sequential unlock requirement.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Unlock chain info */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
            <Zap size={14} className="text-indigo-500" /> Level 1
          </div>
          <ChevronRight size={14} className="text-indigo-300" />
          <div className={`flex items-center gap-2 text-sm ${globalAccess[2] ? 'text-amber-600 font-semibold' : 'text-indigo-600'}`}>
            {globalAccess[2] ? <Unlock size={12} /> : <Lock size={12} />}
            Level 2 {globalAccess[2] ? '(open for all)' : '(after L1)'}
          </div>
          <ChevronRight size={14} className="text-indigo-300" />
          <div className={`flex items-center gap-2 text-sm ${globalAccess[3] ? 'text-amber-600 font-semibold' : 'text-indigo-600'}`}>
            {globalAccess[3] ? <Unlock size={12} /> : <Lock size={12} />}
            Level 3 {globalAccess[3] ? '(open for all)' : '(after L2)'}
          </div>
          <span className="ml-auto text-xs text-indigo-500">
            {anyOpen ? 'Some levels have global overrides active' : 'Students unlock levels by completing the previous one'}
          </span>
        </div>
      </div>

      {/* Level cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {LEVELS.map(level => (
          <LevelCard
            key={level.id}
            level={level}
            settings={settings}
            stats={stats[level.id]}
            globalAccess={globalAccess}
            onEdit={setEditing}
          />
        ))}
      </div>

      {editing && (
        <EditModal
          levelId={editing}
          settings={settings}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
