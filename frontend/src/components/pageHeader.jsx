/* eslint-disable no-unused-vars */
import { ChevronDown, LogOut, Moon, Settings, Sun } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { twMerge } from 'tailwind-merge';

import { useAuth } from '../context/authContext';
import { useTheme } from '../context/themeContext';

const Header = ({ title = 'Dashboard', description = '', className = '', icon = null }) => {
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userData, setUserData] = useState({
    username: 'User',
    role: 'Guest',
    id: '1236985254',
    email: 'user@theonebranding.com',
  });
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line unused-imports/no-unused-vars
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const role = localStorage.getItem('role');
        const token = localStorage.getItem('token');

        if (!token) throw new Error('No authentication token found');
        if (!role || !['employee', 'admin'].includes(role)) {
          throw new Error(`Invalid or missing role: ${role}`);
        }

        const endpoint =
          role === 'employee' ? `${BASE_URL}/employee/my-profile` : `${BASE_URL}/admin/my-profile`;

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch user data: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        const data = result.employee || result.admin || result || {};

        setUserData({
          username: data.name || data.username || 'User',
          role: data.role || role || 'Guest',
          id: data._id || '',
          email: data.email || 'user@example.com',
        });
      } catch (err) {
        setError(err.message);
        toast.error(err.message, { position: 'top-right', autoClose: 3000 });
        setUserData({
          username: 'User',
          role: 'Guest',
          id: '',
          email: 'user@example.com',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = event => {
      if (dropdownOpen && !event.target.closest('.dropdown-container')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleSettings = e => {
    e.stopPropagation();
    setDropdownOpen(false);
    navigate('/employee/dashboard/settings', { state: { userData } });
  };

  const handleLogout = e => {
    e.stopPropagation();
    setDropdownOpen(false);
    logout();
  };

  return (
    <header
      className={twMerge(
        'w-full px-6 py-5 flex items-center justify-between bg-light-bg dark:bg-dark-card text-light-text dark:text-dark-text shadow-md rounded-xl mb-6 transition-all duration-300',
        className
      )}
    >
      {/* Title section with subtle animation */}
      <div className="flex items-center gap-3 group">
        {icon && (
          <div className="text-inherit transition-transform duration-300 group-hover:scale-110">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold transition-colors duration-300">{title}</h1>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors duration-300">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 relative">
        {/* Enhanced Theme toggle with animation */}
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-light-card dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 shadow-sm hover:shadow-md relative overflow-hidden"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <div className="relative">
            <Sun
              className={`w-5 h-5 text-yellow-400 absolute transition-all duration-500 ${
                theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-0'
              }`}
            />
            <Moon
              className={`w-5 h-5 text-indigo-500 transition-all duration-500 ${
                theme === 'dark' ? 'opacity-0 -rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
              }`}
            />
          </div>
        </button>

        {/* Enhanced User dropdown */}
        <div className="relative dropdown-container">
          <button
            onClick={() => setDropdownOpen(prev => !prev)}
            className="flex items-center gap-3 px-4 py-2 bg-light-card dark:bg-dark-card rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center font-semibold uppercase shadow-inner">
              {isLoading ? '...' : userData.username.charAt(0)}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base font-medium transition-colors duration-300">
                {isLoading ? 'Loading...' : userData.username}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 transition-colors duration-300">
                {userData.email}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform duration-300 ${
                dropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Enhanced dropdown menu with animations */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xl z-50 overflow-hidden transition-all duration-300 animate-fadeIn">
              <div className="px-6 py-5 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-gray-800">
                <p className="text-base font-semibold">{userData.username}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                  {userData.email}
                </p>
                <div className="flex items-center mt-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                  </p>
                </div>
              </div>
              <ul className="py-2 text-sm">
                <li>
                  <button
                    onClick={handleSettings}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left transition-colors duration-200"
                  >
                    <Settings className="w-5 h-5" />
                    <span>Account Settings</span>
                  </button>
                </li>
                <li className="border-t border-gray-200 dark:border-dark-border mt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 w-full text-left transition-colors duration-200"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
