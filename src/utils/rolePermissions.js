import { ROLES } from './constants';

export const PERMISSIONS = {
  // Quiz
  CREATE_QUIZ:    [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN],
  ASSIGN_QUIZ:    [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN],
  ATTEMPT_QUIZ:   [ROLES.STUDENT],
  VIEW_REPORTS:   [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN],
  // Question bank
  MANAGE_QUESTIONS: [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN],
  // Users
  MANAGE_USERS:   [ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN],
  MANAGE_SCHOOLS: [ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN],
  MANAGE_DISTRICTS: [ROLES.SUPER_ADMIN],
  // Analytics
  SCHOOL_ANALYTICS:   [ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN],
  DISTRICT_ANALYTICS: [ROLES.DISTRICT_ADMIN, ROLES.SUPER_ADMIN],
};

export const hasPermission = (role, permission) => {
  return PERMISSIONS[permission]?.includes(role) ?? false;
};

export const getDashboardRoute = (role) => {
  const routes = {
    [ROLES.STUDENT]:       '/dashboard/student',
    [ROLES.TEACHER]:       '/dashboard/teacher',
    [ROLES.SCHOOL_ADMIN]:  '/dashboard/school-admin',
    [ROLES.DISTRICT_ADMIN]:'/dashboard/district-admin',
    [ROLES.SUPER_ADMIN]:   '/dashboard/super-admin',
  };
  return routes[role] || '/dashboard/student';
};

export const getSidebarItems = (role) => {
  const common = [
    { label: 'Dashboard', path: getDashboardRoute(role), icon: 'LayoutDashboard' },
  ];

  const studentItems = [
    { label: 'Quiz History', path: '/quiz-history', icon: 'History' },
    { label: 'My Profile', path: '/profile', icon: 'User' },
  ];

  const teacherItems = [
    { label: 'Quiz Management', path: '/quizzes', icon: 'BookOpen' },
    { label: 'Question Bank', path: '/question-bank', icon: 'Database' },
    { label: 'Create Quiz', path: '/quiz-create', icon: 'PlusCircle' },
    { label: 'Assignments', path: '/assignments', icon: 'ClipboardList' },
    { label: 'Monitoring', path: '/monitoring', icon: 'Activity' },
    { label: 'Reports', path: '/reports', icon: 'BarChart2' },
  ];

  const adminItems = [
    { label: 'Quiz Management', path: '/quizzes', icon: 'BookOpen' },
    { label: 'Question Bank', path: '/question-bank', icon: 'Database' },
    { label: 'Create Quiz', path: '/quiz-create', icon: 'PlusCircle' },
    { label: 'Assignments', path: '/assignments', icon: 'ClipboardList' },
    { label: 'Reports', path: '/reports', icon: 'BarChart2' },
    { label: 'Manage Users', path: '/admin/users', icon: 'Users' },
  ];

  const districtItems = [
    ...adminItems,
    { label: 'Schools', path: '/admin/schools', icon: 'Building2' },
  ];

  const superAdminItems = [
    ...districtItems,
    { label: 'Districts', path: '/admin/districts', icon: 'Globe' },
    { label: 'System Settings', path: '/admin/settings', icon: 'Settings' },
  ];

  const map = {
    [ROLES.STUDENT]:       [...common, ...studentItems],
    [ROLES.TEACHER]:       [...common, ...teacherItems],
    [ROLES.SCHOOL_ADMIN]:  [...common, ...adminItems],
    [ROLES.DISTRICT_ADMIN]:[...common, ...districtItems],
    [ROLES.SUPER_ADMIN]:   [...common, ...superAdminItems],
  };
  return map[role] || common;
};
