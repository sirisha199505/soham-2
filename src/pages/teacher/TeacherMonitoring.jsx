import { useState } from 'react';
import {
  Activity, Users, CheckCircle, Clock, Search, RefreshCw,
  Play, Minus, ChevronDown, TrendingUp, AlertCircle,
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Card, { CardHeader } from '../../components/ui/Card';
import { mockQuizzes } from '../../utils/mockData';
import { formatDuration } from '../../utils/helpers';
import { useTheme } from '../../context/ThemeContext';

// ── Mock live monitoring data per quizId ─────────────────────────────────────
const MONITOR = {
  '1': [
    { id: 1, name: 'Aarav Sharma',    grade: '10A', status: 'submitted',  score: 88, timeTaken: 547, submittedAt: '09:15 AM' },
    { id: 2, name: 'Priya Patel',     grade: '10B', status: 'live',       elapsed: 4 },
    { id: 3, name: 'Rohan Verma',     grade: '10A', status: 'submitted',  score: 64, timeTaken: 590, submittedAt: '09:22 AM' },
    { id: 4, name: 'Ananya Singh',    grade: '10C', status: 'not_started' },
    { id: 5, name: 'Karthik Nair',    grade: '10B', status: 'live',       elapsed: 7 },
    { id: 6, name: 'Divya Iyer',      grade: '10A', status: 'submitted',  score: 95, timeTaken: 380, submittedAt: '09:11 AM' },
    { id: 7, name: 'Arjun Mehta',     grade: '10C', status: 'not_started' },
    { id: 8, name: 'Neha Gupta',      grade: '10B', status: 'submitted',  score: 76, timeTaken: 510, submittedAt: '09:18 AM' },
    { id: 9, name: 'Siddharth Rao',   grade: '10A', status: 'live',       elapsed: 2 },
    { id: 10, name: 'Meera Krishnan', grade: '10C', status: 'not_started' },
    { id: 11, name: 'Rahul Kapoor',   grade: '10B', status: 'submitted',  score: 82, timeTaken: 465, submittedAt: '09:20 AM' },
    { id: 12, name: 'Sanjana Iyer',   grade: '10A', status: 'submitted',  score: 91, timeTaken: 420, submittedAt: '09:13 AM' },
  ],
  '2': [
    { id: 1, name: 'Aarav Sharma',    grade: '10A', status: 'submitted',  score: 72, timeTaken: 820, submittedAt: '10:05 AM' },
    { id: 2, name: 'Priya Patel',     grade: '10B', status: 'submitted',  score: 90, timeTaken: 710, submittedAt: '10:00 AM' },
    { id: 3, name: 'Rohan Verma',     grade: '10A', status: 'live',       elapsed: 11 },
    { id: 4, name: 'Ananya Singh',    grade: '10C', status: 'not_started' },
    { id: 5, name: 'Karthik Nair',    grade: '10B', status: 'live',       elapsed: 5 },
    { id: 6, name: 'Divya Iyer',      grade: '10A', status: 'not_started' },
    { id: 7, name: 'Arjun Mehta',     grade: '10C', status: 'submitted',  score: 68, timeTaken: 930, submittedAt: '10:10 AM' },
    { id: 8, name: 'Neha Gupta',      grade: '10B', status: 'not_started' },
  ],
  '6': [
    { id: 1, name: 'Aarav Sharma',    grade: '10A', status: 'live',       elapsed: 18 },
    { id: 2, name: 'Priya Patel',     grade: '10B', status: 'not_started' },
    { id: 3, name: 'Rohan Verma',     grade: '10A', status: 'submitted',  score: 55, timeTaken: 720, submittedAt: '11:30 AM' },
    { id: 4, name: 'Ananya Singh',    grade: '10C', status: 'not_started' },
    { id: 5, name: 'Karthik Nair',    grade: '10B', status: 'submitted',  score: 80, timeTaken: 640, submittedAt: '11:25 AM' },
  ],
};

const STATUS_CONFIG = {
  live:        { label: 'Live',        dot: 'bg-green-500 animate-pulse', badge: 'bg-green-100 text-green-700',   icon: <Play    size={11} className="text-green-600" /> },
  submitted:   { label: 'Submitted',   dot: 'bg-blue-500',                badge: 'bg-blue-100 text-blue-700',    icon: <CheckCircle size={11} className="text-blue-600" /> },
  not_started: { label: 'Not Started', dot: 'bg-slate-300',               badge: 'bg-slate-100 text-slate-500',  icon: <Minus   size={11} className="text-slate-400" /> },
};

const scoreColor = pct =>
  pct >= 75 ? 'text-green-600 bg-green-50' :
  pct >= 50 ? 'text-yellow-600 bg-yellow-50' :
              'text-red-600 bg-red-50';

export default function TeacherMonitoring() {
  const { colors } = useTheme();
  const activeQuizzes = mockQuizzes.filter(q => q.status === 'active');
  const [selectedId, setSelectedId] = useState(activeQuizzes[0]?.id ?? '1');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const students = MONITOR[selectedId] ?? [];
  const selectedQuiz = mockQuizzes.find(q => q.id === selectedId);

  const stats = {
    assigned:    students.length,
    live:        students.filter(s => s.status === 'live').length,
    submitted:   students.filter(s => s.status === 'submitted').length,
    not_started: students.filter(s => s.status === 'not_started').length,
  };

  const avgScore = (() => {
    const done = students.filter(s => s.status === 'submitted' && s.score != null);
    if (!done.length) return null;
    return Math.round(done.reduce((a, s) => a + s.score, 0) / done.length);
  })();

  const filtered = students.filter(s => {
    if (tab !== 'all' && s.status !== tab) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleRefresh = () => setLastRefresh(new Date());

  const tabs = [
    { key: 'all',        label: 'All',         count: stats.assigned },
    { key: 'live',       label: 'Live',        count: stats.live },
    { key: 'submitted',  label: 'Submitted',   count: stats.submitted },
    { key: 'not_started',label: 'Not Started', count: stats.not_started },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Live Monitoring</h1>
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">
            Last updated: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Quiz selector ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Activity size={16} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-700">Select Quiz</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {activeQuizzes.map(q => (
              <button key={q.id} onClick={() => { setSelectedId(q.id); setTab('all'); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedId === q.id
                    ? 'text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={selectedId === q.id ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : {}}
              >
                {q.title}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${selectedId === q.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {q.attempts}
                </span>
              </button>
            ))}
          </div>
        </div>
        {selectedQuiz && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{selectedQuiz.topic}</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{selectedQuiz.duration} min</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{selectedQuiz.questions} questions</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-medium">{selectedQuiz.marks} marks</span>
          </div>
        )}
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Assigned', value: stats.assigned,    icon: <Users size={18} />,       bg: 'from-slate-500 to-slate-600',   light: 'bg-slate-50', text: 'text-slate-700' },
          { label: 'Live Now',       value: stats.live,         icon: <Play  size={18} />,       bg: 'from-green-500 to-green-600',   light: 'bg-green-50', text: 'text-green-700', pulse: true },
          { label: 'Submitted',      value: stats.submitted,    icon: <CheckCircle size={18} />, bg: 'from-blue-500 to-blue-600',     light: 'bg-blue-50',  text: 'text-blue-700' },
          { label: 'Not Started',    value: stats.not_started,  icon: <Minus size={18} />,       bg: 'from-amber-500 to-amber-600',   light: 'bg-amber-50', text: 'text-amber-700' },
          { label: 'Avg Score',      value: avgScore != null ? `${avgScore}%` : '—', icon: <TrendingUp size={18} />, bg: 'from-indigo-500 to-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' },
        ].map(s => (
          <div key={s.label} className={`${s.light} rounded-2xl border border-white/60 p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br ${s.bg} shrink-0 relative`}>
              {s.icon}
              {s.pulse && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-white animate-ping" />}
            </div>
            <div>
              <p className={`text-2xl font-bold ${s.text}`} style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Student table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Table header */}
        <div className="p-5 pb-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <CardHeader title="Student Activity" subtitle={`${filtered.length} student${filtered.length !== 1 ? 's' : ''} shown`} />
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search students…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 w-52"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-100 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${
                  tab === t.key
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                {t.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Table body */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <AlertCircle size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium text-slate-500">No students found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  {['#', 'Student', 'Grade', 'Status', 'Score', 'Time / Elapsed', 'Submitted At'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((s, i) => {
                  const cfg = STATUS_CONFIG[s.status];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3.5 text-xs font-medium text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0"
                            style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                            {s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-sm font-semibold text-slate-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{s.grade}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {s.score != null ? (
                          <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${scoreColor(s.score)}`}>{s.score}%</span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">
                        {s.status === 'submitted' && s.timeTaken != null
                          ? <span className="flex items-center gap-1"><Clock size={12} className="text-slate-400" />{formatDuration(s.timeTaken)}</span>
                          : s.status === 'live'
                          ? <span className="flex items-center gap-1 text-green-600 font-medium"><Activity size={12} className="animate-pulse" />{s.elapsed} min elapsed</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">
                        {s.submittedAt ?? <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
