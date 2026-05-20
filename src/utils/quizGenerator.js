// Quiz generation is now handled by the backend API.
// This file re-exports constants and provides API-backed helpers.

import { CATEGORIES } from './questionBank';
import { api } from './api';

const QUESTIONS_PER_CATEGORY = 5;
export const TOTAL_QUIZ_QUESTIONS = CATEGORIES.length * QUESTIONS_PER_CATEGORY;

// ── localStorage helpers ─────────────────────────────────────────────────────
const localKey = (studentId) => `quiz_attempts_${studentId}`;

function localSave(studentId, attempt) {
  try {
    const key = localKey(studentId);
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    // Dedup: skip if the same level was already saved within the last 2 minutes
    const twoMinAgo = Date.now() - 2 * 60 * 1000;
    const isDup = existing.some(a =>
      Number(a.levelId) === Number(attempt.levelId) &&
      new Date(a.date).getTime() > twoMinAgo
    );
    if (isDup) return;
    existing.unshift(attempt);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {}
}

function localRead(studentId) {
  try {
    return JSON.parse(localStorage.getItem(localKey(studentId)) || '[]');
  } catch {
    return [];
  }
}

// ── Shuffle helpers ──────────────────────────────────────────────────────────

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle the option positions for a single question and remap the correct index.
// Only applies to mcq/image types — tf (True/False) and match are left unchanged.
function shuffleOptions(q) {
  if (q.type !== 'mcq' && q.type !== 'image') return q;
  if (!Array.isArray(q.options) || q.options.length < 2) return q;

  // Build a shuffled mapping of original indices
  const shuffledIndices = fisherYates(q.options.map((_, i) => i));
  const shuffledOptions = shuffledIndices.map(i => q.options[i]);
  // The correct answer was at index q.correct; find its new position
  const newCorrect = shuffledIndices.indexOf(Number(q.correct));

  return {
    ...q,
    options:       shuffledOptions,
    correct:       newCorrect,
    correctAnswer: newCorrect,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

// Generate a quiz for the student via the backend (filtered by level), then
// shuffle option positions client-side so each student sees a unique arrangement.
export async function generateLevelQuiz(studentId, levelId) {
  try {
    const questions = await api.generateQuiz(studentId, levelId);
    // Backend already randomizes question order via SQL RANDOM() + .shuffle.
    // We additionally randomize option positions here so no two students see
    // the same option layout even if they receive the same question set.
    return questions.map(shuffleOptions);
  } catch (err) {
    console.error('generateLevelQuiz failed:', err.message);
    return [];
  }
}

// Record which questions a student has used
export async function recordUsedQuestions(studentId, questionIds) {
  try {
    await api.recordUsedQuestions(studentId, questionIds);
  } catch (err) {
    console.error('recordUsedQuestions failed:', err.message);
  }
}

// Save a completed quiz attempt — writes to localStorage first (guaranteed),
// then tries the API (best-effort).
export async function saveQuizAttempt(studentId, attemptData) {
  const attempt = {
    id:         `local_${Date.now()}`,
    userId:     studentId,
    levelId:    attemptData.levelId,
    levelTitle: attemptData.levelTitle || `Level ${attemptData.levelId}`,
    date:       attemptData.date || new Date().toISOString(),
    score:      attemptData.score,
    answers:    attemptData.answers || {},
    questions:  attemptData.questions || [],
    questionIds: (attemptData.questions || []).map(q => q.id),
  };

  // Always persist locally so Quiz History never loses data
  localSave(studentId, attempt);

  // Also send to backend (may fail on Render cold starts — that's OK)
  try {
    await api.saveAttempt({ userId: studentId, ...attemptData });
  } catch (err) {
    console.error('saveQuizAttempt API failed (local copy saved):', err.message);
  }
}

// Fetch all attempts — merges API results with locally stored ones.
// Local entries fill gaps caused by API failures or Render cold-start token loss.
export async function getStudentAttempts(studentId) {
  let apiAttempts = [];
  try {
    apiAttempts = await api.getAttempts(studentId);
  } catch (err) {
    console.error('getStudentAttempts API failed:', err.message);
  }

  const local = localRead(studentId);

  if (apiAttempts.length === 0 && local.length === 0) return [];
  if (apiAttempts.length === 0) return local;

  // Build a minute-precision key so we can match the same quiz across local/API.
  const minuteKey = (a) => {
    const d = new Date(a.date);
    return `${a.levelId}_${Math.floor(d.getTime() / 60000)}`;
  };

  // Index local attempts by key for quick lookup
  const localByKey = new Map();
  local.forEach(a => {
    const k = minuteKey(a);
    // Keep the one with questions if there are multiple
    if (!localByKey.has(k) || (localByKey.get(k).questions || []).length === 0) {
      localByKey.set(k, a);
    }
  });

  // For each API attempt: if it has no questions, enrich from matching local copy
  const enriched = apiAttempts.map(a => {
    if ((a.questions || []).length > 0) return a;
    const local = localByKey.get(minuteKey(a));
    if (local && (local.questions || []).length > 0) {
      return { ...a, questions: local.questions, answers: a.answers || local.answers };
    }
    return a;
  });

  // Include local-only attempts (API never received them — e.g. save failed)
  const syncedKeys = new Set(apiAttempts.map(minuteKey));
  const unsynced = local.filter(a => !syncedKeys.has(minuteKey(a)));

  return [...enriched, ...unsynced].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
}

export async function getAllAttempts() {
  return {};
}

export function getAttemptById(studentId, attemptId) {
  return null;
}

// Kept for backward compatibility — no-op, seeding handled via questionBank
export function clearUsedQuestions() {}
export function getUsedQuestionIds() { return []; }
