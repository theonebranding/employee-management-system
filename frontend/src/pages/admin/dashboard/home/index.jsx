/* eslint-disable simple-import-sort/imports */
import { Home } from 'lucide-react';
import React from 'react';

import Header from '../../../../components/pageHeader';

import AverageWorkingHours from './components/averageWorkingHours';
import EmployeeHolidayAlerts from './components/employeeHolidayAlerts';
import EmployeeLeaveAlerts from './components/employeeLeaveAlerts';
import ExecutiveKpiStrip from './components/executiveKpiStrip';
import StatCard from './components/statCard';

const AdminDashboardHome = () => {
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

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg">
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

        <ExecutiveKpiStrip />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          <AverageWorkingHours />
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
