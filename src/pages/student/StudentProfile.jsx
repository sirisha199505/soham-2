import { User, Mail, Phone, School, Briefcase, BookOpen, LogOut, ShieldCheck, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

function ProfileRow({ icon: Icon, label, value, color }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-slate-100 last:border-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}12`, border: `1px solid ${color}20` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { user, logout } = useAuth();
  const { colors }       = useTheme();
  const navigate         = useNavigate();

  const isCoach   = user?.role === 'coach' || user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const roleColor = isCoach ? '#FAAB34' : colors.primary;
  const RoleIcon  = isCoach ? Briefcase : GraduationCap;
  const roleLabel = isCoach ? 'Innovation Coach' : 'Student';

  const initials = (user?.name || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: 'Space Grotesk' }}>
        My Profile
      </h1>

      {/* Avatar + name card */}
      <div className="rounded-2xl p-6 flex flex-col items-center text-center shadow-sm"
        style={{ background: `linear-gradient(135deg, ${roleColor}12, ${roleColor}06)`, border: `1.5px solid ${roleColor}25` }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-4"
          style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}bb)` }}>
          {initials}
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-1" style={{ fontFamily: 'Space Grotesk' }}>
          {user?.name || '—'}
        </h2>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
          style={{ background: `${roleColor}18`, color: roleColor, border: `1px solid ${roleColor}30` }}>
          <RoleIcon size={12} /> {roleLabel}
        </span>
      </div>

      {/* Profile details */}
      <div className="rounded-2xl bg-white shadow-sm p-5" style={{ border: '1px solid #f1f5f9' }}>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Profile Details</p>

        <ProfileRow icon={User}     label="Full Name"     value={user?.name}             color={roleColor} />
        <ProfileRow icon={Mail}     label="Email"         value={user?.email?.includes('@student.rq') ? '—' : user?.email} color={roleColor} />
        <ProfileRow icon={Phone}    label="Phone Number"  value={user?.phoneNumber}       color={roleColor} />

        {/* Student-specific */}
        {isStudent && (
          <>
            <ProfileRow icon={School}   label="School Name"  value={user?.schoolName}  color={roleColor} />
            <ProfileRow icon={BookOpen} label="Class"        value={user?.className}   color={roleColor} />
          </>
        )}

        {/* Coach-specific */}
        {isCoach && (
          <ProfileRow icon={Briefcase} label="Organization" value={user?.organizationName} color={roleColor} />
        )}

        <ProfileRow icon={ShieldCheck} label="Account Role" value={roleLabel} color={roleColor} />
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.98]"
        style={{ background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.22)', color: '#ef4444' }}
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
}
