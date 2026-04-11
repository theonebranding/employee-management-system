import { Home } from 'lucide-react';
import React from 'react';

import Header from '../../../../components/pageHeader';
import { useTheme } from '../../../../context/themeContext';
import AverageWorkingHours from './components/averageWorkingHours';
import EmployeeHolidayAlerts from './components/employeeHolidayAlerts';
import EmployeeLeaveAlerts from './components/employeeLeaveAlerts';
import StatCard from './components/statCard';

const AdminDashboardHome = () => {
  const { theme } = useTheme();
  const attendanceData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Present',
        data: [92, 88, 95, 90, 87, 93],
        borderColor: '#6366f1',
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Absent',
        data: [8, 12, 5, 10, 13, 7],
        borderColor: '#ef4444',
        tension: 0.4,
        fill: false,
      },
      {
        label: 'Late',
        data: [4, 6, 3, 5, 7, 4],
        borderColor: '#facc15',
        tension: 0.4,
        fill: false,
      },
    ],
  };

  // const leaveData = {
  //   labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  //   datasets: [
  //     {
  //       label: 'Sick Leave',
  //       data: [12, 8, 10, 15, 7, 9],
  //       backgroundColor: '#ef4444',
  //     },
  //     {
  //       label: 'Vacation',
  //       data: [8, 15, 12, 10, 18, 14],
  //       backgroundColor: '#6366f1',
  //     },
  //     {
  //       label: 'Personal',
  //       data: [5, 3, 6, 4, 7, 5],
  //       backgroundColor: '#22c55e',
  //     },
  //   ],
  // };

  // const departmentData = {
  //   labels: ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance'],
  //   datasets: [
  //     {
  //       data: [45, 20, 30, 15, 18],
  //       backgroundColor: ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4'],
  //     },
  //   ],
  // };

  const chartConfig = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: theme === 'dark' ? '#e2e8f0' : '#1E293B',
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: theme === 'dark' ? '#475569' : '#CBD5E1',
        },
        ticks: {
          color: theme === 'dark' ? '#e2e8f0' : '#1E293B',
        },
      },
      y: {
        grid: {
          color: theme === 'dark' ? '#475569' : '#CBD5E1',
        },
        ticks: {
          color: theme === 'dark' ? '#e2e8f0' : '#1E293B',
        },
      },
    },
  };

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Dashboard Home"
          description="Manage your dashboard and get insights into your data."
          icon={<Home className="w-8 h-8 text-primary" />}
        />

        {/* Stats Grid */}
        <div className="gap-6 mb-8">
          <StatCard />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          <AverageWorkingHours data={attendanceData} config={chartConfig} />
          {/* <LeaveChart data={leaveData} config={chartConfig} /> */}
        </div>

        {/* Department Distribution and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2 bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
              Recent Alerts: Upcoming Holidays and Leaves of Employee
            </h3>
            <div className="space-y-4">
              <EmployeeHolidayAlerts />
            </div>
            <div className="space-y-4 mt-6">
              <EmployeeLeaveAlerts />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardHome;
