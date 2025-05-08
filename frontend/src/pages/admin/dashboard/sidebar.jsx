import {
  BadgeDollarSign,
  BarChart2,
  CalendarFold,
  FileText,
  Home as HomeIcon,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../context/authContext';

const AdminSidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    {
      name: 'Home',
      icon: <HomeIcon className="w-5 h-5" />,
      path: '/admin/dashboard/home',
    },
    {
      name: 'Attendance',
      icon: <BarChart2 className="w-5 h-5" />,
      path: '/admin/dashboard/attendance',
    },
    {
      name: 'Manage Employees',
      icon: <Users className="w-5 h-5" />,
      path: '/admin/dashboard/employees',
    },
    {
      name: 'Salary Management',
      icon: <BadgeDollarSign className="w-5 h-5" />,
      path: '/admin/dashboard/salaries',
    },
    {
      name: 'Leave Requests',
      icon: <FileText className="w-5 h-5" />,
      path: '/admin/dashboard/leaves',
    },
    {
      name: 'Manage Holidays',
      icon: <CalendarFold className="w-5 h-5" />,
      path: '/admin/dashboard/holidays',
    },
    {
      name: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      path: '/admin/dashboard/settings',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
    if (!isSidebarOpen) {
      setTimeout(() => {
        setIsSidebarOpen(false);
      }, 2500); // Automatically close after 2.5 seconds
    }
  };

  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text shadow-xl h-full top-0 left-0 z-50
          ${isSidebarOpen ? 'w-64' : 'w-20 overflow-hidden'} 
          transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-light-border dark:border-dark-border">
          <h2
            className={`font-bold text-light-text dark:text-dark-text text-lg transition-opacity duration-300
              ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}
          >
            Admin Dashboard
          </h2>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
          >
            {isSidebarOpen ? (
              <X className="w-6 h-6 text-light-text dark:text-dark-text" />
            ) : (
              <Menu className="w-6 h-6 text-light-text dark:text-dark-text" />
            )}
          </button>
        </div>

        {/* Sidebar Navigation */}
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
                    : 'text-light-text dark:text-dark-text opacity-70 hover:bg-light-bg dark:hover:bg-dark-bg hover:text-primary'
                }`
              }
            >
              {/* Tooltip */}
              {!isSidebarOpen && (
                <span
                  className="fixed left-14 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text text-xs font-medium px-2 py-1 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-50"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {item.name}
                </span>
              )}
              <div
                className={`${isSidebarOpen ? 'text-light-text dark:text-dark-text' : 'text-light-text dark:text-dark-text opacity-70'} transition-colors duration-100`}
              >
                {item.icon}
              </div>
              <span
                className={`ml-3 font-medium text-sm ${
                  isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
                } transition-all duration-200`}
              >
                {item.name}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-light-border dark:border-dark-border">
          <button
            onClick={handleLogout}
            className={`flex items-center w-full px-4 py-3 text-sm font-medium text-light-text dark:text-dark-text
              transition-all hover:bg-danger hover:text-white ${
                isSidebarOpen ? 'justify-start' : 'justify-center'
              }`}
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;
