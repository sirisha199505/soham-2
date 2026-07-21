import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Trophy, TrendingUp, CheckCircle, BarChart2,
  ArrowRight, RefreshCw, Activity, BookOpen, Settings,
  AlertCircle, ChevronRight, UserCheck,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';
import { compareLevels } from '../../utils/helpers';
import Modal from '../../components/ui/Modal';

// Aggregate performance metrics for ONE group of users (students OR trainers).
function aggregate(list) {
  const levelCounts = {}; // String(levelId) → completion count
  const allScores = [];
  let passCount = 0, failCount = 0, totalAttempts = 0;

  list.forEach(s => {
    totalAttempts += s.attemptsCount || 0;
    Object.entries(s.levels || {}).forEach(([lid, lp]) => {
      if (lp?.status === 'completed') {
        levelCounts[lid] = (levelCounts[lid] || 0) + 1;
        const sc = lp.score?.pct;
        if (sc !== undefined && sc !== null) {
          allScores.push(sc);
          sc >= 50 ? passCount++ : failCount++;
        }
      }
    });
  });

  const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const passRate = passCount + failCount > 0 ? Math.round((passCount / (passCount + failCount)) * 100) : 0;
  return { count: list.length, totalAttempts, avgScore, passRate, passCount, failCount, levelCounts };
}

// api.getStudents() returns role-0 (students) AND role-2 (coaches/trainers)
// together — split them and aggregate each group SEPARATELY so the dashboard can
// show distinct student vs trainer stats.
function computeStats(users) {
  return {
    student: aggregate(users.filter(u => u.role !== 'coach')),
    trainer: aggregate(users.filter(u => u.role === 'coach')),
  };
}

// Top-5 most-recent level completers for a group (falls back to first few).
function buildRecent(users, isStudents) {
  const list = users.filter(u => isStudents ? u.role !== 'coach' : u.role === 'coach');
  const mapped = list.map(s => {
    const entries  = Object.values(s.levels || {}).filter(l => l?.status === 'completed');
    const latestTs = entries.reduce((best, l) => {
      const t = l.lastCompletedAt || l.completedAt || '';
      return t > best ? t : best;
    }, '');
    return {
      id:   s.id,
      name: s.name || s.uniqueId || '—',
      sub:  isStudents ? `${s.schoolName || '—'} · Class ${s.className || '—'}` : (s.schoolName || s.organizationName || '—'),
      latestTs,
      completedCount: entries.length,
    };
  });
  const done = mapped.filter(s => s.completedCount > 0).sort((a, b) => b.latestTs.localeCompare(a.latestTs)).slice(0, 5);
  return done.length > 0 ? done : mapped.slice(0, 5);
}

/* ── static chart data ── */
const COMPLETION_TREND = [
  { month: 'Nov', l1: 4,  l2: 1,  l3: 0 },
  { month: 'Dec', l1: 8,  l2: 3,  l3: 1 },
  { month: 'Jan', l1: 14, l2: 6,  l3: 2 },
  { month: 'Feb', l1: 20, l2: 9,  l3: 4 },
  { month: 'Mar', l1: 28, l2: 14, l3: 7 },
  { month: 'Apr', l1: 35, l2: 18, l3: 9 },
];

// Extended palette — cycles if there are ever more levels than colours
const LEVEL_COLORS = ['#3BC0EF', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#6366F1'];
const levelColor = (i) => LEVEL_COLORS[i % LEVEL_COLORS.length];

/* ── small components ── */
function StatCard({ label, value, icon, color, sub, to, onClick }) {
  const clickable = Boolean(to || onClick);
  const inner = (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow h-full">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {clickable && <ChevronRight size={14} className="text-slate-300" />}
      </div>
      <p className="text-3xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{value}</p>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="text-left w-full">{inner}</button>;
  return inner;
}

function QuickAction({ icon, label, to, color }) {
  return (
    <Link to={to}
      className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group"
    >
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <span className="text-sm font-semibold text-slate-700 flex-1">{label}</span>
      <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [users,      setUsers]      = useState([]); // raw role-0 + role-2 list
  const [view,       setView]       = useState('students'); // 'students' | 'trainers'
  const [refreshed,  setRefreshed]  = useState(false);
  const [levelsList, setLevelsList] = useState([]); // sorted levels from DB
  // Distinguish "still loading the first response" from "loaded, genuinely empty".
  // Without this the dashboard rendered EMPTY_STATS (all zeros / blank charts)
  // during the ~20s Render cold start, which read as a broken/blank page until the
  // 30s interval happened to repaint it. `loaded` flips true after the first OK
  // fetch; `error` only surfaces when we have nothing to show yet.
  const [loaded,     setLoaded]     = useState(false);
  const [error,      setError]      = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);

  // The periodic 30s refresh keeps the current data on screen and never flashes
  // the loading/error screens: once `loaded` is true those screens are gated off,
  // and a failed background refresh leaves the last good data untouched.
  const fetchData = () => {
    return Promise.all([api.getStudents(), api.getLevelSettings()])
      .then(([students, levelsData]) => {
        const sorted = Array.isArray(levelsData)
          ? levelsData.sort(compareLevels)
          : [];
        setLevelsList(sorted);
        setUsers(Array.isArray(students) ? students : []);
        setLoaded(true);
        setError(false);
      })
      .catch(() => {
        // api.request already retries network errors/503s; reaching here means the
        // backend is still unreachable. Only show the error screen if we have no
        // data yet — a failed background refresh keeps the last good data visible.
        setError(prev => prev || !loaded);
      });
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
    const timer = setInterval(fetchData, 30_000);
    return () => clearInterval(timer);
  }, [user?.id]);

  // Await the actual re-fetch so the button reflects real work: "Refreshing…"
  // while data loads, then "Refreshed!" only once new data has arrived (the old
  // version flipped to "Refreshed!" instantly, before any data came back).
  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetchData();
      setRefreshed(true);
      setTimeout(() => setRefreshed(false), 1500);
    } finally {
      setRefreshing(false);
    }
  };

  // Per-group stats + the active selection. These hooks must run on every render
  // (before the early-return loading/error gates below), so they live here.
  const { student, trainer } = useMemo(() => computeStats(users), [users]);
  const isStudents = view === 'students';
  const active     = isStudents ? student : trainer;
  const groupLabel = isStudents ? 'Students' : 'Trainers';
  const recent     = useMemo(() => buildRecent(users, isStudents), [users, isStudents]);

  // First-load gate: a clear loading state instead of a blank zeroed dashboard.
  if (!loaded && !error) {
    return (
      <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center gap-3 py-32">
        <RefreshCw size={28} className="text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Loading dashboard…</p>
        <p className="text-xs text-slate-400">This can take a few seconds while the server wakes up.</p>
      </div>
    );
  }

  // Hard failure with nothing to show — offer a manual retry.
  if (!loaded && error) {
    return (
      <div className="min-h-full bg-slate-50 flex flex-col items-center justify-center gap-3 py-32 px-6 text-center">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-sm font-semibold text-slate-700">Couldn't load the dashboard</p>
        <p className="text-xs text-slate-400 max-w-xs">The server may be starting up or temporarily unavailable. Please try again.</p>
        <button
          onClick={() => { setError(false); fetchData(); }}
          className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const pieData = [
    { name: 'Passed', value: Math.max(active.passCount, 1) },
    { name: 'Failed', value: Math.max(active.failCount, 0) },
  ];
  const PIE_COLORS = ['#10B981', '#EF4444'];

  const levelCompletionData = levelsList.map((lvl, i) => ({
    level:     lvl.title || `Level ${i + 1}`,
    completed: active.levelCounts?.[String(lvl.id)] || 0,
    color:     levelColor(i),
  }));

  // Per-user attempt breakdown for the "Total Attempts" drill-down modal —
  // who attempted, and how many times. Sorted most-attempts first.
  const attemptRows = users
    .filter(u => (isStudents ? u.role !== 'coach' : u.role === 'coach'))
    .map(u => ({
      id:       u.id,
      name:     u.name || u.uniqueId || '—',
      sub:      isStudents ? `${u.schoolName || '—'} · Class ${u.className || '—'}` : (u.schoolName || u.organizationName || '—'),
      attempts: u.attemptsCount || 0,
    }))
    .sort((a, b) => b.attempts - a.attempts);

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 -mt-6 py-4 bg-slate-50/95 backdrop-blur-sm border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400 font-medium">{greeting}!</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            Admin Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Students / Trainers toggle — switches every stat, chart and list
              below; the counts stay visible so both groups are differentiable. */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200">
            {[
              { key: 'students', label: 'Students', Icon: Users,     count: student.count },
              { key: 'trainers', label: 'Trainers', Icon: UserCheck, count: trainer.count },
            ].map(t => {
              const on = view === t.key;
              return (
                <button key={t.key} onClick={() => setView(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    on ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <t.Icon size={13} />
                  <span className="hidden sm:inline">{t.label}</span>
                  <span className={`px-1.5 py-px rounded-full text-[10px] font-bold ${on ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className={`flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-70 shrink-0
              ${refreshed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : refreshed ? 'Refreshed!' : 'Refresh Stats'}</span>
          </button>
        </div>
      </div>

      {/* ── Group indicator ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
          isStudents ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'}`}>
          {isStudents ? <Users size={12} /> : <UserCheck size={12} />}
          Showing {groupLabel}
        </span>
        <span className="text-xs text-slate-400">{active.count} registered</span>
      </div>

      {/* ── Top stat cards — grows dynamically with level count ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard label={`Total ${groupLabel}`} value={active.count} icon={isStudents ? <Users size={18} /> : <UserCheck size={18} />} color={isStudents ? '#4F46E5' : '#8B5CF6'} sub="Registered" to="/admin/students" />
        {levelsList.map((lvl, i) => (
          <StatCard
            key={lvl.id}
            label={`${lvl.title || `Level ${i + 1}`} Done`}
            value={active.levelCounts?.[String(lvl.id)] || 0}
            icon={i === levelsList.length - 1 ? <Trophy size={18} /> : <CheckCircle size={18} />}
            color={levelColor(i)}
            sub={`${groupLabel} completions`}
          />
        ))}
      </div>

      {/* ── Second stat row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Pass Rate"      value={`${active.passRate}%`}      icon={<TrendingUp size={18} />} color="#10B981" sub={`${groupLabel} · all levels`} />
        <StatCard label="Avg Score"      value={`${active.avgScore}%`}      icon={<BarChart2 size={18} />}  color="#F59E0B" sub={`${groupLabel} · all attempts`} />
        <StatCard label="Total Attempts" value={active.totalAttempts}       icon={<BookOpen size={18} />}   color="#3BC0EF" sub={`${groupLabel} exam submissions`} onClick={() => setShowAttempts(true)} />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Level Completion Trend</h3>
              <p className="text-xs text-slate-400 mt-0.5">Monthly completions per level</p>
            </div>
          </div>
          <div className="h-52 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={COMPLETION_TREND} margin={{ left: -10, right: 10 }}>
                <defs>
                  {levelsList.map((_, i) => (
                    <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={levelColor(i)} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={levelColor(i)} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,.1)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {levelsList.map((lvl, i) => (
                  <Area key={lvl.id} type="monotone" dataKey={`l${i + 1}`}
                    name={lvl.title || `Level ${i + 1}`}
                    stroke={levelColor(i)} strokeWidth={2} fill={`url(#grad${i})`} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pass/Fail pie */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Pass vs Fail</h3>
            <p className="text-xs text-slate-400 mt-0.5">{groupLabel} pass/fail ratio</p>
          </div>
          <div className="h-44 min-w-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v, n) => [v, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Space Grotesk' }}>{active.passCount}</p>
              <p className="text-xs text-slate-400">Passed</p>
            </div>
            <div className="w-px bg-slate-100" />
            <div>
              <p className="text-2xl font-bold text-red-500" style={{ fontFamily: 'Space Grotesk' }}>{active.failCount}</p>
              <p className="text-xs text-slate-400">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Level completion bar + Recent + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Level bar chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Level Completions — {groupLabel}</h3>
          {levelCompletionData.length === 0 ? (
            <div className="h-44 flex flex-col items-center justify-center text-center gap-2">
              <BookOpen size={28} className="text-slate-200" />
              <p className="text-sm text-slate-400">No levels created yet</p>
            </div>
          ) : (
            <div className="h-44 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelCompletionData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={v => [v, 'Students']} />
                  <Bar dataKey="completed" radius={[6, 6, 0, 0]}>
                    {levelCompletionData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Recent completions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Recent Completions</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{groupLabel} who finished a level last</p>
            </div>
            <Link to="/admin/students" className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle size={32} className="text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No levels completed yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{s.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{s.sub}</p>
                  </div>
                  {s.completedCount > 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">
                      {s.completedCount}✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Quick Actions</h3>
          <div className="space-y-2">
            <QuickAction icon={<Users size={15} />}     label="Manage Students"   to="/admin/students"      color="#4F46E5" />
            <QuickAction icon={<BookOpen size={15} />}  label="Exam Levels"       to="/admin/levels"        color="#3BC0EF" />
            {/* <QuickAction icon={<Activity size={15} />}  label="Live Monitoring"   to="/admin/monitoring"    color="#10B981" />
            <QuickAction icon={<BarChart2 size={15} />} label="View Reports"      to="/admin/reports"       color="#F59E0B" /> */}
            <QuickAction icon={<Settings size={15} />}  label="System Settings"   to="/admin/settings"      color="#8B5CF6" />
          </div>
        </div>
      </div>

      {/* ── Total Attempts drill-down: who attempted, how many times ── */}
      <Modal
        isOpen={showAttempts}
        onClose={() => setShowAttempts(false)}
        title={`Attempts by ${groupLabel} · ${active.totalAttempts} total`}
        size="lg"
      >
        {attemptRows.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">No {groupLabel.toLowerCase()} found.</p>
        ) : (
          <div className="space-y-1.5">
            {attemptRows.map((r, i) => (
              <div key={r.id ?? i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-100 shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{r.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{r.sub}</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border ${
                  r.attempts > 0
                    ? 'bg-sky-50 text-sky-600 border-sky-100'
                    : 'bg-slate-50 text-slate-400 border-slate-100'
                }`}>
                  {r.attempts} {r.attempts === 1 ? 'attempt' : 'attempts'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

    </div>
  );
}
