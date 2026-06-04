import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { hasPermission } from '../utils/rolePermissions';

function MaintenanceScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🛠️</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Under Maintenance</h2>
        <p className="text-slate-500 text-sm">
          The platform is temporarily offline for maintenance. Please check back shortly —
          contact your administrator if you need access.
        </p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({ children, requiredPermission }) {
  const { isAuthenticated, user, initializing } = useAuth();
  const { maintenanceMode, settingsLoaded } = useSettings();
  const location = useLocation();

  // AuthProvider already shows a spinner while verifying the session; this is
  // a safety net in case a ProtectedRoute renders before that gate resolves.
  if (initializing) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Maintenance mode — block everyone except admins. Admins stay in so they can
  // turn it back off. Only applies once settings have actually loaded (fail-open).
  if (settingsLoaded && maintenanceMode && !hasPermission(user?.role, 'ADMIN_ACCESS')) {
    return <MaintenanceScreen />;
  }

  if (requiredPermission && !hasPermission(user?.role, requiredPermission)) {
    return (
      <div className="p-8 text-center">
        <div className="max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-500 text-sm">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
