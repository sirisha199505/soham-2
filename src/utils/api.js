const BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY         = 'rqa_token';
const USER_KEY          = 'rqa_user';
export const SESSION_TOKEN_KEY = 'rqa_session_token';

// Paths that don't need an Authorization header
const NO_AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/register-coach',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/verify-reset-otp',
  '/api/auth/reset-password-token',
  '/api/registration-status',
];

function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token && token !== 'undefined' && token !== 'null' ? token : null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  window.dispatchEvent(new Event('auth:logout'));
}

async function request(method, path, body, attempt = 0) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  const isNoAuth = NO_AUTH_PATHS.some(p => path.includes(p));
  if (!isNoAuth && !token) {
    console.warn(`[RQA] No auth token — ${path} will be unauthenticated`);
  }
  if (token && !isNoAuth) headers['Authorization'] = `Bearer ${token}`;

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
  } catch {
    clearTimeout(timeoutId);
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 5000));
      return request(method, path, body, attempt + 1);
    }
    throw new Error('Server is not responding. Please wait a moment and try again.');
  }

  let data;
  try { data = await res.json(); } catch { data = {}; }

  if (res.status === 503 && attempt < 3) {
    await new Promise(r => setTimeout(r, 4000));
    return request(method, path, body, attempt + 1);
  }

  if (!res.ok || data.status === 'error') {
    const msg = data.data || data.error || data.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    // Machine-readable error code (e.g. 'session_active' for the single-device
    // block) so callers can branch without string-matching the message.
    if (data.code) err.code = data.code;
    // A 401 on an authenticated request means this token is no longer the active
    // session — e.g. the account was logged in on another device (single-session
    // enforcement) or the token expired. Sign this device out so it returns to the
    // login screen. (Transient/server issues come back as 503 and are retried above,
    // so a 401 here is genuinely an invalid session.)
    if (res.status === 401 && !isNoAuth) {
      console.warn(`[RQA] 401 from ${path} — session ended (logged in elsewhere or expired); signing out`);
      clearSession();
    }
    throw err;
  }
  return data?.status === 'success' ? data.data : data;
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),

  // Auth — Student
  register: (data) =>
    request('POST', '/api/auth/register', data),

  // Auth — Innovation Coach
  registerCoach: (data) =>
    request('POST', '/api/auth/register-coach', data),

  // Auth — Email verification
  verifyEmail: (token) =>
    request('GET', `/api/auth/verify-email?token=${encodeURIComponent(token)}`),

  // Auth — Forgot password OTP flow (3-step)
  // contact = phone number (10 digits) OR email address
  forgotPassword: (contact, role = 'trainer') =>
    request('POST', '/api/auth/forgot-password', { contact, email: contact, role }),
  verifyResetOtp: (contact, otp) =>
    request('POST', '/api/auth/verify-reset-otp', { contact, email: contact, otp }),
  resetPasswordWithToken: (token, newPassword) =>
    request('POST', '/api/auth/reset-password-token', { token, newPassword }),

  login: (identifier, password, force = false) =>
    request('POST', '/api/auth/login', { identifier, password, ...(force ? { force: true } : {}) }),
  me: () => request('GET', '/api/auth/me'),
  logout: () => request('POST', '/api/auth/logout'),
  updatePassword: (currentPassword, newPassword) =>
    request('PUT', '/api/me/update-password', { data: { current_password: currentPassword, new_password: newPassword } }),
  updateProfile: (profile) =>
    request('PUT', '/api/me/update-profile', { data: profile }),
  heartbeat: () => request('POST', '/api/auth/heartbeat', {
    sessionToken: localStorage.getItem(SESSION_TOKEN_KEY) || '',
  }),

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
  getStudents:        () => request('GET', '/api/students'),
  updateStudentPhone: (id, phoneNumber) => request('PATCH', `/api/students/${id}/phone`, { phoneNumber }),
  setStudentActive: (id, active) => request('PATCH', `/api/students/${id}/active`, { active }),
  resetStudentProgress: (userId) => request('DELETE', `/api/levels/progress/${userId}`),

  // Content
  getContent:  (levelId) => request('GET', `/api/content/${levelId}`),
  saveContent: (levelId, pages) => request('PUT', `/api/content/${levelId}`, pages),

  // Settings
  getSettings:  () => request('GET', '/api/settings'),
  saveSettings: (settings) => request('PUT', '/api/settings', settings),
  // Public — whether new registrations are currently accepted (no auth required)
  getRegistrationStatus: () => request('GET', '/api/registration-status'),

  // FAQs — audience: 'student' | 'trainer'. Admin uses getAllFaqs() to manage.
  getFaqs:    (audience) => request('GET', `/api/faqs${audience ? `?audience=${encodeURIComponent(audience)}` : ''}`),
  getAllFaqs: () => request('GET', '/api/faqs?manage=true'),
  createFaq:  (data)      => request('POST', '/api/faqs', data),
  updateFaq:  (id, data)  => request('PUT', `/api/faqs/${id}`, data),
  deleteFaq:  (id)        => request('DELETE', `/api/faqs/${id}`),

  // Monitoring
  getMonitoringSessions: () => request('GET', '/api/monitoring/sessions'),

  // Question Banks
  getQuestionBanks: () => request('GET', '/api/question-banks'),
  createQuestionBank: (data) => request('POST', '/api/question-banks', data),
  updateQuestionBank: (id, data) => request('PUT', `/api/question-banks/${id}`, data),
  deleteQuestionBank: (id) => request('DELETE', `/api/question-banks/${id}`),

  // QB Levels
  getQbLevels:   (bankId) => request('GET', `/api/qb-levels?bankId=${bankId}`),
  createQbLevel: (data)   => request('POST', '/api/qb-levels', data),
  updateQbLevel: (id, data) => request('PUT', `/api/qb-levels/${id}`, data),
  deleteQbLevel: (id)     => request('DELETE', `/api/qb-levels/${id}`),

  // QB Categories
  getQbCategories:   (levelId) => request('GET', `/api/qb-categories?levelId=${levelId}`),
  createQbCategory:  (data)    => request('POST', '/api/qb-categories', data),
  updateQbCategory:  (id, data) => request('PUT', `/api/qb-categories/${id}`, data),
  deleteQbCategory:  (id)      => request('DELETE', `/api/qb-categories/${id}`),

  // Questions by QB category
  getQuestionsByCategory: (categoryId) => request('GET', `/api/questions?categoryId=${categoryId}`),

  // Exam Level CRUD
  createLevel: (data) => request('POST', '/api/levels', data),
  deleteLevel: (id) => request('DELETE', `/api/levels/${id}`),

  // S3 uploads
  getPresignedUrl: (filename, contentType) =>
    request('POST', '/api/uploads/presign', { filename, contentType }),
  uploadToS3: async (presignedUrl, file) => {
    const res = await fetch(presignedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    if (!res.ok) throw new Error(`S3 upload failed (${res.status})`);
  },
  confirmUpload: (id) =>
    request('PUT', `/api/uploads/${id}/confirm`, {}),
};
