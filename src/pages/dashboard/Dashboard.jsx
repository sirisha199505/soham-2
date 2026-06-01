import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../utils/constants';
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';

const STUDENT_ROLES = [ROLES.STUDENT, ROLES.COACH, ROLES.TEACHER];

export default function Dashboard() {
  const { user } = useAuth();
  return STUDENT_ROLES.includes(user?.role) ? <StudentDashboard /> : <AdminDashboard />;
}
