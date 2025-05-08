import { Navigate } from 'react-router-dom';

import { useAuth } from '../context/authContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, userRole } = useAuth();
  const token = localStorage.getItem('token');

  // console.log("ProtectedRoute - Authenticated:", isAuthenticated);
  // console.log("ProtectedRoute - Role:", userRole);

  if (!isAuthenticated && !token) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
