import { useState, useEffect } from 'react';
import {
  User, Mail, Phone, School, Briefcase, BookOpen, LogOut,
  ShieldCheck, GraduationCap, Trophy, BarChart2, Target,
  CheckCircle, Lock, Clock, TrendingUp, Award, Activity,
  ChevronRight, KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLevel } from '../../context/LevelContext';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../../utils/api';

const LEVEL_COLORS = [
  { from: '#3BC0EF', to: '#1E3A8A' },
  { from: '#8B5CF6', to: '#6d28d9' },
  { from: '#10B981', to: '#047857' },
  { from: '#F59E0B', to: '#D97706' },
  { from: '#EF4444', to: '#B91C1C' },
  { from: '#EC4899', to: '#BE185D' },
];

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}15` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-slate-800 leading-none" style={{ fontFamily: 'Space Grotesk' }}>{value}</p>
        <p className="text-[11px] text-slate-400 font-semibold mt-0.5 truncate">{label}</p>
        {sub && <p className="text-[10px] text-slate-300 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, color }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3.5 py-3 border-b border-slate-50 last:border-0">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}10` }}>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const { colors }       = useTheme();
  const { getLevelStatus, getLevel, levelSettings, levelSettingsLoaded } = useLevel();
  const navigate         = useNavigate();

  const [attempts,   setAttempts]   = useState([]);
  const [statsReady, setStatsReady] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    api.getAttempts(user.id)
      .then(data => setAttempts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setStatsReady(true));
  }, [user?.id]);

  const isCoach   = user?.role === 'coach' || user?.role === 'teacher';
  const roleColor = isCoach ? '#FAAB34' : colors.primary;
  const RoleIcon  = isCoach ? Briefcase : GraduationCap;
  const roleLabel = isCoach ? 'Innovation Coach' : 'Student';

  const initials = (user?.name || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // ── Stats ──────────────────────────────────────────────────────────
  const scores = attempts.map(a => a.score?.pct ?? 0);
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const avgScore  = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  const sortedLevels = Object.values(levelSettings)
    .sort((a, b) => (a.order || a.id) - (b.order || b.id));

  const completedCount = sortedLevels.filter(
    lvl => getLevelStatus(user?.id, lvl.id) === 'completed'
  ).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const displayEmail = user?.email?.includes('@student.rq') ? null : user?.email;

  return (
    <div className="min-h-full bg-slate-50 pb-10">

      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${roleColor}cc 0%, ${roleColor}88 50%, ${roleColor}44 100%)` }}>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-900/20" />
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-[80px] bg-white" />

        <div className="relative z-10 px-4 md:px-8 pt-8 pb-10 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-2xl shrink-0"
              style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`, border: '3px solid rgba(255,255,255,0.3)' }}>
              {initials}
            </div>
            <div className="flex-1 text-center sm:text-left pb-1">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">{roleLabel}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight" style={{ fontFamily: 'Space Grotesk' }}>
                {user?.name || '—'}
              </h1>
              {displayEmail && <p className="text-white/60 text-sm mt-1">{displayEmail}</p>}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <RoleIcon size={11} /> {roleLabel}
                </span>
                {user?.schoolName && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                    <School size={10} /> {user.schoolName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-3xl mx-auto -mt-5 space-y-5">

        {/* ── Stats grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Trophy}    label="Levels Completed" value={statsReady ? completedCount : '…'}  color="#10B981" />
          <StatCard icon={Activity}  label="Total Attempts"   value={statsReady ? attempts.length : '…'} color="#4F46E5" />
          <StatCard icon={Award}     label="Best Score"       value={statsReady ? `${bestScore}%` : '…'} color="#F59E0B" />
          <StatCard icon={BarChart2} label="Avg Score"        value={statsReady ? `${avgScore}%` : '…'}  color="#8B5CF6" />
        </div>

        {/* ── Profile details ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${roleColor}15` }}>
              <User size={14} style={{ color: roleColor }} />
            </div>
            <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>Profile Information</h2>
          </div>

          <InfoRow icon={User}       label="Full Name"     value={user?.name}            color={roleColor} />
          <InfoRow icon={Mail}       label="Email"         value={displayEmail}          color={roleColor} />
          <InfoRow icon={Phone}      label="Phone"         value={user?.phoneNumber}      color={roleColor} />
          {!isCoach && (
            <>
              <InfoRow icon={School}   label="School"      value={user?.schoolName}       color={roleColor} />
              <InfoRow icon={BookOpen} label="Class"       value={user?.className}        color={roleColor} />
            </>
          )}
          {isCoach && (
            <InfoRow icon={Briefcase} label="Organization" value={user?.organizationName} color={roleColor} />
          )}
          <InfoRow icon={ShieldCheck} label="Account Role" value={roleLabel}             color={roleColor} />
        </div>

        {/* ── Level progress ──────────────────────────────────────────── */}
        {levelSettingsLoaded && sortedLevels.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <TrendingUp size={14} className="text-indigo-600" />
              </div>
              <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>Level Progress</h2>
              <span className="ml-auto text-[10px] font-semibold text-slate-400">{completedCount}/{sortedLevels.length} completed</span>
            </div>

            <div className="space-y-3">
              {sortedLevels.map((lvl, idx) => {
                const status    = getLevelStatus(user?.id, lvl.id);
                const levelData = getLevel(user?.id, lvl.id);
                const score     = levelData?.score?.pct ?? 0;
                const isComplete = status === 'completed';
                const isLocked   = status === 'locked';
                const col        = LEVEL_COLORS[idx % LEVEL_COLORS.length];

                return (
                  <div key={lvl.id} className="flex items-center gap-3">
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-xs font-bold
                      ${isLocked ? 'bg-slate-200 !text-slate-400' : ''}`}
                      style={!isLocked ? { background: `linear-gradient(135deg, ${col.from}, ${col.to})` } : {}}>
                      {isLocked ? <Lock size={12} className="text-slate-400" /> : isComplete ? <CheckCircle size={14} /> : <Target size={12} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-semibold truncate ${isLocked ? 'text-slate-400' : 'text-slate-700'}`}>
                          {lvl.title || `Level ${lvl.id}`}
                        </p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                          isComplete ? 'bg-green-100 text-green-700' :
                          isLocked   ? 'bg-slate-100 text-slate-400' :
                                       'bg-indigo-100 text-indigo-700'
                        }`}>
                          {isComplete ? `${score}%` : isLocked ? 'Locked' : 'Unlocked'}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-1.5 rounded-full transition-all duration-700"
                          style={{
                            width: isComplete ? `${Math.max(score, 5)}%` : isLocked ? '0%' : '5%',
                            background: isLocked ? '#e2e8f0' : `linear-gradient(90deg, ${col.from}, ${col.to})`,
                          }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Account & Security ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <ShieldCheck size={14} className="text-slate-500" />
            </div>
            <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>Account &amp; Security</h2>
          </div>

          <div className="space-y-2">
            {/* Change password */}
            <Link to="/forgot-password"
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                <KeyRound size={14} className="text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700">Change Password</p>
                <p className="text-[10px] text-slate-400">Update your account password</p>
              </div>
              <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            </Link>

            {/* Account status */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-100 bg-green-50/50">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle size={14} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">Account Active</p>
                <p className="text-[10px] text-slate-400">Your account is in good standing</p>
              </div>
            </div>

            {/* Logout */}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-100 hover:bg-red-50 transition-all group">
              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <LogOut size={14} className="text-red-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-red-600">Sign Out</p>
                <p className="text-[10px] text-slate-400">Log out of your account</p>
              </div>
              <ChevronRight size={14} className="text-red-200 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
