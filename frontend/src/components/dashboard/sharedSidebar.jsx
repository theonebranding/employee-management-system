import { LogOut, Menu, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

const variants = {
  admin: {
    container: 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text',
    headerTitle: 'text-light-text dark:text-dark-text text-lg',
    toggleHover: 'hover:bg-light-bg dark:hover:bg-dark-bg',
    iconColor: 'text-light-text dark:text-dark-text opacity-70',
    inactiveLink:
      'text-light-text dark:text-dark-text opacity-70 hover:bg-light-bg dark:hover:bg-dark-bg hover:text-primary',
    tooltip: 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text',
    logoutHover: 'hover:bg-danger hover:text-white',
  },
  employee: {
    container: 'bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text',
    headerTitle: 'text-light-text dark:text-dark-text text-base',
    toggleHover: 'hover:bg-light-border dark:hover:bg-dark-card',
    iconColor: 'text-light-text dark:text-dark-text',
    inactiveLink:
      'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-black dark:hover:text-white',
    tooltip: 'bg-gray-800 text-white',
    logoutHover: 'hover:bg-red-600 hover:text-white rounded-lg',
  },
};

const SharedSidebar = ({ title, menuItems, onLogout, variant = 'employee' }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const closeTimerRef = useRef(null);
  const style = variants[variant] || variants.employee;

  const toggleSidebar = () => {
    const nextState = !isSidebarOpen;
    setIsSidebarOpen(nextState);

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (nextState) {
      closeTimerRef.current = setTimeout(() => {
        setIsSidebarOpen(false);
      }, 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`fixed h-full top-0 left-0 z-50 shadow-xl transition-all duration-300 ease-in-out flex flex-col ${style.container} ${isSidebarOpen ? 'w-72 sm:w-64' : 'w-16 sm:w-20 overflow-hidden'}`}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-light-border dark:border-dark-border">
        <h2
          className={`font-bold transition-opacity duration-300 ${style.headerTitle} ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}
        >
          {title}
        </h2>
        <button
          onClick={toggleSidebar}
          className={`p-2 rounded-lg transition-colors ${style.toggleHover}`}
        >
          {isSidebarOpen ? (
            <X className="w-6 h-6 text-light-text dark:text-dark-text" />
          ) : (
            <Menu className="w-6 h-6 text-light-text dark:text-dark-text" />
          )}
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-3">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={({ isActive }) =>
                `relative flex items-center px-3 py-2 rounded-lg transition-all duration-200 group ${
                  isActive ? 'bg-primary text-white' : style.inactiveLink
                }`
              }
            >
              {!isSidebarOpen && (
                <span
                  className={`fixed left-14 text-xs font-medium px-2 py-1 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50 ${style.tooltip}`}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {item.name}
                </span>
              )}
              <div className={`transition-colors duration-100 ${style.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`ml-3 font-medium text-sm transition-all duration-200 ${
                  isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
                }`}
              >
                {item.name}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-light-border dark:border-dark-border">
        <button
          onClick={onLogout}
          className={`flex items-center w-full px-4 py-3 text-sm font-medium text-light-text dark:text-dark-text transition-all duration-200 ${style.logoutHover} ${isSidebarOpen ? 'justify-start' : 'justify-center'}`}
        >
          <LogOut className="w-5 h-5" />
          {isSidebarOpen && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </div>
  );
};

export default SharedSidebar;
