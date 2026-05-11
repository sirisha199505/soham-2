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
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        setUser(freshUser);
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

  /* ── Register a new student ── */
  const register = useCallback(async (schoolName, className, password) => {
    const data = await api.register(schoolName, className, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    return data.uniqueId;
  }, []);

  /* ── Login ── */
  const login = useCallback(async (identifier, password) => {
    const data = await api.login(identifier, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    return getDashboardRoute(data.user.role);
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
