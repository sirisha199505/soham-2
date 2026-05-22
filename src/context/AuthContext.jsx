import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getDashboardRoute } from '../utils/rolePermissions';
import { api, clearSession, SESSION_TOKEN_KEY } from '../utils/api';
import { recoverPendingAttempt } from '../utils/quizGenerator';

const AuthContext = createContext(null);
const TOKEN_KEY = 'rqa_token';
const USER_KEY  = 'rqa_user';
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function readStoredUser() {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function hasStoredToken() {
  const t = localStorage.getItem(TOKEN_KEY);
  return t && t !== 'undefined' && t !== 'null';
}

const ROLE_MAP_INIT = { 0: 'student', 1: 'admin', 2: 'teacher' };
function normalizeStoredUser(raw) {
  if (!raw) return raw;
  const role = typeof raw.role === 'number' ? (ROLE_MAP_INIT[raw.role] || 'student') : (raw.role || 'student');
  return { ...raw, role, name: raw.name || raw.full_name || '', full_name: raw.full_name || raw.name || '' };
}

export function AuthProvider({ children }) {
  const [user, setUser]                   = useState(() => normalizeStoredUser(readStoredUser()));
  const [kickedOut, setKickedOut]         = useState(false);
  // While we're verifying a stored token on page load, don't render protected routes yet.
  const [initializing, setInitializing]   = useState(() => !!hasStoredToken());
  const heartbeatRef                      = useRef(null);

  // On mount: if a stored token exists, try to refresh user data from the server.
  // Only clear the session if we get a definitive 401 (token explicitly rejected).
  // 404 (endpoint doesn't exist on this backend) or network errors keep the user logged in.
  useEffect(() => {
    if (!hasStoredToken()) {
      setInitializing(false);
      return;
    }
    api.me()
      .then((freshUser) => {
        const normalized = normalizeStoredUser(freshUser);
        localStorage.setItem(USER_KEY, JSON.stringify(normalized));
        setUser(normalized);
        // After confirming the session is valid, silently retry any quiz attempt
        // that failed to persist during the previous session (e.g. Render cold start).
        recoverPendingAttempt().catch(() => {});
      })
      .catch((err) => {
        if (err?.status === 401) {
          // Token explicitly rejected by server — it's expired or the secret changed
          clearSession();
          setUser(null);
        }
        // 404 (endpoint not on this backend), 500, or network error:
        // keep the stored user — don't punish them for a missing endpoint
      })
      .finally(() => setInitializing(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for explicit session-clear events (e.g. manual logout from other tabs)
  useEffect(() => {
    const handle = () => setUser(null);
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  // Heartbeat: keep student session alive and detect forced logout from another device
  useEffect(() => {
    if (!user || user.role !== 'student') {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }

    const beat = async () => {
      try {
        await api.heartbeat();
      } catch (err) {
        if (err?.status === 409) {
          // Another device force-logged in — invalidate this session
          sessionStorage.setItem('rqa_kicked_out', '1');
          clearSession();
          setUser(null);
          setKickedOut(true);
        }
      }
    };

    // Run once immediately on login, then every 5 minutes
    beat();
    heartbeatRef.current = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(heartbeatRef.current);
  }, [user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Register a new student ── */
  const register = useCallback(async (schoolName, className, password) => {
    const data = await api.register(schoolName, className, password);
    // Do not store session token here — registration does not create an active session.
    // Session token is only set after a proper login.
    return data.uniqueId;
  }, []);

  /* ── Login ── */
  const login = useCallback(async (identifier, password, force = false) => {
    const data = await api.login(identifier, password, force);
    const normalized = normalizeStoredUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    if (data.sessionToken) {
      localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
    }
    setKickedOut(false);
    setUser(normalized);
    return getDashboardRoute(normalized.role);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore — session cleared locally regardless */ }
    clearSession();
    setUser(null);
    setKickedOut(false);
  }, []);

  /* ── Student list (admin) ── */
  const getStudentList = useCallback(async () => {
    return api.getStudents();
  }, []);

  // Backward-compat stubs for old quiz pages (no-ops in API mode)
  const hasAttemptedQuiz  = () => false;
  const markQuizStarted   = () => {};
  const markQuizComplete  = () => {};
  const completedQuizzes  = new Set();
  const getQuizResult     = () => null;
  const isQuizStarted     = () => false;

  const value = {
    user,
    login,
    logout,
    register,
    isAuthenticated: !!user,
    initializing,
    kickedOut,
    getStudentList,
    hasAttemptedQuiz,
    markQuizStarted,
    markQuizComplete,
    completedQuizzes,
    getQuizResult,
    isQuizStarted,
  };

  // Hold the entire tree while the token is being verified so no protected
  // route fires API calls before we know whether the session is valid.
  if (initializing) {
    return (
      <AuthContext.Provider value={value}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f4ff' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#6366f1', fontFamily: 'sans-serif', fontSize: 14 }}>Verifying session…</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
