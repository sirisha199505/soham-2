import { ROLES } from './constants';

const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.DISTRICT_ADMIN];
const COACH_ROLES = [ROLES.COACH];

export const PERMISSIONS = {
  ADMIN_ACCESS:       ADMIN_ROLES,
  CREATE_QUIZ:        [...ADMIN_ROLES, ...COACH_ROLES],
  ASSIGN_QUIZ:        [...ADMIN_ROLES, ...COACH_ROLES],
  ATTEMPT_QUIZ:       [ROLES.STUDENT],
  VIEW_REPORTS:       [...ADMIN_ROLES, ...COACH_ROLES],
  MANAGE_QUESTIONS:   [...ADMIN_ROLES, ...COACH_ROLES],
  MANAGE_USERS:       ADMIN_ROLES,
  MANAGE_SCHOOLS:     ADMIN_ROLES,
  MANAGE_DISTRICTS:   ADMIN_ROLES,
  SCHOOL_ANALYTICS:   ADMIN_ROLES,
  DISTRICT_ANALYTICS: ADMIN_ROLES,
};

export const hasPermission = (role, permission) => {
  // Normalize legacy 'teacher' → 'coach'
  const normalizedRole = role === 'teacher' ? 'coach' : role;
  return PERMISSIONS[permission]?.includes(normalizedRole) ?? false;
};

export const getDashboardRoute = (role) => '/dashboard';

export const getSidebarItems = (role) => {
  const normalizedRole = role === 'teacher' ? 'coach' : role;

  if (ADMIN_ROLES.includes(normalizedRole)) {
    return [
      { label: 'Dashboard',     path: '/dashboard',           icon: 'LayoutDashboard' },
      { label: 'Question Bank', path: '/admin/question-bank', icon: 'BookMarked' },
      { label: 'Students / Trainers', path: '/admin/students', icon: 'Users' },
      { label: 'Exam Levels',   path: '/admin/levels',        icon: 'Layers' },
      { label: 'Content',       path: '/admin/content',       icon: 'FileText' },
      { label: 'Help & Support', path: '/admin/help',         icon: 'HelpCircle'  },
      { label: 'Settings',      path: '/admin/settings',      icon: 'Settings'    },
    ];
  }

  // Student and Coach share the same sidebar
  return [
    { label: 'Dashboard',    path: '/dashboard',    icon: 'LayoutDashboard' },
    { label: 'Content',      path: '/content',      icon: 'BookOpen'        },
    { label: 'Quiz History', path: '/quiz-history', icon: 'History'         },
    { label: 'My Profile',   path: '/profile',      icon: 'User'            },
  ];
};
