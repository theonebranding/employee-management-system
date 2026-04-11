import {
  BadgeDollarSign,
  BarChart2,
  CalendarFold,
  ChevronDown,
  ClipboardList,
  FileText,
  Home as HomeIcon,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../context/authContext';

const AdminSidebar = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openSections, setOpenSections] = useState({ reports: true });
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const isReportsRoute = location.pathname.startsWith('/admin/dashboard/reports');
  const reportsTab = new URLSearchParams(location.search).get('tab') || 'attendance';

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
      name: 'Tasks',
      icon: <ClipboardList className="w-5 h-5" />,
      path: '/admin/dashboard/tasks',
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
    {
      name: 'Reports',
      icon: <FileText className="w-5 h-5" />,
      path: '/admin/dashboard/reports?tab=attendance',
      key: 'reports',
      children: [
        { name: 'Attendance', path: '/admin/dashboard/reports?tab=attendance' },
        { name: 'Daily Punch', path: '/admin/dashboard/reports?tab=daily-punch' },
        { name: 'Daily Work', path: '/admin/dashboard/reports?tab=daily-report' },
        { name: 'Hourly', path: '/admin/dashboard/reports?tab=hourly' },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const toggleSection = (key) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
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
      {/* Sidebar */}
      <div
        className={`group fixed top-0 left-0 z-50 h-screen bg-transparent text-light-text dark:text-dark-text shadow-2xl border border-light-border/70 dark:border-dark-border rounded-r-3xl rounded-l-none backdrop-blur transition-all duration-300 ease-in-out flex flex-col overflow-hidden
          ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-[120%] w-72'} lg:translate-x-0 lg:w-16 lg:hover:w-72`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-light-border/70 dark:border-dark-border lg:px-2">
          <div className="flex items-center gap-3 lg:w-full lg:justify">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center font-bold lg:mx-auto lg:group-hover:mx-0">
              EMS
            </div>
            <div className="lg:opacity-0 lg:w-0 lg:overflow-hidden lg:group-hover:w-auto lg:group-hover:overflow-visible lg:group-hover:opacity-100 lg:transition-all lg:duration-200">
              <p className="text-xs uppercase tracking-[0.24em] text-light-text/60 dark:text-dark-text/60">
                Console
              </p>
              <h2 className="font-semibold text-lg">Admin Hub</h2>
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

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar lg:px-2">
          {menuItems.map((item, index) => {
            const hasChildren = Boolean(item.children?.length);
            const isSectionOpen = item.key ? openSections[item.key] : false;
            const isItemActive =
              hasChildren && item.key === 'reports'
                ? isReportsRoute
                : location.pathname === item.path;

            return (
              <div key={`${item.name}-${index}`} className="space-y-2">
                <div className="relative">
                  <NavLink
                    to={item.path}
                    onClick={() => {
                      if (item.key) {
                        setOpenSections((prev) => ({
                          ...prev,
                          [item.key]: true,
                        }));
                      }
                      setIsSidebarOpen(false);
                    }}
                    className={() =>
                      `relative flex items-center w-full px-4 py-3 rounded-2xl transition-all duration-200 group
                      lg:w-12 lg:h-12 lg:justify-center lg:px-0 lg:mx-auto lg:self-center
                      lg:group-hover:w-full lg:group-hover:justify-start lg:group-hover:px-4 lg:group-hover:mx-0
                      ${
                        isItemActive
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'text-light-text dark:text-dark-text opacity-70 hover:bg-white/60 dark:hover:bg-dark-card/60 hover:text-primary'
                      }`
                    }
                  >
                    <div className="w-6 h-6 shrink-0 flex items-center justify-center transition-colors duration-100">
                      {item.icon}
                    </div>
                    <span className="ml-3 font-medium text-sm lg:opacity-0 lg:w-0 lg:overflow-hidden lg:ml-0 lg:group-hover:w-auto lg:group-hover:overflow-visible lg:group-hover:ml-3 lg:group-hover:opacity-100 lg:transition-all lg:duration-200">
                      {item.name}
                    </span>
                  </NavLink>
                  {hasChildren && (
                    <button
                      type="button"
                      onClick={() => toggleSection(item.key)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-light-text/70 dark:text-dark-text/70 hover:text-primary lg:opacity-0 lg:group-hover:opacity-100"
                      aria-label={`Toggle ${item.name}`}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isSectionOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                      />
                    </button>
                  )}
                </div>
                {hasChildren && isSectionOpen && (
                  <div
                    className={`pl-10 pr-3 space-y-1 ${
                      isSidebarOpen ? 'block' : 'hidden'
                    } lg:hidden`}
                  >
                    {item.children.map((child) => {
                      const isChildActive =
                        item.key === 'reports'
                          ? isReportsRoute && reportsTab === new URLSearchParams(child.path.split('?')[1]).get('tab')
                          : location.pathname === child.path;

                      return (
                        <NavLink
                          key={child.name}
                          to={child.path}
                          onClick={() => setIsSidebarOpen(false)}
                          className={() =>
                            `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors
                            ${
                              isChildActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-light-text/60 dark:text-dark-text/60 hover:text-primary'
                            }`
                          }
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {child.name}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Logout Button */}
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

export default AdminSidebar;
