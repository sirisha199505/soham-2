import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, School, BookOpen, Phone, Mail, Lock, Eye, EyeOff,
  AlertCircle, CheckCircle, ArrowRight, Loader2, GraduationCap, Briefcase,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { isValidEmail } from '../../utils/helpers';
import { api } from '../../utils/api';

const CLASS_OPTIONS = ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'Other'];
const EMAIL_ERROR = 'Enter a valid email address (the part before @ must contain a letter, e.g. name@gmail.com).';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const inputCls = `w-full rounded-xl py-3 text-sm text-white placeholder:text-white/30 transition-all duration-200 focus:outline-none`;
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };

// Defined outside Register — stable identity prevents input focus loss on re-render
function Field({ label, icon: Icon, value, onChange, type = 'text', placeholder, required = true, hint, primaryColor, maxLength, inputMode }) {
  const focus = { borderColor: `${primaryColor}60`, boxShadow: `0 0 0 3px ${primaryColor}18` };
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{label}</label>
      <div className="relative">
        <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type={type} placeholder={placeholder} value={value} onChange={onChange} required={required}
          maxLength={maxLength} inputMode={inputMode}
          className={`${inputCls} pl-11 pr-4`}
          style={{ ...inputStyle, ...(value ? focus : {}) }}
        />
      </div>
      {hint && <p className="text-[11px] text-slate-600 pl-1">{hint}</p>}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder = 'Min. 6 characters', required = true, primaryColor, mismatch }) {
  const focus  = { borderColor: `${primaryColor}60`, boxShadow: `0 0 0 3px ${primaryColor}18` };
  const border = mismatch ? { borderColor: 'rgba(239,68,68,0.6)' } : (value ? focus : {});
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{label}</label>
      <div className="relative">
        <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type={show ? 'text' : 'password'} placeholder={placeholder}
          value={value} onChange={onChange} required={required}
          className={`${inputCls} pl-11 pr-12`}
          style={{ ...inputStyle, ...border }}
        />
        <button type="button" onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  );
}

function GoogleButton({ onError, label, disabled }) {
  const handleClick = useCallback(() => {
    if (!window.google?.accounts?.id) {
      onError('Google Sign-In is not available. Please try again later.');
      return;
    }
    window.google.accounts.id.prompt();
  }, [onError]);

  return (
    <button type="button" onClick={handleClick} disabled={disabled}
      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.01] disabled:opacity-50"
      style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'white' }}>
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      {label}
    </button>
  );
}

export default function Register() {
  const { register, registerCoach, googleLogin } = useAuth();
  const { colors } = useTheme();
  const navigate   = useNavigate();

  const [tab, setTab] = useState('student');

  const [studentForm, setStudentForm] = useState({
    studentName: '', schoolName: '', className: '', customClass: '',
    phoneNumber: '', email: '', password: '', confirmPassword: '',
  });
  const [coachForm, setCoachForm] = useState({
    coachName: '', organizationName: '', phoneNumber: '',
    email: '', password: '', confirmPassword: '',
  });

  const [showStudentPass,   setShowStudentPass]   = useState(false);
  const [showStudentConf,   setShowStudentConf]   = useState(false);
  const [showCoachPass,     setShowCoachPass]     = useState(false);
  const [showCoachConf,     setShowCoachConf]     = useState(false);
  const [loading,           setLoading]           = useState(false);
  const [waitSec,           setWaitSec]           = useState(0);
  const [error,             setError]             = useState('');
  const [success,           setSuccess]           = useState(null);
  const [registrationClosed, setRegistrationClosed] = useState(false);

  // Check whether new registrations are currently accepted (public endpoint).
  // Fail-open: if the check errors, the form stays available.
  useEffect(() => {
    api.getRegistrationStatus()
      .then(d => { if (d && d.registrationOpen === false) setRegistrationClosed(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) { setWaitSec(0); return; }
    const id = setInterval(() => setWaitSec(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || window.google) return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts?.id?.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });
    };
    document.body.appendChild(script);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoogleCredential = useCallback(async (response) => {
    setError('');
    setLoading(true);
    try {
      const role  = tab === 'coach' ? 'coach' : 'student';
      const route = await googleLogin(response.credential, role);
      navigate(route, { replace: true });
    } catch (err) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  }, [tab, googleLogin, navigate]);

  const sS = (k) => (e) => setStudentForm(p => ({ ...p, [k]: e.target.value }));
  const sC = (k) => (e) => setCoachForm(p => ({ ...p, [k]: e.target.value }));

  // Phone: digits only, no leading zero, capped at 10 (Indian mobile numbers
  // are 10 digits and never start with 0).
  const sanitizePhone = (v) => v.replace(/\D/g, '').replace(/^0+/, '').slice(0, 10);
  const sSPhone = (e) => setStudentForm(p => ({ ...p, phoneNumber: sanitizePhone(e.target.value) }));
  const sCPhone = (e) => setCoachForm(p => ({ ...p, phoneNumber: sanitizePhone(e.target.value) }));

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const effectiveClass = studentForm.className === 'Other' ? studentForm.customClass.trim() : studentForm.className;
    if (!effectiveClass)                                           { setError('Please select or enter your class / college.'); return; }
    const cleanPhone = studentForm.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10 || cleanPhone.startsWith('0'))    { setError('Enter a valid 10-digit mobile number (no leading 0).'); return; }
    const studentEmail = studentForm.email.trim();
    if (studentEmail && !isValidEmail(studentEmail))               { setError(EMAIL_ERROR); return; }
    if (studentForm.password.length < 6)                           { setError('Password must be at least 6 characters.'); return; }
    if (studentForm.password !== studentForm.confirmPassword)      { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const result = await register({
        studentName: studentForm.studentName.trim(),
        schoolName:  studentForm.schoolName.trim(),
        className:   effectiveClass,
        phoneNumber: cleanPhone,
        email:       studentForm.email.trim() || undefined,
        password:    studentForm.password,
      });
      setSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCoachSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const cleanPhone = coachForm.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10 || cleanPhone.startsWith('0')) { setError('Enter a valid 10-digit mobile number (no leading 0).'); return; }
    if (!isValidEmail(coachForm.email.trim()))                { setError(EMAIL_ERROR); return; }
    if (coachForm.password.length < 6)                        { setError('Password must be at least 6 characters.'); return; }
    if (coachForm.password !== coachForm.confirmPassword)     { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const result = await registerCoach({
        coachName:        coachForm.coachName.trim(),
        organizationName: coachForm.organizationName.trim(),
        phoneNumber:      cleanPhone,
        email:            coachForm.email.trim(),
        password:         coachForm.password,
      });
      setSuccess(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputFocus = { borderColor: `${colors.primary}60`, boxShadow: `0 0 0 3px ${colors.primary}18` };

  /* ── Registration closed screen ── */
  if (registrationClosed) {
    return (
      <div className="fade-in-up space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-2"
          style={{ background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.35)' }}>
          <Lock size={26} className="text-amber-300" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            Registration Closed
          </h2>
          <p className="text-slate-300 text-sm max-w-xs mx-auto">
            New registrations are currently disabled. Please contact your administrator,
            or check back later.
          </p>
        </div>
        <Link to="/login"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all"
          style={{ background: colors.primary }}>
          Back to Login <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="fade-in-up space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: `${colors.primary}25`, border: `1px solid ${colors.primary}40` }}>
            <CheckCircle size={28} style={{ color: colors.primary }} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk' }}>
            Registration Successful!
          </h2>
        </div>

        <div className="rounded-2xl p-5 space-y-3"
          style={{ background: 'rgba(255,255,255,0.05)', border: `1.5px solid ${colors.primary}40` }}>
          <p className="text-slate-300 text-sm font-semibold">Login with your email or mobile number</p>

          {/* Phone */}
          {success.loginOptions?.phone && (
            <div className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: 'rgba(59,192,239,0.10)', border: '1px solid rgba(59,192,239,0.25)' }}>
              <span className="text-sky-300 text-lg">📱</span>
              <div>
                <p className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Mobile Number</p>
                <p className="text-sky-200 font-mono text-sm">{success.loginOptions.phone}</p>
              </div>
            </div>
          )}

          {/* Email */}
          {success.loginOptions?.email && (
            <div className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: 'rgba(59,192,239,0.10)', border: '1px solid rgba(59,192,239,0.25)' }}>
              <span className="text-sky-300 text-lg">✉️</span>
              <div>
                <p className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Email Address</p>
                <p className="text-sky-200 font-mono text-sm">{success.loginOptions.email}</p>
              </div>
            </div>
          )}

          {/* Student ID */}
          {success.loginOptions?.uniqueId && (
            <div className="rounded-xl p-3 flex items-center gap-3"
              style={{ background: 'rgba(59,192,239,0.10)', border: '1px solid rgba(59,192,239,0.25)' }}>
              <span className="text-sky-300 text-lg">🪪</span>
              <div>
                <p className="text-[10px] text-sky-400 font-semibold uppercase tracking-wider">Student ID</p>
                <p className="text-sky-200 font-mono text-sm tracking-widest">{success.loginOptions.uniqueId}</p>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500 pt-1">Save these details — use any one to sign in with your password.</p>
        </div>

        <button onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all hover:scale-[1.02]"
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, boxShadow: `0 10px 32px ${colors.primary}50` }}>
          Go to Sign In <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in-up">
      {/* Tab switcher */}
      <div className="flex p-1 rounded-2xl mb-7" style={{ background: 'rgba(255,255,255,0.06)' }}>
        {[
          { key: 'student', label: 'Student',          Icon: GraduationCap },
          { key: 'coach',   label: 'Trainer',           Icon: Briefcase     },
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${tab === t.key ? 'text-white shadow-lg' : 'text-slate-500 hover:text-slate-400'}`}
            style={tab === t.key ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})` } : {}}>
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk' }}>
          {tab === 'student' ? 'Student Registration' : 'Trainer Registration'}
        </h2>
        <p className="text-slate-400 text-sm">
          {tab === 'student'
            ? 'Create your student account to access Soham Quiz'
            : 'Register as a Trainer '}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5"
          style={{ background: `${colors.error}18`, border: `1px solid ${colors.error}35` }}>
          <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: colors.error }} />
          <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      )}

      {/* ── STUDENT FORM ── */}
      {tab === 'student' && (
        <form onSubmit={handleStudentSubmit} className="space-y-4">
          <Field primaryColor={colors.primary} label="Student Name" icon={User}   value={studentForm.studentName} onChange={sS('studentName')} placeholder="Full name" />
          <Field primaryColor={colors.primary} label="School Name"  icon={School} value={studentForm.schoolName}  onChange={sS('schoolName')}  placeholder="e.g. Delhi Public School" />

          {/* Class / College */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Class / College</label>
            <div className="relative">
              <BookOpen size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <select value={studentForm.className} onChange={sS('className')} required
                className={`${inputCls} pl-11 pr-4 appearance-none cursor-pointer`}
                style={{ ...inputStyle, color: studentForm.className ? 'white' : 'rgba(255,255,255,0.35)' }}>
                <option value="">Select your Class / College</option>
                {CLASS_OPTIONS.map(c => (
                  <option key={c} value={c} style={{ color: 'white', background: '#1e293b' }}>{c}</option>
                ))}
              </select>
            </div>
            {studentForm.className === 'Other' && (
              <div className="relative mt-2">
                <BookOpen size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="e.g. B.Tech 1st Year, Diploma…"
                  value={studentForm.customClass} onChange={sS('customClass')} required
                  className={`${inputCls} pl-11 pr-4`}
                  style={{ ...inputStyle, ...(studentForm.customClass ? inputFocus : {}) }} />
              </div>
            )}
          </div>

          <Field primaryColor={colors.primary} label="Phone Number" icon={Phone} value={studentForm.phoneNumber} onChange={sSPhone} placeholder="10-digit mobile number" type="tel" maxLength={10} inputMode="numeric" />
          <Field primaryColor={colors.primary} label="Email ID (Optional)" icon={Mail} value={studentForm.email} onChange={sS('email')} placeholder="your@email.com" type="email" required={false}
             />

          <PasswordField primaryColor={colors.primary}
            label="Password" value={studentForm.password} onChange={sS('password')}
            show={showStudentPass} onToggle={() => setShowStudentPass(p => !p)} />
          <PasswordField primaryColor={colors.primary}
            label="Confirm Password" value={studentForm.confirmPassword} onChange={sS('confirmPassword')}
            show={showStudentConf} onToggle={() => setShowStudentConf(p => !p)}
            placeholder="Re-enter password"
            mismatch={studentForm.confirmPassword && studentForm.password !== studentForm.confirmPassword} />

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all mt-2 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, boxShadow: `0 10px 32px ${colors.primary}50` }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? (waitSec < 6 ? 'Creating account…' : `Server waking up… ${waitSec}s`) : 'Create Student Account'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      )}

      {/* ── COACH FORM ── */}
      {tab === 'coach' && (
        <form onSubmit={handleCoachSubmit} className="space-y-4">
          <Field primaryColor={colors.primary} label="Trainer Name"               icon={User}     value={coachForm.coachName}        onChange={sC('coachName')}        placeholder="Full name" />
          <Field primaryColor={colors.primary} label="Organization / Institution" icon={Briefcase} value={coachForm.organizationName} onChange={sC('organizationName')} placeholder="e.g. Soham Robotics Academy" />
          <Field primaryColor={colors.primary} label="Phone Number"               icon={Phone}    value={coachForm.phoneNumber}      onChange={sCPhone}                placeholder="10-digit mobile number" type="tel" maxLength={10} inputMode="numeric" />
          <Field primaryColor={colors.primary} label="Email ID"                   icon={Mail}     value={coachForm.email}            onChange={sC('email')}            placeholder="trainer@email.com" type="email"
             />

          <PasswordField primaryColor={colors.primary}
            label="Password" value={coachForm.password} onChange={sC('password')}
            show={showCoachPass} onToggle={() => setShowCoachPass(p => !p)} />
          <PasswordField primaryColor={colors.primary}
            label="Confirm Password" value={coachForm.confirmPassword} onChange={sC('confirmPassword')}
            show={showCoachConf} onToggle={() => setShowCoachConf(p => !p)}
            placeholder="Re-enter password"
            mismatch={coachForm.confirmPassword && coachForm.password !== coachForm.confirmPassword} />

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all mt-2 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, boxShadow: `0 10px 32px ${colors.primary}50` }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? (waitSec < 6 ? 'Creating account…' : `Server waking up… ${waitSec}s`) : 'Create Trainer Account'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      )}

      <p className="text-slate-500 text-sm text-center mt-6">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold hover:underline" style={{ color: colors.primary }}>
          Sign In
        </Link>
      </p>
    </div>
  );
}
