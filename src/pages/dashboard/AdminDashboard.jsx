import { useState, useEffect } from 'react';
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

function computeStats(users) {
  // api.getStudents() returns role-0 (students) AND role-2 (coaches) together
  const students   = users.filter(u => u.role !== 'coach');
  const coachCount = users.filter(u => u.role === 'coach').length;

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

  const avgScore = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  const passRate = passCount + failCount > 0 ? Math.round((passCount / (passCount + failCount)) * 100) : 0;
  return { totalStudents: students.length, coachCount, totalAttempts, avgScore, passRate, passCount, failCount, levelCounts };
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

const EMPTY_STATS = { totalStudents: 0, coachCount: 0, totalAttempts: 0, avgScore: 0, passRate: 0, passCount: 0, failCount: 0, levelCounts: {} };

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
        setStats(computeStats(students));

        // Show students who most recently completed any level
        const withCompletion = students
          .map(s => {
            const entries = Object.values(s.levels || {}).filter(l => l?.status === 'completed');
            const latestTs = entries.reduce((best, l) => {
              const t = l.lastCompletedAt || l.completedAt || '';
              return t > best ? t : best;
            }, '');
            const completedCount = entries.length;
            return { id: s.uniqueId, school: s.schoolName || '—', class: s.className || '—', latestTs, completedCount };
          })
          .filter(s => s.completedCount > 0)
          .sort((a, b) => b.latestTs.localeCompare(a.latestTs))
          .slice(0, 5);

        setRecent(withCompletion.length > 0 ? withCompletion : students.slice(0, 5).map(s => ({
          id: s.uniqueId, school: s.schoolName || '—', class: s.className || '—', latestTs: '', completedCount: 0,
        })));
      }).catch(() => {});
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchData();
    const timer = setInterval(fetchData, 30_000);
    return () => clearInterval(timer);
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

  const levelCompletionData = levelsList.map((lvl, i) => ({
    level:     lvl.title || `Level ${i + 1}`,
    completed: stats.levelCounts?.[String(lvl.id)] || 0,
    color:     levelColor(i),
  }));

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

      {/* ── Top stat cards — grows dynamically with level count ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard label="Total Students" value={stats.totalStudents} icon={<Users size={18} />} color="#4F46E5" sub="Registered" to="/admin/students" />
        {levelsList.map((lvl, i) => (
          <StatCard
            key={lvl.id}
            label={`${lvl.title || `Level ${i + 1}`} Done`}
            value={stats.levelCounts?.[String(lvl.id)] || 0}
            icon={i === levelsList.length - 1 ? <Trophy size={18} /> : <CheckCircle size={18} />}
            color={levelColor(i)}
            sub="Completions"
          />
        ))}
      </div>

      {/* ── Second stat row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="Innovation Coaches" value={stats.coachCount}              icon={<UserCheck size={18} />}  color="#8B5CF6" sub="Registered coaches" />
        <StatCard label="Pass Rate"          value={`${stats.passRate}%`}          icon={<TrendingUp size={18} />} color="#10B981" sub="Across all levels" />
        <StatCard label="Avg Score"          value={`${stats.avgScore}%`}          icon={<BarChart2 size={18} />}  color="#F59E0B" sub="All attempts" />
        <StatCard label="Total Attempts"     value={stats.totalAttempts}           icon={<BookOpen size={18} />}   color="#3BC0EF" sub="Exam submissions" />
        <StatCard label="Pass / Fail"        value={`${stats.passCount}/${stats.failCount}`} icon={<Activity size={18} />} color="#EF4444" sub="Count breakdown" />
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
            <p className="text-xs text-slate-400 mt-0.5">Overall pass/fail ratio</p>
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
              <p className="text-[10px] text-slate-400 mt-0.5">Students who finished a level last</p>
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
                    <p className="text-xs font-mono font-bold text-slate-700 truncate">{s.id}</p>
                    <p className="text-[10px] text-slate-400">{s.school} · Class {s.class}</p>
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
            <QuickAction icon={<Activity size={15} />}  label="Live Monitoring"   to="/admin/monitoring"    color="#10B981" />
            <QuickAction icon={<BarChart2 size={15} />} label="View Reports"      to="/admin/reports"       color="#F59E0B" />
            <QuickAction icon={<Settings size={15} />}  label="System Settings"   to="/admin/settings"      color="#8B5CF6" />
          </div>
        </div>
      </div>

    </div>
  );
}
