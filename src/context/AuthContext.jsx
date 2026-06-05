import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { getDashboardRoute } from '../utils/rolePermissions';
import { api, clearSession, SESSION_TOKEN_KEY } from '../utils/api';
import { recoverPendingAttempt } from '../utils/quizGenerator';

const AuthContext = createContext(null);
const TOKEN_KEY = 'rqa_token';
const USER_KEY  = 'rqa_user';
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;

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

// Normalize role: treat legacy 'teacher' as 'coach'
function normalizeRole(role) {
  if (typeof role === 'number') {
    return { 0: 'student', 1: 'admin', 2: 'coach' }[role] || 'student';
  }
  return role === 'teacher' ? 'coach' : (role || 'student');
}

function normalizeStoredUser(raw) {
  if (!raw) return raw;
  const role = normalizeRole(raw.role);
  return { ...raw, role, name: raw.name || raw.full_name || '', full_name: raw.full_name || raw.name || '' };
}

export function AuthProvider({ children }) {
  const [user, setUser]                 = useState(() => normalizeStoredUser(readStoredUser()));
  const [initializing, setInitializing] = useState(() => !!hasStoredToken());
  const heartbeatRef                    = useRef(null);

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
        recoverPendingAttempt().catch(() => {});
      })
      .catch((err) => {
        if (err?.status === 401) {
          clearSession();
          setUser(null);
        }
      })
      .finally(() => setInitializing(false));
  }, []);  

  useEffect(() => {
    const handle = () => setUser(null);
    window.addEventListener('auth:logout', handle);
    return () => window.removeEventListener('auth:logout', handle);
  }, []);

  // Heartbeat — keeps session_active_at fresh for all logged-in users
  useEffect(() => {
    if (!user) {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      return;
    }
    const beat = () => api.heartbeat().catch(() => {});
    beat();
    heartbeatRef.current = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(heartbeatRef.current);
  }, [user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Register a new student ── */
  const register = useCallback(async (data) => {
    return api.register(data);
  }, []);

  /* ── Register an Innovation Coach ── */
  const registerCoach = useCallback(async (data) => {
    return api.registerCoach(data);
  }, []);

  /* ── Login ── */
  // expectedTab: 'student' | 'coach' | 'admin' — must match the actual account role
  // force=true ends any session already active on another device (the user
  // explicitly chose "log out other device & continue" after a session_active error).
  const login = useCallback(async (identifier, password, expectedTab, force = false) => {
    const data = await api.login(identifier, password, force);
    const normalized = normalizeStoredUser(data.user);
    const role = normalized.role;

    if (expectedTab) {
      const isStudent = role === 'student';
      const isTrainer = role === 'coach' || role === 'teacher';
      const isAdmin   = !isStudent && !isTrainer;

      if (expectedTab === 'student' && !isStudent)
        throw new Error(isTrainer ? 'These credentials belong to a Trainer account. Please use the Trainer tab.' : 'These credentials belong to an Admin account. Please use the Admin tab.');
      if (expectedTab === 'coach' && !isTrainer)
        throw new Error(isStudent ? 'These credentials belong to a Student account. Please use the Student tab.' : 'These credentials belong to an Admin account. Please use the Admin tab.');
      if (expectedTab === 'admin' && !isAdmin)
        throw new Error(isStudent ? 'These credentials belong to a Student account. Please use the Student tab.' : 'These credentials belong to a Trainer account. Please use the Trainer tab.');
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    if (data.sessionToken) {
      localStorage.setItem(SESSION_TOKEN_KEY, data.sessionToken);
    }
    setUser(normalized);
    return getDashboardRoute(normalized.role);
  }, []);  

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    clearSession();
    setUser(null);
  }, []);

  /* ── Refresh the cached user from the server (after a profile edit) ── */
  const refreshUser = useCallback(async () => {
    const fresh = await api.me();
    const normalized = normalizeStoredUser(fresh);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  }, []);

  const getStudentList = useCallback(async () => {
    return api.getStudents();
  }, []);

  // Backward-compat stubs
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
    registerCoach,
    refreshUser,
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
