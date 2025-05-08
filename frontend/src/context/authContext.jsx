import React, { createContext, useContext, useEffect, useState } from 'react';
// Create AuthContext
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));
  const [userId, setUserId] = useState(localStorage.getItem('_id'));
  const [email, setEmail] = useState(localStorage.getItem('email'));

  // function to check if token is expired
  const isTokenExpired = token => {
    if (!token) return true;
    try {
      // eslint-disable-next-line no-undef
      const payload = JSON.parse(atob(token.split('.')[1]));
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
    const checkAuth = async () => {
      let token = localStorage.getItem('token');

      if (!token || isTokenExpired(token)) {
        logout();
      }

      if (token) {
        const role = localStorage.getItem('role');
        const _id = localStorage.getItem('_id');
        const email = localStorage.getItem('email');
        login(token, role, _id, email);

        setIsAuthenticated(true);
        setUserRole(role);
        setUserId(_id);
        setEmail(email);
      } else {
        logout();
      }
    };
    checkAuth();
  }),
    [];
  const login = (token, role, _id, email) => {
    // Save to localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('_id', _id);
    localStorage.setItem('email', email);
    // console.log(token, role, _id, email);

    // Update state
    setIsAuthenticated(true);
    setUserRole(role);
    setUserId(_id);
    setEmail(email);
  };

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('_id');
    localStorage.removeItem('email');

    // Update state
    setIsAuthenticated(false);
    setUserRole(null);
    setUserId(null);
    setEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userId,
        email,
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
