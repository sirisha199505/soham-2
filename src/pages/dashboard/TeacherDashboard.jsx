import { BookOpen, Users, BarChart2, Clock, Plus, ArrowRight, TrendingUp, Activity, Play, CheckCircle, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { CHART_COLORS } from '../../utils/constants';
import StatsCard from '../../components/dashboard/StatsCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { mockQuizzes, mockParticipation, mockTopicScores } from '../../utils/mockData';

// ── Quick monitoring summary (mirrors TeacherMonitoring mock data) ──
const LIVE_SUMMARY = [
  { quizId: '1', title: 'Introduction to Robotics', live: 3, submitted: 7, pending: 2, total: 12 },
  { quizId: '2', title: 'Programming Logic Quiz',   live: 2, submitted: 5, pending: 1, total: 8  },
  { quizId: '6', title: 'Computer Vision Basics',   live: 1, submitted: 2, pending: 2, total: 5  },
];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const { colors } = useTheme();

  const pendingItems = [
    { text: 'Grade Programming Logic Quiz',    due: 'Today',    priority: 'high'   },
    { text: 'Review AI Robotics submissions',  due: 'Tomorrow', priority: 'medium' },
    { text: 'Publish Sensor quiz results',     due: 'Apr 25',   priority: 'low'    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Hero banner ── */}
      <div
        className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7c3200 0%, #c97a10 50%, #b97308 100%)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-[60px] bg-white" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="text-white/70 text-sm font-medium mb-1">
              Welcome back, {user?.name?.split(' ')[0] ?? 'Teacher'}
            </p>
            <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
              Teacher Dashboard
            </h1>
            <p className="text-white/70 text-sm">
              You have <span className="text-white font-bold">5 pending reviews</span> and{' '}
              <span className="text-white font-bold">
                {LIVE_SUMMARY.reduce((s, q) => s + q.live, 0)} students live right now
              </span>.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/quiz-create"
              className="inline-flex items-center gap-2 bg-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:scale-[1.03] transition-all"
              style={{ color: colors.secondary }}>
              <Plus size={15} /> Create Quiz
            </Link>
            <Link to="/monitoring"
              className="inline-flex items-center gap-2 text-white font-semibold px-4 py-2.5 rounded-xl text-sm hover:scale-[1.02] transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <Activity size={15} /> Live Monitor
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Quizzes"   value="18"  icon={<BookOpen   size={18} />} color="brand" trend="up" trendValue="+2 this week" />
        <StatsCard title="Active Students" value="142" icon={<Users      size={18} />} color="amber" trend="up" trendValue="+12" />
        <StatsCard title="Avg Class Score" value="71%" icon={<TrendingUp size={18} />} color="green" trend="up" trendValue="+3%" />
        <StatsCard title="Pending Review"  value="5"   icon={<Clock      size={18} />} color="red"   subtitle="Needs attention" />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly participation */}
        <div className="bg-white rounded-2xl border border-slate-100/60 shadow-sm">
          <div className="p-5">
            <CardHeader title="Monthly Participation" subtitle="Students engaging per month" />
          </div>
          <div className="h-52 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockParticipation} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Bar dataKey="students" name="Students" radius={[8, 8, 0, 0]}>
                  {mockParticipation.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? colors.primary : `${colors.primary}88`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topic performance */}
        <div className="bg-white rounded-2xl border border-slate-100/60 shadow-sm">
          <div className="p-5">
            <CardHeader title="Topic Performance" subtitle="Class average by topic" />
          </div>
          <div className="h-52 px-3 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTopicScores} layout="vertical" margin={{ left: 40, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} domain={[0, 100]} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="topic" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
                <Tooltip contentStyle={{ borderRadius: 14, border: 'none', fontSize: 12 }} formatter={v => [`${v}%`, 'Avg Score']} />
                <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                  {mockTopicScores.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Bottom row: quiz list + pending ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Quizzes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100/60 shadow-sm p-5">
          <CardHeader
            title="My Quizzes"
            action={
              <Link to="/quizzes" className="text-sm font-semibold flex items-center gap-1 hover:underline" style={{ color: colors.primary }}>
                View all <ArrowRight size={13} />
              </Link>
            }
          />
          <div className="space-y-2">
            {mockQuizzes.slice(0, 5).map(q => (
              <div key={q.id}
                className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}>
                  {q.questions}Q
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{q.title}</p>
                  <p className="text-xs text-slate-400">{q.topic} · {q.duration}min · {q.attempts} attempts</p>
                </div>
                <Badge variant={q.status} dot>{q.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Pending tasks */}
        <div className="bg-white rounded-2xl border border-slate-100/60 shadow-sm p-5">
          <CardHeader title="Pending Tasks" subtitle="Needs your attention" />
          <div className="space-y-3">
            {pendingItems.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  p.priority === 'high' ? 'bg-red-500' : p.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                }`} />
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.text}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Due: {p.due}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Live Monitoring Summary ── */}
      <div className="bg-white rounded-2xl border border-slate-100/60 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                Live Activity
                <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
                </span>
              </span>
            }
            subtitle="Current quiz attempt activity across active quizzes"
          />
          <Link to="/monitoring"
            className="flex items-center gap-1.5 text-sm font-semibold hover:underline"
            style={{ color: colors.primary }}>
            Full Monitor <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {LIVE_SUMMARY.map(item => (
            <div key={item.quizId} className="border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 transition-colors">
              <p className="text-sm font-semibold text-slate-800 mb-3 truncate">{item.title}</p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { icon: <Play size={11} />, value: item.live,      label: 'Live',      cls: 'bg-green-50 text-green-700',  dot: 'animate-pulse' },
                  { icon: <CheckCircle size={11} />, value: item.submitted, label: 'Done', cls: 'bg-blue-50 text-blue-700',    dot: '' },
                  { icon: <Minus size={11} />, value: item.pending,   label: 'Pending',   cls: 'bg-slate-50 text-slate-500',  dot: '' },
                ].map(s => (
                  <div key={s.label} className={`${s.cls} rounded-xl p-2 text-center`}>
                    <div className="flex justify-center mb-0.5">{s.icon}</div>
                    <p className="text-lg font-bold">{s.value}</p>
                    <p className="text-[10px] leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.round((item.submitted / item.total) * 100)}%`,
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.accent})`,
                  }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{Math.round((item.submitted / item.total) * 100)}% completed</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
