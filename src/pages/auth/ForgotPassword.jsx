import { Link, useSearchParams } from 'react-router-dom';
import {
  Phone, ArrowLeft, ShieldCheck, GraduationCap, Briefcase, Info,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ADMIN_CONTACT_PHONE } from '../../utils/constants';

// Password resets are handled by the Administrator (students/trainers can no
// longer self-reset). This page just tells them who to contact and lets them
// call the admin directly.
export default function ForgotPassword() {
  const { colors } = useTheme();
  const [params] = useSearchParams();
  const role = params.get('role') === 'trainer' ? 'trainer' : 'student';
  const RoleIcon = role === 'trainer' ? Briefcase : GraduationCap;
  const roleLabel = role === 'trainer' ? 'Trainer' : 'Student';
  const telHref = `tel:${ADMIN_CONTACT_PHONE.replace(/[^\d+]/g, '')}`;

  return (
    <div className="fade-in-up">

      {/* Back to sign in */}
      <Link
        to={`/login?role=${role}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-300 mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Back to Sign In
      </Link>

      {/* Header */}
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: `${colors.primary}25`, border: `1px solid ${colors.primary}35` }}>
        <ShieldCheck size={22} style={{ color: colors.primary }} />
      </div>
      <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>Reset Password</h2>
      <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
        <RoleIcon size={13} /> {roleLabel} account
      </p>

      {/* Contact-admin message */}
      <div className="mt-6 rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-start gap-3">
          <Info size={16} className="shrink-0 mt-0.5" style={{ color: colors.primary }} />
          <p className="text-sm text-slate-200 leading-relaxed">
            Please contact the Administrator to reset your password.
          </p>
        </div>

        {/* Administrator number */}
        <div className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${colors.primary}20` }}>
            <Phone size={16} style={{ color: colors.primary }} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">Administrator</p>
            <p className="text-base font-bold text-white tracking-wide">{ADMIN_CONTACT_PHONE}</p>
          </div>
        </div>
      </div>

      {/* Call Administrator */}
      <a
        href={telHref}
        className="mt-4 w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, boxShadow: `0 10px 32px ${colors.primary}50` }}
      >
        <Phone size={16} /> Call Administrator
      </a>
    </div>
  );
}
