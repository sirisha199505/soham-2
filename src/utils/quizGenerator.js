// ─── Quiz Generation with no-repeat logic ─────────────────────────────────
// Generates 20 questions per level: 5 from each of 4 categories
// Ensures no question repeats across Level 1, 2, 3 for the same student

import { getCategoryQuestions, CATEGORIES } from './questionBank';

const USED_KEY = 'rqa_used_questions';
const ATTEMPTS_KEY = 'rqa_quiz_attempts';
const QUESTIONS_PER_CATEGORY = 5;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getUsedQuestionIds(studentId) {
  try {
    const all = JSON.parse(localStorage.getItem(USED_KEY) || '{}');
    return Array.isArray(all[studentId]) ? all[studentId] : [];
  } catch { return []; }
}

export function recordUsedQuestions(studentId, questionIds) {
  try {
    const all = JSON.parse(localStorage.getItem(USED_KEY) || '{}');
    const existing = Array.isArray(all[studentId]) ? all[studentId] : [];
    all[studentId] = [...new Set([...existing, ...questionIds])];
    localStorage.setItem(USED_KEY, JSON.stringify(all));
  } catch {}
}

export function clearUsedQuestions(studentId) {
  try {
    const all = JSON.parse(localStorage.getItem(USED_KEY) || '{}');
    delete all[studentId];
    localStorage.setItem(USED_KEY, JSON.stringify(all));
  } catch {}
}

// Shuffle MCQ/image options and update the correct-answer index accordingly
function shuffleOptions(q) {
  if ((q.type !== 'mcq' && q.type !== 'image') || !q.options?.length) return q;
  const indices = q.options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    ...q,
    options: indices.map(i => q.options[i]),
    correct: indices.indexOf(q.correct),
  };
}

// Generate 20 questions for a level: 5 per category, no repeats
export function generateLevelQuiz(studentId) {
  const usedIds = new Set(getUsedQuestionIds(studentId));
  const selectedQuestions = [];

  CATEGORIES.forEach(cat => {
    const pool = getCategoryQuestions(cat);
    const available = pool.filter(q => !usedIds.has(q.id));

    // If not enough fresh questions, fall back to all active (cycle resets per category)
    const source = available.length >= QUESTIONS_PER_CATEGORY ? available : pool;
    const picked = shuffle(source).slice(0, QUESTIONS_PER_CATEGORY);
    // Shuffle options so each student sees different option order
    selectedQuestions.push(...picked.map(shuffleOptions));
  });

  // Shuffle the combined 20 questions so order differs per student
  return shuffle(selectedQuestions);
}

// ─── Attempt storage ───────────────────────────────────────────────────────

export function saveQuizAttempt(studentId, attemptData) {
  try {
    const all = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
    if (!Array.isArray(all[studentId])) all[studentId] = [];
    all[studentId].unshift({ ...attemptData, id: `att_${Date.now()}` });
    // Keep max 50 attempts per student
    if (all[studentId].length > 50) all[studentId] = all[studentId].slice(0, 50);
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  } catch {}
}

export function getStudentAttempts(studentId) {
  try {
    const all = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
    return Array.isArray(all[studentId]) ? all[studentId] : [];
  } catch { return []; }
}

export function getAllAttempts() {
  try {
    return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
  } catch { return {}; }
}

export function getAttemptById(studentId, attemptId) {
  const attempts = getStudentAttempts(studentId);
  return attempts.find(a => a.id === attemptId) || null;
}
