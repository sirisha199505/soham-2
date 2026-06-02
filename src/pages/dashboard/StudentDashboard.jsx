import { useEffect, useState, useMemo } from 'react';
import {
  Lock, CheckCircle, ArrowRight, Trophy, Clock,
  BookOpen, Star, ChevronRight, Zap, RotateCcw, Hash, Target,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../utils/api';
import { LEVELS } from '../../utils/levelData';
import { getPerformanceLabel } from '../../utils/helpers';

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
        id:          dbLevel.id,
        title:       dbLevel.title       || `Level ${dbLevel.id}`,
        subtitle:    dbLevel.subtitle    || '',
        description: dbLevel.description || '',
        color:       FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      };
    });
}

/* ── Attempt meter bar ──────────────────────────────────────────── */
function AttemptMeter({ used, limit, color }) {
  const remaining = Math.max(0, limit - used);
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const barColor = remaining === 0 ? '#ef4444' : remaining === 1 ? '#f59e0b' : color;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] font-semibold">
        <span className="text-slate-400">Attempts</span>
        <span style={{ color: barColor }}>{remaining} remaining</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{used} used</span>
        <span>{limit} total</span>
      </div>
    </div>
  );
}

/* ── Welcome banner ─────────────────────────────────────────────── */
function WelcomeBanner({ greeting, userName, colors, completedCount, totalLevels }) {
  return (
    <div
      className="relative rounded-2xl lg:rounded-3xl overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${colors.accent} 0%, #0a2050 60%, #051030 100%)` }}
    >
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 blur-[100px]"
        style={{ background: colors.primary }} />
      <div className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10 blur-[80px]"
        style={{ background: '#818cf8' }} />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5 p-6 md:p-8 lg:p-10">
        <div className="space-y-2">
          <p className="text-white/60 text-sm font-medium">{greeting}!</p>
          <h1 className="text-3xl lg:text-4xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
            Welcome{userName ? `, ${userName.split(' ')[0]}` : ' back'}
          </h1>
        </div>

        <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-2xl backdrop-blur-sm"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <Star size={18} className="text-amber-300" />
            <div>
              <p className="text-white font-bold text-lg leading-none">{completedCount} / {totalLevels}</p>
              <p className="text-white/60 text-xs mt-0.5">Levels completed</p>
            </div>
          </div>
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: totalLevels > 0 ? `${(completedCount / totalLevels) * 100}%` : '0%', background: '#facc15' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Attempt Tracker summary bar ────────────────────────────────── */
function AttemptTrackerBar({ levels, levelSettings, attemptsByLevel }) {
  if (!levels.length) return null;

  const rows = levels.map(level => {
    const limit = levelSettings[level.id]?.attemptLimit ?? 3;
    const used  = attemptsByLevel[String(level.id)] || 0;
    const remaining = Math.max(0, limit - used);
    return { level, limit, used, remaining };
  });

  const totalUsed      = rows.reduce((s, r) => s + r.used, 0);
  const totalAllowed   = rows.reduce((s, r) => s + r.limit, 0);
  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Summary header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-50">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#4F46E515' }}>
          <Hash size={16} style={{ color: '#4F46E5' }} />
        </div>
        <div className="flex-1">
          <p className="font-bold text-slate-800 text-sm">Quiz Attempt Tracker</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Track how many attempts you have left for each level</p>
        </div>
        <div className="flex items-center gap-5 shrink-0">
          {[
            { label: 'Total Allowed', val: totalAllowed, color: '#4F46E5' },
            { label: 'Completed',     val: totalUsed,    color: '#10B981' },
            { label: 'Remaining',     val: totalRemaining, color: totalRemaining === 0 ? '#ef4444' : '#F59E0B' },
          ].map(s => (
            <div key={s.label} className="text-center hidden sm:block">
              <p className="text-xl font-bold leading-none" style={{ color: s.color, fontFamily: 'Space Grotesk' }}>{s.val}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-level rows */}
      <div className="divide-y divide-slate-50">
        {rows.map(({ level, limit, used, remaining }) => {
          const color = level.color?.from || '#4F46E5';
          const pct   = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
          const barColor = remaining === 0 ? '#ef4444' : remaining === 1 ? '#f59e0b' : color;
          return (
            <div key={level.id} className="flex items-center gap-4 px-5 py-3">
              <div className="w-7 h-7 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0"
                style={{ background: `linear-gradient(135deg, ${color}, ${level.color?.to || color})` }}>
                L{level.id}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate">{level.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: barColor }} />
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{used}/{limit}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: remaining === 0 ? '#fef2f2' : remaining === 1 ? '#fffbeb' : '#f0fdf4',
                    color:      remaining === 0 ? '#dc2626' : remaining === 1 ? '#d97706' : '#16a34a',
                  }}>
                  {remaining === 0 ? 'No attempts left' : `${remaining} left`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Level Card ─────────────────────────────────────────────────── */
function LevelCard({ level, status, levelData, levelSettings, attemptCount }) {
  const isLocked    = status === 'locked';
  const isCompleted = status === 'completed';
  const isUnlocked  = status === 'unlocked';

  const attemptLimit = levelSettings?.[level.id]?.attemptLimit ?? 3;
  const remaining    = Math.max(0, attemptLimit - attemptCount);

  const timeLimit  = Number(levelSettings?.[level.id]?.timeLimit) || 10;
  const score      = levelData?.score;
  const lastScore  = levelData?.lastScore;

  const lastAttemptAt = levelData?.lastCompletedAt
    ? new Date(levelData.lastCompletedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const scorePct    = score?.pct ?? 0;
  const perf        = getPerformanceLabel(scorePct);
  const scoreColor  = { text: perf.color, bg: perf.bg, border: perf.border };
  const showLastAttempt = lastScore && lastScore.pct !== scorePct;

  const headerGradient =
    isLocked ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
    `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`;

  const StatusIcon = isLocked ? Lock : isCompleted ? CheckCircle : Zap;

  return (
    <div
      className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300"
      style={{ borderColor: isCompleted ? `${level.color.from}40` : '#f1f5f9', opacity: isLocked ? 0.75 : 1 }}
    >
      {/* Header */}
      <div className="relative p-5 pb-4 overflow-hidden" style={{ background: headerGradient }}>
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-10 blur-[40px] bg-white" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-0.5">
              {isLocked ? 'Locked' : isCompleted ? 'Completed' : 'Ready'}
            </p>
            <h3 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
              {level.title}
            </h3>
            <p className="text-white/80 text-sm font-medium mt-0.5">{level.subtitle}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <StatusIcon size={18} className="text-white" />
          </div>
        </div>

        {/* Attempt badge on header */}
        {!isLocked && (
          <div className="relative z-10 mt-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}>
              <Target size={10} />
              {remaining === 0 ? 'No attempts left' : `${remaining} of ${attemptLimit} attempts left`}
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-5 space-y-4">
        <p className="text-sm text-slate-500 leading-relaxed">{level.description}</p>

        {/* Meta pills */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <BookOpen size={13} />, label: 'Questions', value: `${levelSettings?.[level.id]?.questionCount ?? 0} Qs` },
            { icon: <Clock    size={13} />, label: 'Time Limit', value: `${timeLimit} Min` },
          ].map(m => (
            <div key={m.label} className="bg-slate-50 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="text-slate-400">{m.icon}</span>
              <div>
                <p className="text-[10px] text-slate-400">{m.label}</p>
                <p className="text-xs font-bold text-slate-700">{m.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Attempt meter */}
        {!isLocked && (
          <AttemptMeter used={attemptCount} limit={attemptLimit} color={level.color.from} />
        )}

        {/* Score (if completed) */}
        {isCompleted && score && (
          <div className="space-y-1.5">
            {/* Best Score block */}
            <div className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: scoreColor.bg, border: `1px solid ${scoreColor.border}` }}>
              <Trophy size={20} style={{ color: scoreColor.text }} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                    Best Score
                  </span>
                  <p className="text-lg font-bold leading-none" style={{ color: scoreColor.text, fontFamily: 'Space Grotesk' }}>
                    {scorePct}%
                  </p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: scoreColor.border, color: scoreColor.text }}>
                    {perf.emoji} {perf.label}
                  </span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${scorePct >= 50 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {scorePct >= 50 ? '✓ Passed' : '✗ Failed'}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: scoreColor.text }}>
                  {score.correct}/{score.total} correct
                </p>
              </div>
            </div>

            {/* Last attempt row (shown only when it differs from best) */}
            {showLastAttempt && (
              <div className="rounded-xl px-3 py-2 flex items-center justify-between"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <span className="text-[10px] text-slate-400 font-medium">Last attempt</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">{lastScore.pct}%</span>
                  <span className="text-[10px] text-slate-400">
                    {lastScore.correct}/{lastScore.total} · {lastAttemptAt}
                  </span>
                </div>
              </div>
            )}
            {!showLastAttempt && lastAttemptAt && (
              <p className="text-[10px] text-slate-400 text-right">{lastAttemptAt}</p>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Progress</span>
            <span>{isCompleted ? '100%' : isLocked ? '0%' : 'In Progress'}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: isCompleted ? '100%' : '0%',
                background: isLocked
                  ? '#94a3b8'
                  : `linear-gradient(90deg, ${level.color.from}, ${level.color.to})`,
              }}
            />
          </div>
        </div>

        {/* CTA */}
        {isLocked && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 w-full py-3 rounded-xl text-slate-400 text-sm font-semibold bg-slate-50 border border-slate-200 justify-center cursor-not-allowed select-none">
              <Lock size={14} /> Locked
            </div>
            <p className="text-[11px] text-slate-400 text-center leading-snug px-1">
              {levelSettings?.[level.id]?.active === false
                ? 'This level has been disabled by the Administrator.'
                : 'This level is currently locked. Please wait for the Administrator to unlock it.'}
            </p>
          </div>
        )}

        {isCompleted && remaining > 0 && (
          <div className="space-y-2">
            <Link
              to={`/level/${level.id}/quiz`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
                boxShadow: `0 4px 16px ${level.color.from}40`,
              }}
            >
              <RotateCcw size={14} /> Retake Quiz
              <span className="text-[10px] opacity-80 ml-1">({remaining} left)</span>
            </Link>
          </div>
        )}

        {isCompleted && remaining === 0 && (
          <div className="flex items-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-slate-50 border border-slate-200 text-slate-400 justify-center cursor-not-allowed select-none">
            <CheckCircle size={14} /> All Attempts Used
          </div>
        )}

        {isUnlocked && remaining > 0 && (
          <Link
            to={`/level/${level.id}/quiz`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
              boxShadow: `0 4px 16px ${level.color.from}40`,
            }}
          >
            <BookOpen size={15} /> Start Quiz
          </Link>
        )}

        {isUnlocked && remaining === 0 && (
          <div className="flex items-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-slate-50 border border-slate-200 text-slate-400 justify-center cursor-not-allowed select-none">
            <Lock size={14} /> No Attempts Remaining
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Skeleton card ──────────────────────────────────────────────── */
function LevelCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
      <div className="h-28 bg-slate-200" />
      <div className="p-5 space-y-3">
        <div className="h-3 bg-slate-100 rounded-full w-3/4" />
        <div className="h-3 bg-slate-100 rounded-full w-1/2" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 bg-slate-100 rounded-xl" />
          <div className="h-12 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-10 bg-slate-100 rounded-xl" />
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────── */
export default function StudentDashboard() {
  const { user }  = useAuth();
  const {
    getLevelStatus, getLevel, levelSettings, levelSettingsLoaded,
    refreshLevelSettings, progressFetched,
  } = useLevel();
  const { colors } = useTheme();

  // Fetch all attempts so we can compute per-level counts
  const [attempts,       setAttempts]      = useState([]);
  const [attemptsLoaded, setAttemptsLoaded] = useState(false);

  useEffect(() => { refreshLevelSettings(); }, []);

  useEffect(() => {
    if (!user?.id) return;
    api.getAttempts(user.id)
      .then(data => setAttempts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setAttemptsLoaded(true));
  }, [user?.id]);

  // Map: levelId → attempt count
  const attemptsByLevel = useMemo(() => {
    const map = {};
    attempts.forEach(a => {
      const k = String(a.levelId);
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }, [attempts]);

  const hours    = new Date().getHours();
  const greeting = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  const userId   = user?.id;

  const isProgressLoading = userId ? !progressFetched[userId] : false;
  const visibleLevels = levelSettingsLoaded ? buildLevelList(levelSettings) : [];

  const statuses = isProgressLoading
    ? visibleLevels.map(() => 'loading')
    : visibleLevels.map(l => getLevelStatus(userId, l.id));

  const completedCount = isProgressLoading ? 0 : statuses.filter(s => s === 'completed').length;

  const isSettingsLoading = !levelSettingsLoaded;
  const noLevels = levelSettingsLoaded && visibleLevels.length === 0;

  return (
    <div className="min-h-full px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* Welcome banner */}
      <WelcomeBanner
        greeting={greeting}
        userName={user?.name}
        colors={colors}
        completedCount={completedCount}
        totalLevels={visibleLevels.length}
      />

      {isSettingsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <LevelCardSkeleton />
        </div>
      ) : noLevels ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-16 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <BookOpen size={28} className="text-slate-400" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>
              No Exam Levels Available
            </h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Your administrator hasn't configured any exam levels yet. Please check back later.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Attempt tracker */}
          {/* Section label */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{ background: colors.primary }} />
            <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
              Exam Levels
            </h2>
            {!isProgressLoading && (
              <span className="text-xs text-slate-400 font-medium">
                Levels are unlocked by your Administrator
              </span>
            )}
          </div>

          {/* Level cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {isProgressLoading
              ? visibleLevels.map((_, i) => <LevelCardSkeleton key={i} />)
              : visibleLevels.map((level, i) => (
                  <LevelCard
                    key={level.id}
                    level={level}
                    status={statuses[i]}
                    levelData={getLevel(userId, level.id)}
                    levelSettings={levelSettings}
                    attemptCount={attemptsByLevel[String(level.id)] || 0}
                  />
                ))
            }
          </div>
        </>
      )}

    </div>
  );
}
