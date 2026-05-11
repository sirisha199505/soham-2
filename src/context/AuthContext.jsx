import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getDashboardRoute } from '../utils/rolePermissions';
import { api } from '../utils/api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'rqa_token';
const USER_KEY  = 'rqa_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

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
    getStudentList,
    hasAttemptedQuiz,
    markQuizStarted,
    markQuizComplete,
    completedQuizzes,
    getQuizResult,
    isQuizStarted,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
