import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, ChevronRight,
  GraduationCap, ShieldCheck, Briefcase, Loader2, Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Login() {
  const { login } = useAuth();
  const { colors } = useTheme();
  const navigate = useNavigate();

  // Admins reach their login only via the dedicated /admin/login link (or the
  // legacy ?role=admin), never through a visible tab on the public page.
  const adminMode = window.location.pathname === '/admin/login'
    || new URLSearchParams(window.location.search).get('role') === 'admin';

  // Pre-select the tab from ?role= so arriving from "Register as Trainer" or a
  // post-registration redirect lands on the matching login tab (the tab-vs-role
  // guard would otherwise reject a trainer signing in on the default Student tab).
  const [tab,      setTab]     = useState(() => {
    if (adminMode) return 'admin';
    const r = new URLSearchParams(window.location.search).get('role');
    if (r === 'coach' || r === 'trainer' || r === 'teacher') return 'coach';
    return 'student';
  }); // 'student' | 'coach' | 'admin'
  const [form,     setForm]    = useState({ identifier: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading] = useState(false);
  const [waitSec,  setWaitSec] = useState(0);
  const [error,    setError]   = useState('');
  // Set when the backend reports the account is already signed in elsewhere
  // (code 'session_active'); reveals the "log out other device & continue" button.
  const [sessionConflict, setSessionConflict] = useState(false);

  useEffect(() => {
    if (!loading) { setWaitSec(0); return; }
    const id = setInterval(() => setWaitSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const switchTab = (t) => {
    setTab(t);
    setForm({ identifier: '', password: '' });
    setError('');
    setSessionConflict(false);
    setShowPass(false);
  };

  const doLogin = async (force = false) => {
    setError('');
    setLoading(true);
    try {
      const identifier = form.identifier.replace(/\s/g, '');
      const route = await login(identifier, form.password, tab, force);
      navigate(route, { replace: true });
    } catch (err) {
      // Account already active on another device — offer to end that session.
      if (err.code === 'session_active') {
        setSessionConflict(true);
        setError(err.message || 'This account is already logged in on another device.');
      } else if (err.code === 'account_not_found') {
        // First-time user: no account matches. Point them at registration
        // instead of the misleading "invalid credentials".
        setSessionConflict(false);
        setError(
          tab === 'student'
            ? "We couldn't find an account with these details. If this is your first time, create your Student Account below."
            : tab === 'coach'
              ? "We couldn't find a Trainer account with these details. If you're new, register as a Trainer below."
              : 'No account found with these credentials.'
        );
      } else {
        setSessionConflict(false);
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); doLogin(false); };

  const inputCls = `w-full rounded-xl py-3 text-sm text-white placeholder:text-white/30 transition-all duration-200 focus:outline-none`;
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };
  const inputFocus = { borderColor: `${colors.primary}60` };

  // Admin is intentionally absent — admins sign in via /admin/login, so the
  // public page only offers Student and Trainer.
  const tabs = [
    { key: 'student', label: 'Student', Icon: GraduationCap },
    { key: 'coach',   label: 'Trainer', Icon: Briefcase     },
  ];

  const isAdmin = tab === 'admin';
  const isCoach = tab === 'coach';
  const isStudent = tab === 'student';

  const tabConfig = {
    student: {
      title: 'Student Sign In',
      subtitle: 'Use your phone number or email address',
      idLabel: 'Phone / Email',
      idPlaceholder: 'Phone number / Email',
      idType: 'text',
      idIcon: Phone,
      passHint: null,
    },
    coach: {
      title: 'Trainer Sign In',
      subtitle: 'Use your phone number or email address',
      idLabel: 'Phone / Email',
      idPlaceholder: 'Phone number / Email',
      idType: 'text',
      idIcon: Phone,
      passHint: null,
    },
    admin: {
      title: 'Admin Sign In',
      subtitle: 'Sign in with your admin credentials',
      idLabel: 'Email Address',
      idPlaceholder: 'Email address',
      idType: 'email',
      idIcon: Mail,
      passHint: null,
    },
  };

  const cfg = tabConfig[tab];

  return (
    <div className="fade-in-up">

      {/* Tab switcher — hidden in admin mode (admins arrive via /admin/login) */}
      {!adminMode && (
      <div className="flex p-1 rounded-2xl mb-7" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => switchTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all
              ${tab === t.key ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
            style={tab === t.key ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : {}}
          >
            <t.Icon size={13} /> {t.label}
          </button>
        ))}
      </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: `${colors.primary}25`, border: `1px solid ${colors.primary}35` }}>
          {isAdmin ? <ShieldCheck size={22} style={{ color: colors.primary }} /> :
           isCoach  ? <Briefcase  size={22} style={{ color: colors.primary }} /> :
                      <GraduationCap size={22} style={{ color: colors.primary }} />}
        </div>
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>{cfg.title}</h2>
        <p className="text-slate-400 text-sm mt-1">{cfg.subtitle}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl px-4 py-3.5 mb-5"
          style={{ background: `${colors.error}18`, border: `1px solid ${colors.error}35` }}>
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: colors.error }} />
            <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
          </div>
          {sessionConflict && (
            <button type="button" onClick={() => doLogin(true)} disabled={loading}
              className="mt-3 w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 hover:scale-[1.01] active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)` }}>
              {loading && <Loader2 size={14} className="animate-spin" />}
              Log out other device &amp; continue
            </button>
          )}
        </div>
      )}

      {/* Email / password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{cfg.idLabel}<span className="text-rose-400 ml-0.5">*</span></label>
          <div className="relative">
            <cfg.idIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={cfg.idType} placeholder={cfg.idPlaceholder}
              value={form.identifier}
              onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
              required autoComplete={isAdmin ? 'email' : 'off'}
              className={`${inputCls} pl-11 pr-4`}
              style={{ ...inputStyle, ...(form.identifier ? inputFocus : {}) }}
            />
          </div>
          {isStudent && (
            <p className="text-[11px] text-slate-600 pl-1">
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password<span className="text-rose-400 ml-0.5">*</span></label>
            {/* Admins can't self-reset — password resets are a manual/DB op for them. */}
            {!isAdmin && (
              <Link to={`/forgot-password?role=${tab === 'student' ? 'student' : 'trainer'}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPass ? 'text' : 'password'} placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required autoComplete={isAdmin || isCoach ? 'current-password' : 'off'}
              className={`${inputCls} pl-11 pr-12`} style={inputStyle}
            />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              {showPass ? <Eye size={15} /> : <EyeOff size={15} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all mt-2 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, boxShadow: `0 10px 32px ${colors.primary}50` }}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading
            ? (waitSec < 6 ? 'Signing in…' : `Server waking up… ${waitSec}s`)
            : isAdmin ? 'Sign In as Admin' : isCoach ? 'Sign In as Trainer' : 'Sign In as Student'}
          {!loading && <ChevronRight size={16} />}
        </button>
      </form>

      {/* Register link for student/coach */}
      {!isAdmin && (
        <>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-slate-600 text-xs font-medium px-2">New here?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <Link to={`/register?role=${isCoach ? 'trainer' : 'student'}`}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.01]"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.primary}35`, color: colors.primary }}>
            {isCoach ? 'Create your Trainer Account' : 'Create your Student Account'}
            <ChevronRight size={15} />
          </Link>
        </>
      )}
    </div>
  );
}
