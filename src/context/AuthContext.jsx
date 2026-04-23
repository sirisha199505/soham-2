import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ROLES } from '../utils/constants';
import { getDashboardRoute } from '../utils/rolePermissions';
import { generateUniqueId } from '../utils/uniqueId';

const AuthContext = createContext(null);

const STUDENTS_KEY = 'rqa_students';
const USER_KEY     = 'rqa_user';

// ── Demo staff accounts (hardcoded, no registration needed) ──────────────────
const DEMO_STAFF = {
  'teacher@roboquiz.in': {
    id: 'teacher@roboquiz.in', email: 'teacher@roboquiz.in',
    name: 'Ms. Kavya Nair', role: ROLES.TEACHER, password: 'teacher123',
  },
  'admin@roboquiz.in': {
    id: 'admin@roboquiz.in', email: 'admin@roboquiz.in',
    name: 'Mr. Arjun Mehta', role: ROLES.SCHOOL_ADMIN, password: 'admin123',
  },
  'district@roboquiz.in': {
    id: 'district@roboquiz.in', email: 'district@roboquiz.in',
    name: 'Dr. Priya Sharma', role: ROLES.DISTRICT_ADMIN, password: 'district123',
  },
  'super@roboquiz.in': {
    id: 'super@roboquiz.in', email: 'super@roboquiz.in',
    name: 'Admin Superuser', role: ROLES.SUPER_ADMIN, password: 'super123',
  },
};

function getStudents() {
  try { return JSON.parse(localStorage.getItem(STUDENTS_KEY) || '{}'); }
  catch { return {}; }
}
function saveStudents(s) {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(s));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  // Version bump forces completedQuizzes to re-derive from localStorage
  const [completedV, setCompletedV] = useState(0);

  /* ── Register a new student ── */
  const register = useCallback(async (name, rollNo, className, password) => {
    await new Promise(r => setTimeout(r, 700));

    const uniqueId = generateUniqueId(name, rollNo, className);
    const students = getStudents();

    if (students[uniqueId]) {
      throw new Error(
        `A student with this combination already exists. Your ID is: ${uniqueId}`
      );
    }

    students[uniqueId] = { uniqueId, name, rollNo, className, password };
    saveStudents(students);
    return uniqueId;
  }, []);

  /* ── Login — checks staff accounts first, then students ── */
  const login = useCallback(async (identifier, password) => {
    await new Promise(r => setTimeout(r, 800));

    const key = identifier.trim().toLowerCase();

    // Check demo staff accounts (email-based)
    const staff = DEMO_STAFF[key];
    if (staff) {
      if (staff.password !== password) {
        throw new Error('Incorrect password for this staff account.');
      }
      const userData = { id: staff.id, email: staff.email, name: staff.name, role: staff.role };
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setUser(userData);
      return getDashboardRoute(staff.role);
    }

    // Fall back to student lookup
    const students = getStudents();
    const student  = students[identifier.trim()];
    if (!student || student.password !== password) {
      throw new Error('Invalid ID or password. Please check your credentials.');
    }

    const userData = {
      id:       student.uniqueId,
      uniqueId: student.uniqueId,
      role:     ROLES.STUDENT,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    return getDashboardRoute(ROLES.STUDENT);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  /* ── Quiz attendance: record the moment a student starts ── */
  const markQuizStarted = useCallback((quizId) => {
    if (!user?.uniqueId) return;
    try {
      const key     = `rqa_started_${user.uniqueId}`;
      const started = JSON.parse(localStorage.getItem(key) || '{}');
      if (!started[quizId]) {
        started[quizId] = { startedAt: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(started));
      }
    } catch {}
  }, [user?.uniqueId]);

  const isQuizStarted = useCallback((quizId) => {
    if (!user?.uniqueId) return false;
    try {
      const key     = `rqa_started_${user.uniqueId}`;
      const started = JSON.parse(localStorage.getItem(key) || '{}');
      return !!started[quizId];
    } catch { return false; }
  }, [user?.uniqueId]);

  /* ── Quiz completion (one-time play) ── */
  const completedQuizzes = useMemo(() => {
    if (!user?.uniqueId) return new Set();
    try {
      const key = `rqa_completed_${user.uniqueId}`;
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(arr);
    } catch { return new Set(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uniqueId, completedV]);

  /**
   * Mark a quiz as completed and store its result.
   * scoreData = { pct, correct, wrong, total, timeTaken, questions: [...], answers: {...} }
   */
  const markQuizComplete = useCallback((quizId, scoreData = {}) => {
    if (!user?.uniqueId) return;
    const key     = `rqa_completed_${user.uniqueId}`;
    const recKey  = `rqa_results_${user.uniqueId}`;
    try {
      // Store completed IDs list
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      if (!arr.includes(quizId)) {
        arr.push(quizId);
        localStorage.setItem(key, JSON.stringify(arr));
      }
      // Store result details keyed by quizId (persist questions + answers for review)
      const { questions = [], answers = {}, ...rest } = scoreData;
      const results = JSON.parse(localStorage.getItem(recKey) || '{}');
      results[quizId] = {
        ...rest,
        completedAt:  new Date().toISOString(),
        questionIds:  questions.map(q => q.id),
        answers,
      };
      localStorage.setItem(recKey, JSON.stringify(results));
      setCompletedV(v => v + 1);
    } catch {
      localStorage.setItem(key, JSON.stringify([quizId]));
      setCompletedV(v => v + 1);
    }
  }, [user?.uniqueId]);

  /** Returns stored result for a given quizId, or null */
  const getQuizResult = useCallback((quizId) => {
    if (!user?.uniqueId) return null;
    try {
      const results = JSON.parse(localStorage.getItem(`rqa_results_${user.uniqueId}`) || '{}');
      return results[quizId] || null;
    } catch { return null; }
  }, [user?.uniqueId]);

  const hasAttemptedQuiz = useCallback(
    (quizId) => completedQuizzes.has(quizId),
    [completedQuizzes]
  );

  /**
   * Returns a list of registered student IDs ONLY — no names, roll numbers, or passwords.
   * Safe to expose to school admins.
   */
  const getStudentList = useCallback(() => {
    const students = getStudents();
    return Object.values(students).map(s => ({
      uniqueId:        s.uniqueId,
      quizzesCompleted: (() => {
        try {
          const arr = JSON.parse(localStorage.getItem(`rqa_completed_${s.uniqueId}`) || '[]');
          return arr.length;
        } catch { return 0; }
      })(),
    }));
  }, []);

  const value = {
    user,
    login,
    logout,
    register,
    isAuthenticated: !!user,
    completedQuizzes,
    markQuizComplete,
    markQuizStarted,
    isQuizStarted,
    hasAttemptedQuiz,
    getQuizResult,
    getStudentList,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
