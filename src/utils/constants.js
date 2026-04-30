export const ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin',
  // Legacy (kept for data compatibility)
  SCHOOL_ADMIN: 'school_admin',
  DISTRICT_ADMIN: 'district_admin',
  SUPER_ADMIN: 'super_admin',
};

export const ROLE_LABELS = {
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Administrator',
  school_admin: 'School Admin',
  district_admin: 'District Admin',
  super_admin: 'Super Admin',
};

export const QUIZ_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  CLOSED: 'closed',
};

export const QUESTION_TYPES = {
  MCQ: 'mcq',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer',
  MULTI_SELECT: 'multi_select',
};

export const TOPIC_TAGS = [
  'Sensors & Actuators',
  'Programming Logic',
  'Kinematics',
  'Electronics',
  'Mechanical Design',
  'AI & Machine Learning',
  'Computer Vision',
  'Path Planning',
  'Control Systems',
  'Safety Protocols',
];

export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

export const COLORS = {
  primary:   '#3BC0EF', // Brand turquoise
  secondary: '#FAAB34', // Brand orange
  accent:    '#1E3A8A', // Deep navy
  success:   '#10B981',
  warning:   '#FAAB34',
  danger:    '#EF4444',
  info:      '#3BC0EF',
  girls:     '#EC4899',
  boys:      '#3BC0EF',
};

export const CHART_COLORS = ['#3BC0EF', '#FAAB34', '#1E3A8A', '#10B981', '#EC4899', '#8B5CF6'];
