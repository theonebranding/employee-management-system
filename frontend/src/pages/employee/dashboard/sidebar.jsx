import {
  CalendarOff,
  CalendarPlus,
  FileText,
  HistoryIcon,
  Home as HomeIcon,
  ReceiptIndianRupee,
  Settings,
} from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import SharedSidebar from '../../../components/dashboard/sharedSidebar';
import { useAuth } from '../../../context/authContext';

const EmployeeSidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const menuItems = [
    {
      name: 'Home',
      icon: HomeIcon,
      path: '/employee/dashboard/home',
    },
    {
      name: 'Attendance',
      icon: CalendarPlus,
      path: '/employee/dashboard/attendance',
    },
    {
      name: 'History',
      icon: HistoryIcon,
      path: '/employee/dashboard/history',
    },
    {
      name: 'Leaves',
      icon: FileText,
      path: '/employee/dashboard/leaves',
    },
    {
      name: 'Holidays',
      icon: CalendarOff,
      path: '/employee/dashboard/holidays',
    },
    {
      name: 'Payslips',
      icon: ReceiptIndianRupee,
      path: '/employee/dashboard/payslips',
    },
    {
      name: 'Settings',
      icon: Settings,
      path: '/employee/dashboard/settings',
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <SharedSidebar
      title="Dashboard"
      menuItems={menuItems}
      onLogout={handleLogout}
      variant="employee"
    />
  );
};

export default EmployeeSidebar;
