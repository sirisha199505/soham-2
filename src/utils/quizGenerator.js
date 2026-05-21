// Quiz generation and attempt persistence — all data sourced from the backend API.
// No localStorage is used; the PostgreSQL database is the single source of truth.

import { api } from './api';

// ── Option shuffler (client-side only — ensures unique layouts per student) ──

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleOptions(q) {
  if (q.type !== 'mcq' && q.type !== 'image') return q;
  if (!Array.isArray(q.options) || q.options.length < 2) return q;
  const shuffledIndices = fisherYates(q.options.map((_, i) => i));
  const newCorrect = shuffledIndices.indexOf(Number(q.correct));
  return {
    ...q,
    options:       shuffledIndices.map(i => q.options[i]),
    correct:       newCorrect,
    correctAnswer: newCorrect,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function generateLevelQuiz(studentId, levelId) {
  try {
    const questions = await api.generateQuiz(studentId, levelId);
    return questions.map(shuffleOptions);
  } catch (err) {
    console.error('generateLevelQuiz failed:', err.message);
    return [];
  }
}

export async function recordUsedQuestions(studentId, questionIds) {
  try {
    await api.recordUsedQuestions(studentId, questionIds);
  } catch (err) {
    console.error('recordUsedQuestions failed:', err.message);
  }
}

// Persist a completed quiz attempt to the backend database only.
export async function saveQuizAttempt(studentId, attemptData) {
  await api.saveAttempt({ userId: studentId, ...attemptData });
}

// Fetch all quiz attempts for a student from the backend database.
export async function getStudentAttempts(studentId) {
  try {
    return await api.getAttempts(studentId);
  } catch (err) {
    console.error('getStudentAttempts failed:', err.message);
    return [];
  }
}
