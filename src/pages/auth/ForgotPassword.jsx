import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, GraduationCap, Briefcase, Info, MessageCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { ADMIN_CONTACT_PHONE } from '../../utils/constants';

// Password resets are handled by the Administrator (students/trainers can no
// longer self-reset). This page just tells them to contact the admin.
export default function ForgotPassword() {
  const { colors } = useTheme();
  const [params] = useSearchParams();
  const role = params.get('role') === 'trainer' ? 'trainer' : 'student';
  const RoleIcon = role === 'trainer' ? Briefcase : GraduationCap;
  const roleLabel = role === 'trainer' ? 'Trainer' : 'Student';
  // WhatsApp click-to-chat needs the number as digits only (country code, no +/spaces).
  const waNumber = ADMIN_CONTACT_PHONE.replace(/\D/g, '');
  const nameLabel = role === 'trainer' ? 'trainer name' : 'student name';
  const orgLabel  = role === 'trainer' ? 'organization name' : 'institute name';

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

      {/* Contact-admin message + how to reach them */}
      <div className="mt-6 rounded-2xl p-5"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-start gap-3">
          <Info size={16} className="shrink-0 mt-0.5" style={{ color: colors.primary }} />
          <p className="text-sm text-slate-200 leading-relaxed">
            Please contact the Administrator to reset your password.
          </p>
        </div>

        {/* WhatsApp contact + what to send */}
        <div className="mt-4 pt-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-3 group">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${colors.primary}20` }}>
              <MessageCircle size={15} style={{ color: colors.primary }} />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">WhatsApp</p>
              <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                {ADMIN_CONTACT_PHONE}
              </span>
            </div>
          </a>
          <p className="text-[13px] text-slate-300 leading-relaxed">
            Send your <span className="font-semibold text-white">{nameLabel}</span>,{' '}
            <span className="font-semibold text-white">phone number</span> and{' '}
            <span className="font-semibold text-white">{orgLabel}</span> to this WhatsApp number,
            and the Administrator will reset your password.
          </p>
        </div>
      </div>
    </div>
  );
}
