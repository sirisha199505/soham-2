import { useState, useEffect } from 'react';
import { Users, TrendingUp, Activity, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import StatsCard from '../../components/dashboard/StatsCard';
import { CardHeader } from '../../components/ui/Card';
import { api } from '../../utils/api';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [sessions,  setSessions]  = useState([]);
  const [students,  setStudents]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([api.getMonitoringSessions(), api.getStudents()])
      .then(([sess, studs]) => {
        setSessions(Array.isArray(sess) ? sess : []);
        setStudents(Array.isArray(studs) ? studs : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group active sessions by level title
  const grouped = sessions.reduce((acc, s) => {
    const key = s.levelTitle || `Level ${s.levelId}`;
    if (!acc[key]) acc[key] = { title: key, count: 0 };
    acc[key].count++;
    return acc;
  }, {});
  const liveGroups = Object.values(grouped);

  const avgScore = sessions.length
    ? Math.round(sessions.reduce((s, a) => s + (a.score || 0), 0) / sessions.length)
    : null;

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Hero banner ── */}
      <div
        className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #7c3200 0%, #c97a10 50%, #b97308 100%)' }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-[60px] bg-white" />
        <div className="relative z-10">
          <p className="text-white/70 text-sm font-medium mb-1">
            Welcome back, {user?.name?.split(' ')[0] ?? 'Teacher'}
          </p>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            Teacher Dashboard
          </h1>
          <p className="text-white/70 text-sm">
            <span className="text-white font-bold">{sessions.length}</span> student{sessions.length !== 1 ? 's' : ''} active in the last hour.
          </p>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="Total Students"
          value={loading ? '…' : students.length.toString()}
          icon={<Users size={18} />}
          color="amber"
        />
        <StatsCard
          title="Active Now"
          value={loading ? '…' : sessions.length.toString()}
          icon={<Activity size={18} />}
          color="green"
          subtitle="Last hour"
        />
        <StatsCard
          title="Avg Score"
          value={loading ? '…' : (avgScore !== null ? `${avgScore}%` : '—')}
          icon={<TrendingUp size={18} />}
          color="brand"
          subtitle="Last hour"
        />
      </div>

      {/* ── Live Activity ── */}
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
            subtitle="Quiz attempt activity in the last hour"
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 py-8 text-center">Loading…</p>
        ) : liveGroups.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Activity size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">No active quiz sessions right now</p>
            <p className="text-xs text-slate-400 mt-1">Students taking quizzes will appear here in real time.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {liveGroups.map(group => (
              <div key={group.title} className="border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 transition-colors">
                <p className="text-sm font-semibold text-slate-800 mb-3 truncate">{group.title}</p>
                <div className="flex items-center gap-2">
                  <Play size={13} className="text-green-600" />
                  <span className="text-2xl font-bold text-slate-800">{group.count}</span>
                  <span className="text-xs text-slate-400">student{group.count !== 1 ? 's' : ''} active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Recent attempts table ── */}
      {!loading && sessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100/60 shadow-sm p-5">
          <CardHeader title="Recent Quiz Attempts" subtitle="Students who took quizzes in the last hour" />
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-slate-400 border-b border-slate-100">
                  <th className="pb-2 text-left font-semibold">Student</th>
                  <th className="pb-2 text-left font-semibold">Level</th>
                  <th className="pb-2 text-right font-semibold">Score</th>
                  <th className="pb-2 text-right font-semibold">Correct</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sessions.slice(0, 10).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 pr-4 font-medium text-slate-700 truncate max-w-[140px]">
                      {s.student?.name || `Student #${s.userId}`}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 truncate max-w-[120px]">
                      {s.levelTitle || `Level ${s.levelId}`}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-bold" style={{ color: (s.score || 0) >= 70 ? '#16a34a' : (s.score || 0) >= 40 ? '#d97706' : '#dc2626' }}>
                      {s.score || 0}%
                    </td>
                    <td className="py-2.5 text-right text-slate-500">
                      {s.correctCount ?? '—'}/{s.total ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
