// Quiz generation and attempt persistence — all data sourced from the backend API.
// PostgreSQL is the source of truth; localStorage is used only as a crash-recovery
// buffer so a Render cold-start timeout cannot cause score data loss.

import { api } from './api';

const PENDING_KEY = 'rqa_pending_attempt';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fisherYates(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle answer options client-side so every student sees a unique layout.
function shuffleOptions(q) {
  if (q.type !== 'mcq' && q.type !== 'image' && q.type !== 'label') return q;
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

// ── Type-balanced quiz builder ────────────────────────────────────────────────
// Guarantees: 4 MCQ + 4 True/False + 4 Label + 4 Match + 4 random = 20.
// Runs client-side as a safety net — the backend already applies the same
// logic, but this ensures correctness even if the DB has uneven type counts.
//
// normaliseType maps legacy / alternate spellings to canonical keys.
const CANONICAL = { image: 'label', tf: 'truefalse' };
function normaliseType(t) { return CANONICAL[t] || t || 'mcq'; }

const TYPE_QUOTAS = { mcq: 4, truefalse: 4, label: 4, match: 4 };
const RANDOM_QUOTA = 4;
const TOTAL_TARGET = Object.values(TYPE_QUOTAS).reduce((s, v) => s + v, 0) + RANDOM_QUOTA; // 20

function balanceByType(questions, total = TOTAL_TARGET) {
  if (!questions.length) return [];

  // Group into type buckets
  const byType = {};
  questions.forEach(q => {
    const t = normaliseType(q.type);
    if (!byType[t]) byType[t] = [];
    byType[t].push(q);
  });
  Object.values(byType).forEach(arr => fisherYates(arr));

  const selected   = [];
  const usedIds    = new Set();

  // Pick from each required type bucket (up to quota)
  for (const [type, quota] of Object.entries(TYPE_QUOTAS)) {
    const candidates = (byType[type] || []).filter(q => !usedIds.has(q.id));
    candidates.slice(0, quota).forEach(q => { selected.push(q); usedIds.add(q.id); });
  }

  // Fill remaining slots from whatever types are left
  const randomNeeded = Math.max(0, total - selected.length);
  if (randomNeeded > 0) {
    const remaining = fisherYates(questions.filter(q => !usedIds.has(q.id)));
    remaining.slice(0, randomNeeded).forEach(q => { selected.push(q); usedIds.add(q.id); });
  }

  return fisherYates(selected).slice(0, total);
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function generateLevelQuiz(studentId, levelId) {
  try {
    const raw       = await api.generateQuiz(studentId, levelId);
    const balanced  = balanceByType(raw, TOTAL_TARGET);
    return balanced.map(shuffleOptions);
  } catch (err) {
    if (err?.status === 403) throw err;
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

// Persist a completed quiz attempt.
// Writes to localStorage FIRST as a crash-recovery buffer, then persists to the
// backend. On success, clears localStorage. On failure, the buffer survives a
// page reload so recoverPendingAttempt() can re-submit automatically.
export async function saveQuizAttempt(studentId, attemptData) {
  const payload = { userId: studentId, ...attemptData };

  // Write recovery buffer before network call — survives browser crash / refresh
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({
      payload,
      savedAt: Date.now(),
    }));
  } catch { /* localStorage quota exceeded — proceed without backup */ }

  await api.saveAttempt(payload);

  // Clear buffer only after confirmed server persistence
  try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
}

// Call this once on app boot (e.g. in AuthContext after login).
// If a pending attempt exists and is < 30 minutes old, retries the submission
// silently. Returns true if a recovery was attempted.
export async function recoverPendingAttempt() {
  let raw;
  try { raw = localStorage.getItem(PENDING_KEY); } catch { return false; }
  if (!raw) return false;

  let entry;
  try { entry = JSON.parse(raw); } catch {
    try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    return false;
  }

  // Discard stale entries (> 30 minutes) — student has moved on
  if (!entry?.payload || Date.now() - (entry.savedAt || 0) > 30 * 60 * 1000) {
    try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    return false;
  }

  try {
    await api.saveAttempt(entry.payload);
    try { localStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
    return true;
  } catch (err) {
    console.error('recoverPendingAttempt failed:', err.message);
    return false;
  }
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
