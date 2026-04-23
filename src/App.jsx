import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

import AuthLayout     from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

import Login          from './pages/auth/Login';
import Register       from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard      from './pages/dashboard/Dashboard';
import QuizList       from './pages/quiz/QuizList';
import QuizAttempt    from './pages/quiz/QuizAttempt';
import QuizResult     from './pages/quiz/QuizResult';
import StudentProfile from './pages/student/StudentProfile';
import QuizHistory    from './pages/student/QuizHistory';
import TeacherMonitoring from './pages/teacher/TeacherMonitoring';
import QuestionBank   from './pages/admin/QuestionBank';
import QuizCreation   from './pages/admin/QuizCreation';
import QuizAssignment from './pages/admin/QuizAssignment';
import Reports        from './pages/admin/Reports';
import AdminPanel     from './pages/admin/AdminPanel';
import NotFound       from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
});

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<RootRedirect />} />

              {/* Auth routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login"           element={<Login />} />
                <Route path="/register"        element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
              </Route>

              {/* Quiz attempt (full screen, no sidebar) */}
              <Route path="/quiz/:id/attempt" element={
                <ProtectedRoute><QuizAttempt /></ProtectedRoute>
              } />

              {/* Protected dashboard routes */}
              <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                {/* Dashboard - role-based */}
                <Route path="/dashboard"              element={<Dashboard />} />
                <Route path="/dashboard/student"      element={<Dashboard />} />
                <Route path="/dashboard/teacher"      element={<Dashboard />} />
                <Route path="/dashboard/school-admin" element={<Dashboard />} />
                <Route path="/dashboard/district-admin" element={<Dashboard />} />
                <Route path="/dashboard/super-admin"  element={<Dashboard />} />

                {/* Quizzes */}
                <Route path="/quizzes"                element={<QuizList />} />
                <Route path="/quiz/:id/result"        element={<QuizResult />} />

                {/* Student */}
                <Route path="/profile"                element={<StudentProfile />} />
                <Route path="/quiz-history"           element={<QuizHistory />} />
                <Route path="/performance"            element={<QuizHistory />} />
                <Route path="/monitoring"             element={<TeacherMonitoring />} />

                {/* Admin / Teacher */}
                <Route path="/question-bank"   element={<ProtectedRoute requiredPermission="MANAGE_QUESTIONS"><QuestionBank /></ProtectedRoute>} />
                <Route path="/quiz-create"     element={<ProtectedRoute requiredPermission="CREATE_QUIZ"><QuizCreation /></ProtectedRoute>} />
                <Route path="/assignments"     element={<ProtectedRoute requiredPermission="ASSIGN_QUIZ"><QuizAssignment /></ProtectedRoute>} />
                <Route path="/reports"         element={<ProtectedRoute requiredPermission="VIEW_REPORTS"><Reports /></ProtectedRoute>} />
                <Route path="/admin/users"     element={<ProtectedRoute requiredPermission="MANAGE_USERS"><AdminPanel /></ProtectedRoute>} />
                <Route path="/admin/schools"   element={<ProtectedRoute requiredPermission="MANAGE_SCHOOLS"><AdminPanel /></ProtectedRoute>} />
                <Route path="/admin/districts" element={<ProtectedRoute requiredPermission="MANAGE_DISTRICTS"><AdminPanel /></ProtectedRoute>} />
                <Route path="/admin/settings"  element={<ProtectedRoute requiredPermission="MANAGE_DISTRICTS"><AdminPanel /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
