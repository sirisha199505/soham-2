import { useState } from 'react';
import {
  User, Mail, Phone, School, Briefcase, BookOpen, LogOut,
  ShieldCheck, GraduationCap, ChevronRight, KeyRound,
  CheckCircle, Hash, Settings, Eye, EyeOff, ChevronDown, ChevronUp,
  Loader2, Pencil, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import { isValidEmail, validatePassword, PASSWORD_MAX } from '../../utils/helpers';

function InfoRow({ icon: Icon, label, value, color }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-slate-50 last:border-0">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}12` }}>
        {Icon && <Icon size={15} style={{ color }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}

function EditField({ icon: Icon, label, value, onChange, placeholder, type = 'text', color, maxLength, inputMode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{label}</label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          maxLength={maxLength} inputMode={inputMode}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-slate-300"
          style={{ '--tw-ring-color': `${color}30` }}
        />
      </div>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder, maxLength }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-slate-300"
          style={{ '--tw-ring-color': '#6366f120' }}
        />
        <button type="button" onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  );
}

export default function StudentProfile() {
  const { user, logout, refreshUser } = useAuth();
  const { colors }       = useTheme();
  const navigate         = useNavigate();

  const isCoach   = user?.role === 'coach' || user?.role === 'teacher';
  const roleColor = isCoach ? '#FAAB34' : colors.primary;
  const RoleIcon  = isCoach ? Briefcase : GraduationCap;
  const roleLabel = isCoach ? 'Trainer' : 'Student';

  const initials = (user?.name || '?')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  // ── Change password state ─────────────────────────────────────────────────
  const [pwOpen,    setPwOpen]    = useState(false);
  const [current,   setCurrent]   = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg,     setPwMsg]     = useState(null); // { type: 'ok'|'err', text }

  // ── Edit profile state ────────────────────────────────────────────────────
  const [editing,  setEditing]  = useState(false);
  const [pform,    setPform]    = useState(null);
  const [pSaving,  setPSaving]  = useState(false);
  const [pMsg,     setPMsg]     = useState(null); // { type:'ok'|'err', text }

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const startEdit = () => {
    const realEmail = user?.email?.includes('@student.rq') ? '' : (user?.email || '');
    setPform({
      name:             user?.name || '',
      email:            realEmail,
      phoneNumber:      user?.phoneNumber || '',
      schoolName:       user?.schoolName || '',
      className:        user?.className || '',
      organizationName: user?.organizationName || '',
    });
    setPMsg(null);
    setEditing(true);
  };

  const setPF = (k) => (e) => setPform(p => ({ ...p, [k]: e.target.value }));

  const handleSaveProfile = async () => {
    if (!pform.name.trim()) { setPMsg({ type: 'err', text: 'Name is required.' }); return; }
    const cleanPhone = pform.phoneNumber.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      setPMsg({ type: 'err', text: 'Enter a valid 10-digit mobile number.' }); return;
    }
    if (pform.email.trim() && !isValidEmail(pform.email.trim())) {
      setPMsg({ type: 'err', text: 'Enter a valid email address.' }); return;
    }
    setPSaving(true);
    setPMsg(null);
    try {
      const payload = { name: pform.name.trim(), phoneNumber: cleanPhone };
      if (pform.email.trim()) payload.email = pform.email.trim();
      if (isCoach) {
        payload.organizationName = pform.organizationName.trim();
      } else {
        payload.schoolName = pform.schoolName.trim();
        payload.className  = pform.className.trim();
      }
      await api.updateProfile(payload);
      await refreshUser();
      setPMsg({ type: 'ok', text: 'Profile updated successfully.' });
      setTimeout(() => { setEditing(false); setPMsg(null); }, 1400);
    } catch (err) {
      setPMsg({ type: 'err', text: err.message || 'Failed to update profile.' });
    } finally {
      setPSaving(false);
    }
  };

  const resetPwForm = () => {
    setCurrent(''); setNewPw(''); setConfirm('');
    setShowCur(false); setShowNew(false); setShowConf(false);
    setPwMsg(null);
  };

  const handleSavePassword = async () => {
    if (!current || !newPw || !confirm) {
      setPwMsg({ type: 'err', text: 'All fields are required.' });
      return;
    }
    if (newPw !== confirm) {
      setPwMsg({ type: 'err', text: 'New passwords do not match.' });
      return;
    }
    const pwErr = validatePassword(newPw);
    if (pwErr) {
      setPwMsg({ type: 'err', text: pwErr });
      return;
    }
    if (newPw === current) {
      setPwMsg({ type: 'err', text: 'New password must be different from your current password.' });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await api.updatePassword(current, newPw);
      setPwMsg({ type: 'ok', text: 'Password updated successfully.' });
      setCurrent(''); setNewPw(''); setConfirm('');
      setTimeout(() => { setPwOpen(false); setPwMsg(null); }, 1800);
    } catch (err) {
      setPwMsg({ type: 'err', text: err.message || 'Failed to update password.' });
    } finally {
      setPwLoading(false);
    }
  };

  const displayEmail = user?.email?.includes('@student.rq') ? null : user?.email;

  return (
    <div className="min-h-full bg-slate-50 pb-10">

      {/* ── Hero banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${roleColor}cc 0%, ${roleColor}88 50%, ${roleColor}44 100%)` }}>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 to-slate-900/20" />
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10 blur-[80px] bg-white" />

        <div className="relative z-10 px-4 md:px-8 pt-10 pb-14 max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-2xl shrink-0"
              style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)`, border: '3px solid rgba(255,255,255,0.3)' }}>
              {initials}
            </div>
            <div className="flex-1 text-center sm:text-left pb-1">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1.5">{roleLabel}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight" style={{ fontFamily: 'Space Grotesk' }}>
                {user?.name || '—'}
              </h1>
              {displayEmail && <p className="text-white/70 text-sm mt-1.5">{displayEmail}</p>}
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                  style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.25)' }}>
                  <RoleIcon size={11} /> {roleLabel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-3xl mx-auto -mt-6 space-y-5">

        {/* ── Profile Information ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${roleColor}15` }}>
                <User size={15} style={{ color: roleColor }} />
              </div>
              <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>Profile Information</h2>
            </div>
            {!editing && (
              <button onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ color: roleColor, background: `${roleColor}12` }}>
                <Pencil size={12} /> Edit
              </button>
            )}
          </div>

          {!editing ? (
            <div className="px-5 py-1">
              <InfoRow icon={User}       label="Full Name"            value={user?.name}             color={roleColor} />
              <InfoRow icon={Mail}       label="Email Address"        value={displayEmail}           color={roleColor} />
              <InfoRow icon={Phone}      label="Phone Number"         value={user?.phoneNumber}       color={roleColor} />
              {!isCoach && (
                <>
                  <InfoRow icon={School}   label="School / Institution" value={user?.schoolName}      color={roleColor} />
                  <InfoRow icon={BookOpen} label="Class / Grade"        value={user?.className}       color={roleColor} />
                </>
              )}
              {isCoach && (
                <InfoRow icon={Briefcase} label="Organization"         value={user?.organizationName} color={roleColor} />
              )}
              <InfoRow icon={ShieldCheck} label="Account Role"         value={roleLabel}              color={roleColor} />
            </div>
          ) : (
            <div className="px-5 py-4 space-y-3">
              <EditField icon={User}  label="Full Name"     value={pform.name}        onChange={setPF('name')}        placeholder="Your full name"           color={roleColor} />
              <EditField icon={Mail}  label="Email Address" value={pform.email}       onChange={setPF('email')}       placeholder="your@email.com" type="email" color={roleColor} />
              <EditField icon={Phone} label="Phone Number"  value={pform.phoneNumber} onChange={setPF('phoneNumber')} placeholder="10-digit mobile number" type="tel" inputMode="numeric" maxLength={10} color={roleColor} />
              {!isCoach ? (
                <>
                  <EditField icon={School}   label="School / Institution" value={pform.schoolName} onChange={setPF('schoolName')} placeholder="School / institution" color={roleColor} />
                  <EditField icon={BookOpen} label="Class / Grade"        value={pform.className}  onChange={setPF('className')}  placeholder="e.g. X, B.Tech 1st Year" color={roleColor} />
                </>
              ) : (
                <EditField icon={Briefcase} label="Organization" value={pform.organizationName} onChange={setPF('organizationName')} placeholder="Organization / institution" color={roleColor} />
              )}

              {pMsg && (
                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                  pMsg.type === 'ok'
                    ? 'bg-green-50 border border-green-100 text-green-700'
                    : 'bg-red-50 border border-red-100 text-red-600'
                }`}>
                  {pMsg.type === 'ok' ? <CheckCircle size={13} /> : null}
                  {pMsg.text}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setEditing(false); setPMsg(null); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all">
                  <X size={13} /> Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={pSaving}
                  className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)` }}>
                  {pSaving ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Account Settings ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                <Settings size={15} className="text-slate-500" />
              </div>
              <h2 className="text-sm font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk' }}>Account Settings</h2>
            </div>
          </div>

          <div className="p-4 space-y-2.5">
            {/* Account status */}
            <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-green-50 border border-green-100">
              <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle size={15} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">Account Active</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Your account is in good standing</p>
              </div>
              <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-full">Active</span>
            </div>

            {/* Change password — inline expandable */}
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => { setPwOpen(o => !o); if (!pwOpen) resetPwForm(); }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-slate-50 transition-all group">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${roleColor}12` }}>
                  <KeyRound size={15} style={{ color: roleColor }} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-slate-700">Change Password</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Update your account password</p>
                </div>
                {pwOpen
                  ? <ChevronUp size={15} className="text-slate-400 shrink-0" />
                  : <ChevronDown size={15} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />}
              </button>

              {pwOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-3">
                  <PasswordField
                    label="Current Password"
                    value={current} onChange={setCurrent}
                    show={showCur} onToggle={() => setShowCur(s => !s)}
                    placeholder="Enter current password"
                  />
                  <PasswordField
                    label="New Password"
                    value={newPw} onChange={setNewPw}
                    show={showNew} onToggle={() => setShowNew(s => !s)}
                    placeholder="Enter new password" maxLength={PASSWORD_MAX}
                  />
                  <PasswordField
                    label="Confirm New Password"
                    value={confirm} onChange={setConfirm}
                    show={showConf} onToggle={() => setShowConf(s => !s)}
                    placeholder="Confirm new password" maxLength={PASSWORD_MAX}
                  />

                  {pwMsg && (
                    <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                      pwMsg.type === 'ok'
                        ? 'bg-green-50 border border-green-100 text-green-700'
                        : 'bg-red-50 border border-red-100 text-red-600'
                    }`}>
                      {pwMsg.type === 'ok' ? <CheckCircle size={13} /> : null}
                      {pwMsg.text}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setPwOpen(false); resetPwForm(); }}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-all">
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePassword}
                      disabled={pwLoading}
                      className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-bold transition-all hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}cc)` }}>
                      {pwLoading ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : 'Save Password'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sign out */}
            <button onClick={handleLogout}
              className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all group">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <LogOut size={15} className="text-red-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-red-600">Sign Out</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Log out of your account</p>
              </div>
              <ChevronRight size={15} className="text-red-200 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
