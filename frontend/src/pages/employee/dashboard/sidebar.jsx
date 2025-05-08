import {
  CalendarOff,
  CalendarPlus,
  FileText,
  HistoryIcon,
  Home as HomeIcon,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../context/authContext';

const EmployeeSidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    {
      name: 'Home',
      icon: <HomeIcon className="w-5 h-5" />,
      path: '/employee/dashboard/home',
    },
    {
      name: 'Attendance',
      icon: <CalendarPlus className="w-5 h-5" />,
      path: '/employee/dashboard/attendance',
    },
    {
      name: 'History',
      icon: <HistoryIcon className="w-5 h-5" />,
      path: '/employee/dashboard/history',
    },
    {
      name: 'Leaves',
      icon: <FileText className="w-5 h-5" />,
      path: '/employee/dashboard/leaves',
    },
    {
      name: 'Holidays',
      icon: <CalendarOff className="w-5 h-5" />,
      path: '/employee/dashboard/holidays',
    },
    {
      name: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      path: '/employee/dashboard/settings',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    if (!isSidebarOpen) {
      setTimeout(() => setIsSidebarOpen(false), 2500);
    }
  };

  return (
    <div
      className={`fixed h-full top-0 left-0 z-50 shadow-xl transition-all duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'w-64' : 'w-20 overflow-hidden'}
        bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text`}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-light-border dark:border-dark-border">
        <h2
          className={`font-bold text-base transition-opacity duration-300
            ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}
        >
          Dashboard
        </h2>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-light-border dark:hover:bg-dark-card transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-3">
        {menuItems.map((item, index) => (
          <NavLink
            to={item.path}
            key={index}
            onClick={() => setIsSidebarOpen(false)}
            className={({ isActive }) =>
              `relative flex items-center px-3 py-2 rounded-lg transition-all duration-200 group
              ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white'
              }`
            }
          >
            {/* Tooltip */}
            {!isSidebarOpen && (
              <span
                className="fixed left-14 bg-gray-800 text-white text-xs font-medium px-2 py-1 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50"
                style={{ whiteSpace: 'nowrap' }}
              >
                {item.name}
              </span>
            )}
            <div className="transition-colors duration-100">{item.icon}</div>
            <span
              className={`ml-3 font-medium text-sm transition-all duration-200 ${
                isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
              }`}
            >
              {item.name}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-light-border dark:border-dark-border">
        <button
          onClick={handleLogout}
          className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg
            hover:bg-red-600 hover:text-white transition-all duration-200
            ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}
        >
          <LogOut className="w-5 h-5" />
          {isSidebarOpen && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default EmployeeSidebar;
