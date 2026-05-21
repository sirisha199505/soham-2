import { Hash, CheckCircle, BookOpen, Trophy, Clock, XCircle, Target, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { useTheme } from '../../context/ThemeContext';
import { formatUniqueId } from '../../utils/uniqueId';
import { LEVELS } from '../../utils/levelData';
import { getPerformanceLabel, formatDuration } from '../../utils/helpers';
import Card, { CardHeader } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const FALLBACK_COLORS = [
  { from: '#3BC0EF', to: '#1E3A8A' },
  { from: '#8B5CF6', to: '#6d28d9' },
  { from: '#10B981', to: '#047857' },
  { from: '#F59E0B', to: '#D97706' },
  { from: '#EF4444', to: '#B91C1C' },
  { from: '#EC4899', to: '#BE185D' },
];

function buildLevelList(levelSettingsMap) {
  return Object.values(levelSettingsMap)
    .sort((a, b) => (a.order || a.id) - (b.order || b.id))
    .map((dbLevel, idx) => {
      const staticLevel = LEVELS.find(l => l.id === dbLevel.id);
      if (staticLevel) return staticLevel;
      return {
        id:       dbLevel.id,
        title:    dbLevel.title    || `Level ${dbLevel.id}`,
        subtitle: dbLevel.subtitle || '',
        color:    FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      };
    });
}

export default function StudentProfile() {
  const { user }                                   = useAuth();
  const { getLevel, levelSettings, levelSettingsLoaded, progressFetched } = useLevel();
  const { colors }                                 = useTheme();

  const userId    = user?.uniqueId;
  const displayId = userId ? formatUniqueId(userId) : '—';

  const isLoading = !levelSettingsLoaded || !progressFetched[userId];

  const allLevels = buildLevelList(levelSettings);

  const levelResults = allLevels.map(l => ({
    ...l,
    data: getLevel(userId, l.id),
  })).filter(l => l.data?.status === 'completed' && l.data?.score);

  const completedCount = levelResults.length;
  const totalLevels    = allLevels.length;

  const avgScore = completedCount > 0
    ? Math.round(levelResults.reduce((s, l) => s + (l.data.score.pct ?? 0), 0) / completedCount)
    : null;

  const bestLevel = completedCount > 0
    ? levelResults.reduce((best, l) =>
        (l.data.score.pct ?? 0) > (best.data.score.pct ?? 0) ? l : best
      , levelResults[0])
    : null;

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
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          {[
            { value: isLoading ? '—' : completedCount,                        label: 'Completed' },
            { value: isLoading ? '—' : totalLevels,                           label: 'Total Levels' },
            { value: isLoading || avgScore === null ? '—' : `${avgScore}%`,   label: 'Avg Score' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-bold text-slate-800 text-xl" style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Exam Level Results */}
      <Card>
        <CardHeader title="Exam Level Results" subtitle="Your scores for each completed level" />

        {isLoading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-slate-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Loading results…</span>
          </div>
        ) : levelResults.length === 0 ? (
          <div className="py-10 text-center">
            <BookOpen size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400 text-sm font-medium">No levels completed yet</p>
            <p className="text-slate-300 text-xs mt-1">Complete a level quiz to see your results here.</p>
          </div>
        ) : (
          <div className="space-y-4 mt-1">
            {levelResults.map((l) => {
              const score       = l.data.score;
              const pct         = score.pct ?? 0;
              const correct     = score.correct ?? 0;
              const total       = score.total   ?? 0;
              // wrong+skipped combined — DB only stores correct & total
              const notCorrect  = total - correct;
              const timeTaken   = score.timeTaken;
              const perf        = getPerformanceLabel(pct);

              const completedAt = l.data.lastCompletedAt || l.data.completedAt;
              const dateStr = completedAt
                ? new Date(completedAt).toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })
                : null;

              return (
                <div key={l.id} className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                  {/* Level header */}
                  <div
                    className="px-5 py-4 flex items-center gap-4"
                    style={{ background: `linear-gradient(135deg, ${l.color.from}, ${l.color.to})` }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {l.id}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold truncate" style={{ fontFamily: 'Space Grotesk' }}>{l.title}</p>
                      {l.subtitle && <p className="text-white/70 text-xs truncate">{l.subtitle}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-3xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>{pct}%</p>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
                      >
                        {perf.emoji} {perf.label}
                      </span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="bg-white px-5 py-4">
                    <div className="grid grid-cols-3 gap-3">
                      {/* Correct */}
                      <div className="flex items-center gap-2.5 bg-green-50 rounded-xl px-3 py-2.5 border border-green-100">
                        <CheckCircle size={16} className="text-green-500 shrink-0" />
                        <div>
                          <p className="text-lg font-bold text-green-700">{correct}</p>
                          <p className="text-[10px] text-green-500 font-medium">Correct</p>
                        </div>
                      </div>

                      {/* Not Correct (wrong + skipped) */}
                      <div className="flex items-center gap-2.5 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
                        <XCircle size={16} className="text-red-400 shrink-0" />
                        <div>
                          <p className="text-lg font-bold text-red-600">{notCorrect}</p>
                          <p className="text-[10px] text-red-400 font-medium">Incorrect</p>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex items-center gap-2.5 bg-indigo-50 rounded-xl px-3 py-2.5 border border-indigo-100">
                        <Target size={16} className="text-indigo-400 shrink-0" />
                        <div>
                          <p className="text-lg font-bold text-indigo-600">{total}</p>
                          <p className="text-[10px] text-indigo-400 font-medium">Total Qs</p>
                        </div>
                      </div>
                    </div>

                    {/* Time & date row */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock size={12} />
                        {timeTaken != null
                          ? <span>Time taken: <span className="font-semibold text-slate-600">{formatDuration(timeTaken)}</span></span>
                          : <span>Time data unavailable</span>
                        }
                      </div>
                      {dateStr && (
                        <span className="text-xs text-slate-400">
                          Completed: <span className="font-semibold text-slate-600">{dateStr}</span>
                        </span>
                      )}
                    </div>

                    {/* Score bar */}
                    <div className="mt-3">
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${l.color.from}, ${l.color.to})`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Best performance highlight */}
      {!isLoading && bestLevel && (
        <Card>
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: `linear-gradient(135deg, ${bestLevel.color.from}30, ${bestLevel.color.to}15)` }}
            >
              <Trophy size={22} style={{ color: bestLevel.color.from }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-400 font-medium">Best Performance</p>
              <p className="text-sm font-semibold text-slate-700 truncate">{bestLevel.title}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold" style={{ color: bestLevel.color.from, fontFamily: 'Space Grotesk' }}>
                {bestLevel.data.score.pct}%
              </p>
              <p className="text-[10px] text-slate-400">Best score</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
