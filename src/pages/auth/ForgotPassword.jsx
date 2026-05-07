import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Hash, School, Users, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../utils/api';

export default function ForgotPassword() {
  const [step,      setStep]     = useState(1); // 1 = enter details, 2 = success
  const [form,      setForm]     = useState({ uniqueId: '', schoolName: '', className: '', newPassword: '', confirmPassword: '' });
  const [showPass,  setShowPass] = useState(false);
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState('');

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.newPassword.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setLoading(true);
    try {
      await api.resetPassword(
        form.uniqueId.trim(),
        form.schoolName.trim(),
        form.className.trim(),
        form.newPassword,
      );
      setStep(2);
    } catch (err) {
      setError(err.message || 'Password reset failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `
    w-full rounded-xl py-3 text-sm text-white
    placeholder:text-white/30 transition-all duration-200 focus:outline-none
  `;
  const inputStyle = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
      <Link to="/login" className="inline-flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to login
      </Link>

      {step === 2 ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
            Password Reset!
          </h2>
          <p className="text-white/60 text-sm mb-6">
            Your password has been updated. You can now log in with your new password.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            Go to Login
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Space Grotesk' }}>
              Reset Password
            </h2>
            <p className="text-white/60 text-sm">
              Enter your Student ID with the school details you registered with.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-2xl px-4 py-3.5 mb-5"
              style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Student ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Student ID
              </label>
              <div className="relative">
                <Hash size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Your 8-digit Student ID"
                  value={form.uniqueId}
                  onChange={f('uniqueId')}
                  required
                  inputMode="numeric"
                  maxLength={9}
                  className={`${inputCls} pl-11 pr-4 font-mono tracking-widest`}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* School Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                School Name
              </label>
              <div className="relative">
                <School size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="School name used during registration"
                  value={form.schoolName}
                  onChange={f('schoolName')}
                  required
                  className={`${inputCls} pl-11 pr-4`}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Class Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Class / Section
              </label>
              <div className="relative">
                <Users size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Class name used during registration"
                  value={form.className}
                  onChange={f('className')}
                  required
                  className={`${inputCls} pl-11 pr-4`}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="At least 4 characters"
                  value={form.newPassword}
                  onChange={f('newPassword')}
                  required
                  minLength={4}
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

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={form.confirmPassword}
                  onChange={f('confirmPassword')}
                  required
                  className={`${inputCls} pl-11 pr-4`}
                  style={inputStyle}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3.5 rounded-2xl transition-all mt-2 disabled:opacity-60 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)', boxShadow: '0 10px 32px rgba(99,102,241,0.4)' }}
            >
              {loading && (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              {loading ? 'Verifying…' : 'Reset Password'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
