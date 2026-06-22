import React, { createContext, useContext, useEffect, useState } from 'react';
// Create AuthContext
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));
  const [userId, setUserId] = useState(localStorage.getItem('_id'));
  const [email, setEmail] = useState(localStorage.getItem('email'));
  const [isProfileComplete, setIsProfileComplete] = useState(true);

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

  const checkProfile = async (token, role) => {
    if (role !== 'employee' || !token) {
      setIsProfileComplete(true);
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/employee/my-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const emp = data.employee || {};
        const isMissing =
          !emp.bankName ||
          !emp.branchName ||
          !emp.bankAccountNumber ||
          !emp.ifscCode ||
          !emp.aadharNumber ||
          !emp.panNumber ||
          !emp.dateofBirth ||
          !emp.address ||
          !emp.state ||
          !emp.city ||
          !emp.district ||
          !emp.pinCode;

        setIsProfileComplete(!isMissing);
      } else {
        setIsProfileComplete(true);
      }
    } catch (error) {
      console.error('Error checking profile completion:', error);
      setIsProfileComplete(true);
    }
  };

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
        checkProfile(token, role);
      } else {
        logout();
      }
    };
    checkAuth();
  }, []);

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

    checkProfile(token, role);
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
    setIsProfileComplete(true);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        userId,
        email,
        isProfileComplete,
        setIsProfileComplete,
        checkProfile,
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
