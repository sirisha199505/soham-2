import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import AdminDashboard from './AdminDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (user?.role === ROLES.STUDENT) return <StudentDashboard />;
  if (user?.role === ROLES.TEACHER) return <TeacherDashboard />;
  return <AdminDashboard />;
}
