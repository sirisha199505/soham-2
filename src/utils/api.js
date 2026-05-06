// In dev: Vite proxies /api → http://localhost:3001
// In prod: set VITE_API_URL to your deployed API base URL
const BASE = import.meta.env.VITE_API_URL || '';

function getToken() {
  const token = localStorage.getItem('rqa_token');
  return token && token !== 'undefined' && token !== 'null' ? token : null;
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok || data.status === 'error') {
    throw new Error(data.data || data.error || `Request failed (${res.status})`);
  }
  // Unwrap { status:'success', data: X } — return X directly
  return data?.status === 'success' ? data.data : data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),

  // Auth
  register: (schoolName, className, password) =>
    request('POST', '/api/register', { schoolName, className, password }),
  login: (identifier, password) =>
    request('POST', '/api/login', { identifier, password }),
  me: () => request('GET', '/api/me/info'),

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
  generateQuiz: (userId) => request('GET', `/api/quiz/generate/${userId}`),
  recordUsedQuestions: (userId, questionIds) =>
    request('POST', `/api/quiz/used/${userId}`, { questionIds }),
  getAttempts: (userId) => request('GET', `/api/quiz/attempts/${userId}`),
  saveAttempt: (data) => request('POST', '/api/quiz/attempts', data),

  // Students
  getStudents: () => request('GET', '/api/students'),
};
