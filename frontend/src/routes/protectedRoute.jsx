import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/authContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, userRole, isProfileComplete } = useAuth();
  const token = localStorage.getItem('token');
  const location = useLocation();

  // console.log("ProtectedRoute - Authenticated:", isAuthenticated);
  // console.log("ProtectedRoute - Role:", userRole);

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to home if employee's profile is incomplete
  if (
    userRole === 'employee' &&
    !isProfileComplete &&
    location.pathname !== '/employee/dashboard/home'
  ) {
    return <Navigate to="/employee/dashboard/home" replace />;
  }

  return children;
};

export default ProtectedRoute;
