import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getDashboardRoute } from '../utils/rolePermissions';
import { api, clearSession } from '../utils/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'rqa_token';
const USER_KEY  = 'rqa_user';

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  // While we're verifying a stored token on page load, don't render protected routes yet.
  const [initializing, setInitializing] = useState(() => !!hasStoredToken());

  // On mount: if a stored token exists, verify it with the server ONCE before
  // rendering any protected route. Catches stale tokens without racing against
  // a dozen parallel dashboard API calls.
  useEffect(() => {
    if (!hasStoredToken()) {
      setInitializing(false);
      return;
    }
    api.me()
      .then((freshUser) => {
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        setUser(freshUser);
      })
      .catch(() => {
        // Token rejected by server (expired / JWT_SECRET changed) — clear silently
        clearSession();
        setUser(null);
      })
      .finally(() => setInitializing(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for explicit session-clear events (e.g. manual logout from other tabs)
  useEffect(() => {
    const handle = () => setUser(null);
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  /* ── Register a new student ── */
  const register = useCallback(async (schoolName, className, password) => {
    const data = await api.register(schoolName, className, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.uniqueId;
  }, []);

  /* ── Login ── */
  const login = useCallback(async (identifier, password) => {
    const data = await api.login(identifier, password);
    // Store token first so api.me() can pick it up
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));

    // Immediately verify the token works on this server before navigating.
    // If JWT_SECRET is misconfigured, me() returns 401 here rather than
    // after the user reaches the dashboard and fires multiple API calls.
    try {
      const freshUser = await api.me();
      localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      setUser(freshUser);
      return getDashboardRoute(freshUser.role);
    } catch {
      // me() failed — token was issued but can't be verified (server mismatch)
      // Fall back to the login-response user so the session still works
      setUser(data.user);
      return getDashboardRoute(data.user.role);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
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
