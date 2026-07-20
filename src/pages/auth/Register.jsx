import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, School, BookOpen, Phone, Mail, Lock, Eye, EyeOff,
  AlertCircle, CheckCircle, ArrowRight, Loader2, Briefcase, MapPin, ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { isValidEmail, validatePassword, PASSWORD_MAX } from '../../utils/helpers';
import { api } from '../../utils/api';

const CLASS_OPTIONS = ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'Other'];
const EMAIL_ERROR = 'Enter a valid email address (the part before @ must contain a letter, e.g. name@gmail.com).';

const inputCls = `w-full rounded-xl py-3 text-sm text-white placeholder:text-white/30 transition-all duration-200 focus:outline-none`;
const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };

// Defined outside Register — stable identity prevents input focus loss on re-render
function Field({ label, icon: Icon, value, onChange, type = 'text', placeholder, required = true, hint, primaryColor, maxLength, inputMode }) {
  const focus = { borderColor: `${primaryColor}60`, boxShadow: `0 0 0 3px ${primaryColor}18` };
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
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

// Dropdown field (State / District) — matches the Field look.
function SelectField({ label, icon: Icon, value, onChange, options, placeholder = 'Select…', required = true, disabled = false, primaryColor }) {
  const focus = { borderColor: `${primaryColor}60`, boxShadow: `0 0 0 3px ${primaryColor}18` };
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Icon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
        <select
          value={value} onChange={onChange} required={required} disabled={disabled}
          className={`${inputCls} pl-11 pr-10 appearance-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ ...inputStyle, ...(value ? focus : {}), color: value ? '#fff' : 'rgba(255,255,255,0.35)' }}
        >
          <option value="" disabled style={{ color: '#94a3b8', background: '#1e293b' }}>{placeholder}</option>
          {options.map(o => (
            <option key={o} value={o} style={{ color: '#fff', background: '#1e293b' }}>{o}</option>
          ))}
        </select>
        {/* Dropdown chevron (native arrow is hidden by appearance-none) */}
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

// Sentinel option appended to the village dropdown so a user can enter a village
// that isn't in the list. Selecting it switches the field to a free-text box.
const OTHER_VILLAGE = 'Other (enter manually)';

// Cascading State → District → Mandal → Village dropdowns, fed by the backend
// location API. `value` = { state, district, mandal, village }; each selection
// loads the next level and clears the ones below it.
function LocationPicker({ value, onChange, primaryColor }) {
  const [states,    setStates]    = useState([]);
  const [districts, setDistricts] = useState([]);
  const [mandals,   setMandals]   = useState([]);
  const [villages,  setVillages]  = useState([]);
  // When on, the Village field is a free-text box instead of a dropdown
  // (for villages not present in the list).
  const [villageManual, setVillageManual] = useState(false);

  useEffect(() => { api.getLocationStates().then(setStates).catch(() => setStates([])); }, []);
  useEffect(() => {
    if (!value.state) { setDistricts([]); return; }
    api.getLocationDistricts(value.state).then(setDistricts).catch(() => setDistricts([]));
  }, [value.state]);
  useEffect(() => {
    if (!value.state || !value.district) { setMandals([]); return; }
    api.getLocationMandals(value.state, value.district).then(setMandals).catch(() => setMandals([]));
  }, [value.state, value.district]);
  useEffect(() => {
    if (!value.state || !value.district || !value.mandal) { setVillages([]); return; }
    api.getLocationVillages(value.state, value.district, value.mandal).then(setVillages).catch(() => setVillages([]));
  }, [value.state, value.district, value.mandal]);

  const set = (patch) => onChange({ ...value, ...patch });

  // No villages in the list for this mandal → force the manual text box.
  const noVillages    = !!value.mandal && villages.length === 0;
  const manualVillage = villageManual || noVillages;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <SelectField primaryColor={primaryColor} label="State" icon={MapPin}
          value={value.state} options={states} placeholder="Select State"
          onChange={e => { setVillageManual(false); set({ state: e.target.value, district: '', mandal: '', village: '' }); }} />
        <SelectField primaryColor={primaryColor} label="District" icon={MapPin}
          value={value.district} options={districts} disabled={!value.state}
          placeholder={value.state ? 'Select District' : 'Select State first'}
          onChange={e => { setVillageManual(false); set({ district: e.target.value, mandal: '', village: '' }); }} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SelectField primaryColor={primaryColor} label="Mandal" icon={MapPin}
          value={value.mandal} options={mandals} disabled={!value.district}
          placeholder={value.district ? 'Select Mandal' : 'Select District first'}
          onChange={e => { setVillageManual(false); set({ mandal: e.target.value, village: '' }); }} />

        {/* Village — pick from the list (incl. an "Other" option to type it), or a
            free-text box when the mandal has no villages listed */}
        <div>
          {manualVillage ? (
            <Field primaryColor={primaryColor} label="Village (optional)" required={false} icon={MapPin}
              value={value.village} onChange={e => set({ village: e.target.value })}
              placeholder={value.mandal ? 'Type your village name' : 'Select Mandal first'} />
          ) : (
            <SelectField primaryColor={primaryColor} label="Village (optional)" required={false} icon={MapPin}
              value={value.village} options={[...villages, OTHER_VILLAGE]} disabled={!value.mandal}
              placeholder={!value.mandal ? 'Select Mandal first' : 'Select Village (optional)'}
              onChange={e => {
                if (e.target.value === OTHER_VILLAGE) { setVillageManual(true); set({ village: '' }); }
                else set({ village: e.target.value });
              }} />
          )}
          {value.mandal && (noVillages ? (
            <p className="text-[11px] text-slate-500 mt-1 pl-1">Not listed — type your village above.</p>
          ) : manualVillage ? (
            <button type="button"
              onClick={() => { setVillageManual(false); set({ village: '' }); }}
              className="text-[11px] font-semibold mt-1 pl-1 hover:underline"
              style={{ color: primaryColor }}>
              ↩ Choose from list
            </button>
          ) : null)}
        </div>
      </div>
    </>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder = 'Min. 6 characters', required = true, primaryColor, mismatch, maxLength }) {
  const focus  = { borderColor: `${primaryColor}60`, boxShadow: `0 0 0 3px ${primaryColor}18` };
  const border = mismatch ? { borderColor: 'rgba(239,68,68,0.6)' } : (value ? focus : {});
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type={show ? 'text' : 'password'} placeholder={placeholder}
          value={value} onChange={onChange} required={required} maxLength={maxLength}
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

export default function Register() {
  const { register, registerCoach } = useAuth();
  const { colors } = useTheme();
  const navigate   = useNavigate();

  // The role is fixed by ?role= — "Create your Student Account" opens ONLY the
  // student form, "Register as Trainer" opens ONLY the trainer form. There is no
  // in-page switcher; the two flows are kept separate (switch via the login page).
  const tab = (() => {
    const r = new URLSearchParams(window.location.search).get('role');
    return (r === 'coach' || r === 'trainer' || r === 'teacher') ? 'coach' : 'student';
  })();

  const [studentForm, setStudentForm] = useState({
    studentName: '', schoolName: '', className: '', customClass: '',
    state: '', district: '', mandal: '', village: '',
    phoneNumber: '', email: '', password: '', confirmPassword: '',
  });
  const [coachForm, setCoachForm] = useState({
    coachName: '', organizationName: '',
    state: '', district: '', mandal: '', village: '',
    phoneNumber: '', email: '', password: '', confirmPassword: '',
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
    if (!effectiveClass)                                           { setError('Please select or enter your Class / Course.'); return; }
    if (!studentForm.state)                                        { setError('Please select your State.'); return; }
    if (!studentForm.district)                                     { setError('Please select your District.'); return; }
    if (!studentForm.mandal.trim())                                { setError('Please select your Mandal.'); return; }
    const cleanPhone = studentForm.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10 || cleanPhone.startsWith('0'))    { setError('Enter a valid 10-digit mobile number (no leading 0).'); return; }
    const studentEmail = studentForm.email.trim();
    if (studentEmail && !isValidEmail(studentEmail))               { setError(EMAIL_ERROR); return; }
    const studentPwErr = validatePassword(studentForm.password);
    if (studentPwErr)                                              { setError(studentPwErr); return; }
    if (studentForm.password !== studentForm.confirmPassword)      { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const result = await register({
        studentName: studentForm.studentName.trim(),
        schoolName:  studentForm.schoolName.trim(),
        className:   effectiveClass,
        state:       studentForm.state,
        district:    studentForm.district,
        mandal:      studentForm.mandal.trim(),
        village:     studentForm.village.trim(),
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
    if (!coachForm.state)                                     { setError('Please select your State.'); return; }
    if (!coachForm.district)                                  { setError('Please select your District.'); return; }
    if (!coachForm.mandal.trim())                             { setError('Please select your Mandal.'); return; }
    const cleanPhone = coachForm.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10 || cleanPhone.startsWith('0')) { setError('Enter a valid 10-digit mobile number (no leading 0).'); return; }
    if (!isValidEmail(coachForm.email.trim()))                { setError(EMAIL_ERROR); return; }
    const coachPwErr = validatePassword(coachForm.password);
    if (coachPwErr)                                           { setError(coachPwErr); return; }
    if (coachForm.password !== coachForm.confirmPassword)     { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const result = await registerCoach({
        coachName:        coachForm.coachName.trim(),
        organizationName: coachForm.organizationName.trim(),
        state:            coachForm.state,
        district:         coachForm.district,
        mandal:           coachForm.mandal.trim(),
        village:          coachForm.village.trim(),
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

          <p className="text-[11px] text-slate-500 pt-1">Save these details — use any one to sign in with your password.</p>
        </div>

        <button onClick={() => navigate(`/login?role=${tab === 'coach' ? 'trainer' : 'student'}`)}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all hover:scale-[1.02]"
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`, boxShadow: `0 10px 32px ${colors.primary}50` }}>
          Go to Sign In <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in-up">
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
          <Field primaryColor={colors.primary} label="Institute Name"  icon={School} value={studentForm.schoolName}  onChange={sS('schoolName')}  placeholder="Institution name" />

          {/*Class / Course */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Class / Course<span className="text-rose-400 ml-0.5">*</span></label>
            <div className="relative">
              <BookOpen size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <select value={studentForm.className} onChange={sS('className')} required
                className={`${inputCls} pl-11 pr-4 appearance-none cursor-pointer`}
                style={{ ...inputStyle, color: studentForm.className ? 'white' : 'rgba(255,255,255,0.55)' }}>
                {/* Placeholder needs the same explicit dark bg/colour as the real
                    options below — without it the open dropdown rendered this row as
                    near-white text on the browser's default white option background,
                    so it was invisible unless the cursor was hovering over it. Also
                    disabled+hidden so it can't be re-selected once a real value is set. */}
                <option value="" disabled style={{ color: '#94a3b8', background: '#1e293b' }}>Select your Class / Course</option>
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

          {/* Location — cascading State → District → Mandal → Village dropdowns */}
          <LocationPicker primaryColor={colors.primary}
            value={{ state: studentForm.state, district: studentForm.district, mandal: studentForm.mandal, village: studentForm.village }}
            onChange={loc => setStudentForm(p => ({ ...p, ...loc }))} />

          <Field primaryColor={colors.primary} label="Phone Number" icon={Phone} value={studentForm.phoneNumber} onChange={sSPhone} placeholder="10-digit mobile number" type="tel" maxLength={10} inputMode="numeric" />
          <Field primaryColor={colors.primary} label="Email ID (Optional)" icon={Mail} value={studentForm.email} onChange={sS('email')} placeholder="your@email.com" type="email" required={false}
             />

          <PasswordField primaryColor={colors.primary} maxLength={PASSWORD_MAX}
            label="Password" value={studentForm.password} onChange={sS('password')}
            show={showStudentPass} onToggle={() => setShowStudentPass(p => !p)} />
          <PasswordField primaryColor={colors.primary} maxLength={PASSWORD_MAX}
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
          <Field primaryColor={colors.primary} label="Organization / Institution" icon={Briefcase} value={coachForm.organizationName} onChange={sC('organizationName')} placeholder="Organization / Institution" />

          {/* Location — cascading State → District → Mandal → Village dropdowns */}
          <LocationPicker primaryColor={colors.primary}
            value={{ state: coachForm.state, district: coachForm.district, mandal: coachForm.mandal, village: coachForm.village }}
            onChange={loc => setCoachForm(p => ({ ...p, ...loc }))} />

          <Field primaryColor={colors.primary} label="Phone Number"               icon={Phone}    value={coachForm.phoneNumber}      onChange={sCPhone}                placeholder="10-digit mobile number" type="tel" maxLength={10} inputMode="numeric" />
          <Field primaryColor={colors.primary} label="Email ID"                   icon={Mail}     value={coachForm.email}            onChange={sC('email')}            placeholder="trainer@email.com" type="email"
             />

          <PasswordField primaryColor={colors.primary} maxLength={PASSWORD_MAX}
            label="Password" value={coachForm.password} onChange={sC('password')}
            show={showCoachPass} onToggle={() => setShowCoachPass(p => !p)} />
          <PasswordField primaryColor={colors.primary} maxLength={PASSWORD_MAX}
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
