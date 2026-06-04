export const formatDate = (date) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(date));
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date));
};

export const formatDuration = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const formatScore = (score, total) => {
  if (!total) return '0%';
  return `${Math.round((score / total) * 100)}%`;
};

export const getPerformanceLabel = (pct) => {
  if (pct >= 90) return { emoji: '🏆', label: 'Excellent', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
  if (pct >= 80) return { emoji: '💡', label: 'Very Good', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
  if (pct >= 60) return { emoji: '👍', label: 'Good',      color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
  if (pct >= 40) return { emoji: '⚠️', label: 'Average',   color: '#d97706', bg: '#fff7ed', border: '#fed7aa' };
  return               { emoji: '❌', label: 'Poor',       color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
};

export const getScoreColor = (pct) => {
  if (pct >= 80) return 'text-green-600';
  if (pct >= 60) return 'text-yellow-600';
  return 'text-red-500';
};

export const getScoreBg = (pct) => {
  if (pct >= 80) return 'bg-green-100 text-green-700';
  if (pct >= 60) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-600';
};

export const truncate = (str, n = 60) =>
  str && str.length > n ? str.slice(0, n) + '…' : str;

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

export const generateId = () =>
  Math.random().toString(36).slice(2, 10);

// An email is accepted only when it is well-formed AND the local part (before
// the @) contains at least one letter. This rejects all-numeric addresses like
// 123344454@gmail.com while still accepting admin@gmail.com or admin123@gmail.com.
export const isValidEmail = (email) => {
  if (!email) return false;
  const value = String(email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  const local = value.slice(0, value.indexOf('@'));
  return /[a-zA-Z]/.test(local);
};

// Canonical form of a name for uniqueness checks and Exam-Level ↔ QB-Level
// matching. Lowercases and strips everything except letters/digits so
// "Science Quiz", "science-quiz", "SCIENCE  QUIZ" all collapse to "sciencequiz".
// Must mirror the backend's normalize_name (base.rb).
export const normalizeName = (str) =>
  String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Deterministic, stable ordering for exam levels everywhere they're listed.
// Sorts by order_index (0 is a valid order, unlike the old `order || id`), then
// breaks ties by id so the sequence is ALWAYS the same (Level 1, 2, 3 …).
export const compareLevels = (a, b) => {
  const ao = Number(a?.order);
  const bo = Number(b?.order);
  const ak = Number.isFinite(ao) ? ao : Number(a?.id);
  const bk = Number.isFinite(bo) ? bo : Number(b?.id);
  return (ak - bk) || (Number(a?.id) - Number(b?.id));
};

// ── Match-the-following scoring ──────────────────────────────────────────────
// A match answer is stored as { leftIdx: rightIdx }. Pairs are persisted in
// correct positional order, so a pair is correct when the right card placed in
// slot i has original index i. Keys AND values can round-trip through JSON,
// sessionStorage, or the backend as STRINGS ("2" instead of 2), so a strict
// `answer[i] === i` wrongly scores a correct pair as wrong. These helpers coerce
// both the key lookup and the value before comparing.
export const matchSelectedIndex = (answer, i) => {
  if (!answer || typeof answer !== 'object') return undefined;
  const v = answer[i] ?? answer[String(i)];
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};

export const isMatchPairCorrect = (answer, i) => matchSelectedIndex(answer, i) === i;

export const isMatchAllCorrect = (pairs, answer) =>
  Array.isArray(pairs) && pairs.length > 0 &&
  pairs.every((_, i) => isMatchPairCorrect(answer, i));

export const debounce = (fn, delay = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};
