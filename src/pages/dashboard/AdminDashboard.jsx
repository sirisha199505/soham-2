import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Trophy, TrendingUp, CheckCircle, BarChart2,
  ArrowRight, RefreshCw, Activity, BookOpen, Settings,
  AlertCircle, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

// levels: sorted array of {id, title} from /api/levels/settings
function computeStats(students, levels = []) {
  const levelCounts = {}; // String(levelId) → completion count
  const allScores = [];
  let passCount = 0, failCount = 0;
  let totalAttempts = 0;

  students.forEach(s => {
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

  // Map first three levels (by order) to l1/l2/l3 so existing stat cards stay meaningful
  const sortedIds = levels.length
    ? levels.map(l => String(l.id))
    : Object.keys(levelCounts).sort((a, b) => Number(a) - Number(b));
  const l1Done = levelCounts[sortedIds[0]] || 0;
  const l2Done = levelCounts[sortedIds[1]] || 0;
  const l3Done = levelCounts[sortedIds[2]] || 0;

  const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const passRate = passCount + failCount > 0 ? Math.round((passCount / (passCount + failCount)) * 100) : 0;
  return { totalStudents: students.length, l1Done, l2Done, l3Done, totalAttempts, avgScore, passRate, passCount, failCount, levelCounts };
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

const LEVEL_COLORS = ['#3BC0EF', '#8B5CF6', '#10B981'];

/* ── small components ── */
function StatCard({ label, value, icon, color, sub, to }) {
  const inner = (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        {to && <ChevronRight size={14} className="text-slate-300" />}
      </div>
      <p className="text-3xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{value}</p>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
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

const EMPTY_STATS = { totalStudents: 0, l1Done: 0, l2Done: 0, l3Done: 0, totalAttempts: 0, avgScore: 0, passRate: 0, passCount: 0, failCount: 0, levelCounts: {} };

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats,      setStats]      = useState(EMPTY_STATS);
  const [recent,     setRecent]     = useState([]);
  const [refreshed,  setRefreshed]  = useState(false);
  const [levelsList, setLevelsList] = useState([]); // sorted levels from DB

  const fetchData = () => {
    Promise.all([api.getStudents(), api.getLevelSettings()])
      .then(([students, levelsData]) => {
        const sorted = Array.isArray(levelsData)
          ? levelsData.sort((a, b) => (a.order || a.id) - (b.order || b.id))
          : [];
        setLevelsList(sorted);
        setStats(computeStats(students, sorted));
        setRecent(students.slice(0, 5).map(s => ({
          id:     s.uniqueId,
          school: s.schoolName || '—',
          class:  s.className  || '—',
        })));
      }).catch(() => {});
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => {
    fetchData();
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 1500);
  };

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const pieData = [
    { name: 'Passed', value: Math.max(stats.passCount, 1) },
    { name: 'Failed', value: Math.max(stats.failCount, 0) },
  ];
  const PIE_COLORS = ['#10B981', '#EF4444'];

  const levelCompletionData = levelsList.length > 0
    ? levelsList.slice(0, 3).map((lvl, i) => ({
        level:     lvl.title || `Level ${i + 1}`,
        completed: stats.levelCounts?.[String(lvl.id)] || 0,
        color:     LEVEL_COLORS[i],
      }))
    : [
        { level: 'Level 1', completed: stats.l1Done, color: LEVEL_COLORS[0] },
        { level: 'Level 2', completed: stats.l2Done, color: LEVEL_COLORS[1] },
        { level: 'Level 3', completed: stats.l3Done, color: LEVEL_COLORS[2] },
      ];

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400 font-medium">{greeting}!</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
            Admin Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={refresh}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all
            ${refreshed ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          <RefreshCw size={14} className={refreshed ? 'animate-spin' : ''} />
          {refreshed ? 'Refreshed!' : 'Refresh Stats'}
        </button>
      </div>

      {/* ── Top stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.totalStudents} icon={<Users size={18} />} color="#4F46E5" sub="Registered" to="/admin/students" />
        <StatCard label="L1 Completed"   value={stats.l1Done}        icon={<CheckCircle size={18} />} color="#3BC0EF" sub="Level 1 done" />
        <StatCard label="L2 Completed"   value={stats.l2Done}        icon={<CheckCircle size={18} />} color="#8B5CF6" sub="Level 2 done" />
        <StatCard label="L3 Completed"   value={stats.l3Done}        icon={<Trophy size={18} />}      color="#10B981" sub="Level 3 done" />
      </div>

      {/* ── Second stat row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pass Rate"     value={`${stats.passRate}%`}   icon={<TrendingUp size={18} />} color="#10B981" sub="Across all levels" />
        <StatCard label="Avg Score"     value={`${stats.avgScore}%`}   icon={<BarChart2 size={18} />}  color="#F59E0B" sub="All attempts" />
        <StatCard label="Total Attempts" value={stats.totalAttempts}   icon={<BookOpen size={18} />}   color="#3BC0EF" sub="Exam submissions" />
        <StatCard label="Pass / Fail"   value={`${stats.passCount}/${stats.failCount}`} icon={<Activity size={18} />} color="#EF4444" sub="Count breakdown" />
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
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={COMPLETION_TREND} margin={{ left: -10, right: 10 }}>
                <defs>
                  {LEVEL_COLORS.map((c, i) => (
                    <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={c} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,.1)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="l1" name="Level 1" stroke={LEVEL_COLORS[0]} strokeWidth={2} fill="url(#grad0)" />
                <Area type="monotone" dataKey="l2" name="Level 2" stroke={LEVEL_COLORS[1]} strokeWidth={2} fill="url(#grad1)" />
                <Area type="monotone" dataKey="l3" name="Level 3" stroke={LEVEL_COLORS[2]} strokeWidth={2} fill="url(#grad2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pass/Fail pie */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Pass vs Fail</h3>
            <p className="text-xs text-slate-400 mt-0.5">Overall pass/fail ratio</p>
          </div>
          <div className="h-44 flex items-center justify-center">
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
              <p className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Space Grotesk' }}>{stats.passCount}</p>
              <p className="text-xs text-slate-400">Passed</p>
            </div>
            <div className="w-px bg-slate-100" />
            <div>
              <p className="text-2xl font-bold text-red-500" style={{ fontFamily: 'Space Grotesk' }}>{stats.failCount}</p>
              <p className="text-xs text-slate-400">Failed</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Level completion bar + Recent + Quick Actions ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Level bar chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Level Completions</h3>
          <div className="h-44">
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
        </div>

        {/* Recent registrations */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Recent Students</h3>
            <Link to="/admin/students" className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle size={32} className="text-slate-200 mb-2" />
              <p className="text-sm text-slate-400">No students registered yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono font-bold text-slate-700 truncate">{s.id}</p>
                    <p className="text-[10px] text-slate-400">{s.school} · Class {s.class}</p>
                  </div>
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
            <QuickAction icon={<Activity size={15} />}  label="Live Monitoring"   to="/admin/monitoring"    color="#10B981" />
            <QuickAction icon={<BarChart2 size={15} />} label="View Reports"      to="/admin/reports"       color="#F59E0B" />
            <QuickAction icon={<Settings size={15} />}  label="System Settings"   to="/admin/settings"      color="#8B5CF6" />
          </div>
        </div>
      </div>

    </div>
  );
}
