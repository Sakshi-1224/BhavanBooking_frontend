import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, role } = useAuthStore();

  // 1. If they aren't logged in at all, kick them to the default login
  if (!isAuthenticated) {
    return <Navigate to="/user/login" replace />;
  }

  // 2. If they are logged in but don't have the right role, send them to an unauthorized page
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 3. If they pass all checks, render the child components!
  return <Outlet />;
}