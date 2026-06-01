import {
  User, Mail, Phone, School, Briefcase, BookOpen, LogOut,
  ShieldCheck, GraduationCap, ChevronRight, KeyRound,
  CheckCircle, Hash, Settings,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate, Link } from 'react-router-dom';

function InfoRow({ icon: Icon, label, value, color }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-slate-50 last:border-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}12` }}>
        <Icon size={15} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const { colors }       = useTheme();
  const navigate         = useNavigate();

  const isCoach   = user?.role === 'coach' || user?.role === 'teacher';
  const roleColor = isCoach ? '#FAAB34' : colors.primary;
  const RoleIcon  = isCoach ? Briefcase : GraduationCap;
  const roleLabel = isCoach ? 'Innovation Coach' : 'Student';

  const initials = (user?.name || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const displayEmail = user?.email?.includes('@student.rq') ? null : user?.email;
  const studentId    = user?.id ? `#${String(user.id).padStart(6, '0')}` : null;

  return (
    <div className="min-h-full bg-slate-50 pb-10">

      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${roleColor}cc 0%, ${roleColor}88 50%, ${roleColor}44 100%)` }}>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-900/20" />
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-[80px] bg-white" />

        <div className="relative z-10 px-4 md:px-8 pt-10 pb-14 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-2xl shrink-0"
              style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`, border: '3px solid rgba(255,255,255,0.3)' }}>
              {initials}
            </div>
            <div className="flex-1 text-center sm:text-left pb-1">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1.5">{roleLabel}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight" style={{ fontFamily: 'Space Grotesk' }}>
                {user?.name || '—'}
              </h1>
              {displayEmail && <p className="text-white/70 text-sm mt-1.5">{displayEmail}</p>}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <RoleIcon size={11} /> {roleLabel}
                </span>
                {!isCoach && studentId && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
                    <Hash size={10} /> {studentId}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-3xl mx-auto -mt-6 space-y-5">

        {/* ── Profile Information ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${roleColor}15` }}>
                <User size={15} style={{ color: roleColor }} />
              </div>
              <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>Profile Information</h2>
            </div>
          </div>
          <div className="px-5 py-1">
            <InfoRow icon={User}       label="Full Name"            value={user?.name}             color={roleColor} />
            {!isCoach && <InfoRow icon={Hash} label="Student ID"    value={studentId}              color={roleColor} />}
            <InfoRow icon={Mail}       label="Email Address"        value={displayEmail}           color={roleColor} />
            <InfoRow icon={Phone}      label="Phone Number"         value={user?.phoneNumber}       color={roleColor} />
            {!isCoach && (
              <>
                <InfoRow icon={School}   label="School / Institution" value={user?.schoolName}      color={roleColor} />
                <InfoRow icon={BookOpen} label="Class / Grade"        value={user?.className}       color={roleColor} />
              </>
            )}
            {isCoach && (
              <InfoRow icon={Briefcase} label="Organization"         value={user?.organizationName} color={roleColor} />
            )}
            <InfoRow icon={ShieldCheck} label="Account Role"         value={roleLabel}              color={roleColor} />
          </div>
        </div>

        {/* ── Account Settings ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                <Settings size={15} className="text-slate-500" />
              </div>
              <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>Account Settings</h2>
            </div>
          </div>

          <div className="p-4 space-y-2.5">
            {/* Account status */}
            <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-green-50 border border-green-100">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle size={15} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">Account Active</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Your account is in good standing</p>
              </div>
              <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">Active</span>
            </div>

            {/* Change password */}
            <Link to="/forgot-password"
              className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${roleColor}12` }}>
                <KeyRound size={15} style={{ color: roleColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700">Change Password</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Update your account password</p>
              </div>
              <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
            </Link>

            {/* Sign out */}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all group">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <LogOut size={15} className="text-red-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-red-600">Sign Out</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Log out of your account</p>
              </div>
              <ChevronRight size={15} className="text-red-200 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
