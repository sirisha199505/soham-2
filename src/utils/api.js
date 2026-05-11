// In dev: Vite proxies /api → http://localhost:3002 (keep VITE_API_URL empty in .env)
// In prod: VITE_API_URL is set in .env.production or the Vercel dashboard
const BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'rqa_token';
const USER_KEY  = 'rqa_user';

// Paths that don't send an Authorization header (no token needed)
const NO_AUTH_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/reset-password'];

// Paths where a 401 should NOT trigger auto-logout — caller handles it manually
const NO_AUTO_LOGOUT_PATHS = [...NO_AUTH_PATHS, '/api/auth/me'];

function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token && token !== 'undefined' && token !== 'null' ? token : null;
}

// Debounce flag — prevents multiple simultaneous 401s from firing repeated logout events
let _clearPending = false;
function clearSession() {
  if (_clearPending) return;
  _clearPending = true;
  setTimeout(() => { _clearPending = false; }, 2000);

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Notify AuthContext so React state is cleared and React Router handles
  // the redirect — avoids a hard page reload that kicks users out mid-session.
  window.dispatchEvent(new Event('auth:logout'));
}

async function request(method, path, body, attempt = 0) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  const isNoAuth       = NO_AUTH_PATHS.some(p => path.includes(p));
  const isNoAutoLogout = NO_AUTO_LOGOUT_PATHS.some(p => path.includes(p));
  if (token && !isNoAuth) headers['Authorization'] = `Bearer ${token}`;

  // Hard 55-second timeout via AbortController.
  // Render free tier cold start can take 30-50 s; without this fetch hangs forever.
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 55000);

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body:   body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err) {
    clearTimeout(timeoutId);
    if (attempt < 2) {
      // Wait then retry — Render needs time to wake up
      await new Promise(r => setTimeout(r, 5000));
      return request(method, path, body, attempt + 1);
    }
    throw new Error('Server is not responding. Please wait a moment and try again.');
  }

  let data;
  try { data = await res.json(); } catch { data = {}; }

  // 503 = DB still initialising — retry automatically up to 3 times
  if (res.status === 503 && attempt < 3) {
    await new Promise(r => setTimeout(r, 4000));
    return request(method, path, body, attempt + 1);
  }

  if (res.status === 401 && !isNoAutoLogout) clearSession();

  if (!res.ok || data.status === 'error') {
    throw new Error(data.data || data.error || `Request failed (${res.status})`);
  }
  return data?.status === 'success' ? data.data : data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),

  // Auth
  register: (schoolName, className, password) =>
    request('POST', '/api/auth/register', { schoolName, className, password }),
  login: (identifier, password) =>
    request('POST', '/api/auth/login', { identifier, password }),
  me: () => request('GET', '/api/auth/me'),
  resetPassword: (uniqueId, schoolName, className, newPassword) =>
    request('POST', '/api/auth/reset-password', { uniqueId, schoolName, className, newPassword }),

  // Levels
  getLevelSettings: () => request('GET', '/api/levels/settings'),
  saveLevelSettings: (levelId, data) => request('PUT', `/api/levels/settings/${levelId}`, data),
  getLevelProgress: (userId) => request('GET', `/api/levels/progress/${userId}`),
  completeLevelProgress: (userId, levelId, score) =>
    request('POST', `/api/levels/progress/${userId}/${levelId}/complete`, { score }),
  markContentRead: (userId, levelId) =>
    request('POST', `/api/levels/progress/${userId}/${levelId}/content-read`),
  getApprovals: () => request('GET', '/api/levels/approvals'),
  setApproval: (userId, levelId, status) =>
    request('PUT', `/api/levels/approvals/${userId}/${levelId}`, { status }),
  getOverrides: () => request('GET', '/api/levels/overrides'),
  setOverride: (userId, levelId) =>
    request('POST', `/api/levels/overrides/${userId}/${levelId}`),
  getGlobalAccess: () => request('GET', '/api/levels/global-access'),
  setGlobalAccess: (levelId, open) =>
    request('PUT', `/api/levels/global-access/${levelId}`, { open }),

  // Questions
  getQuestionBank: () => request('GET', '/api/questions/bank'),
  addQuestion: (q) => request('POST', '/api/questions', q),
  updateQuestion: (id, q) => request('PUT', `/api/questions/${id}`, q),
  deleteQuestion: (id) => request('DELETE', `/api/questions/${id}`),
  seedQuestions: (questions) => request('POST', '/api/questions/seed', questions),

  // Quiz
  generateQuiz: (userId, levelId) => request('GET', `/api/quiz/generate/${userId}?level=${levelId || ''}`),
  recordUsedQuestions: (userId, questionIds) =>
    request('POST', `/api/quiz/used/${userId}`, { questionIds }),
  getAttempts: (userId) => request('GET', `/api/quiz/attempts/${userId}`),
  saveAttempt: (data) => request('POST', '/api/quiz/attempts', data),

  // Students
  getStudents: () => request('GET', '/api/students'),
  resetStudentProgress: (userId) => request('DELETE', `/api/levels/progress/${userId}`),

  // Content
  getContent:  (levelId) => request('GET', `/api/content/${levelId}`),
  saveContent: (levelId, pages) => request('PUT', `/api/content/${levelId}`, pages),

  // Settings
  getSettings:  () => request('GET', '/api/settings'),
  saveSettings: (settings) => request('PUT', '/api/settings', settings),

  // Monitoring
  getMonitoringSessions: () => request('GET', '/api/monitoring/sessions'),
};
