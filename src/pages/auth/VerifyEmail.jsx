import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { api } from '../../utils/api';
import { useTheme } from '../../context/ThemeContext';

export default function VerifyEmail() {
  const [searchParams]                = useSearchParams();
  const { colors }                    = useTheme();
  const [status, setStatus]           = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage]         = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please check your email link.');
      return;
    }

    api.verifyEmail(token)
      .then((msg) => {
        setStatus('success');
        setMessage(typeof msg === 'string' ? msg : 'Email verified successfully! You can now log in.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Verification failed. The link may have expired.');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="w-full max-w-md rounded-3xl p-10 text-center"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)' }}>

        {status === 'loading' && (
          <>
            <Loader2 size={48} className="animate-spin mx-auto mb-5" style={{ color: colors.primary }} />
            <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
              Verifying your email…
            </h2>
            <p className="text-slate-400 text-sm">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: `${colors.primary}20`, border: `1px solid ${colors.primary}40` }}>
              <CheckCircle size={32} style={{ color: colors.primary }} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
              Email Verified!
            </h2>
            <p className="text-slate-400 text-sm mb-8">{message}</p>
            <Link to="/login"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-semibold transition-all hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, boxShadow: `0 10px 32px ${colors.primary}50` }}>
              Go to Sign In <ArrowRight size={16} />
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <XCircle size={32} className="text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk' }}>
              Verification Failed
            </h2>
            <p className="text-slate-400 text-sm mb-8">{message}</p>
            <Link to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white font-semibold transition-all hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`, boxShadow: `0 10px 32px ${colors.primary}50` }}>
              Register Again <ArrowRight size={16} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
