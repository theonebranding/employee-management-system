import {
  CalendarOff,
  CalendarPlus,
  ClipboardList,
  FileText,
  HistoryIcon,
  Home as HomeIcon,
  ListChecks,
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
      name: 'Daily Work',
      icon: <ClipboardList className="w-5 h-5" />,
      path: '/employee/dashboard/daily-work',
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
      name: 'Tasks',
      icon: <ListChecks className="w-5 h-5" />,
      path: '/employee/dashboard/tasks',
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
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      <div
        className={`group fixed top-0 left-0 z-50 h-screen glass-sidebar text-light-text dark:text-dark-text rounded-r-3xl rounded-l-none transition-all duration-300 ease-in-out flex flex-col overflow-hidden
          ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-[120%] w-72'} lg:translate-x-0 lg:w-16 lg:hover:w-72`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-border/70 dark:border-dark-border lg:px-2">
          <div className="flex items-center gap-3 lg:w-full lg:justify">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold lg:mx-auto lg:group-hover:mx-0">
              EMS
            </div>
            <div className="lg:opacity-0 lg:w-0 lg:overflow-hidden lg:group-hover:w-auto lg:group-hover:overflow-visible lg:group-hover:opacity-100 lg:transition-all lg:duration-200">
              <p className="text-xs uppercase tracking-[0.24em] text-light-text/60 dark:text-dark-text/60">
                Portal
              </p>
              <h2 className="font-semibold text-lg">Employee</h2>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-light-bg dark:hover:bg-dark-bg transition-colors lg:hidden"
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5 text-light-text dark:text-dark-text" />
            ) : (
              <Menu className="w-5 h-5 text-light-text dark:text-dark-text" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar lg:px-2">
          {menuItems.map((item, index) => (
            <NavLink
              to={item.path}
              key={index}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `relative flex items-center w-full px-4 py-3 rounded-2xl transition-all duration-200 group
                lg:w-12 lg:h-12 lg:justify-center lg:px-0 lg:mx-auto lg:self-center
                lg:group-hover:w-full lg:group-hover:justify-start lg:group-hover:px-4 lg:group-hover:mx-0
                ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-light-text dark:text-dark-text opacity-70 hover:bg-white/60 dark:hover:bg-dark-card/60 hover:text-primary'
                }`
              }
            >
              {!isSidebarOpen && (
                <span
                  className="fixed left-14 bg-gray-800 text-white text-xs font-medium px-2 py-1 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50 lg:hidden"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {item.name}
                </span>
              )}
              <div className="w-6 h-6 shrink-0 flex items-center justify-center transition-colors duration-100">
                {item.icon}
              </div>
              <span className="ml-3 font-medium text-sm lg:opacity-0 lg:w-0 lg:overflow-hidden lg:ml-0 lg:group-hover:w-auto lg:group-hover:overflow-visible lg:group-hover:ml-3 lg:group-hover:opacity-100 lg:transition-all lg:duration-200">
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-5 border-t border-light-border/70 dark:border-dark-border lg:px-2">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-light-text dark:text-dark-text rounded-2xl transition-all hover:bg-danger hover:text-white lg:w-12 lg:h-12 lg:justify-center lg:px-0 lg:mx-auto lg:self-center lg:group-hover:w-full lg:group-hover:justify-start lg:group-hover:px-4 lg:group-hover:mx-0"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="ml-3 lg:opacity-0 lg:w-0 lg:overflow-hidden lg:ml-0 lg:group-hover:w-auto lg:group-hover:overflow-visible lg:group-hover:ml-3 lg:group-hover:opacity-100 lg:transition-all lg:duration-200">
              Logout
            </span>
          </button>
        </div>
      </div>
    </>
  );
};

export default EmployeeSidebar;
