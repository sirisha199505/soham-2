import { Hash, CheckCircle, BookOpen, Target } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatUniqueId } from '../../utils/uniqueId';
import { mockQuizzes } from '../../utils/mockData';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function StudentProfile() {
  const { user, completedQuizzes, getQuizResult } = useAuth();
  const { colors } = useTheme();

  const displayId = user?.uniqueId ? formatUniqueId(user.uniqueId) : '—';

  const history = mockQuizzes
    .filter(q => completedQuizzes.has(q.id))
    .map(q => ({ ...q, result: getQuizResult(q.id) }));

  const avgScore = history.length > 0
    ? Math.round(history.reduce((sum, q) => sum + (q.result?.pct ?? 0), 0) / history.length)
    : null;

  const bestScore = history.length > 0
    ? Math.max(...history.map(q => q.result?.pct ?? 0))
    : null;

  const remaining = mockQuizzes.length - completedQuizzes.size;

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>My Profile</h1>

      {/* Identity card */}
      <Card>
        <div className="flex flex-col items-center text-center py-4">
          {/* Anonymous avatar */}
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
            style={{ background: `linear-gradient(135deg, ${colors.primary}25, ${colors.accent}15)`, border: `2px solid ${colors.primary}30` }}
          >
            <Hash size={32} style={{ color: colors.primary }} />
          </div>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Student ID</p>
          <p className="text-3xl font-bold font-mono tracking-[0.15em]" style={{ color: colors.primary, fontFamily: 'Space Grotesk' }}>
            {displayId}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <Badge variant="primary">Student</Badge>
            <Badge variant="success" dot>Active</Badge>
          </div>

          <p className="text-xs text-slate-400 mt-3 max-w-xs">
            Your identity on this platform is your unique ID only. No personal information is stored or displayed.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          {[
            { value: completedQuizzes.size, label: 'Completed' },
            { value: avgScore !== null ? `${avgScore}%` : '—',  label: 'Avg Score'  },
            { value: remaining,             label: 'Remaining'  },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-bold text-slate-800 text-xl" style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Quiz results */}
      <Card>
        <CardHeader title="My Quiz Results" subtitle="All quizzes you have submitted" />

        {history.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400 text-sm">No quizzes completed yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((q, i) => {
              const pct = q.result?.pct ?? null;
              return (
                <div key={q.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{q.title}</p>
                    <p className="text-xs text-slate-400">{q.topic}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pct !== null ? (
                      <span
                        className="text-sm font-bold px-3 py-1 rounded-xl"
                        style={pct >= 70
                          ? { background: '#f0fdf4', color: '#16a34a' }
                          : pct >= 40
                          ? { background: '#fefce8', color: '#d97706' }
                          : { background: '#fef2f2', color: '#dc2626' }}
                      >
                        {pct}%
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                    <CheckCircle size={15} className="text-green-500" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Best score highlight */}
      {bestScore !== null && (
        <Card>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${colors.secondary}20` }}
            >
              <Target size={22} style={{ color: colors.secondary }} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Best Score</p>
              <p className="text-2xl font-bold" style={{ color: colors.secondary, fontFamily: 'Space Grotesk' }}>{bestScore}%</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
