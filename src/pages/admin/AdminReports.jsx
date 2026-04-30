import { useState, useMemo } from 'react';
import {
  BarChart2, Download, TrendingUp, Users,
  CheckCircle, Trophy, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

/* ── Data helpers ── */
function loadReportData() {
  const students = JSON.parse(localStorage.getItem('rqa_students') || '{}');
  const progress = JSON.parse(localStorage.getItem('rqa_level_progress') || '{}');

  const levelStats = { 1: [], 2: [], 3: [] };
  const studentRows = [];

  Object.entries(progress).forEach(([userId, userProg]) => {
    const s = students[userId] || {};
    const row = {
      id: userId,
      school: s.name || '—',
      class: s.className || '—',
      l1: userProg[1] || null,
      l2: userProg[2] || null,
      l3: userProg[3] || null,
    };
    studentRows.push(row);

    [1, 2, 3].forEach(lvl => {
      if (userProg[lvl]?.status === 'completed') {
        const pct = userProg[lvl]?.score?.pct ?? 0;
        levelStats[lvl].push(pct);
      }
    });
  });

  // Compute stats per level
  const computeLevel = (scores) => {
    if (!scores.length) return { attempts: 0, passed: 0, failed: 0, avg: 0, passRate: 0 };
    const passed = scores.filter(s => s >= 50).length;
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { attempts: scores.length, passed, failed: scores.length - passed, avg, passRate: Math.round((passed / scores.length) * 100) };
  };

  return {
    l1: computeLevel(levelStats[1]),
    l2: computeLevel(levelStats[2]),
    l3: computeLevel(levelStats[3]),
    total: Object.keys(students).length,
    studentRows,
  };
}

/* ── CSV export ── */
function exportCSV(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const LEVEL_COLORS = { 1: '#3BC0EF', 2: '#8B5CF6', 3: '#10B981' };
const DIFF_COLORS  = ['#10B981', '#EF4444'];

/* ── Stat card ── */
function StatTile({ label, value, icon, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── MAIN ── */
export default function AdminReports() {
  const [data, setData] = useState(loadReportData);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const refresh = () => setData(loadReportData());

  const levelChartData = [
    { level: 'Level 1', attempts: data.l1.attempts, passed: data.l1.passed, failed: data.l1.failed, avg: data.l1.avg },
    { level: 'Level 2', attempts: data.l2.attempts, passed: data.l2.passed, failed: data.l2.failed, avg: data.l2.avg },
    { level: 'Level 3', attempts: data.l3.attempts, passed: data.l3.passed, failed: data.l3.failed, avg: data.l3.avg },
  ];

  const totalAttempts = data.l1.attempts + data.l2.attempts + data.l3.attempts;
  const totalPassed   = data.l1.passed   + data.l2.passed   + data.l3.passed;
  const overallAvg    = Math.round([data.l1, data.l2, data.l3].filter(l => l.attempts > 0).reduce((sum, l) => sum + l.avg, 0) / Math.max(1, [data.l1, data.l2, data.l3].filter(l => l.attempts > 0).length));
  const overallPass   = totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0;

  const pieData = [
    { name: 'Passed', value: Math.max(totalPassed, 1) },
    { name: 'Failed', value: Math.max(totalAttempts - totalPassed, 0) },
  ];

  const filteredRows = useMemo(() => data.studentRows.filter(r => {
    const matchSearch = !search || r.id.toLowerCase().includes(search.toLowerCase()) || r.school.toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' ? true
      : levelFilter === '1' ? r.l1?.status === 'completed'
      : levelFilter === '2' ? r.l2?.status === 'completed'
      : levelFilter === '3' ? r.l3?.status === 'completed'
      : true;
    return matchSearch && matchLevel;
  }), [data.studentRows, search, levelFilter]);

  const paginated = filteredRows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filteredRows.length / PER_PAGE);

  const handleExportSummary = () => {
    exportCSV('admin_report_summary.csv', [
      { Level: 'Level 1', Attempts: data.l1.attempts, Passed: data.l1.passed, Failed: data.l1.failed, AvgScore: `${data.l1.avg}%`, PassRate: `${data.l1.passRate}%` },
      { Level: 'Level 2', Attempts: data.l2.attempts, Passed: data.l2.passed, Failed: data.l2.failed, AvgScore: `${data.l2.avg}%`, PassRate: `${data.l2.passRate}%` },
      { Level: 'Level 3', Attempts: data.l3.attempts, Passed: data.l3.passed, Failed: data.l3.failed, AvgScore: `${data.l3.avg}%`, PassRate: `${data.l3.passRate}%` },
    ]);
  };

  const handleExportStudents = () => {
    exportCSV('student_performance.csv', filteredRows.map(r => ({
      StudentID: r.id,
      School: r.school,
      Class: r.class,
      L1_Status: r.l1?.status || 'not started',
      L1_Score: r.l1?.score?.pct !== undefined ? `${r.l1.score.pct}%` : '—',
      L2_Status: r.l2?.status || 'not started',
      L2_Score: r.l2?.score?.pct !== undefined ? `${r.l2.score.pct}%` : '—',
      L3_Status: r.l3?.status || 'not started',
      L3_Score: r.l3?.score?.pct !== undefined ? `${r.l3.score.pct}%` : '—',
    })));
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Reports & Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Student performance and exam completion data</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} />
          </button>
          <button onClick={handleExportSummary} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Download size={14} /> Summary CSV
          </button>
          <button onClick={handleExportStudents} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <Download size={14} /> Export Students
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total Students"  value={data.total}           icon={<Users size={16} />}       color="#4F46E5" sub="Registered" />
        <StatTile label="Total Attempts"  value={totalAttempts}        icon={<BarChart2 size={16} />}   color="#3BC0EF" sub="All levels" />
        <StatTile label="Overall Pass Rate" value={`${overallPass}%`} icon={<TrendingUp size={16} />}  color="#10B981" sub="Pass threshold 50%" />
        <StatTile label="Overall Avg Score" value={overallAvg > 0 ? `${overallAvg}%` : '—'} icon={<Trophy size={16} />} color="#F59E0B" sub="Across all levels" />
      </div>

      {/* Level stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(lvl => {
          const ld = data[`l${lvl}`];
          return (
            <div key={lvl} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl text-white flex items-center justify-center text-sm font-bold"
                    style={{ background: LEVEL_COLORS[lvl] }}>
                    {lvl}
                  </div>
                  <span className="font-bold text-slate-700">Level {lvl}</span>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${LEVEL_COLORS[lvl]}15`, color: LEVEL_COLORS[lvl] }}>
                  {ld.passRate}% pass
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{ld.attempts}</p>
                  <p className="text-[10px] text-slate-400">Attempts</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-600" style={{ fontFamily: 'Space Grotesk' }}>{ld.passed}</p>
                  <p className="text-[10px] text-slate-400">Passed</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>{ld.avg || '—'}{ld.avg ? '%' : ''}</p>
                  <p className="text-[10px] text-slate-400">Avg</p>
                </div>
              </div>
              {ld.attempts > 0 && (
                <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${ld.passRate}%`, background: LEVEL_COLORS[lvl] }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Pass vs Fail by Level</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelChartData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="level" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="passed" name="Passed" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" name="Failed" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Overall Pass/Fail Ratio</h3>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={4} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={DIFF_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} formatter={(v, n) => [v, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-around text-center mt-2">
            <div><p className="text-xl font-bold text-green-600" style={{ fontFamily: 'Space Grotesk' }}>{totalPassed}</p><p className="text-xs text-slate-400">Passed</p></div>
            <div className="w-px bg-slate-100" />
            <div><p className="text-xl font-bold text-red-500" style={{ fontFamily: 'Space Grotesk' }}>{totalAttempts - totalPassed}</p><p className="text-xs text-slate-400">Failed</p></div>
            <div className="w-px bg-slate-100" />
            <div><p className="text-xl font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>{overallPass}%</p><p className="text-xs text-slate-400">Pass Rate</p></div>
          </div>
        </div>
      </div>

      {/* Student performance table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Student Performance</h3>
          <div className="flex gap-2 flex-wrap">
            <input placeholder="Search student…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none w-36" />
            {['all', '1', '2', '3'].map(f => (
              <button key={f} onClick={() => { setLevelFilter(f); setPage(1); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${levelFilter === f ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {f === 'all' ? 'All' : `L${f} Done`}
              </button>
            ))}
          </div>
        </div>

        {paginated.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 text-sm">No student data available</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Student ID', 'School', 'Level 1', 'Level 2', 'Level 3'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-mono font-bold text-slate-800 text-xs">{r.id}</p>
                    <p className="text-[10px] text-slate-400">{r.class}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[100px] truncate">{r.school}</td>
                  {[1, 2, 3].map(lvl => {
                    const ld = r[`l${lvl}`];
                    return (
                      <td key={lvl} className="px-4 py-3">
                        {ld?.status === 'completed' ? (
                          <div>
                            <span className={`text-sm font-bold ${ld.score?.pct >= 50 ? 'text-green-600' : 'text-red-500'}`}>{ld.score?.pct}%</span>
                            <p className="text-[10px] text-slate-400">{ld.score?.correct}/{ld.score?.total}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50">Previous</button>
            <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
