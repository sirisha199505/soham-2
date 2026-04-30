import { ROLES } from './constants';

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN];

export const PERMISSIONS = {
  ADMIN_ACCESS:       ADMIN_ROLES,
  CREATE_QUIZ:        [...ADMIN_ROLES, ROLES.TEACHER],
  ASSIGN_QUIZ:        [...ADMIN_ROLES, ROLES.TEACHER],
  ATTEMPT_QUIZ:       [ROLES.STUDENT],
  VIEW_REPORTS:       [...ADMIN_ROLES, ROLES.TEACHER],
  MANAGE_QUESTIONS:   [...ADMIN_ROLES, ROLES.TEACHER],
  MANAGE_USERS:       ADMIN_ROLES,
  MANAGE_SCHOOLS:     ADMIN_ROLES,
  MANAGE_DISTRICTS:   ADMIN_ROLES,
  SCHOOL_ANALYTICS:   ADMIN_ROLES,
  DISTRICT_ANALYTICS: ADMIN_ROLES,
};

export const hasPermission = (role, permission) => {
  return PERMISSIONS[permission]?.includes(role) ?? false;
};

export const getDashboardRoute = (role) => {
  if (ADMIN_ROLES.includes(role)) return '/dashboard';
  if (role === ROLES.TEACHER) return '/dashboard';
  return '/dashboard';
};

export const getSidebarItems = (role) => {
  if (ADMIN_ROLES.includes(role)) {
    return [
      { label: 'Dashboard',       path: '/dashboard',           icon: 'LayoutDashboard' },
      { label: 'Question Bank',   path: '/admin/question-bank', icon: 'BookMarked' },
      { label: 'Students',        path: '/admin/students',      icon: 'Users' },
      { label: 'Exam Levels',     path: '/admin/levels',        icon: 'Layers' },
      { label: 'Content',         path: '/admin/content',       icon: 'FileText' },
      { label: 'Live Monitoring', path: '/admin/monitoring',    icon: 'Activity' },
      { label: 'Reports',         path: '/admin/reports',       icon: 'BarChart2' },
      { label: 'Import / Export', path: '/admin/import-export', icon: 'Upload' },
      { label: 'Settings',        path: '/admin/settings',      icon: 'Settings' },
    ];
  }

  if (role === ROLES.TEACHER) {
    return [
      { label: 'Dashboard',    path: '/dashboard',       icon: 'LayoutDashboard' },
      { label: 'Monitoring',   path: '/monitoring',      icon: 'Activity' },
      { label: 'Reports',      path: '/reports',         icon: 'BarChart2' },
    ];
  }

  return [
    { label: 'Dashboard',    path: '/dashboard',    icon: 'LayoutDashboard' },
    { label: 'Quiz History', path: '/quiz-history', icon: 'History' },
    { label: 'My Profile',   path: '/profile',      icon: 'User' },
  ];
};
