import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart2, Upload, TrendingUp, Users,
  Trophy, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../../utils/api';

const EMPTY_DATA = { levelIds: [], levelData: {}, total: 0, studentRows: [] };

const LEVEL_PALETTE = ['#3BC0EF','#8B5CF6','#10B981','#F59E0B','#EF4444','#EC4899','#6366f1','#14b8a6'];
function levelColor(id) { return LEVEL_PALETTE[(id - 1) % LEVEL_PALETTE.length]; }

/* ── Data helpers ── */
async function fetchReportData() {
  const [students, levelSettingsRaw] = await Promise.all([
    api.getStudents(),
    api.getLevelSettings().catch(() => []),
  ]);

  // Build a map of levelId → title from the DB
  const levelTitles = {};
  const settingsArr = Array.isArray(levelSettingsRaw) ? levelSettingsRaw : Object.values(levelSettingsRaw || {});
  settingsArr.forEach(l => { if (l?.id) levelTitles[l.id] = l.title || `Level ${l.id}`; });

  // Collect all unique level IDs from students' progress AND from settings
  const allLevelIds = new Set(settingsArr.map(l => l.id).filter(Boolean));
  students.forEach(s => {
    Object.keys(s.levels || {}).forEach(k => allLevelIds.add(Number(k)));
  });
  // Order by order_index (mirrors compareLevels used everywhere else) so report
  // columns follow the canonical Level 1, 2, 3 … sequence rather than raw id order,
  // which can diverge once levels are deleted/recreated.
  const orderById = {};
  settingsArr.forEach(l => { if (l?.id != null) orderById[l.id] = Number(l.order); });
  const levelIds = Array.from(allLevelIds).sort((a, b) => {
    const ao = Number.isFinite(orderById[a]) ? orderById[a] : a;
    const bo = Number.isFinite(orderById[b]) ? orderById[b] : b;
    return (ao - bo) || (a - b);
  });

  // Build dynamic per-level stats
  const levelStats = {};
  levelIds.forEach(id => { levelStats[id] = []; });

  const studentRows = [];
  students.forEach(s => {
    const levels = s.levels || {};
    const rowLevels = {};
    levelIds.forEach(id => { rowLevels[id] = levels[String(id)] || null; });
    studentRows.push({
      id:     s.uniqueId,
      school: s.schoolName || '—',
      class:  s.className  || '—',
      ...rowLevels,
    });
    levelIds.forEach(id => {
      const ld = levels[String(id)];
      if (ld?.status === 'completed') {
        levelStats[id].push(ld?.score?.pct ?? 0);
      }
    });
  });

  const computeLevel = (scores) => {
    if (!scores.length) return { attempts: 0, passed: 0, failed: 0, avg: 0, passRate: 0 };
    const passed = scores.filter(s => s >= 50).length;
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { attempts: scores.length, passed, failed: scores.length - passed, avg, passRate: Math.round((passed / scores.length) * 100) };
  };

  const levelData = {};
  levelIds.forEach(id => {
    levelData[id] = { ...computeLevel(levelStats[id]), title: levelTitles[id] || `Level ${id}`, id };
  });

  return {
    levelIds,
    levelData,
    total: students.length,
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
  const { user } = useAuth();
  const [data,        setData]        = useState(EMPTY_DATA);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [page,        setPage]        = useState(1);
  const PER_PAGE = 8;

  const loadData = () => {
    setLoading(true);
    fetchReportData().then(setData).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user?.id) return;
    loadData();
    const timer = setInterval(loadData, 30_000);
    return () => clearInterval(timer);
  }, [user?.id]);  

  const refresh = loadData;

  const { levelIds, levelData } = data;

  const levelChartData = levelIds.map(id => {
    const ld = levelData[id] || {};
    return { level: ld.title || `Level ${id}`, attempts: ld.attempts || 0, passed: ld.passed || 0, failed: ld.failed || 0, avg: ld.avg || 0 };
  });

  const allLevels      = levelIds.map(id => levelData[id] || {});
  const totalAttempts  = allLevels.reduce((s, l) => s + (l.attempts || 0), 0);
  const totalPassed    = allLevels.reduce((s, l) => s + (l.passed   || 0), 0);
  const activeLevels   = allLevels.filter(l => l.attempts > 0);
  const overallAvg     = activeLevels.length
    ? Math.round(activeLevels.reduce((s, l) => s + l.avg, 0) / activeLevels.length)
    : 0;
  const overallPass    = totalAttempts > 0 ? Math.round((totalPassed / totalAttempts) * 100) : 0;

  const pieData = [
    { name: 'Passed', value: Math.max(totalPassed, 1) },
    { name: 'Failed', value: Math.max(totalAttempts - totalPassed, 0) },
  ];

  const filteredRows = useMemo(() => data.studentRows.filter(r => {
    const matchSearch = !search || String(r.id || '').toLowerCase().includes(search.toLowerCase()) || (r.school || '').toLowerCase().includes(search.toLowerCase());
    const matchLevel  = levelFilter === 'all' ? true
      : r[Number(levelFilter)]?.status === 'completed';
    return matchSearch && matchLevel;
  }), [data.studentRows, search, levelFilter]);

  const paginated  = filteredRows.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filteredRows.length / PER_PAGE);

  const handleExportSummary = () => {
    exportCSV('admin_report_summary.csv', levelIds.map(id => {
      const ld = levelData[id] || {};
      return { Level: ld.title || `Level ${id}`, Attempts: ld.attempts || 0, Passed: ld.passed || 0, Failed: ld.failed || 0, AvgScore: `${ld.avg || 0}%`, PassRate: `${ld.passRate || 0}%` };
    }));
  };

  const handleExportStudents = () => {
    exportCSV('student_performance.csv', filteredRows.map(r => {
      const base = { StudentID: r.id, Institute: r.school, 'Class / Course': r.class };
      levelIds.forEach(id => {
        const ld = r[id];
        base[`L${id}_Status`] = ld?.status || 'not started';
        base[`L${id}_Score`]  = ld?.score?.pct !== undefined ? `${ld.score.pct}%` : '—';
      });
      return base;
    }));
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
          <button onClick={refresh} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={handleExportSummary} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Upload size={14} /> Summary CSV
          </button>
          <button onClick={handleExportStudents} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors">
            <Upload size={14} /> Export Students
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Total Students"    value={data.total}                              icon={<Users size={16} />}       color="#4F46E5" sub="Registered" />
        <StatTile label="Total Attempts"    value={totalAttempts}                           icon={<BarChart2 size={16} />}   color="#3BC0EF" sub="All levels" />
        <StatTile label="Overall Pass Rate" value={`${overallPass}%`}                       icon={<TrendingUp size={16} />}  color="#10B981" sub="Pass threshold 50%" />
        <StatTile label="Overall Avg Score" value={overallAvg > 0 ? `${overallAvg}%` : '—'} icon={<Trophy size={16} />}     color="#F59E0B" sub="Across all levels" />
      </div>

      {/* Per-level stats — dynamic, shows only existing levels */}
      {levelIds.length === 0 && !loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-12 text-center">
          <BarChart2 size={32} className="mx-auto text-slate-200 mb-3" />
          <p className="text-slate-400 text-sm">No exam levels configured yet.</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${levelIds.length === 1 ? 'grid-cols-1 max-w-xs' : levelIds.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {levelIds.map(id => {
            const ld  = levelData[id] || {};
            const col = levelColor(id);
            return (
              <div key={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl text-white flex items-center justify-center text-sm font-bold" style={{ background: col }}>
                      {id}
                    </div>
                    <span className="font-bold text-slate-700">{ld.title || `Level ${id}`}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: `${col}15`, color: col }}>
                    {ld.passRate || 0}% pass
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>{ld.attempts || 0}</p>
                    <p className="text-[10px] text-slate-400">Attempts</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600" style={{ fontFamily: 'Space Grotesk' }}>{ld.passed || 0}</p>
                    <p className="text-[10px] text-slate-400">Passed</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>{ld.avg || '—'}{ld.avg ? '%' : ''}</p>
                    <p className="text-[10px] text-slate-400">Avg</p>
                  </div>
                </div>
                {(ld.attempts || 0) > 0 && (
                  <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${ld.passRate || 0}%`, background: col }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Charts row */}
      {levelIds.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4" style={{ fontFamily: 'Space Grotesk' }}>Pass vs Fail by Level</h3>
            <div className="h-52 min-w-0">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
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
            <div className="h-44 min-w-0">
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
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
      )}

      {/* Student performance table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <h3 className="font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>Student Performance</h3>
          <div className="flex gap-2 flex-wrap">
            <input placeholder="Search student…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none w-36" />
            {['all', ...levelIds.map(String)].map(f => (
              <button key={f} onClick={() => { setLevelFilter(f); setPage(1); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all
                  ${levelFilter === f ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                {f === 'all' ? 'All' : `${levelData[Number(f)]?.title || `L${f}`} Done`}
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
                {['Student ID', 'Institute', 'Class / Course', ...levelIds.map(id => levelData[id]?.title || `Level ${id}`)].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map(r => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-mono font-bold text-slate-800 text-xs">{r.id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-[100px] truncate">{r.school}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">{r.class}</span>
                  </td>
                  {levelIds.map(id => {
                    const ld = r[id];
                    return (
                      <td key={id} className="px-4 py-3">
                        {ld?.status === 'completed' ? (
                          <div>
                            <span className={`text-sm font-bold ${(ld.score?.pct ?? 0) >= 50 ? 'text-green-600' : 'text-red-500'}`}>{ld.score?.pct}%</span>
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
