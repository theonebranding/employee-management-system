import React, { createContext, useContext, useEffect, useState } from 'react';
// Create AuthContext
const AuthContext = createContext();

const getDefaultProfile = (role, _id, storedEmail) => ({
  username: 'User',
  role: role || 'Guest',
  id: _id || '',
  email: storedEmail || 'user@example.com',
});

const parseJwtPayload = token => {
  try {
    // eslint-disable-next-line no-undef
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
};

const getStoredPermissions = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('permissions') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));
  const [userId, setUserId] = useState(localStorage.getItem('_id'));
  const [email, setEmail] = useState(localStorage.getItem('email'));
  const [sessionId, setSessionId] = useState(localStorage.getItem('sessionId'));
  const [roleTemplate, setRoleTemplate] = useState(localStorage.getItem('roleTemplate'));
  const [permissions, setPermissions] = useState(getStoredPermissions());
  const [profile, setProfile] = useState(
    getDefaultProfile(
      localStorage.getItem('role'),
      localStorage.getItem('_id'),
      localStorage.getItem('email')
    )
  );
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // function to check if token is expired
  const isTokenExpired = token => {
    if (!token) return true;
    try {
      const payload = parseJwtPayload(token);
      if (!payload) return true;
      return Date.now() >= payload.exp * 1000;
    } catch (error) {
      console.error('Error parsing token:', error);
      return true;
    }
  };

  // // Function to refresh token
  // const refreshAccessToken = async () => {
  //   try {
  //     const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/refresh-token`, {
  //       method: 'POST',
  //       credentials: 'include',
  //     });

  //     if (!response.ok) {
  //       throw new Error('Failed to refresh token');
  //     }

  //     const data = await response.json();
  //     localStorage.setItem('token', data.token);
  //     return data.token;
  //   } catch (error) {
  //     console.error('Refresh token failed. Logging out...', error);
  //     logout();
  //     return null;
  //   }
  // };

  // Check authentication on mount and update when login/logout happens
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');

      if (!token || isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('_id');
        localStorage.removeItem('email');
        localStorage.removeItem('roleTemplate');
        localStorage.removeItem('permissions');
        localStorage.removeItem('sessionId');
        setIsAuthenticated(false);
        setUserRole(null);
        setUserId(null);
        setEmail(null);
        setRoleTemplate(null);
        setPermissions([]);
        setSessionId(null);
        setProfile(getDefaultProfile(null, null, null));
        setIsProfileLoading(false);
        return;
      }

      const role = localStorage.getItem('role');
      const _id = localStorage.getItem('_id');
      const storedEmail = localStorage.getItem('email');
      const storedRoleTemplate = localStorage.getItem('roleTemplate');
      const storedSessionId = localStorage.getItem('sessionId');
      const payload = parseJwtPayload(token);
      const resolvedPermissions =
        getStoredPermissions().length > 0
          ? getStoredPermissions()
          : Array.isArray(payload?.permissions)
            ? payload.permissions
            : [];
      const resolvedRoleTemplate = storedRoleTemplate || payload?.roleTemplate || null;

      setIsAuthenticated(true);
      setUserRole(role);
      setUserId(_id);
      setEmail(storedEmail);
      setRoleTemplate(resolvedRoleTemplate);
      setPermissions(resolvedPermissions);
      setSessionId(storedSessionId || null);
      setProfile(getDefaultProfile(role, _id, storedEmail));
    };

    checkAuth();
  }, []);
  const login = (
    token,
    role,
    _id,
    email,
    roleTemplateValue = null,
    permissionsValue = [],
    sessionIdValue = null
  ) => {
    // Save to localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('_id', _id);
    localStorage.setItem('email', email);
    const payload = parseJwtPayload(token);
    const resolvedRoleTemplate = roleTemplateValue || payload?.roleTemplate || null;
    const resolvedPermissions =
      Array.isArray(permissionsValue) && permissionsValue.length > 0
        ? permissionsValue
        : Array.isArray(payload?.permissions)
          ? payload.permissions
          : [];
    if (resolvedRoleTemplate) {
      localStorage.setItem('roleTemplate', resolvedRoleTemplate);
    }
    localStorage.setItem('permissions', JSON.stringify(resolvedPermissions));
    if (sessionIdValue) {
      localStorage.setItem('sessionId', sessionIdValue);
    }
    // console.log(token, role, _id, email);

    // Update state
    setIsAuthenticated(true);
    setUserRole(role);
    setUserId(_id);
    setEmail(email);
    setRoleTemplate(resolvedRoleTemplate);
    setPermissions(resolvedPermissions);
    setSessionId(sessionIdValue || null);
    setProfile(getDefaultProfile(role, _id, email));
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('_id');
    localStorage.removeItem('email');
    localStorage.removeItem('roleTemplate');
    localStorage.removeItem('permissions');
    localStorage.removeItem('sessionId');

    // Update state
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setEmail(null);
    setRoleTemplate(null);
    setPermissions([]);
    setSessionId(null);
    setProfile(getDefaultProfile(null, null, null));
    setIsProfileLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!isAuthenticated || !token || !userRole || !['employee', 'admin'].includes(userRole)) {
      setIsProfileLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsProfileLoading(true);
        const endpoint =
          userRole === 'employee'
            ? `${import.meta.env.VITE_BACKEND_URL}/employee/my-profile`
            : `${import.meta.env.VITE_BACKEND_URL}/admin/my-profile`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const result = await response.json();
        const data = result.employee || result.admin || result || {};

        setProfile({
          username: data.name || data.username || 'User',
          role: data.role || userRole || 'Guest',
          id: data._id || userId || '',
          email: data.email || email || 'user@example.com',
        });
      } catch {
        setProfile(prev => getDefaultProfile(userRole, userId || prev.id, email || prev.email));
      } finally {
        setIsProfileLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, userRole, userId, email]);

  const hasPermission = requiredPermissions => {
    const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    if (!required.length) return true;
    if (permissions.includes('*')) return true;
    return required.some(permission => permissions.includes(permission));
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userId,
        email,
        sessionId,
        roleTemplate,
        permissions,
        profile,
        isProfileLoading,
        hasPermission,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use AuthContext
export const useAuth = () => useContext(AuthContext);
