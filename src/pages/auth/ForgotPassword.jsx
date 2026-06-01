import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle,
  AlertCircle, Loader2, ShieldCheck, RefreshCw, Clock,
} from 'lucide-react';
import { api } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';

// ── OTP Countdown (5 minutes) ────────────────────────────────────────────────
function Countdown({ startedAt, onExpire }) {
  const OTP_SECONDS = 5 * 60;
  const elapsed = Math.floor((Date.now() - startedAt) / 1000);
  const [left, setLeft] = useState(Math.max(0, OTP_SECONDS - elapsed));

  useEffect(() => {
    if (left <= 0) { onExpire?.(); return; }
    const id = setInterval(() => setLeft(p => {
      if (p <= 1) { clearInterval(id); onExpire?.(); return 0; }
      return p - 1;
    }), 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mins = String(Math.floor(left / 60)).padStart(2, '0');
  const secs = String(left % 60).padStart(2, '0');
  const urgent = left <= 60;

  if (left === 0) return (
    <span className="font-bold text-red-400 flex items-center gap-1">
      <Clock size={12}/> OTP expired
    </span>
  );
  return (
    <span className={`font-mono font-bold flex items-center gap-1 ${urgent ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
      <Clock size={12}/> {mins}:{secs}
    </span>
  );
}

// ── 6-box OTP Input ──────────────────────────────────────────────────────────
function OtpInput({ value, onChange, disabled }) {
  const refs = useRef([...Array(6)].map(() => ({ current: null })));

  const handleChange = (i, raw) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next  = [...value];
    next[i]     = digit;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.current?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      if (!value[i] && i > 0) {
        const next = [...value]; next[i - 1] = '';
        onChange(next);
        refs.current[i - 1]?.current?.focus();
      } else if (value[i]) {
        const next = [...value]; next[i] = '';
        onChange(next);
      }
    } else if (e.key === 'ArrowLeft' && i > 0) {
      refs.current[i - 1]?.current?.focus();
    } else if (e.key === 'ArrowRight' && i < 5) {
      refs.current[i + 1]?.current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!paste) return;
    const next = [...Array(6)].map((_, i) => paste[i] || '');
    onChange(next);
    const focusIdx = Math.min(paste.length, 5);
    refs.current[focusIdx]?.current?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {value.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = { current: el }; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onFocus={e => e.target.select()}
          className="w-11 h-14 text-center text-2xl font-bold rounded-xl transition-all duration-200 focus:outline-none disabled:opacity-50"
          style={{
            background:  digit ? 'rgba(59,192,239,0.12)' : 'rgba(255,255,255,0.06)',
            border:      digit ? '2px solid rgba(59,192,239,0.5)' : '1px solid rgba(255,255,255,0.12)',
            color:       '#fff',
            caretColor:  'transparent',
          }}
        />
      ))}
    </div>
  );
}

// ── Password strength bar ────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    password.length >= 6,
    password.length >= 10,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const levels = [
    { label: 'Very Weak',  color: '#ef4444' },
    { label: 'Weak',       color: '#f97316' },
    { label: 'Fair',       color: '#eab308' },
    { label: 'Good',       color: '#22c55e' },
    { label: 'Strong',     color: '#10b981' },
  ];
  const lvl = levels[Math.max(0, score - 1)];
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? lvl.color : 'rgba(255,255,255,0.08)' }}/>
        ))}
      </div>
      <p className="text-[11px] font-semibold" style={{ color: lvl.color }}>{lvl.label}</p>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const { colors } = useTheme();

  // step: 'email' | 'otp' | 'password' | 'success'
  const [step,        setStep]       = useState('email');
  const [email,       setEmail]      = useState('');
  const [otp,         setOtp]        = useState(['', '', '', '', '', '']);
  const [otpSentAt,   setOtpSentAt]  = useState(null);
  const [otpExpired,  setOtpExpired] = useState(false);
  const [resetToken,  setResetToken] = useState('');
  const [newPassword, setNewPass]    = useState('');
  const [confirmPass, setConfirmPass]= useState('');
  const [showPass,    setShowPass]   = useState(false);
  const [loading,     setLoading]    = useState(false);
  const [error,       setError]      = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const inputCls  = `w-full rounded-xl py-3 text-sm text-white placeholder:text-white/30 transition-all duration-200 focus:outline-none`;
  const inputBase = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };

  const gradBtn = {
    background:  `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
    boxShadow:   `0 10px 32px ${colors.primary}50`,
  };

  // ── Step 1: send OTP ──────────────────────────────────────────────────────
  const handleSendOtp = useCallback(async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.forgotPassword(email.trim().toLowerCase());
      setOtp(['', '', '', '', '', '']);
      setOtpExpired(false);
      setOtpSentAt(Date.now());
      setResendCooldown(60);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Could not send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  // ── Step 2: verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = useCallback(async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter all 6 digits.'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await api.verifyResetOtp(email.trim().toLowerCase(), code);
      setResetToken(result.resetToken);
      setStep('password');
    } catch (err) {
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, otp]);

  // ── Step 3: set new password ──────────────────────────────────────────────
  const handleResetPassword = useCallback(async (e) => {
    e?.preventDefault();
    setError('');
    if (newPassword.length < 6)    { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPass){ setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.resetPasswordWithToken(resetToken, newPassword);
      setStep('success');
    } catch (err) {
      setError(err.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [resetToken, newPassword, confirmPass]);

  // ── Step indicator ────────────────────────────────────────────────────────
  const STEPS = [
    { id: 'email',    label: 'Email' },
    { id: 'otp',      label: 'Verify' },
    { id: 'password', label: 'Reset' },
  ];
  const stepIdx = { email: 0, otp: 1, password: 2, success: 2 }[step];

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">

      <Link to="/login" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-5 transition-colors">
        <ArrowLeft size={15}/> Back to login
      </Link>

      {/* Step indicator (hidden on success) */}
      {step !== 'success' && (
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                i < stepIdx  ? 'text-white'
                : i === stepIdx ? 'text-white ring-2 ring-white/30'
                : 'text-white/30'
              }`} style={i <= stepIdx ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : { background: 'rgba(255,255,255,0.08)' }}>
                {i < stepIdx ? <CheckCircle size={14}/> : i + 1}
              </div>
              <span className={`text-xs font-semibold transition-colors ${i <= stepIdx ? 'text-white/80' : 'text-white/25'}`}>{s.label}</span>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-px" style={{ background: i < stepIdx ? `${colors.primary}60` : 'rgba(255,255,255,0.08)' }}/>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5"
          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400"/>
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* ── STEP 1: email ──────────────────────────────────────────────────── */}
      {step === 'email' && (
        <>
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${colors.primary}25`, border: `1px solid ${colors.primary}35` }}>
              <Mail size={22} style={{ color: colors.primary }}/>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk' }}>Forgot Password</h2>
            <p className="text-white/60 text-sm">
              Enter your registered email address. We'll send a 6-digit OTP to verify your identity.
            </p>
          </div>
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Email Address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input type="email" placeholder="your@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required
                  className={`${inputCls} pl-11 pr-4`} style={inputBase}/>
              </div>
              <p className="text-[11px] text-slate-500 pl-1">
                Must be the email used at registration. Phone-only accounts cannot use this flow.
              </p>
            </div>
            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
              style={gradBtn}>
              {loading ? <><Loader2 size={16} className="animate-spin"/> Sending OTP…</> : 'Send OTP'}
            </button>
          </form>
        </>
      )}

      {/* ── STEP 2: OTP entry ──────────────────────────────────────────────── */}
      {step === 'otp' && (
        <>
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${colors.primary}25`, border: `1px solid ${colors.primary}35` }}>
              <ShieldCheck size={22} style={{ color: colors.primary }}/>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk' }}>Enter OTP</h2>
            <p className="text-white/60 text-sm">
              We sent a 6-digit code to <span className="text-white font-semibold">{email}</span>.
              Check your inbox (and spam folder).
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <OtpInput value={otp} onChange={v => { setOtp(v); setError(''); }} disabled={loading}/>

            {/* Timer + expiry */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">OTP expires in:</span>
              {otpSentAt && (
                <Countdown startedAt={otpSentAt} onExpire={() => setOtpExpired(true)}/>
              )}
            </div>

            <button type="submit" disabled={loading || otpExpired}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              style={gradBtn}>
              {loading ? <><Loader2 size={16} className="animate-spin"/> Verifying…</> : 'Verify OTP'}
            </button>

            {/* Resend */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-white/40">Didn't receive it?</span>
              {resendCooldown > 0 ? (
                <span className="text-white/30 font-semibold">Resend in {resendCooldown}s</span>
              ) : (
                <button type="button" onClick={handleSendOtp} disabled={loading}
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors disabled:opacity-50">
                  <RefreshCw size={13}/> Resend OTP
                </button>
              )}
            </div>
          </form>
        </>
      )}

      {/* ── STEP 3: new password ───────────────────────────────────────────── */}
      {step === 'password' && (
        <>
          <div className="mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: `${colors.primary}25`, border: `1px solid ${colors.primary}35` }}>
              <Lock size={22} style={{ color: colors.primary }}/>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk' }}>Set New Password</h2>
            <p className="text-white/60 text-sm">
              OTP verified! Enter a strong new password for your account.
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">New Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input type={showPass ? 'text' : 'password'} placeholder="At least 6 characters"
                  value={newPassword} onChange={e => setNewPass(e.target.value)} required minLength={6}
                  className={`${inputCls} pl-11 pr-12`} style={inputBase}/>
                <button type="button" onClick={() => setShowPass(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              <PasswordStrength password={newPassword}/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Confirm Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"/>
                <input type={showPass ? 'text' : 'password'} placeholder="Re-enter new password"
                  value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required
                  className={`${inputCls} pl-11 pr-4`}
                  style={{ ...inputBase, ...(confirmPass && (confirmPass === newPassword
                    ? { borderColor: '#22c55e80' }
                    : { borderColor: '#ef444480' })) }}/>
              </div>
              {confirmPass && confirmPass !== newPassword && (
                <p className="text-[11px] text-red-400 pl-1">Passwords do not match</p>
              )}
              {confirmPass && confirmPass === newPassword && (
                <p className="text-[11px] text-green-400 pl-1 flex items-center gap-1"><CheckCircle size={10}/> Passwords match</p>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
              style={gradBtn}>
              {loading ? <><Loader2 size={16} className="animate-spin"/> Resetting…</> : 'Reset Password'}
            </button>
          </form>
        </>
      )}

      {/* ── SUCCESS ────────────────────────────────────────────────────────── */}
      {step === 'success' && (
        <div className="text-center py-4">
          <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center mx-auto mb-5
                          ring-4 ring-green-500/20">
            <CheckCircle size={40} className="text-green-400"/>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            Password Reset!
          </h2>
          <p className="text-white/60 text-sm mb-8">
            Your password has been updated successfully.
            You can now log in with your new password.
          </p>
          <Link to="/login"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-bold text-sm transition-all hover:scale-[1.02]"
            style={gradBtn}>
            Go to Login
          </Link>
        </div>
      )}
    </div>
  );
}
