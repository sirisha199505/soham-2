import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Hash, Lock, Eye, EyeOff, AlertCircle, ChevronRight,
  Mail, GraduationCap, Users, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// ── Demo staff credentials (mirrors DEMO_STAFF in AuthContext) ──────────────
const DEMO_STAFF = [
  { label: 'Teacher',        email: 'teacher@roboquiz.in',  password: 'teacher123',  color: '#FAAB34', bg: 'rgba(250,171,52,0.12)',  border: 'rgba(250,171,52,0.3)'  },
  { label: 'School Admin',   email: 'admin@roboquiz.in',    password: 'admin123',    color: '#3BC0EF', bg: 'rgba(59,192,239,0.12)',  border: 'rgba(59,192,239,0.3)'  },
  { label: 'District Admin', email: 'district@roboquiz.in', password: 'district123', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.3)'  },
  { label: 'Super Admin',    email: 'super@roboquiz.in',    password: 'super123',    color: '#10B981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)'  },
];

export default function Login() {
  const { login }  = useAuth();
  const { colors } = useTheme();
  const navigate   = useNavigate();

  const [tab,      setTab]      = useState('student'); // 'student' | 'staff'
  const [form,     setForm]     = useState({ identifier: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const id = tab === 'student'
        ? form.identifier.replace(/\s/g, '')
        : form.identifier.trim().toLowerCase();
      const route = await login(id, form.password);
      navigate(route, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (d) => {
    setForm({ identifier: d.email, password: d.password });
    setError('');
  };

  const inputCls = `
    w-full rounded-xl py-3 text-sm text-white
    placeholder:text-white/30 transition-all duration-200 focus:outline-none
  `;
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };

  return (
    <div className="fade-in-up">

      {/* ── Tab switcher ── */}
      <div className="flex p-1 rounded-2xl mb-8" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {[
          { key: 'student', label: 'Student Login',  Icon: GraduationCap },
          { key: 'staff',   label: 'Staff Login',    Icon: Users },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setForm({ identifier: '', password: '' }); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'
            }`}
            style={tab === t.key ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : {}}>
            <t.Icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Header ── */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk' }}>
          {tab === 'student' ? 'Student Sign In' : 'Staff Sign In'}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {tab === 'student'
            ? 'Use your unique Student ID to access RoboQuiz'
            : 'Sign in with your staff email and password'}
        </p>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5"
          style={{ background: `${colors.error}18`, border: `1px solid ${colors.error}35` }}>
          <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: colors.error }} />
          <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      )}

      {/* ── Demo staff quick-fill (staff tab only) ── */}
      {tab === 'staff' && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2.5">
            <Zap size={13} className="text-yellow-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quick fill demo account</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_STAFF.map(d => (
              <button key={d.label} onClick={() => fillDemo(d)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: d.bg, border: `1px solid ${d.border}`, color: d.color }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.color }} />
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Identifier field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            {tab === 'student' ? 'Student ID' : 'Email Address'}
          </label>
          <div className="relative">
            {tab === 'student'
              ? <Hash size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              : <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            }
            <input
              type={tab === 'student' ? 'text' : 'email'}
              placeholder={tab === 'student' ? 'Enter your 8-digit Student ID' : 'you@roboquiz.in'}
              value={form.identifier}
              onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
              required
              inputMode={tab === 'student' ? 'numeric' : 'email'}
              maxLength={tab === 'student' ? 9 : undefined}
              className={`${inputCls} pl-11 pr-4 ${tab === 'student' ? 'font-mono tracking-widest' : ''}`}
              style={{
                ...inputStyle,
                ...(form.identifier ? { borderColor: `${colors.primary}60` } : {}),
              }}
            />
          </div>
          {tab === 'student' && (
            <p className="text-[11px] text-slate-600 pl-1">You received this 8-digit ID when you registered.</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Password</label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              required
              className={`${inputCls} pl-11 pr-12`}
              style={inputStyle}
            />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all mt-2 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            boxShadow: `0 10px 32px ${colors.primary}50`,
          }}>
          {loading && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {loading ? 'Signing in…' : 'Sign In'}
          {!loading && <ChevronRight size={16} />}
        </button>
      </form>

      {/* ── Register link (student tab only) ── */}
      {tab === 'student' && (
        <>
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-slate-600 text-xs font-medium px-2">New student?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
          <Link to="/register"
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold transition-all hover:scale-[1.01]"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${colors.primary}35`, color: colors.primary }}>
            Create your Student Account
            <ChevronRight size={15} />
          </Link>
        </>
      )}

      {/* ── Staff credentials hint ── */}
      {tab === 'staff' && (
        <div className="mt-6 p-3.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-xs font-semibold text-slate-500 mb-2">Demo credentials</p>
          <div className="space-y-1">
            {DEMO_STAFF.map(d => (
              <div key={d.label} className="flex items-center justify-between text-[11px]">
                <span style={{ color: d.color }} className="font-semibold">{d.label}</span>
                <span className="text-slate-600 font-mono">{d.email} / {d.password}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
