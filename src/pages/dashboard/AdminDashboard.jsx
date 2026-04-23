import { BookOpen, Users, Building2, BarChart2, Award, Globe } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ROLES, ROLE_LABELS, CHART_COLORS } from '../../utils/constants';
import StatsCard from '../../components/dashboard/StatsCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { mockParticipation, mockTopicScores, mockSchools } from '../../utils/mockData';

const difficultyData = [
  { name: 'Easy',   value: 35 },
  { name: 'Medium', value: 45 },
  { name: 'Hard',   value: 20 },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const isDistrict = [ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{ROLE_LABELS[user?.role]} Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">System overview and analytics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Students"  value="856"  icon={<Users size={18} />}     color="brand" trend="up" trendValue="+42 this month" />
        <StatsCard title="Total Teachers"  value="42"   icon={<Award size={18} />}     color="amber" trend="up" trendValue="+3" />
        <StatsCard title="Active Quizzes"  value="23"   icon={<BookOpen size={18} />}  color="green" trend="up" trendValue="+5" />
        {isDistrict
          ? <StatsCard title="Schools" value="12" icon={<Building2 size={18} />} color="navy" trend="neutral" trendValue="2 districts" />
          : <StatsCard title="Avg School Score" value="68%" icon={<BarChart2 size={18} />} color="navy" trend="up" trendValue="+4%" />
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" padding={false}>
          <div className="p-5">
            <CardHeader title="Monthly Participation" subtitle="Students and quizzes over 6 months" />
          </div>
          <div className="h-56 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockParticipation} margin={{ left: -10, right: 10 }}>
                <defs>
                  <linearGradient id="studGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={colors.primary} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="quizGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={colors.secondary} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={colors.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="students" name="Students" stroke={colors.primary}   strokeWidth={2} fill="url(#studGrad)" />
                <Area type="monotone" dataKey="quizzes"  name="Quizzes"  stroke={colors.secondary} strokeWidth={2} fill="url(#quizGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding={false}>
          <div className="p-5">
            <CardHeader title="Quiz Difficulty" subtitle="Distribution breakdown" />
          </div>
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={difficultyData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {difficultyData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={v => [`${v}%`, '']} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Schools table */}
      {isDistrict && (
        <Card>
          <CardHeader title="Schools Overview" subtitle="Performance across all schools" icon={<Globe size={18} />} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-100">
                  {['School', 'District', 'Students', 'Teachers', 'Avg Score', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockSchools.map(s => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-3 py-3 text-slate-500">{s.district}</td>
                    <td className="px-3 py-3 text-slate-700">{s.students.toLocaleString()}</td>
                    <td className="px-3 py-3 text-slate-700">{s.teachers}</td>
                    <td className="px-3 py-3">
                      <span className={`font-semibold ${s.avgScore >= 75 ? 'text-green-600' : s.avgScore >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {s.avgScore}%
                      </span>
                    </td>
                    <td className="px-3 py-3"><Badge variant={s.status} dot>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card padding={false}>
        <div className="p-5">
          <CardHeader title="Topic-wise Performance" subtitle="Average scores across all students by topic" />
        </div>
        <div className="h-52 px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockTopicScores} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="topic" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={v => [`${v}%`, 'Avg Score']} />
              <Bar dataKey="score" radius={[6,6,0,0]}>
                {mockTopicScores.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
