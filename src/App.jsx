import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { LevelProvider } from './context/LevelContext';
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
import NotFound          from './pages/NotFound';
import LevelContent      from './pages/level/LevelContent';
import LevelQuiz         from './pages/level/LevelQuiz';
import StudentManagement from './pages/admin/StudentManagement';
import ExamLevels        from './pages/admin/ExamLevels';
import QuestionBankAdmin from './pages/admin/QuestionBankAdmin';
import ContentManagement from './pages/admin/ContentManagement';
import LiveMonitoring    from './pages/admin/LiveMonitoring';
import AdminReports      from './pages/admin/AdminReports';
import ImportExport      from './pages/admin/ImportExport';
import SystemSettings    from './pages/admin/SystemSettings';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 1000 * 60 * 5 } },
});

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <LevelProvider>
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

              {/* Level content & quiz (full screen, no sidebar) */}
              <Route path="/level/:levelId/content" element={
                <ProtectedRoute><LevelContent /></ProtectedRoute>
              } />
              <Route path="/level/:levelId/quiz" element={
                <ProtectedRoute><LevelQuiz /></ProtectedRoute>
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
                <Route path="/profile"      element={<StudentProfile />} />
                <Route path="/quiz-history" element={<QuizHistory />} />
                <Route path="/performance"  element={<QuizHistory />} />

                {/* Centralized Admin routes */}
                <Route path="/admin/students"      element={<ProtectedRoute requiredPermission="ADMIN_ACCESS"><StudentManagement /></ProtectedRoute>} />
                <Route path="/admin/levels"        element={<ProtectedRoute requiredPermission="ADMIN_ACCESS"><ExamLevels /></ProtectedRoute>} />
                <Route path="/admin/question-bank" element={<ProtectedRoute requiredPermission="ADMIN_ACCESS"><QuestionBankAdmin /></ProtectedRoute>} />
                <Route path="/admin/content"       element={<ProtectedRoute requiredPermission="ADMIN_ACCESS"><ContentManagement /></ProtectedRoute>} />
                <Route path="/admin/monitoring"    element={<ProtectedRoute requiredPermission="ADMIN_ACCESS"><LiveMonitoring /></ProtectedRoute>} />
                <Route path="/admin/reports"       element={<ProtectedRoute requiredPermission="ADMIN_ACCESS"><AdminReports /></ProtectedRoute>} />
                <Route path="/admin/import-export" element={<ProtectedRoute requiredPermission="ADMIN_ACCESS"><ImportExport /></ProtectedRoute>} />
                <Route path="/admin/settings"      element={<ProtectedRoute requiredPermission="ADMIN_ACCESS"><SystemSettings /></ProtectedRoute>} />

                {/* Legacy aliases */}
                <Route path="/reports"    element={<AdminReports />} />
                <Route path="/monitoring" element={<LiveMonitoring />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
        </LevelProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
