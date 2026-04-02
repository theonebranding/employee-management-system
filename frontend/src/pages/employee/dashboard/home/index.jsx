import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { CheckCircle, FileText } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import { useTheme } from '../../../../context/themeContext'; // ✅ Theme Context

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend
);

const DashboardHome = () => {
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const { theme } = useTheme(); // ✅ Get current theme

  const dailyWorkingHoursData = [8, 7.5, 6, 8.5, 7, 5.5, 8];
  const weeklyHoursWorkedData = [40, 35, 42, 38];

  useEffect(() => {
    const textColor = theme === 'dark' ? '#E5E7EB' : '#1F2937';
    const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    // const bgGray = theme === 'dark' ? '#1E293B' : '#F9FAFB';

    // Line Chart
    const lineChart = new ChartJS(lineChartRef.current, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Daily Working Hours',
            data: dailyWorkingHoursData,
            borderColor: '#4F46E5',
            backgroundColor: 'rgba(79, 70, 229, 0.3)',
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: textColor },
          },
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          y: {
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
        },
      },
    });

    // Bar Chart
    const barChart = new ChartJS(barChartRef.current, {
      type: 'bar',
      data: {
        labels: ['Week 1 (1-7)', 'Week 2 (8-14)', 'Week 3 (15-21)', 'Week 4 (22-28)'],
        datasets: [
          {
            label: 'Hours Worked',
            data: weeklyHoursWorkedData,
            backgroundColor: '#22C55E',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: textColor },
          },
        },
        scales: {
          x: {
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
          y: {
            ticks: { color: textColor },
            grid: { color: gridColor },
          },
        },
      },
    });

    return () => {
      lineChart.destroy();
      barChart.destroy();
    };
  }); // ✅ Re-render charts when theme changes

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header with Theme Toggle */}
        <Header
          title="Dashboard Home"
          description="Daily working, weekly hours worked, and attendance metrics."
          icon={<FileText className="w-8 h-8" />}
        />

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-emerald-500/10 text-emerald-800 dark:text-white dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border hover:scale-105 transform transition-all duration-300">
            <CheckCircle className="w-8 h-8 text-emerald-800 dark:text-white mb-4" />
            <h3 className="text-lg font-semibold">Total Hours Worked This Week</h3>
            <p className="text-2xl font-bold">40 hrs</p>
          </div>

          <div className="bg-yellow-500/10 text-yellow-800 dark:text-white dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border hover:scale-105 transform transition-all duration-300">
            <CheckCircle className="w-8 h-8  text-yellow-800 dark:text-white mb-4" />
            <h3 className="text-lg font-semibold">Active Days this week</h3>
            <p className="text-2xl font-bold">6 Days</p>
          </div>

          <div className="bg-red-500/10 text-red-800 dark:text-white dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border hover:scale-105 transform transition-all duration-300">
            <CheckCircle className="w-8 h-8 text-red-800 dark:text-white mb-4" />
            <h3 className="text-lg font-semibold">Monthly Attendance</h3>
            <p className="text-2xl font-bold">95%</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold mb-4">Daily Working Hours</h3>
            <canvas ref={lineChartRef}></canvas>
          </div>

          <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold mb-4">Weekly Hours Worked</h3>
            <canvas ref={barChartRef}></canvas>
          </div>
        </div>
      </div>

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick={true}
        autoClose={1000}
      />
    </div>
  );
};

export default DashboardHome;
