import { useState, useEffect } from 'react';
import {
  Activity, RefreshCw, Pause, Play, StopCircle, RotateCcw,
  AlertTriangle, CheckCircle, Clock, Users, Hash, Wifi,
  UserX, TrendingUp, Ghost, Loader2,
} from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  active: {
    label: 'Active',
    bg: '#f0fdf4', color: '#16a34a', dot: 'bg-green-400',
    desc: 'Currently attempting the quiz',
  },
  progress: {
    label: 'In Progress',
    bg: '#eff6ff', color: '#2563eb', dot: 'bg-blue-400',
    desc: 'Partially completed, still in session',
  },
  abandoned: {
    label: 'Abandoned',
    bg: '#fff7ed', color: '#ea580c', dot: 'bg-orange-400',
    desc: 'Started but left without submitting',
  },
  anonymous: {
    label: 'Anonymous',
    bg: '#f8fafc', color: '#64748b', dot: 'bg-slate-400',
    desc: 'Student identity not identified',
  },
};

const LEVEL_COLORS = { 1: '#3BC0EF', 2: '#8B5CF6', 3: '#10B981' };

const MOCK_IDS = [
  'RQ4A1B2', 'RQ7C3D4', 'RQ2E5F6', 'RQ9G7H8', 'RQ1I9J0',
  'RQ3K2L1', 'RQ6M4N3', 'RQ8O6P5', 'RQ5Q8R7', 'RQ0S1T9',
  'RQ2U3V4', 'RQ7W5X6',
];

const MOCK_STATUSES = [
  'active', 'active', 'active', 'progress', 'active',
  'progress', 'abandoned', 'active', 'anonymous', 'progress',
  'abandoned', 'anonymous',
];

function generateSession(id, lvl, offset, status) {
  const start    = new Date(Date.now() - offset * 1000);
  const answered = status === 'abandoned'
    ? Math.floor(Math.random() * 4)
    : Math.min(10, Math.floor(offset / 60) + Math.floor(Math.random() * 3));
  return {
    id:        `sess_${id}`,
    studentId: status === 'anonymous' ? '????????' : id,
    level:     lvl,
    startTime: start,
    answered,
    total:     10,
    elapsed:   offset,
    status,
  };
}

function buildInitialSessions() {
  const sessions = [];
  const offsets  = [120, 240, 60, 480, 180, 360, 90, 540, 300, 420, 150, 270];
  const levels   = [1, 1, 2, 1, 2, 3, 1, 2, 1, 3, 2, 1];
  MOCK_IDS.forEach((id, i) => {
    sessions.push(generateSession(id, levels[i], offsets[i], MOCK_STATUSES[i]));
  });

  // Merge real in-progress data from localStorage
  const progress = JSON.parse(localStorage.getItem('rqa_level_progress') || '{}');
  Object.entries(progress).forEach(([userId, userProg]) => {
    [1, 2, 3].forEach(lvl => {
      if (userProg[lvl] && userProg[lvl].status !== 'completed') {
        sessions.push({
          id: `real_${userId}_${lvl}`,
          studentId: userId,
          level: lvl,
          startTime: new Date(Date.now() - 180000),
          answered: 0,
          total: 10,
          elapsed: 180,
          status: 'active',
          real: true,
        });
      }
    });
  });
  return sessions;
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Action confirm modal ─────────────────────────────────────────────────
function ActionModal({ action, session, onConfirm, onClose }) {
  const cfg = {
    pause:    { title:'Pause Session',   desc:`Pause the active session for ${session?.studentId}?`,                              color:'#F59E0B', btn:'Pause'       },
    resume:   { title:'Resume Session',  desc:`Resume the paused session for ${session?.studentId}?`,                            color:'#10B981', btn:'Resume'      },
    submit:   { title:'Force Submit',    desc:`Force submit the quiz for ${session?.studentId}? Current answers will be graded.`, color:'#EF4444', btn:'Force Submit' },
    reset:    { title:'Reset Attempt',   desc:`Reset the quiz attempt for ${session?.studentId}? They can retake from start.`,   color:'#8B5CF6', btn:'Reset'       },
    markAbandoned: { title:'Mark Abandoned', desc:`Mark ${session?.studentId}'s session as abandoned?`, color:'#EA580C', btn:'Mark Abandoned' },
  }[action] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background:`${cfg.color}15` }}>
            <AlertTriangle size={18} style={{ color:cfg.color }}/>
          </div>
          <h3 className="font-bold text-slate-800">{cfg.title}</h3>
        </div>
        <p className="text-sm text-slate-500 mb-5">{cfg.desc}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors hover:opacity-90"
            style={{ background:cfg.color }}>
            {cfg.btn}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────
export default function LiveMonitoring() {
  const [sessions,     setSessions]     = useState(buildInitialSessions);
  const [filter,       setFilter]       = useState('all');
  const [search,       setSearch]       = useState('');
  const [actionModal,  setActionModal]  = useState(null);
  const [toast,        setToast]        = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(''), 2500);
  };

  // Tick elapsed for active sessions
  useEffect(() => {
    const iv = setInterval(() => {
      setSessions(prev => prev.map(s =>
        s.status === 'active' || s.status === 'progress'
          ? { ...s, elapsed: s.elapsed + 1 }
          : s
      ));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const refresh = () => { setSessions(buildInitialSessions()); showToast('Sessions refreshed'); };

  const executeAction = () => {
    const { action, session } = actionModal;
    setSessions(prev => prev.map(s => {
      if (s.id !== session.id) return s;
      if (action === 'pause')          return { ...s, status: 'progress' };
      if (action === 'resume')         return { ...s, status: 'active' };
      if (action === 'submit')         return { ...s, status: 'progress', answered: s.total };
      if (action === 'reset')          return { ...s, status: 'active', answered: 0, elapsed: 0 };
      if (action === 'markAbandoned')  return { ...s, status: 'abandoned' };
      return s;
    }));
    const labels = {
      pause:'Session paused → In Progress', resume:'Session resumed → Active',
      submit:'Quiz force-submitted', reset:'Attempt reset → Active',
      markAbandoned:'Session marked as Abandoned',
    };
    showToast(labels[action] || 'Action applied');
    setActionModal(null);
  };

  const filtered = sessions.filter(s => {
    const matchSearch = !search || s.studentId.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });

  // Stats
  const counts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map(k => [k, sessions.filter(s => s.status === k).length])
  );

  const STAT_CARDS = [
    { key:'active',    label:'Active',      icon:<Wifi size={16}/>,     color:'#10B981' },
    { key:'progress',  label:'In Progress', icon:<TrendingUp size={16}/>, color:'#2563eb' },
    { key:'abandoned', label:'Abandoned',   icon:<UserX size={16}/>,    color:'#EA580C' },
    { key:'anonymous', label:'Anonymous',   icon:<Ghost size={16}/>,    color:'#64748b' },
  ];

  const FILTER_TABS = [
    { key:'all',       label:`All (${sessions.length})`    },
    { key:'active',    label:`Active (${counts.active})`   },
    { key:'progress',  label:`Progress (${counts.progress})` },
    { key:'abandoned', label:`Abandoned (${counts.abandoned})` },
    { key:'anonymous', label:`Anonymous (${counts.anonymous})` },
  ];

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold border ${
          toast.type==='warning'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-green-50 border-green-200 text-green-800'
        }`}>
          <CheckCircle size={14}/> {toast.msg||toast}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily:'Space Grotesk' }}>Live Monitoring</h1>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>
                <span className="text-xs font-bold text-green-700">LIVE</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">Real-time exam session monitoring · {sessions.length} total sessions</p>
          </div>
        </div>
        <button onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw size={14}/> Refresh
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CARDS.map(s => (
          <button key={s.key} onClick={() => setFilter(filter===s.key?'all':s.key)}
            className={`bg-white rounded-xl border shadow-sm px-4 py-3 flex items-center gap-3 text-left transition-all hover:shadow-md ${
              filter===s.key ? 'border-current' : 'border-slate-100'
            }`}
            style={filter===s.key ? { borderColor:`${s.color}60`, background:`${s.color}08` } : {}}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background:`${s.color}15` }}>
              <span style={{ color:s.color }}>{s.icon}</span>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800" style={{ fontFamily:'Space Grotesk', color:s.color }}>{counts[s.key]}</p>
              <p className="text-[10px] font-semibold text-slate-400 uppercase">{s.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Status legend */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Status Definitions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <div key={k} className="flex items-start gap-2 p-3 rounded-xl" style={{ background:v.bg }}>
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${v.dot}`}/>
              <div>
                <p className="text-xs font-bold" style={{ color:v.color }}>{v.label}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-xs">
          <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input placeholder="Search student ID…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"/>
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_TABS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                filter===f.key ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">{filtered.length} sessions</p>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="text-xs text-indigo-600 font-semibold hover:text-indigo-800">
              Clear filter
            </button>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['Student ID', 'Level', 'Time Elapsed', 'Progress', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                  No sessions match the current filter
                </td>
              </tr>
            ) : filtered.map(sess => {
              const st       = STATUS_CONFIG[sess.status] || STATUS_CONFIG.active;
              const lvlColor = LEVEL_COLORS[sess.level];
              const pct      = Math.round((sess.answered / sess.total) * 100);
              const isAnon   = sess.status === 'anonymous';
              const isAbandoned = sess.status === 'abandoned';

              return (
                <tr key={sess.id}
                  className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${isAbandoned?'bg-orange-50/20':''} ${isAnon?'bg-slate-50/40':''}`}>

                  {/* Student ID */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isAnon?'bg-slate-100':'bg-indigo-50'}`}>
                        {isAnon ? <Ghost size={11} className="text-slate-400"/> : <Hash size={11} className="text-indigo-400"/>}
                      </div>
                      <div>
                        <p className={`font-mono font-bold text-xs tracking-wide ${isAnon?'text-slate-400 italic':'text-slate-800'}`}>
                          {sess.studentId}
                        </p>
                        {sess.real && <p className="text-[9px] text-green-600 font-bold">● REAL</p>}
                      </div>
                    </div>
                  </td>

                  {/* Level */}
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background:`linear-gradient(135deg,${lvlColor},${lvlColor}99)` }}>
                      Level {sess.level}
                    </span>
                  </td>

                  {/* Elapsed */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {(sess.status==='active'||sess.status==='progress') && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0"/>
                      )}
                      <Clock size={12} className="text-slate-400"/>
                      <span className="font-mono text-sm text-slate-700">{formatTime(sess.elapsed)}</span>
                    </div>
                  </td>

                  {/* Progress */}
                  <td className="px-4 py-3.5 min-w-[130px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{sess.answered}/{sess.total} answered</span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width:`${pct}%`, background: isAbandoned?'#EA580C':isAnon?'#94a3b8':lvlColor }}/>
                      </div>
                    </div>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border"
                      style={{ background:st.bg, color:st.color, borderColor:`${st.color}30` }}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                      {st.label}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      {/* Pause active → progress */}
                      {sess.status==='active' && (
                        <button onClick={() => setActionModal({ action:'pause', session:sess })}
                          title="Pause → In Progress"
                          className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors">
                          <Pause size={13}/>
                        </button>
                      )}
                      {/* Resume progress → active */}
                      {sess.status==='progress' && (
                        <button onClick={() => setActionModal({ action:'resume', session:sess })}
                          title="Resume → Active"
                          className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 transition-colors">
                          <Play size={13}/>
                        </button>
                      )}
                      {/* Mark abandoned */}
                      {(sess.status==='active'||sess.status==='progress') && (
                        <button onClick={() => setActionModal({ action:'markAbandoned', session:sess })}
                          title="Mark as Abandoned"
                          className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-50 transition-colors">
                          <UserX size={13}/>
                        </button>
                      )}
                      {/* Force submit */}
                      <button onClick={() => setActionModal({ action:'submit', session:sess })}
                        title="Force Submit"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                        <StopCircle size={13}/>
                      </button>
                      {/* Reset */}
                      <button onClick={() => setActionModal({ action:'reset', session:sess })}
                        title="Reset Attempt → Active"
                        className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-50 transition-colors">
                        <RotateCcw size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {actionModal && (
        <ActionModal
          action={actionModal.action}
          session={actionModal.session}
          onConfirm={executeAction}
          onClose={() => setActionModal(null)}
        />
      )}
    </div>
  );
}
