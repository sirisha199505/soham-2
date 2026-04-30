import { LEVEL1_QUESTIONS, LEVEL2_QUESTIONS, LEVEL3_QUESTIONS } from './levelData';

const KEY = 'rqa_admin_questions';

const DEFAULTS = {
  1: LEVEL1_QUESTIONS,
  2: LEVEL2_QUESTIONS,
  3: LEVEL3_QUESTIONS,
};

/* ── Read questions for a level ── */
export function getAdminQuestions(levelId) {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (Array.isArray(stored[levelId]) && stored[levelId].length > 0) {
      return stored[levelId];
    }
    // Not seeded yet — return defaults transparently
    return DEFAULTS[levelId] || [];
  } catch {
    return DEFAULTS[levelId] || [];
  }
}

/* ── Write questions for a level ── */
export function setLevelQuestions(levelId, questions) {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    stored[levelId] = questions;
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {}
}

/* ── Seed all levels on first admin visit ── */
export function ensureSeeded() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    let changed = false;
    [1, 2, 3].forEach(lvl => {
      if (!Array.isArray(stored[lvl])) {
        stored[lvl] = DEFAULTS[lvl].map(q => ({ ...q }));
        changed = true;
      }
    });
    if (changed) localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {}
}

/* ── Reset a level back to built-in defaults ── */
export function resetLevelToDefaults(levelId) {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    stored[levelId] = DEFAULTS[levelId].map(q => ({ ...q }));
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {}
}

/* ── Check if a level has been seeded ── */
export function isSeeded(levelId) {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    return Array.isArray(stored[levelId]);
  } catch { return false; }
}

/* ── Load all levels (for admin panel) ── */
export function loadAllAdminQuestions() {
  ensureSeeded();
  return {
    1: getAdminQuestions(1),
    2: getAdminQuestions(2),
    3: getAdminQuestions(3),
  };
}
