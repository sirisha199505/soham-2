import { useEffect } from 'react';
import {
  Lock, CheckCircle, ArrowRight, Hash, Trophy, Clock,
  BookOpen, Star, ChevronRight, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { useTheme } from '../../context/ThemeContext';
import { formatUniqueId } from '../../utils/uniqueId';
import { LEVELS } from '../../utils/levelData';
import { getPerformanceLabel } from '../../utils/helpers';

// Colors for admin-created levels that don't have a matching entry in the hardcoded LEVELS array
const FALLBACK_COLORS = [
  { from: '#3BC0EF', to: '#1E3A8A' },
  { from: '#8B5CF6', to: '#6d28d9' },
  { from: '#10B981', to: '#047857' },
  { from: '#F59E0B', to: '#D97706' },
  { from: '#EF4444', to: '#B91C1C' },
  { from: '#EC4899', to: '#BE185D' },
];

// Build the visible level list from the DB-driven levelSettings map so that
// admin-created levels with any DB ID are shown, not just hardcoded IDs 1–3.
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

/* ─────────────────────────────────────────────────────────────── */
/*  Welcome banner                                                 */
/* ─────────────────────────────────────────────────────────────── */
function WelcomeBanner({ greeting, displayId, colors, completedCount, totalLevels }) {
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
            Welcome, Student
          </h1>
          <p className="text-white/50 text-sm flex items-center gap-1.5">
            <Hash size={13} />
            Your quiz ID:&nbsp;
            <span className="font-mono font-bold text-white/90 tracking-widest">{displayId}</span>
          </p>
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
              style={{ width: `${(completedCount / totalLevels) * 100}%`, background: '#facc15' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Level Card                                                     */
/* ─────────────────────────────────────────────────────────────── */
function LevelCard({ level, status, levelData, levelSettings }) {
  const isLocked    = status === 'locked';
  const isCompleted = status === 'completed';
  const isUnlocked  = status === 'unlocked';

  const timeLimit   = Number(levelSettings?.[level.id]?.timeLimit) || 10;
  const score       = levelData?.score;
  const lastScore   = levelData?.lastScore;

  const lastAttemptAt = levelData?.lastCompletedAt
    ? new Date(levelData.lastCompletedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const scorePct   = score?.pct ?? 0;
  const perf       = getPerformanceLabel(scorePct);
  const scoreColor = { text: perf.color, bg: perf.bg, border: perf.border };

  const showLastAttempt = lastScore && lastScore.pct !== scorePct;

  const headerGradient =
    isLocked   ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
    `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`;

  const statusLabel =
    isLocked    ? 'Locked' :
    isCompleted ? 'Completed' :
                  'Ready';

  const StatusIcon = isLocked ? Lock : isCompleted ? CheckCircle : Zap;

  const borderColor =
    isCompleted ? `${level.color.from}40` :
    '#f1f5f9';

  return (
    <div
      className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300"
      style={{ borderColor, opacity: isLocked ? 0.75 : 1 }}
    >
      {/* Header */}
      <div className="relative p-5 pb-4 overflow-hidden" style={{ background: headerGradient }}>
        <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-10 blur-[40px] bg-white" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-0.5">
              {statusLabel}
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

        <div className="relative z-10 flex items-center gap-1.5 mt-3">
          {isLocked    && <><Lock size={11} className="text-white/60" /><span className="text-white/50 text-xs">Awaiting Admin unlock</span></>}
          {isCompleted && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-1.5 rounded-full" style={{ width: i === 0 ? 20 : 8, background: 'rgba(255,255,255,0.9)' }} />
          ))}
          {isUnlocked  && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-1.5 rounded-full" style={{ width: i === 0 ? 20 : 8, background: i === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
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

        {/* Score (if completed) */}
        {isCompleted && score && (
          <div className="space-y-1.5">
            <div className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: scoreColor.bg, border: `1px solid ${scoreColor.border}` }}>
              <Trophy size={20} style={{ color: scoreColor.text }} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold leading-none" style={{ color: scoreColor.text, fontFamily: 'Space Grotesk' }}>
                    {scorePct}%
                  </p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: scoreColor.border, color: scoreColor.text }}>
                    {perf.emoji} {perf.label}
                  </span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: scoreColor.text }}>
                  {score.correct}/{score.total} correct
                </p>
              </div>
            </div>

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

        {isCompleted && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-green-50 border border-green-200 text-green-700 justify-center">
              <CheckCircle size={14} /> Completed
            </div>
            {/* <Link
              to={`/level/${level.id}/quiz`}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] w-full"
              style={{
                background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
              }}
            >
              Retake Quiz <ArrowRight size={13} />
            </Link> */}
          </div>
        )}

        {isUnlocked && (
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
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Skeleton card (shown while progress is loading)               */
/* ─────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */
export default function StudentDashboard() {
  const { user }  = useAuth();
  const {
    getLevelStatus, getLevel, levelSettings, levelSettingsLoaded,
    refreshLevelSettings, progressFetched,
  } = useLevel();
  const { colors } = useTheme();

  // Re-fetch level settings each time the student opens their dashboard
  // so admin active/inactive/delete changes are reflected without a full re-login
  useEffect(() => { refreshLevelSettings(); }, []);

  const displayId = user?.uniqueId ? `#${formatUniqueId(user.uniqueId)}` : '#Student';
  const hours     = new Date().getHours();
  const greeting  = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  const userId    = user?.uniqueId;

  // Progress is considered loaded once the fetch completed for this user.
  // While loading we show skeletons instead of level cards — this prevents
  // the brief "Start Level 1" flash on every login/page-refresh.
  const isProgressLoading = userId ? !progressFetched[userId] : false;

  // Only show levels that the admin has explicitly created in the DB.
  // Show nothing (skeletons) while settings are still loading.
  const visibleLevels = levelSettingsLoaded ? buildLevelList(levelSettings) : [];

  const statuses = isProgressLoading
    ? visibleLevels.map(() => 'loading')
    : visibleLevels.map(l => getLevelStatus(userId, l.id));

  const completedCount = isProgressLoading
    ? 0
    : statuses.filter(s => s === 'completed').length;

  const isSettingsLoading = !levelSettingsLoaded;
  const noLevels = levelSettingsLoaded && visibleLevels.length === 0;

  return (
    <div className="min-h-full px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* 1 — Welcome banner */}
      <WelcomeBanner
        greeting={greeting}
        displayId={displayId}
        colors={colors}
        completedCount={completedCount}
        totalLevels={visibleLevels.length}
      />

      {isSettingsLoading ? (
        /* ── Still fetching from DB — show 1 skeleton so layout doesn't jump ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <LevelCardSkeleton />
        </div>
      ) : noLevels ? (
        /* ── No levels configured by admin ── */
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
          {/* 2 — Section label */}
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

          {/* 4 — Level cards grid (skeletons while progress loads) */}
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
                  />
                ))
            }
          </div>
        </>
      )}

    </div>
  );
}
