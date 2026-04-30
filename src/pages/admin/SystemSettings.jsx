import { useState } from 'react';
import {
  Settings, Save, CheckCircle, RotateCcw, Clock, Target,
  RefreshCw, Eye, Shuffle, Users, Lock, Unlock,
  AlertTriangle, Info, ToggleLeft, ToggleRight, Shield,
  Layers, ChevronDown, ChevronUp, BookOpen, Key, Timer,
} from 'lucide-react';

const SETTINGS_KEY = 'rqa_system_settings';

const DEFAULT_LEVEL_CFG = {
  timerMinutes:   10,
  passingMark:    50,
  retryLimit:     1,
  randomize:      false,
  locked:         false,
  showHints:      false,
  questionsCount: 10,
};

const DEFAULT_SETTINGS = {
  quizTimerMinutes:        10,
  passingMark:             50,
  retryLimit:              1,
  randomizeQuestions:      false,
  showResultsImmediately:  true,
  registrationOpen:        true,
  showLeaderboard:         false,
  allowSelfReset:          false,
  maintenanceMode:         false,
  maxStudentsPerClass:     60,
  levels: {
    1: { ...DEFAULT_LEVEL_CFG, timerMinutes: 10, passingMark: 50, locked: false },
    2: { ...DEFAULT_LEVEL_CFG, timerMinutes: 15, passingMark: 60, locked: true  },
    3: { ...DEFAULT_LEVEL_CFG, timerMinutes: 20, passingMark: 70, locked: true  },
  },
};

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      levels: {
        1: { ...DEFAULT_SETTINGS.levels[1], ...(stored.levels?.[1] || {}) },
        2: { ...DEFAULT_SETTINGS.levels[2], ...(stored.levels?.[2] || {}) },
        3: { ...DEFAULT_SETTINGS.levels[3], ...(stored.levels?.[3] || {}) },
      },
    };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(s) { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); }

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

/* ── Level palette ── */
const LEVEL_PALETTE = [
  { bg:'from-indigo-500 to-blue-500',   light:'bg-indigo-50',  text:'text-indigo-700',  accent:'#4F46E5' },
  { bg:'from-violet-500 to-purple-500', light:'bg-violet-50',  text:'text-violet-700',  accent:'#7C3AED' },
  { bg:'from-emerald-500 to-teal-500',  light:'bg-emerald-50', text:'text-emerald-700', accent:'#059669' },
];

/* ── Level Settings Panel ── */
function LevelSettingsPanel({ lvl, cfg, onChange }) {
  const [open, setOpen] = useState(lvl === 1);
  const pal = LEVEL_PALETTE[lvl - 1] || LEVEL_PALETTE[0];
  const set = (key, val) => onChange({ ...cfg, [key]: val });

  const stats = [
    { label:'Timer',    value:`${cfg.timerMinutes}m`,     color: pal.accent },
    { label:'Pass',     value:`${cfg.passingMark}%`,      color: pal.accent },
    { label:'Retries',  value: cfg.retryLimit===0?'∞':cfg.retryLimit, color: pal.accent },
    { label:'Questions',value: cfg.questionsCount,        color: pal.accent },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
      {/* Level header */}
      <button onClick={() => setOpen(p => !p)}
        className={`w-full bg-gradient-to-r ${pal.bg} px-5 py-4 flex items-center gap-3 text-left`}>
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Layers size={16} className="text-white"/>
        </div>
        <div className="flex-1">
          <p className="text-white font-bold" style={{ fontFamily:'Space Grotesk' }}>Level {lvl} Settings</p>
          <div className="flex flex-wrap gap-3 mt-1">
            {stats.map(s => (
              <span key={s.label} className="text-white/80 text-xs font-semibold">
                {s.label}: <span className="text-white">{s.value}</span>
              </span>
            ))}
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

      {/* Settings body */}
      {open && (
        <div className={`${pal.light} p-5 space-y-3`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Timer */}
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <NumberRow
                label="Quiz Timer"
                desc="Time limit for this level"
                value={cfg.timerMinutes}
                onChange={v => set('timerMinutes', v)}
                icon={<Timer size={14}/>}
                color={pal.accent}
                min={1} max={120} suffix=" min"
              />
            </div>
            {/* Passing mark */}
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <NumberRow
                label="Passing Mark"
                desc="Minimum score to pass this level"
                value={cfg.passingMark}
                onChange={v => set('passingMark', v)}
                icon={<Target size={14}/>}
                color={pal.accent}
                min={1} max={100} suffix="%"
              />
            </div>
            {/* Retry limit */}
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <NumberRow
                label="Retry Limit"
                desc="Max attempts (0 = unlimited)"
                value={cfg.retryLimit}
                onChange={v => set('retryLimit', v)}
                icon={<RefreshCw size={14}/>}
                color={pal.accent}
                min={0} max={10}
              />
            </div>
            {/* Questions per quiz */}
            <div className="bg-white rounded-xl p-4 border border-slate-100">
              <NumberRow
                label="Questions per Quiz"
                desc="Number of questions drawn per attempt"
                value={cfg.questionsCount}
                onChange={v => set('questionsCount', v)}
                icon={<BookOpen size={14}/>}
                color={pal.accent}
                min={1} max={100}
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="bg-white rounded-xl border border-slate-100 space-y-0 divide-y divide-slate-50">
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
              desc="Shuffle question order for each student in this level"
              value={cfg.randomize}
              onChange={v => set('randomize', v)}
              icon={<Shuffle size={14}/>}
              color={pal.accent}
            />
            <ToggleRow
              label="Show Hints"
              desc="Allow students to reveal hints during this level's quiz"
              value={cfg.showHints}
              onChange={v => set('showHints', v)}
              icon={<Eye size={14}/>}
              color={pal.accent}
            />
          </div>

          {/* Lock warning */}
          {cfg.locked && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
              <Lock size={13} className="text-amber-500 shrink-0"/>
              <p className="text-xs font-semibold text-amber-700">Level {lvl} is locked — students cannot attempt this level's quiz</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── MAIN ── */
export default function SystemSettings() {
  const [settings, setSettings] = useState(loadSettings);
  const [saved,      setSaved]      = useState(false);
  const [showReset,  setShowReset]  = useState(false);
  const [activeTab,  setActiveTab]  = useState('global');

  const update = (key, val) => setSettings(p => ({ ...p, [key]: val }));
  const updateLevel = (lvl, cfg) => setSettings(p => ({ ...p, levels: { ...p.levels, [lvl]: cfg } }));

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    saveSettings({ ...DEFAULT_SETTINGS });
    setShowReset(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center"><AlertTriangle size={18} className="text-red-500"/></div>
              <h3 className="font-bold text-slate-800">Reset to Defaults?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">All settings including level configurations will be restored to factory defaults.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleReset} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">Reset</button>
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
          <button onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors">
            <Save size={14}/> Save Settings
          </button>
        </div>
      </div>

      {/* Maintenance banner */}
      {settings.maintenanceMode && (
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
              activeTab===key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}>
            <Icon size={15}/> {label}
          </button>
        ))}
      </div>

      {/* ── GLOBAL SETTINGS TAB ── */}
      {activeTab === 'global' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Quiz settings */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center"><Clock size={15} className="text-blue-500"/></div>
                <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Quiz Settings</h2>
              </div>
              <NumberRow label="Default Quiz Timer" desc="Fallback timer for levels without a custom timer"
                value={settings.quizTimerMinutes} onChange={v => update('quizTimerMinutes',v)}
                icon={<Clock size={15}/>} color="#3B82F6" min={1} max={60} suffix=" min"/>
              <NumberRow label="Default Passing Mark" desc="Fallback passing score for levels without a custom mark"
                value={settings.passingMark} onChange={v => update('passingMark',v)}
                icon={<Target size={15}/>} color="#10B981" min={1} max={100} suffix="%"/>
              <NumberRow label="Default Retry Limit" desc="Fallback retry count (0 = unlimited)"
                value={settings.retryLimit} onChange={v => update('retryLimit',v)}
                icon={<RefreshCw size={15}/>} color="#F59E0B" min={0} max={10}/>
              <NumberRow label="Max Students / Class" desc="Maximum registrations per class code"
                value={settings.maxStudentsPerClass} onChange={v => update('maxStudentsPerClass',v)}
                icon={<Users size={15}/>} color="#8B5CF6" min={1} max={200}/>
            </div>

            {/* Question & result */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center"><Shuffle size={15} className="text-purple-500"/></div>
                <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Question & Result</h2>
              </div>
              <ToggleRow label="Randomize Questions" desc="Shuffle question order globally (overridable per level)"
                value={settings.randomizeQuestions} onChange={v => update('randomizeQuestions',v)}
                icon={<Shuffle size={14}/>} color="#8B5CF6"/>
              <ToggleRow label="Show Results Immediately" desc="Students see pass/fail and score right after submission"
                value={settings.showResultsImmediately} onChange={v => update('showResultsImmediately',v)}
                icon={<Eye size={14}/>} color="#3BC0EF"/>
              <ToggleRow label="Show Leaderboard" desc="Display ranking on student dashboard"
                value={settings.showLeaderboard} onChange={v => update('showLeaderboard',v)}
                icon={<Users size={14}/>} color="#F59E0B"/>
            </div>

            {/* Access & Registration */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center"><Unlock size={15} className="text-green-500"/></div>
                <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Access & Registration</h2>
              </div>
              <ToggleRow label="Registration Open" desc="Allow new students to register on the platform"
                value={settings.registrationOpen} onChange={v => update('registrationOpen',v)}
                icon={<Users size={14}/>} color="#10B981"/>
              <ToggleRow label="Allow Self-Reset" desc="Students can reset their own exam progress"
                value={settings.allowSelfReset} onChange={v => update('allowSelfReset',v)}
                icon={<RotateCcw size={14}/>} color="#F59E0B"/>
            </div>

            {/* System control */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"><Shield size={15} className="text-red-500"/></div>
                <h2 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>System Control</h2>
              </div>
              <ToggleRow label="Maintenance Mode" desc="Take platform offline for maintenance"
                value={settings.maintenanceMode} onChange={v => update('maintenanceMode',v)}
                icon={<Settings size={14}/>} color="#EF4444"/>
              <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-4 py-3">
                <Info size={13} className="text-slate-400 shrink-0 mt-0.5"/>
                <p className="text-xs text-slate-500">Settings are saved to browser localStorage. In production these would be stored server-side.</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4" style={{ fontFamily:'Space Grotesk' }}>Current Configuration Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:'Default Timer',  value:`${settings.quizTimerMinutes} min`,  color:'#3B82F6' },
                { label:'Default Pass',   value:`${settings.passingMark}%`,          color:'#10B981' },
                { label:'Retry Limit',    value:settings.retryLimit===0?'∞':settings.retryLimit, color:'#F59E0B' },
                { label:'Registration',   value:settings.registrationOpen?'Open':'Closed', color:settings.registrationOpen?'#10B981':'#EF4444' },
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
          {/* Info banner */}
          <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4">
            <Layers size={18} className="text-indigo-500 shrink-0 mt-0.5"/>
            <div>
              <p className="text-sm font-bold text-indigo-800">Level-Specific Settings</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                Each level can have its own timer, passing mark, retry limit, and access controls.
                Level-specific values override the global defaults.
              </p>
            </div>
          </div>

          {/* Level 1 / 2 / 3 panels */}
          {[1, 2, 3].map(lvl => (
            <LevelSettingsPanel
              key={lvl}
              lvl={lvl}
              cfg={settings.levels[lvl]}
              onChange={(cfg) => updateLevel(lvl, cfg)}
            />
          ))}

          {/* Comparison table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Level Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Setting', 'Level 1', 'Level 2', 'Level 3'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { label:'Timer',       key:'timerMinutes',   fmt:(v)=>`${v} min`    },
                    { label:'Pass Mark',   key:'passingMark',    fmt:(v)=>`${v}%`       },
                    { label:'Retries',     key:'retryLimit',     fmt:(v)=>v===0?'∞':v   },
                    { label:'Questions',   key:'questionsCount', fmt:(v)=>v             },
                    { label:'Locked',      key:'locked',         fmt:(v)=>v?'Yes':'No'  },
                    { label:'Randomize',   key:'randomize',      fmt:(v)=>v?'Yes':'No'  },
                    { label:'Hints',       key:'showHints',      fmt:(v)=>v?'Yes':'No'  },
                  ].map(row => (
                    <tr key={row.label} className="hover:bg-slate-50/50">
                      <td className="px-5 py-3 text-xs font-semibold text-slate-500">{row.label}</td>
                      {[1,2,3].map(lvl => {
                        const v = settings.levels[lvl][row.key];
                        const isWarning = (row.key==='locked' && v) || (row.key==='passingMark' && v > 70);
                        return (
                          <td key={lvl} className="px-5 py-3">
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
        </div>
      )}

      {/* Save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <button onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg hover:bg-indigo-700 transition-colors">
          <Save size={16}/> Save All Settings
        </button>
      </div>
    </div>
  );
}
