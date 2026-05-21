import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Settings, Save, CheckCircle, RotateCcw, Clock,
  RefreshCw, Eye, Shuffle, Users, Lock, Unlock,
  AlertTriangle, Info, ToggleLeft, ToggleRight, Shield,
  Layers, ChevronDown, ChevronUp, BookOpen, Timer, Loader2,
} from 'lucide-react';
import { api } from '../../utils/api';

const DEFAULT_GLOBAL = {
  quizTimerMinutes:       10,
  retryLimit:             1,
  randomizeQuestions:     false,
  showResultsImmediately: true,
  registrationOpen:       true,
  showLeaderboard:        false,
  allowSelfReset:         false,
  maintenanceMode:        false,
  maxStudentsPerClass:    60,
};

// Per-level cfg built dynamically from DB levels
const defaultLevelCfg = (level) => ({
  timerMinutes:   level.timeLimit ?? 10,
  questionsCount: level.questionCount ?? 10,
  locked:         !(level.active ?? level.open ?? true),
  randomize:      false,
  showHints:      false,
  retryLimit:     1,
});

/* ── Palette cycles for any number of levels ── */
const PALETTE = [
  { bg:'from-indigo-500 to-blue-500',   light:'bg-indigo-50',  text:'text-indigo-700',  accent:'#4F46E5' },
  { bg:'from-violet-500 to-purple-500', light:'bg-violet-50',  text:'text-violet-700',  accent:'#7C3AED' },
  { bg:'from-emerald-500 to-teal-500',  light:'bg-emerald-50', text:'text-emerald-700', accent:'#059669' },
  { bg:'from-amber-500 to-orange-500',  light:'bg-amber-50',   text:'text-amber-700',   accent:'#D97706' },
  { bg:'from-rose-500 to-pink-500',     light:'bg-rose-50',    text:'text-rose-700',    accent:'#BE185D' },
  { bg:'from-sky-500 to-cyan-500',      light:'bg-sky-50',     text:'text-sky-700',     accent:'#0284C7' },
];
const pal = (i) => PALETTE[i % PALETTE.length];

/* ── Toggle row ── */
function ToggleRow({ label, desc, value, onChange, icon, color = '#4F46E5' }) {
  return (
    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100/80 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 shrink-0" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
        </div>
      </div>
      <button onClick={(e) => { e.preventDefault(); onChange(!value); }}
        className={`shrink-0 transition-colors ${value ? 'text-indigo-500' : 'text-slate-300'}`}>
        {value ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
      </button>
    </label>
  );
}

/* ── Number input row ── */
function NumberRow({ label, desc, value, onChange, icon, color = '#4F46E5', min = 0, max = 999, suffix = '' }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 shrink-0" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-lg leading-none flex items-center justify-center transition-colors">−</button>
        <span className="w-14 text-center text-sm font-bold text-slate-800">{value}{suffix}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-lg leading-none flex items-center justify-center transition-colors">+</button>
      </div>
    </div>
  );
}

/* ── Level Settings Panel ── */
function LevelSettingsPanel({ level, idx, cfg, onChange }) {
  const [open, setOpen] = useState(idx === 0);
  const p = pal(idx);
  const set = (key, val) => onChange({ ...cfg, [key]: val });

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
      <button onClick={() => setOpen(v => !v)}
        className={`w-full bg-gradient-to-r ${p.bg} px-5 py-4 flex items-center gap-3 text-left`}>
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Layers size={16} className="text-white"/>
        </div>
        <div className="flex-1">
          <p className="text-white font-bold" style={{ fontFamily:'Space Grotesk' }}>
            {level.title || `Level ${level.id}`}
          </p>
          {level.subtitle && <p className="text-white/70 text-xs">{level.subtitle}</p>}
          <div className="flex flex-wrap gap-3 mt-1">
            <span className="text-white/80 text-xs font-semibold">
              Timer: <span className="text-white">{cfg.timerMinutes} min</span>
            </span>
            <span className="text-white/80 text-xs font-semibold">
              Questions: <span className="text-white">{cfg.questionsCount}</span>
            </span>
            <span className="text-white/80 text-xs font-semibold">
              Retries: <span className="text-white">{cfg.retryLimit === 0 ? '∞' : cfg.retryLimit}</span>
            </span>
            {cfg.locked && (
              <span className="flex items-center gap-1 text-amber-200 text-xs font-bold">
                <Lock size={11}/> Locked
              </span>
            )}
          </div>
        </div>
        <div className="text-white/70 shrink-0">
          {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </div>
      </button>

      {open && (
        <div className={`${p.light} p-5 space-y-3`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <NumberRow
                label="Quiz Timer"
                desc="Time limit for this level"
                value={cfg.timerMinutes}
                onChange={v => set('timerMinutes', v)}
                icon={<Timer size={14}/>}
                color={p.accent}
                min={1} max={120} suffix=" min"
              />
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <NumberRow
                label="Questions per Quiz"
                desc="How many questions are drawn per attempt"
                value={cfg.questionsCount}
                onChange={v => set('questionsCount', v)}
                icon={<BookOpen size={14}/>}
                color={p.accent}
                min={1} max={100}
              />
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <NumberRow
                label="Retry Limit"
                desc="Max attempts (0 = unlimited)"
                value={cfg.retryLimit}
                onChange={v => set('retryLimit', v)}
                icon={<RefreshCw size={14}/>}
                color={p.accent}
                min={0} max={10}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">
            <ToggleRow
              label="Level Locked"
              desc="Students cannot access this level until unlocked"
              value={cfg.locked}
              onChange={v => set('locked', v)}
              icon={cfg.locked ? <Lock size={14}/> : <Unlock size={14}/>}
              color={cfg.locked ? '#EF4444' : '#10B981'}
            />
            <ToggleRow
              label="Randomize Questions"
              desc="Shuffle question order for each student"
              value={cfg.randomize}
              onChange={v => set('randomize', v)}
              icon={<Shuffle size={14}/>}
              color={p.accent}
            />
            <ToggleRow
              label="Show Hints"
              desc="Allow students to reveal hints during the quiz"
              value={cfg.showHints}
              onChange={v => set('showHints', v)}
              icon={<Eye size={14}/>}
              color={p.accent}
            />
          </div>

          {cfg.locked && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <Lock size={13} className="text-amber-500 shrink-0"/>
              <p className="text-xs font-semibold text-amber-700">
                {level.title || `Level ${level.id}`} is locked — students cannot attempt this quiz
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── MAIN ── */
export default function SystemSettings() {
  const { user } = useAuth();
  const [global,     setGlobal]     = useState(DEFAULT_GLOBAL);
  const [levelCfgs,  setLevelCfgs]  = useState({}); // { [levelId]: cfg }
  const [levels,     setLevels]     = useState([]); // sorted DB levels
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [showReset,  setShowReset]  = useState(false);
  const [activeTab,  setActiveTab]  = useState('global');

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([api.getSettings(), api.getLevelSettings()])
      .then(([settingsData, levelsData]) => {
        // ── Global settings ──
        if (settingsData && Object.keys(settingsData).length > 0) {
          const { levels: _ignore, ...rest } = settingsData;
          setGlobal(prev => ({ ...prev, ...rest }));
        }

        // ── Level list from DB ──
        const sorted = Array.isArray(levelsData)
          ? levelsData.sort((a, b) => (a.order || a.id) - (b.order || b.id))
          : [];
        setLevels(sorted);

        // Build per-level cfg: start from DB values, overlay any saved system_settings
        const savedLevels = settingsData?.levels || {};
        const cfgs = {};
        sorted.forEach(lvl => {
          cfgs[lvl.id] = {
            ...defaultLevelCfg(lvl),
            ...(savedLevels[lvl.id] || {}),
          };
        });
        setLevelCfgs(cfgs);
      })
      .catch(err => console.error('Failed to load settings:', err))
      .finally(() => setLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateLevel = (id, cfg) => setLevelCfgs(p => ({ ...p, [id]: cfg }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save global + per-level cfgs to system_settings
      await api.saveSettings({ ...global, levels: levelCfgs });

      // Push timer, questionsCount, and locked directly into the levels table
      await Promise.all(
        levels.map(lvl => {
          const cfg = levelCfgs[lvl.id] || {};
          return api.saveLevelSettings(lvl.id, {
            timeLimit: cfg.timerMinutes ?? lvl.timeLimit ?? 10,
            active:    !cfg.locked,
          }).catch(err => console.error(`Level ${lvl.id} sync failed:`, err));
        })
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setGlobal(DEFAULT_GLOBAL);
    const resetCfgs = {};
    levels.forEach(lvl => { resetCfgs[lvl.id] = defaultLevelCfg(lvl); });
    setLevelCfgs(resetCfgs);
    try {
      await api.saveSettings({ ...DEFAULT_GLOBAL, levels: resetCfgs });
    } catch {}
    setShowReset(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) return (
    <div className="min-h-full flex items-center justify-center">
      <Loader2 size={28} className="animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* Toast */}
      {saved && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-semibold shadow-lg">
          <CheckCircle size={14}/> Settings saved successfully!
        </div>
      )}

      {/* Reset confirm */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowReset(false)}/>
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-red-500"/>
              </div>
              <h3 className="font-bold text-slate-800">Reset to Defaults?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              All settings including level configurations will be restored to defaults.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>System Settings</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configure platform-wide and per-level settings</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowReset(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RotateCcw size={14}/> Defaults
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Maintenance banner */}
      {global.maintenanceMode && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle size={14} className="text-amber-500 shrink-0"/>
          <p className="text-sm font-semibold text-amber-800">Maintenance mode is ON — students cannot access the platform</p>
        </div>
      )}

      {/* Tab selector */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm w-fit">
        {[
          { key:'global', label:'Global Settings', icon:Settings },
          { key:'levels', label:'Level Settings',  icon:Layers   },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab===key ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            <Icon size={15}/> {label}
          </button>
        ))}
      </div>

      {/* ── GLOBAL SETTINGS TAB ── */}
      {activeTab === 'global' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"><Clock size={15} className="text-blue-500"/></div>
                <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Quiz Settings</h2>
              </div>
              <NumberRow label="Default Quiz Timer" desc="Fallback timer for levels without a custom timer"
                value={global.quizTimerMinutes} onChange={v => setGlobal(p => ({ ...p, quizTimerMinutes: v }))}
                icon={<Clock size={15}/>} color="#3B82F6" min={1} max={60} suffix=" min"/>
              <NumberRow label="Default Retry Limit" desc="Fallback retry count (0 = unlimited)"
                value={global.retryLimit} onChange={v => setGlobal(p => ({ ...p, retryLimit: v }))}
                icon={<RefreshCw size={15}/>} color="#F59E0B" min={0} max={10}/>
              <NumberRow label="Max Students / Class" desc="Maximum registrations per class code"
                value={global.maxStudentsPerClass} onChange={v => setGlobal(p => ({ ...p, maxStudentsPerClass: v }))}
                icon={<Users size={15}/>} color="#8B5CF6" min={1} max={200}/>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center"><Shuffle size={15} className="text-purple-500"/></div>
                <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Question & Result</h2>
              </div>
              <ToggleRow label="Randomize Questions" desc="Shuffle question order globally"
                value={global.randomizeQuestions} onChange={v => setGlobal(p => ({ ...p, randomizeQuestions: v }))}
                icon={<Shuffle size={14}/>} color="#8B5CF6"/>
              <ToggleRow label="Show Results Immediately" desc="Students see score right after submission"
                value={global.showResultsImmediately} onChange={v => setGlobal(p => ({ ...p, showResultsImmediately: v }))}
                icon={<Eye size={14}/>} color="#3BC0EF"/>
              <ToggleRow label="Show Leaderboard" desc="Display ranking on student dashboard"
                value={global.showLeaderboard} onChange={v => setGlobal(p => ({ ...p, showLeaderboard: v }))}
                icon={<Users size={14}/>} color="#F59E0B"/>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center"><Unlock size={15} className="text-green-500"/></div>
                <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Access & Registration</h2>
              </div>
              <ToggleRow label="Registration Open" desc="Allow new students to register"
                value={global.registrationOpen} onChange={v => setGlobal(p => ({ ...p, registrationOpen: v }))}
                icon={<Users size={14}/>} color="#10B981"/>
              <ToggleRow label="Allow Self-Reset" desc="Students can reset their own exam progress"
                value={global.allowSelfReset} onChange={v => setGlobal(p => ({ ...p, allowSelfReset: v }))}
                icon={<RotateCcw size={14}/>} color="#F59E0B"/>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"><Shield size={15} className="text-red-500"/></div>
                <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>System Control</h2>
              </div>
              <ToggleRow label="Maintenance Mode" desc="Take platform offline for maintenance"
                value={global.maintenanceMode} onChange={v => setGlobal(p => ({ ...p, maintenanceMode: v }))}
                icon={<Settings size={14}/>} color="#EF4444"/>
              <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-4 py-3">
                <Info size={13} className="text-slate-400 shrink-0 mt-0.5"/>
                <p className="text-xs text-slate-500">Settings are saved to the database and apply globally to all users.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4" style={{ fontFamily:'Space Grotesk' }}>Current Configuration Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:'Default Timer',  value:`${global.quizTimerMinutes} min`,  color:'#3B82F6' },
                { label:'Retry Limit',    value: global.retryLimit===0?'∞':global.retryLimit, color:'#F59E0B' },
                { label:'Registration',   value: global.registrationOpen?'Open':'Closed', color: global.registrationOpen?'#10B981':'#EF4444' },
                { label:'Maintenance',    value: global.maintenanceMode?'ON':'OFF', color: global.maintenanceMode?'#EF4444':'#10B981' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold" style={{ color:s.color, fontFamily:'Space Grotesk' }}>{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── LEVEL SETTINGS TAB ── */}
      {activeTab === 'levels' && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
            <Layers size={18} className="text-indigo-500 shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-bold text-indigo-800">Level-Specific Settings</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Configure timer, questions count, and access per level. Changes sync directly to Exam Level settings on save.
              </p>
            </div>
          </div>

          {levels.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 px-6 py-16 flex flex-col items-center gap-3 text-center">
              <Layers size={32} className="text-slate-300"/>
              <p className="font-semibold text-slate-500">No exam levels created yet</p>
              <p className="text-sm text-slate-400">Go to <span className="font-semibold">Exam Levels</span> to create levels first.</p>
            </div>
          ) : (
            levels.map((lvl, i) => (
              <LevelSettingsPanel
                key={lvl.id}
                level={lvl}
                idx={i}
                cfg={levelCfgs[lvl.id] || defaultLevelCfg(lvl)}
                onChange={(cfg) => updateLevel(lvl.id, cfg)}
              />
            ))
          )}

          {/* Comparison table — only when levels exist */}
          {levels.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Level Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Setting</th>
                      {levels.map(lvl => (
                        <th key={lvl.id} className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                          {lvl.title || `Level ${lvl.id}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {[
                      { label:'Timer',      key:'timerMinutes',   fmt: v => `${v} min`         },
                      { label:'Questions',  key:'questionsCount', fmt: v => v                   },
                      { label:'Retries',    key:'retryLimit',     fmt: v => v === 0 ? '∞' : v  },
                      { label:'Locked',     key:'locked',         fmt: v => v ? 'Yes' : 'No'   },
                      { label:'Randomize',  key:'randomize',      fmt: v => v ? 'Yes' : 'No'   },
                      { label:'Hints',      key:'showHints',      fmt: v => v ? 'Yes' : 'No'   },
                    ].map(row => (
                      <tr key={row.label} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 text-xs font-semibold text-slate-500">{row.label}</td>
                        {levels.map(lvl => {
                          const cfg = levelCfgs[lvl.id] || defaultLevelCfg(lvl);
                          const v = cfg[row.key];
                          const isWarning = row.key === 'locked' && v;
                          return (
                            <td key={lvl.id} className="px-5 py-3">
                              <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                isWarning ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                              }`}>{row.fmt(v)}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}
