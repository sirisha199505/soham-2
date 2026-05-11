import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getDashboardRoute } from '../utils/rolePermissions';
import { api } from '../utils/api';

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
  // While we're verifying a stored token, don't render protected routes yet.
  const [initializing, setInitializing] = useState(() => !!hasStoredToken());

  // On mount: if a token is stored, verify it against the server once.
  // This catches stale tokens (e.g. JWT_SECRET rotated) before the dashboard
  // fires a dozen parallel API calls that would all return 401.
  useEffect(() => {
    if (!hasStoredToken()) {
      setInitializing(false);
      return;
    }
    api.me()
      .then((freshUser) => {
        // Refresh the stored user object in case fields changed
        localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        setUser(freshUser);
      })
      .catch(() => {
        // Token is invalid/expired — clear everything silently
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setInitializing(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Register a new student ── */
  const register = useCallback(async (schoolName, className, password) => {
    const data = await api.register(schoolName, className, password);
    // Store token for auto-login after register
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // When api.js clears the session due to a 401, sync React state so
  // ProtectedRoute redirects to /login via React Router (no hard reload).
  useEffect(() => {
    const handle = () => setUser(null);
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
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
