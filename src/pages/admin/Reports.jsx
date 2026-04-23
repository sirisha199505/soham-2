import { useState } from 'react';
import { Download, Filter, TrendingUp, Users, BookOpen, BarChart2, FileSpreadsheet } from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Select } from '../../components/ui/Input';
import { mockStudents, mockParticipation, mockTopicScores, mockScoreHistory, mockSchools } from '../../utils/mockData';
import { CHART_COLORS } from '../../utils/constants';
import { getScoreBg } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';

// ── CSV / Excel export helpers ──
function toCSV(headers, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ];
  return lines.join('\r\n');
}

function downloadCSV(filename, csv) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportStudentReport() {
  const headers = ['Rank', 'Student Name', 'Grade', 'Quizzes Done', 'Avg Score (%)', 'Status', 'Last Active'];
  const rows    = mockStudents.map((s, i) => [i + 1, s.name, s.grade, s.quizzesDone, s.avgScore, s.status, s.lastActive]);
  downloadCSV('student_report.csv', toCSV(headers, rows));
}

function exportSchoolReport() {
  const headers = ['School', 'District', 'Total Students', 'Total Teachers', 'Avg Score (%)', 'Status'];
  const rows    = mockSchools.map(s => [s.name, s.district, s.students, s.teachers, s.avgScore, s.status]);
  downloadCSV('school_report.csv', toCSV(headers, rows));
}

export default function Reports() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState('student');
  const [period, setPeriod] = useState('month');

  const isSchoolAdmin   = [ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);
  const isDistrictAdmin = [ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN].includes(user?.role);

  const handleExport = () => {
    if (reportType === 'student') exportStudentReport();
    else exportSchoolReport();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-slate-500 text-sm mt-0.5">Comprehensive performance data and insights</p>
        </div>
        <div className="flex gap-2">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none">
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          {isSchoolAdmin && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 14px #10B98140' }}
            >
              <FileSpreadsheet size={14} /> Export Excel
            </button>
          )}
        </div>
      </div>

      {/* Report type tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'student', label: 'Student Report', icon: <Users size={14} /> },
          { value: 'school', label: 'School Report', icon: <BookOpen size={14} /> },
          ...(isDistrictAdmin ? [{ value: 'district', label: 'District Report', icon: <BarChart2 size={14} /> }] : []),
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setReportType(t.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
              ${reportType === t.value ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {reportType === 'student' && [
          { value: '856', label: 'Total Students', icon: <Users size={18} className="text-indigo-500" />, bg: 'bg-indigo-50' },
          { value: '76%', label: 'Avg Score', icon: <TrendingUp size={18} className="text-green-500" />, bg: 'bg-green-50' },
          { value: '92%', label: 'Participation', icon: <BookOpen size={18} className="text-blue-500" />, bg: 'bg-blue-50' },
          { value: '1,240', label: 'Quiz Attempts', icon: <BarChart2 size={18} className="text-purple-500" />, bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="mb-2">{s.icon}</div>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
        {reportType !== 'student' && [
          { value: isDistrictAdmin ? '12' : '4', label: reportType === 'district' ? 'Schools' : 'Classes', icon: <BookOpen size={18} className="text-indigo-500" />, bg: 'bg-indigo-50' },
          { value: '68%', label: 'Avg Score', icon: <TrendingUp size={18} className="text-green-500" />, bg: 'bg-green-50' },
          { value: '88%', label: 'Participation', icon: <Users size={18} className="text-blue-500" />, bg: 'bg-blue-50' },
          { value: '45', label: 'Active Quizzes', icon: <BarChart2 size={18} className="text-purple-500" />, bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="mb-2">{s.icon}</div>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding={false}>
          <div className="p-5">
            <CardHeader title="Score Trend" subtitle="Average scores over time" />
          </div>
          <div className="h-52 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockScoreHistory} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[50, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={v => [`${v}%`, 'Score']} />
                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card padding={false}>
          <div className="p-5">
            <CardHeader title="Topic-wise Performance" subtitle="Average score by topic" />
          </div>
          <div className="h-52 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockTopicScores} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="topic" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={v => [`${v}%`, 'Score']} />
                <Bar dataKey="score" radius={[6,6,0,0]}>
                  {mockTopicScores.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Participation chart */}
      <Card padding={false}>
        <div className="p-5">
          <CardHeader title="Participation Rate" subtitle="Monthly student engagement" />
        </div>
        <div className="h-48 px-2 pb-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockParticipation} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="partGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="students" name="Students" stroke="#a855f7" strokeWidth={2} fill="url(#partGrad)" />
              <Area type="monotone" dataKey="quizzes" name="Quizzes" stroke="#6366f1" strokeWidth={2} fill="none" strokeDasharray="5 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Student leaderboard */}
      {reportType === 'student' && (
        <Card>
          <CardHeader title="Student Leaderboard" subtitle="Top performers this period" action={
            <button onClick={exportStudentReport} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors">
              <FileSpreadsheet size={13} /> Export Excel
            </button>
          } />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {['Rank', 'Student', 'Grade', 'Quizzes', 'Avg Score', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockStudents.map((s, i) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-3">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                        ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-slate-100 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-500'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-800">{s.name}</td>
                    <td className="px-3 py-3 text-slate-500">{s.grade}</td>
                    <td className="px-3 py-3 text-slate-700">{s.quizzesDone}</td>
                    <td className="px-3 py-3">
                      <span className={`text-sm font-semibold px-2 py-0.5 rounded-lg ${getScoreBg(s.avgScore)}`}>{s.avgScore}%</span>
                    </td>
                    <td className="px-3 py-3"><Badge variant={s.status} dot>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* School report */}
      {(reportType === 'school' || reportType === 'district') && (
        <Card>
          <CardHeader title="Schools Performance" action={
            <button onClick={exportSchoolReport} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 transition-colors">
              <FileSpreadsheet size={13} /> Export Excel
            </button>
          } />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {['School', 'District', 'Students', 'Avg Score', 'Participation', 'Status'].map(h => (
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
                    <td className="px-3 py-3">
                      <span className={`font-semibold text-sm px-2 py-0.5 rounded-lg ${getScoreBg(s.avgScore)}`}>{s.avgScore}%</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full">
                          <div className="h-1.5 bg-indigo-500 rounded-full" style={{ width: '85%' }} />
                        </div>
                        <span className="text-xs text-slate-500">85%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><Badge variant={s.status} dot>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
