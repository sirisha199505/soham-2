import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Layers, Edit2, CheckCircle, Lock, Users, Clock,
  BookOpen, X, Save, ToggleLeft, ToggleRight, Zap,
} from 'lucide-react';
import { LEVELS } from '../../utils/levelData';
import { loadQuestionBank, CATEGORY_META } from '../../utils/questionBank';
import { TOTAL_QUIZ_QUESTIONS } from '../../utils/quizGenerator';
import { useLevel } from '../../context/LevelContext';

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
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase block mb-1.5">Time Limit (minutes)</label>
              <input type="number" min="1" max="60" value={form.timeLimit} onChange={f('timeLimit')}
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
function LevelCard({ level, settings, stats, onEdit }) {
  const s = settings[level.id];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold
            ${s?.active ? 'bg-white/20 text-white' : 'bg-black/20 text-white/60'}`}>
            {s?.active ? '● LIVE' : '○ OFF'}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-1.5 mt-3">
          {level.id === 1 ? (
            <><Zap size={12} className="text-white/70" /><span className="text-white/60 text-xs">Unlocked by default</span></>
          ) : (
            <><Lock size={12} className="text-white/70" /><span className="text-white/60 text-xs">Unlocks after Level {level.id - 1}</span></>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2">{s?.description || level.description}</p>

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <BookOpen size={12} />, label: 'Questions',   val: `${TOTAL_QUIZ_QUESTIONS} per quiz` },
            { icon: <Clock size={12} />,    label: 'Time Limit',  val: `${s?.timeLimit ?? 10} min` },
            { icon: <Users size={12} />,    label: 'Completions', val: stats.completed },
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

        {stats.completed > 0 && (
          <div className="flex gap-3 text-center bg-slate-50 rounded-xl px-4 py-3">
            <div className="flex-1">
              <p className="text-lg font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>{stats.avg}%</p>
              <p className="text-[10px] text-slate-400">Avg Score</p>
            </div>
            <div className="w-px bg-slate-200" />
            <div className="flex-1">
              <p className="text-lg font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>{stats.completed}</p>
              <p className="text-[10px] text-slate-400">Students Done</p>
            </div>
          </div>
        )}

        <button onClick={() => onEdit(level.id)}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 transition-all">
          <Edit2 size={13} /> Edit Settings
        </button>
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function ExamLevels() {
  const { user } = useAuth();
  const { setLevelActive, levelSettings } = useLevel();
  const [editing,   setEditing]  = useState(null);
  const [saved,     setSaved]    = useState(false);
  const [bankStats, setBankStats] = useState({ total: 0, perCat: [] });

  // Build settings from LevelContext (API-backed), fallback to LEVELS defaults
  const settings = LEVELS.reduce((acc, l) => {
    acc[l.id] = {
      title:       l.title,
      subtitle:    l.subtitle,
      description: l.description,
      timeLimit:   10,
      active:      true,
      ...levelSettings[l.id],
    };
    return acc;
  }, {});

  // Load bank stats from API
  useEffect(() => {
    if (!user?.id) return;
    loadQuestionBank().then(bank => {
      // API returns active questions only — no status filter needed
      const allQs = Object.values(bank).flat();
      const total  = allQs.length;
      const perCat = Object.entries(CATEGORY_META).map(([cat, meta]) => ({
        label: meta.label,
        color: meta.color,
        count: (bank[cat] || []).length,
      }));
      setBankStats({ total, perCat });
    }).catch(() => {});
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (levelId, form) => {
    // Pass the full form so title, subtitle, description, timeLimit, and active all persist
    await setLevelActive(levelId, {
      title:       form.title,
      subtitle:    form.subtitle,
      description: form.description,
      timeLimit:   Number(form.timeLimit) || 10,
      active:      form.active,
    });
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const stats = LEVELS.reduce((acc, l) => { acc[l.id] = { completed: 0, avg: 0 }; return acc; }, {});

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {saved && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg">
          <CheckCircle size={14} /> Settings saved!
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Exam Level Management</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configure and manage the sequential exam system</p>
      </div>

      {/* Question Bank Summary */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers size={16} className="text-indigo-500" />
          <h2 className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Space Grotesk' }}>Question Bank Pool</h2>
          <span className="ml-auto text-xs text-slate-400">{bankStats.total} active questions total</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {bankStats.perCat.map(cat => (
            <div key={cat.label} className="rounded-xl px-3 py-2.5 border"
              style={{ background: `${cat.color}08`, borderColor: `${cat.color}25` }}>
              <p className="text-xs font-semibold" style={{ color: cat.color }}>{cat.label}</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5" style={{ fontFamily: 'Space Grotesk' }}>{cat.count}</p>
              <p className="text-[10px] text-slate-400">questions</p>
            </div>
          ))}
        </div>
      </div>

      {/* Level cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {LEVELS.map(level => (
          <LevelCard
            key={level.id}
            level={level}
            settings={settings}
            stats={stats[level.id]}
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
