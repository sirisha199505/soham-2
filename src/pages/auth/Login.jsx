import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Hash, Lock, Eye, EyeOff, AlertCircle, ChevronRight,
  Mail, GraduationCap, ShieldCheck, Loader2, MonitorSmartphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Login() {
  const { login }  = useAuth();
  const { colors } = useTheme();
  const navigate   = useNavigate();

  const [tab,            setTab]           = useState('student'); // 'student' | 'admin'
  const [form,           setForm]          = useState({ identifier: '', password: '' });
  const [showPass,       setShowPass]      = useState(false);
  const [loading,        setLoading]       = useState(false);
  const [waitSec,        setWaitSec]       = useState(0);
  const [error,          setError]         = useState('');
  const [activeOnOther,  setActiveOnOther] = useState(false);
  const [wasKickedOut,   setWasKickedOut]  = useState(() => {
    const flag = sessionStorage.getItem('rqa_kicked_out');
    if (flag) sessionStorage.removeItem('rqa_kicked_out');
    return !!flag;
  });

  useEffect(() => {
    if (!loading) { setWaitSec(0); return; }
    const id = setInterval(() => setWaitSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  const switchTab = (t) => {
    setTab(t);
    setForm({ identifier: '', password: '' });
    setError('');
    setShowPass(false);
    setActiveOnOther(false);
  };

  const doLogin = async (force = false) => {
    setError('');
    setActiveOnOther(false);
    setLoading(true);
    try {
      const id = tab === 'student'
        ? form.identifier.replace(/\s/g, '')
        : form.identifier.trim().toLowerCase();
      const route = await login(id, form.password, force);
      navigate(route, { replace: true });
    } catch (err) {
      if (err?.status === 409) {
        // Account active on another device
        setActiveOnOther(true);
        setError('Your account is already active on another device.');
      } else if (err.status === 500 || !err.status) {
        setError(err.message);
      } else {
        setError(tab === 'admin'
          ? 'Invalid admin email or password.'
          : 'Invalid Student ID or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    doLogin(false);
  };

  const handleForceLogin = () => doLogin(true);

  const inputCls = `
    w-full rounded-xl py-3 text-sm text-white
    placeholder:text-white/30 transition-all duration-200 focus:outline-none
  `;
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };
  const inputFocusStyle = { borderColor: `${colors.primary}60` };

  const isAdmin = tab === 'admin';

  return (
    <div className="fade-in-up">

      {/* ── Kicked-out banner (shown when another device force-logged in) ── */}
      {wasKickedOut && (
        <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)' }}>
          <MonitorSmartphone size={16} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: '#fca5a5' }}>
              Signed out automatically
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#f87171' }}>
              Your session was ended because you signed in from another device.
            </p>
          </div>
          <button onClick={() => setWasKickedOut(false)} className="ml-auto text-red-400 hover:text-red-300">
            <AlertCircle size={14} />
          </button>
        </div>
      )}

      {/* ── Tab switcher ── */}
      <div className="flex p-1 rounded-2xl mb-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {[
          { key: 'student', label: 'Student Login', Icon: GraduationCap },
          { key: 'admin',   label: 'Admin Login',   Icon: ShieldCheck   },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${tab === t.key ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
            style={tab === t.key
              ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` }
              : {}}
          >
            <t.Icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="mb-6">
        {isAdmin ? (
          <>
            {/* Admin icon badge */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `linear-gradient(135deg, ${colors.primary}30, ${colors.accent}30)`, border: `1px solid ${colors.primary}30` }}>
              <ShieldCheck size={22} style={{ color: colors.primary }} />
            </div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
              Admin Sign In
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Sign in with your admin email and password.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
              Student Sign In
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Use your unique Student ID to access Soham Quiz
            </p>
          </>
        )}
      </div>

      {/* ── Active-on-another-device error ── */}
      {activeOnOther && (
        <div className="rounded-2xl mb-5 overflow-hidden"
          style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.30)' }}>
          <div className="flex items-start gap-3 px-4 pt-4 pb-3">
            <MonitorSmartphone size={18} className="shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: '#fde68a' }}>
                Account Active on Another Device
              </p>
              <p className="text-xs mt-1" style={{ color: '#fcd34d' }}>
                Your account is already signed in on another device. You can end that session and sign in here instead.
              </p>
            </div>
          </div>
          <div className="px-4 pb-4 flex gap-2">
            <button
              type="button"
              onClick={handleForceLogin}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 transition-all hover:scale-[1.01]"
              style={{ background: '#fbbf24', color: '#1c1917' }}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <MonitorSmartphone size={13} />}
              Sign in anyway (end other session)
            </button>
          </div>
        </div>
      )}

      {/* ── Generic error ── */}
      {error && !activeOnOther && (
        <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5"
          style={{ background: `${colors.error}18`, border: `1px solid ${colors.error}35` }}>
          <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: colors.error }} />
          <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Identifier field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {isAdmin ? 'Email Address' : 'Student ID'}
          </label>
          <div className="relative">
            {isAdmin
              ? <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              : <Hash size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            }
            <input
              type={isAdmin ? 'email' : 'text'}
              placeholder={isAdmin ? 'admin@domain.com' : 'Enter your 8-digit Student ID'}
              value={form.identifier}
              onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
              required
              autoComplete={isAdmin ? 'email' : 'off'}
              inputMode={isAdmin ? 'email' : 'numeric'}
              maxLength={isAdmin ? undefined : 9}
              className={`${inputCls} pl-11 pr-4 ${!isAdmin ? 'font-mono tracking-widest' : ''}`}
              style={{ ...inputStyle, ...(form.identifier ? inputFocusStyle : {}) }}
            />
          </div>
          {!isAdmin && (
            <p className="text-[11px] text-slate-600 pl-1">
              You received this 8-digit ID when you registered.
            </p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Password
            </label>
            {!isAdmin && (
              <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              autoComplete={isAdmin ? 'current-password' : 'off'}
              className={`${inputCls} pl-11 pr-12`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPass(p => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all mt-2 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            boxShadow: `0 10px 32px ${colors.primary}50`,
          }}
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading
            ? waitSec < 6
              ? 'Signing in…'
              : `Server waking up… ${waitSec}s`
            : isAdmin
              ? 'Login as Admin'
              : 'Sign In'}
          {!loading && <ChevronRight size={16} />}
        </button>
      </form>

      {/* ── Register link (student tab only) ── */}
      {!isAdmin && (
        <>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-slate-600 text-xs font-medium px-2">New student?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <Link
            to="/register"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.01]"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${colors.primary}35`,
              color: colors.primary,
            }}
          >
            Create your Student Account
            <ChevronRight size={15} />
          </Link>
        </>
      )}
    </div>
  );
}


