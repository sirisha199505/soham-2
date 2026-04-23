import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { School, Hash, BookOpen, Lock, Eye, EyeOff, AlertCircle, Copy, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { formatUniqueId } from '../../utils/uniqueId';

export default function Register() {
  const { register } = useAuth();
  const { colors }   = useTheme();
  const navigate     = useNavigate();

  const [form, setForm] = useState({
    schoolName: '', rollNo: '', className: '', password: '', confirm: '',
  });
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [generatedId, setGeneratedId] = useState(null);
  const [copied, setCopied]           = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!/^\d{1,2}[A-Za-z]+$/.test(form.className.trim())) {
      setError('Class must be in format like 9A or 10B (no hyphens).');
      return;
    }

    setLoading(true);
    try {
      const uid = await register(form.schoolName, form.rollNo, form.className, form.password);
      setGeneratedId(uid);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(generatedId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls = `
    w-full rounded-xl py-3 text-sm text-white
    placeholder:text-white/30 transition-all duration-200
    focus:outline-none
  `;
  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
  };
  const inputFocusStyle = {
    borderColor: `${colors.primary}60`,
    boxShadow: `0 0 0 3px ${colors.primary}18`,
  };

  /* ── Show generated ID screen ── */
  if (generatedId) {
    return (
      <div className="fade-in-up space-y-6">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: `${colors.primary}25`, border: `1px solid ${colors.primary}40` }}
          >
            <CheckCircle size={28} style={{ color: colors.primary }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk' }}>
            Registration Successful!
          </h2>
          <p className="text-slate-400 text-sm">Your unique student ID has been generated.</p>
        </div>

        {/* ID display */}
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${colors.primary}40` }}
        >
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mb-3">
            Your Student ID
          </p>
          <p
            className="text-4xl font-bold tracking-[0.2em] mb-4"
            style={{ color: colors.primary, fontFamily: 'Space Grotesk' }}
          >
            {formatUniqueId(generatedId)}
          </p>
          <button
            onClick={copyId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02]"
            style={{ background: `${colors.primary}20`, color: colors.primary, border: `1px solid ${colors.primary}35` }}
          >
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy ID'}
          </button>
        </div>

        {/* Warning */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(250,171,52,0.08)', border: '1px solid rgba(250,171,52,0.25)' }}
        >
          <p className="text-[13px] font-semibold text-amber-300 mb-1">Important — Save your ID</p>
          <p className="text-xs text-amber-200/70 leading-relaxed">
            This is your <strong>only login credential</strong>. You will NOT see your name after logging in.
            Write this ID down or save it securely. It cannot be recovered if lost.
          </p>
        </div>

        <button
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all hover:scale-[1.02]"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            boxShadow: `0 10px 32px ${colors.primary}50`,
          }}
        >
          Go to Sign In <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  /* ── Registration form ── */
  return (
    <div className="fade-in-up">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
          Student Registration
        </h2>
        <p className="text-slate-400 text-sm">Create your account to access RoboQuiz</p>
      </div>

      {error && (
        <div
          className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5"
          style={{ background: `${colors.error}18`, border: `1px solid ${colors.error}35` }}
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: colors.error }} />
          <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* School Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            School Name
          </label>
          <div className="relative">
            <School size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text" placeholder="e.g. Delhi Public School"
              value={form.schoolName} onChange={set('schoolName')} required
              className={`${inputCls} pl-11 pr-4`}
              style={{ ...inputStyle, ...(form.schoolName ? inputFocusStyle : {}) }}
            />
          </div>
        </div>

        {/* Roll Number */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Roll Number
          </label>
          <div className="relative">
            <Hash size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text" placeholder="e.g. 2024-ROL-42"
              value={form.rollNo} onChange={set('rollNo')} required
              className={`${inputCls} pl-11 pr-4`}
              style={{ ...inputStyle, ...(form.rollNo ? inputFocusStyle : {}) }}
            />
          </div>
        </div>

        {/* Class */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Class / Section
          </label>
          <div className="relative">
            <BookOpen size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text" placeholder="e.g. 9A or 10B"
              value={form.className} onChange={set('className')} required
              className={`${inputCls} pl-11 pr-4`}
              style={{ ...inputStyle, ...(form.className ? inputFocusStyle : {}) }}
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters"
              value={form.password} onChange={set('password')} required
              className={`${inputCls} pl-11 pr-12`}
              style={inputStyle}
            />
            <button
              type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Confirm Password
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password"
              value={form.confirm} onChange={set('confirm')} required
              className={`${inputCls} pl-11 pr-12`}
              style={{
                ...inputStyle,
                ...(form.confirm && form.password !== form.confirm
                  ? { borderColor: `${colors.error}60` }
                  : form.confirm ? inputFocusStyle : {}),
              }}
            />
            <button
              type="button" onClick={() => setShowConfirm(p => !p)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all mt-2 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
            boxShadow: `0 10px 32px ${colors.primary}50`,
          }}
        >
          {loading && (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {loading ? 'Creating account…' : 'Create Account'}
          {!loading && <ArrowRight size={16} />}
        </button>
      </form>

      <p className="text-slate-500 text-sm text-center mt-6">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold hover:underline" style={{ color: colors.primary }}>
          Sign In
        </Link>
      </p>
    </div>
  );
}
