import {
  Lock, CheckCircle, ArrowRight, Hash, Trophy, Clock,
  BookOpen, Star, ChevronRight, Zap, AlertCircle, XCircle,
  Hourglass, ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLevel } from '../../context/LevelContext';
import { useTheme } from '../../context/ThemeContext';
import { formatUniqueId } from '../../utils/uniqueId';
import { LEVELS } from '../../utils/levelData';

function getLevelTimeLimit(levelId) {
  try {
    const s = JSON.parse(localStorage.getItem('rqa_level_settings') || '{}');
    return s[levelId]?.timeLimit ?? 10;
  } catch { return 10; }
}

/* ─────────────────────────────────────────────────────────────── */
/*  Welcome banner                                                 */
/* ─────────────────────────────────────────────────────────────── */
function WelcomeBanner({ greeting, displayId, colors, completedCount }) {
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
              <p className="text-white font-bold text-lg leading-none">{completedCount} / {LEVELS.length}</p>
              <p className="text-white/60 text-xs mt-0.5">Levels completed</p>
            </div>
          </div>
          <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-700"
              style={{ width: `${(completedCount / LEVELS.length) * 100}%`, background: '#facc15' }}
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
function LevelCard({ level, status, levelData }) {
  const isLocked    = status === 'locked';
  const isPending   = status === 'pending_approval';
  const isRejected  = status === 'rejected';
  const isCompleted = status === 'completed';
  const isUnlocked  = status === 'unlocked';

  const timeLimit  = getLevelTimeLimit(level.id);
  const score      = levelData?.score;
  const submittedAt = levelData?.completedAt
    ? new Date(levelData.completedAt).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  const scorePct = score?.pct ?? 0;
  const scoreColor =
    scorePct >= 75 ? { text: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' } :
    scorePct >= 50 ? { text: '#d97706', bg: '#fffbeb', border: '#fde68a' } :
                     { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' };

  /* derive header gradient and icon */
  const headerGradient =
    isLocked   ? 'linear-gradient(135deg, #94a3b8, #64748b)' :
    isPending  ? 'linear-gradient(135deg, #f59e0b, #d97706)' :
    isRejected ? 'linear-gradient(135deg, #ef4444, #b91c1c)' :
    `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`;

  const statusLabel =
    isLocked   ? 'Locked' :
    isPending  ? 'Awaiting Approval' :
    isRejected ? 'Access Denied' :
    isCompleted? 'Completed' :
                 'Ready';

  const StatusIcon = isLocked ? Lock : isPending ? Hourglass : isRejected ? XCircle : isCompleted ? CheckCircle : Zap;

  /* border colour */
  const borderColor =
    isPending  ? '#fde68a' :
    isRejected ? '#fecaca' :
    isCompleted? `${level.color.from}40` :
    '#f1f5f9';

  return (
    <div
      className="bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-300"
      style={{
        borderColor,
        opacity: isLocked ? 0.75 : 1,
        boxShadow: (isPending || isRejected) ? '0 0 0 1px ' + borderColor : undefined,
      }}
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

        {/* Sub-label row */}
        <div className="relative z-10 flex items-center gap-1.5 mt-3">
          {isLocked    && <><Lock     size={11} className="text-white/60" /><span className="text-white/50 text-xs">Complete previous level to unlock</span></>}
          {isPending   && <><Hourglass size={11} className="text-white/80"/><span className="text-white/80 text-xs font-semibold">Waiting for admin approval</span></>}
          {isRejected  && <><XCircle  size={11} className="text-white/80" /><span className="text-white/80 text-xs font-semibold">Access denied by admin</span></>}
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
            { icon: <BookOpen size={13} />, label: 'Questions', value: `${level.totalQuestions} Qs` },
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
          <div className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: scoreColor.bg, border: `1px solid ${scoreColor.border}` }}>
            <Trophy size={22} style={{ color: scoreColor.text }} className="shrink-0" />
            <div>
              <p className="text-lg font-bold leading-none" style={{ color: scoreColor.text, fontFamily: 'Space Grotesk' }}>
                {scorePct}%
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: scoreColor.text }}>
                {score.correct}/{score.total} correct · {submittedAt}
              </p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Progress</span>
            <span>
              {isCompleted ? '100%' : isLocked ? '0%' : isPending ? 'Pending' : isRejected ? 'Denied' : 'In Progress'}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: isCompleted ? '100%' : isPending ? '60%' : isRejected ? '60%' : '0%',
                background:
                  isLocked   ? '#94a3b8' :
                  isPending  ? '#f59e0b' :
                  isRejected ? '#ef4444' :
                  `linear-gradient(90deg, ${level.color.from}, ${level.color.to})`,
              }}
            />
          </div>
        </div>

        {/* ── CTA / Status button ── */}

        {isLocked && (
          <div className="flex items-center gap-2 w-full py-3 rounded-xl text-slate-400 text-sm font-semibold bg-slate-50 border border-slate-200 justify-center">
            <Lock size={14} /> Locked
          </div>
        )}

        {isPending && (
          <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
              <Hourglass size={14} /> Waiting for Admin Approval
            </div>
            <p className="text-xs text-amber-600">
              You have completed the previous level. An admin will review and grant access shortly.
            </p>
          </div>
        )}

        {isRejected && (
          <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-1">
            <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
              <XCircle size={14} /> Access Rejected
            </div>
            <p className="text-xs text-red-500">
              Your request to access this level was not approved. Please contact your administrator.
            </p>
          </div>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2 w-full py-3 rounded-xl text-sm font-semibold bg-green-50 border border-green-200 text-green-700 justify-center">
            <CheckCircle size={14} /> Completed
          </div>
        )}

        {isUnlocked && (
          <Link
            to={`/level/${level.id}/content`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`,
              boxShadow: `0 4px 16px ${level.color.from}40`,
            }}
          >
            Start Level <ArrowRight size={15} />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Step path indicator                                            */
/* ─────────────────────────────────────────────────────────────── */
function LevelPath({ statuses }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-2">
      {LEVELS.map((level, i) => {
        const st = statuses[i];
        const isCompleted = st === 'completed';
        const isUnlocked  = st === 'unlocked';
        const isPending   = st === 'pending_approval';
        const isRejected  = st === 'rejected';

        const nodeStyle =
          isCompleted
            ? { background: `linear-gradient(135deg, ${level.color.from}, ${level.color.to})`, color: '#fff' }
          : isUnlocked
            ? { background: `${level.color.from}20`, color: level.color.from, border: `2px solid ${level.color.from}` }
          : isPending
            ? { background: '#fef3c7', color: '#d97706', border: '2px solid #fde68a' }
          : isRejected
            ? { background: '#fee2e2', color: '#dc2626', border: '2px solid #fecaca' }
          : { background: '#f1f5f9', color: '#94a3b8', border: '2px solid #e2e8f0' };

        const NodeIcon =
          isCompleted ? <CheckCircle size={18} /> :
          isPending   ? <Hourglass   size={14} /> :
          isRejected  ? <XCircle     size={14} /> :
          level.id;

        return (
          <div key={level.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all" style={nodeStyle}>
                {NodeIcon}
              </div>
              <p className="text-[10px] font-semibold text-slate-400 text-center whitespace-nowrap">
                {level.title}
              </p>
            </div>
            {i < LEVELS.length - 1 && (
              <div
                className="w-16 md:w-24 h-0.5 mx-1 mb-4 rounded-full transition-all"
                style={{ background: isCompleted ? `linear-gradient(90deg, ${level.color.from}, ${LEVELS[i + 1].color.from})` : '#e2e8f0' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Approval notice banner (shown when any level is pending)       */
/* ─────────────────────────────────────────────────────────────── */
function ApprovalNoticeBanner({ statuses }) {
  const pendingLevels  = LEVELS.filter((l, i) => statuses[i] === 'pending_approval').map(l => l.title);
  const rejectedLevels = LEVELS.filter((l, i) => statuses[i] === 'rejected').map(l => l.title);

  if (!pendingLevels.length && !rejectedLevels.length) return null;

  return (
    <div className="space-y-2">
      {pendingLevels.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <Hourglass size={18} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              Approval Pending — {pendingLevels.join(', ')}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              You have completed the previous level. Your request is with the admin for approval. You will be notified once access is granted.
            </p>
          </div>
        </div>
      )}
      {rejectedLevels.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-800">
              Access Rejected — {rejectedLevels.join(', ')}
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              Access to {rejectedLevels.join(', ')} was not approved. Please contact your administrator for assistance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/*  Main Page                                                      */
/* ─────────────────────────────────────────────────────────────── */
export default function StudentDashboard() {
  const { user }  = useAuth();
  const { getLevelStatus, getLevel } = useLevel();
  const { colors } = useTheme();

  const displayId = user?.uniqueId ? `#${formatUniqueId(user.uniqueId)}` : '#Student';
  const hours     = new Date().getHours();
  const greeting  = hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  const userId    = user?.uniqueId;

  const statuses       = LEVELS.map(l => getLevelStatus(userId, l.id));
  const completedCount = statuses.filter(s => s === 'completed').length;

  return (
    <div className="min-h-full px-4 md:px-6 lg:px-8 py-6 space-y-6">

      {/* 1 — Welcome banner */}
      <WelcomeBanner
        greeting={greeting}
        displayId={displayId}
        colors={colors}
        completedCount={completedCount}
      />

      {/* 2 — Approval notice (conditional) */}
      <ApprovalNoticeBanner statuses={statuses} />

      {/* 3 — Level path */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
          Your Learning Path
        </p>
        <LevelPath statuses={statuses} />
      </div>

      {/* 4 — Section label */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 rounded-full" style={{ background: colors.primary }} />
        <h2 className="text-lg font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
          Exam Levels
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          Complete each level — admin approval required to proceed
        </span>
      </div>

      {/* 5 — Level cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {LEVELS.map((level, i) => (
          <LevelCard
            key={level.id}
            level={level}
            status={statuses[i]}
            levelData={getLevel(userId, level.id)}
            userId={userId}
          />
        ))}
      </div>

    </div>
  );
}
