import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, AlertCircle, ChevronRight,
  GraduationCap, ShieldCheck, Briefcase, Loader2, Phone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const { colors } = useTheme();
  const navigate = useNavigate();

  const [tab,      setTab]     = useState('student'); // 'student' | 'coach' | 'admin'
  const [form,     setForm]    = useState({ identifier: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading] = useState(false);
  const [waitSec,  setWaitSec] = useState(0);
  const [error,    setError]   = useState('');

  useEffect(() => {
    if (!loading) { setWaitSec(0); return; }
    const id = setInterval(() => setWaitSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  // Load Google Identity Services once
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || window.google) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        });
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleCredential = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      const role = tab === 'coach' ? 'coach' : 'student';
      const route = await googleLogin(response.credential, role);
      navigate(route, { replace: true });
    } catch (err) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  }, [tab, googleLogin, navigate]);

  const handleGoogleClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Sign-In is not configured. Set VITE_GOOGLE_CLIENT_ID in your .env file to enable it.');
      return;
    }
    if (!window.google?.accounts?.id) {
      setError('Google Sign-In is loading. Please wait a moment and try again.');
      return;
    }
    window.google.accounts.id.prompt();
  };

  const switchTab = (t) => {
    setTab(t);
    setForm({ identifier: '', password: '' });
    setError('');
    setShowPass(false);
  };

  const doLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const identifier = form.identifier.replace(/\s/g, '');
      const route = await login(identifier, form.password, tab);
      navigate(route, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { e.preventDefault(); doLogin(); };

  const inputCls = `w-full rounded-xl py-3 text-sm text-white placeholder:text-white/30 transition-all duration-200 focus:outline-none`;
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };
  const inputFocus = { borderColor: `${colors.primary}60` };

  const tabs = [
    { key: 'student', label: 'Student', Icon: GraduationCap },
    { key: 'coach',   label: 'Trainer', Icon: Briefcase     },
    { key: 'admin',   label: 'Admin',   Icon: ShieldCheck   },
  ];

  const isAdmin = tab === 'admin';
  const isCoach = tab === 'coach';
  const isStudent = tab === 'student';
  // Show Google button for Student and Coach — always visible so the UI is consistent.
  // If VITE_GOOGLE_CLIENT_ID is not configured, the button shows a setup message on click.
  const showGoogle = !isAdmin;

  const tabConfig = {
    student: {
      title: 'Student Sign In',
      subtitle: 'Sign in with your registered email and password',
      idLabel: 'Email Address',
      idPlaceholder: 'email@example.com',
      idType: 'text',
      idIcon: Phone,
      passHint: null,
    },
    coach: {
      title: 'Trainer Sign In',
      subtitle: 'Sign in with your registered email and password',
      idLabel: 'Email Address',
      idPlaceholder: 'trainer@organization.com',
      idType: 'email',
      idIcon: Mail,
      passHint: null,
    },
    admin: {
      title: 'Admin Sign In',
      subtitle: 'Sign in with your admin credentials',
      idLabel: 'Email Address',
      idPlaceholder: 'admin@sohamquiz.in',
      idType: 'email',
      idIcon: Mail,
      passHint: null,
    },
  };

  const cfg = tabConfig[tab];

  return (
    <div className="fade-in-up">

      {/* Tab switcher */}
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
        <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5"
          style={{ background: `${colors.error}18`, border: `1px solid ${colors.error}35` }}>
          <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: colors.error }} />
          <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      )}

      {/* Email / password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{cfg.idLabel}</label>
          <div className="relative">
            <cfg.idIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={cfg.idType} placeholder={cfg.idPlaceholder}
              value={form.identifier}
              onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
              required autoComplete={isAdmin || isCoach ? 'email' : 'off'}
              className={`${inputCls} pl-11 pr-4`}
              style={{ ...inputStyle, ...(form.identifier ? inputFocus : {}) }}
            />
          </div>
          {isStudent && (
            <p className="text-[11px] text-slate-600 pl-1">
              Use your email address
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot password?
            </Link>
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
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all mt-2 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, boxShadow: `0 10px 32px ${colors.primary}50` }}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading
            ? (waitSec < 6 ? 'Signing in…' : `Server waking up… ${waitSec}s`)
            : isAdmin ? 'Login as Admin' : isCoach ? 'Login as Trainer' : 'Sign In'}
          {!loading && <ChevronRight size={16} />}
        </button>
      </form>

      {/* Google Sign-In — below form, separated by OR divider */}
      {showGoogle && (
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <span className="text-[11px] font-semibold text-slate-500 px-2 uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
            style={{
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#3c4043',
              boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      )}

      {/* Register link for student/coach */}
      {!isAdmin && (
        <>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-slate-600 text-xs font-medium px-2">New here?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <Link to="/register"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.01]"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.primary}35`, color: colors.primary }}>
            {isCoach ? 'Register as Trainer' : 'Create your Student Account'}
            <ChevronRight size={15} />
          </Link>
        </>
      )}
    </div>
  );
}
