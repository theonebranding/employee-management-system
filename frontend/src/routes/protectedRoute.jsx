import { Navigate } from 'react-router-dom';

import { useAuth } from '../context/authContext';

const ProtectedRoute = ({ children, allowedRoles = [], allowedPermissions = [] }) => {
  const { isAuthenticated, userRole, hasPermission } = useAuth();
  const token = localStorage.getItem('token');

  // console.log("ProtectedRoute - Authenticated:", isAuthenticated);
  // console.log("ProtectedRoute - Role:", userRole);

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (allowedPermissions.length > 0 && !hasPermission(allowedPermissions)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
