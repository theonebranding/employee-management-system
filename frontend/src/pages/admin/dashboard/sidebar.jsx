import {
  Activity,
  BadgeDollarSign,
  BarChart2,
  CalendarFold,
  ClipboardList,
  FileText,
  Home as HomeIcon,
  Landmark,
  LineChart,
  Link,
  ListChecks,
  Settings,
  Users,
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import SharedSidebar from '../../../components/dashboard/sharedSidebar';
import { useAuth } from '../../../context/authContext';

const AdminSidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    {
      name: 'Home',
      icon: HomeIcon,
      path: '/admin/dashboard/home',
    },
    {
      name: 'Attendance',
      icon: BarChart2,
      path: '/admin/dashboard/attendance',
    },
    {
      name: 'Manage Employees',
      icon: Users,
      path: '/admin/dashboard/employees',
    },
    {
      name: 'Salary Management',
      icon: BadgeDollarSign,
      path: '/admin/dashboard/salaries',
    },
    {
      name: 'Payroll Runs',
      icon: Landmark,
      path: '/admin/dashboard/payroll',
    },
    {
      name: 'Reports & BI',
      icon: LineChart,
      path: '/admin/dashboard/reports',
    },
    {
      name: 'Integrations',
      icon: Link,
      path: '/admin/dashboard/integrations',
    },
    {
      name: 'Leave Requests',
      icon: FileText,
      path: '/admin/dashboard/leaves',
    },
    {
      name: 'Leave Policy',
      icon: ListChecks,
      path: '/admin/dashboard/leave-policy',
    },
    {
      name: 'Manage Holidays',
      icon: CalendarFold,
      path: '/admin/dashboard/holidays',
    },
    {
      name: 'Daily Reports',
      icon: ClipboardList,
      path: '/admin/dashboard/daily-reports',
    },
    {
      name: 'Security Center',
      icon: Activity,
      path: '/admin/dashboard/security',
    },
    {
      name: 'Settings',
      icon: Settings,
      path: '/admin/dashboard/settings',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <SharedSidebar
      title="Admin Dashboard"
      menuItems={menuItems}
      onLogout={handleLogout}
      variant="admin"
    />
  );
};

export default AdminSidebar;
