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

// Whitelist of accepted top-level domains. An email's final domain label must be
// one of these, so common typos / partial TLDs like "name@gmail.co" are rejected
// while proper domains (.com, .org, .net, .edu, the Indian .in family, etc.) pass.
// Add entries here if a legitimate TLD is ever reported as rejected.
export const ALLOWED_TLDS = new Set([
  // Generic
  'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'name',
  'pro', 'mobi', 'aero', 'coop', 'museum', 'io', 'ai', 'app', 'dev', 'tech',
  'online', 'site', 'store', 'xyz', 'live', 'me', 'tv', 'cc', 'email', 'cloud',
  'digital', 'world', 'group', 'company', 'academy', 'institute', 'education',
  'school', 'college', 'ac', 'edu',
  // Country codes (India first, then other common ones)
  'in', 'us', 'uk', 'ca', 'au', 'nz', 'sg', 'ae', 'de', 'fr', 'jp', 'cn',
  'za', 'my', 'ph', 'id', 'lk', 'bd', 'np', 'pk',
]);

// An email is accepted only when it is well-formed, the local part (before the @)
// contains at least one letter, AND the final domain label is a recognised TLD.
// This rejects all-numeric addresses like 123344454@gmail.com and partial TLDs
// like name@gmail.co, while accepting admin@gmail.com / admin123@school.edu.in.
export const isValidEmail = (email) => {
  if (!email) return false;
  const value = String(email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  const at = value.indexOf('@');
  const local = value.slice(0, at);
  if (!/[a-zA-Z]/.test(local)) return false;
  const tld = value.slice(at + 1).split('.').pop().toLowerCase();
  return ALLOWED_TLDS.has(tld);
};

// Password length policy — keep in sync with the backend (users.rb / session.rb).
// Used by every form that sets a password (register, change password, reset).
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 64;

// Returns a human-readable error string if the password is out of bounds, else
// null. Centralised so every form shows the SAME min/max validation message.
export const validatePassword = (pw) => {
  const len = String(pw ?? '').length;
  if (len < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (len > PASSWORD_MAX) return `Password must be ${PASSWORD_MAX} characters or fewer.`;
  return null;
};

// Registration password policy — a NEW password set at sign-up must be 6-8
// characters. Login only enforces the minimum (see PASSWORD_MIN) so existing
// users with longer passwords are never locked out.
export const REG_PASSWORD_MIN = 6;
export const REG_PASSWORD_MAX = 8;
export const validateRegistrationPassword = (pw) => {
  const len = String(pw ?? '').length;
  if (len < REG_PASSWORD_MIN) return `Password must be at least ${REG_PASSWORD_MIN} characters.`;
  if (len > REG_PASSWORD_MAX) return `Password must be ${REG_PASSWORD_MAX} characters or fewer.`;
  return null;
};

// Canonical form of a name for uniqueness checks and Exam-Level ↔ QB-Level
// matching. Lowercases and strips everything except letters/digits so
// "Science Quiz", "science-quiz", "SCIENCE  QUIZ" all collapse to "sciencequiz".
// Must mirror the backend's normalize_name (base.rb).
export const normalizeName = (str) =>
  String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// ── Exam-Level Access Control (audience) ─────────────────────────────────────
// A level can be restricted to one account type. Options shown in the admin UI:
export const LEVEL_AUDIENCES = [
  { value: 'both',    label: 'Both Students & Trainers', desc: 'Visible to students and trainers' },
  { value: 'student', label: 'Students Only',            desc: 'Visible to students only' },
  { value: 'trainer', label: 'Trainers Only',            desc: 'Visible to trainers only' },
];

// Map a user role to the audience key it matches. Coach/teacher → 'trainer'.
export const roleAudienceKey = (role) =>
  (role === 'coach' || role === 'teacher') ? 'trainer'
    : role === 'student' ? 'student'
    : 'admin';

// Whether a user of the given role may see/take a level with this audience.
// Admins (and any non-student/trainer) always pass; unknown/blank audience = 'both'.
export const levelAudienceAllows = (audience, role) => {
  const aud = audience || 'both';
  const key = roleAudienceKey(role);
  if (key === 'admin') return true;
  return aud === 'both' || aud === key;
};

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

// ── Ordering / Sequencing scoring ────────────────────────────────────────────
// Options are stored in the CORRECT order. The answer is the student's slot
// arrangement: answer[slotIndex] = the option index placed in that slot. A slot
// is correct when the option index placed there equals the slot index. Values
// can round-trip as strings, so coerce with Number().
export const orderPlacedIndex = (answer, slot) => {
  if (!Array.isArray(answer)) return undefined;
  const v = answer[slot];
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};
export const isOrderSlotCorrect = (answer, slot) => orderPlacedIndex(answer, slot) === slot;
export const isOrderAllCorrect = (options, answer) =>
  Array.isArray(options) && options.length > 0 && Array.isArray(answer) &&
  answer.length === options.length &&
  options.every((_, i) => isOrderSlotCorrect(answer, i));

// ── Categorize / Grouping scoring ────────────────────────────────────────────
// extras = { buckets:[name…], items:[{ text, imageUrl, bucket:<bucketIndex> }] }.
// The answer maps each item index to the bucket the student dropped it into:
// { itemIndex: bucketIndex }. An item is correct when its placed bucket equals
// its defined bucket. Keys/values may be strings.
export const categorizePlacedBucket = (answer, itemIdx) => {
  if (!answer || typeof answer !== 'object') return undefined;
  const v = answer[itemIdx] ?? answer[String(itemIdx)];
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};
export const isCategorizeItemCorrect = (extras, answer, itemIdx) =>
  categorizePlacedBucket(answer, itemIdx) === Number(extras?.items?.[itemIdx]?.bucket);
export const isCategorizeAllCorrect = (extras, answer) => {
  const items = extras?.items;
  return Array.isArray(items) && items.length > 0 &&
    items.every((_, i) => isCategorizeItemCorrect(extras, answer, i));
};

// ── Hotspot labeling scoring ─────────────────────────────────────────────────
// extras = { hotspots:[{ x, y, label }] }. The labels bank is the hotspot labels
// in their original order, so hotspot i is correct when the label dropped on it
// has index i. The answer maps hotspot index → label index: { hotspotIdx: labelIdx }.
export const hotspotPlacedLabel = (answer, hotspotIdx) => {
  if (!answer || typeof answer !== 'object') return undefined;
  const v = answer[hotspotIdx] ?? answer[String(hotspotIdx)];
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
};
export const isHotspotSpotCorrect = (answer, hotspotIdx) =>
  hotspotPlacedLabel(answer, hotspotIdx) === hotspotIdx;
export const isHotspotAllCorrect = (extras, answer) => {
  const hs = extras?.hotspots;
  return Array.isArray(hs) && hs.length > 0 &&
    hs.every((_, i) => isHotspotSpotCorrect(answer, i));
};

// ── YouTube helpers (content video pages) ────────────────────────────────────
// Extract the 11-char video id from the common YouTube URL shapes (watch?v=,
// youtu.be/, embed/, shorts/, live/). Returns null when it isn't a YouTube link.
export const youtubeId = (url) => {
  if (!url) return null;
  const s = String(url).trim();
  const patterns = [
    /youtube\.com\/watch\?[^#]*\bv=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ];
  for (const p of patterns) { const m = s.match(p); if (m) return m[1]; }
  return null;
};
export const isYouTubeUrl = (url) => !!youtubeId(url);
// Privacy-friendly embed URL for an <iframe>, or null if not a YouTube link.
export const youtubeEmbedUrl = (url) => {
  const id = youtubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
};

export const debounce = (fn, delay = 300) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
};
