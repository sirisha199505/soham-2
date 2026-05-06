import { Hash, CheckCircle, BookOpen, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { useTheme } from '../../context/ThemeContext';
import { formatUniqueId } from '../../utils/uniqueId';
import { LEVELS } from '../../utils/levelData';
import { getPerformanceLabel } from '../../utils/helpers';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

export default function StudentProfile() {
  const { user }          = useAuth();
  const { getLevel }      = useLevel();
  const { colors }        = useTheme();

  const userId    = user?.uniqueId;
  const displayId = userId ? formatUniqueId(userId) : '—';

  // ── Single source of truth: LevelContext (same as Dashboard) ──────────────
  const levelResults = LEVELS.map(l => ({
    ...l,
    data: getLevel(userId, l.id),
  })).filter(l => l.data?.status === 'completed' && l.data?.score);

  const completedCount = levelResults.length;

  const avgScore = completedCount > 0
    ? Math.round(levelResults.reduce((s, l) => s + (l.data.score.pct ?? 0), 0) / completedCount)
    : null;

  const bestScore = completedCount > 0
    ? Math.max(...levelResults.map(l => l.data.score.pct ?? 0))
    : null;

  const scoreColor = (pct) => {
    const p = getPerformanceLabel(pct);
    return { bg: p.bg, color: p.color, border: p.border, label: `${p.emoji} ${p.label}` };
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>My Profile</h1>

      {/* Identity card */}
      <Card>
        <div className="flex flex-col items-center text-center py-4">
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
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100 max-w-xs mx-auto w-full">
          {[
            { value: completedCount,                              label: 'Levels Done'  },
            { value: avgScore !== null ? `${avgScore}%` : '—',   label: 'Avg Score'    },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-bold text-slate-800 text-xl" style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Level results — same data as Dashboard */}
      <Card>
        <CardHeader title="Exam Level Results" subtitle="Scores shown match your Dashboard" />

        {levelResults.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400 text-sm">No levels completed yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {levelResults.map((l) => {
              const pct = l.data.score.pct ?? 0;
              const sc  = scoreColor(pct);
              const completedAt = l.data.lastCompletedAt
                ? new Date(l.data.lastCompletedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : null;
              return (
                <div key={l.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: `linear-gradient(135deg, ${l.color.from}, ${l.color.to})` }}
                  >
                    {l.id}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{l.title}</p>
                    <p className="text-xs text-slate-400">{l.subtitle}{completedAt ? ` · ${completedAt}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: sc.border, color: sc.color }}>
                      {sc.label}
                    </span>
                    <span className="text-sm font-bold px-2.5 py-1 rounded-xl" style={{ background: sc.bg, color: sc.color }}>
                      {pct}%
                    </span>
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
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `${colors.primary}15` }}>
              <Trophy size={22} style={{ color: colors.primary }} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Best Level Score</p>
              <p className="text-2xl font-bold" style={{ color: colors.primary, fontFamily: 'Space Grotesk' }}>{bestScore}%</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
