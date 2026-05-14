// AttendanceTab.jsx - Main Component
import { Calendar, ChevronDown, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';

import AbsentTab from './components/absentTab';
import DailyAttendanceTab from './components/dailyAttendanceTab';
import HalfDaysTab from './components/halfDaysTab';
import HolidaysTab from './components/holidaysTab';
import LateCheckInsTab from './components/lateCheckInsTab';

// Tab definitions
const TABS = [
  {
    id: 'attendance',
    label: 'Daily Attendance',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    id: 'lateCheckIns',
    label: 'Late Check-ins',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    id: 'halfDays',
    label: 'Half Days',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    id: 'absent',
    label: 'Absent',
    icon: <Calendar className="w-4 h-4" />,
  },
  {
    id: 'holidays',
    label: 'Holidays',
    icon: <Calendar className="w-4 h-4" />,
  },
];

// Filter component
const DateFilter = ({ month, setMonth, year, setYear, onRefresh }) => (
  <div className="flex items-center gap-4 p-4 bg-light-bg dark:bg-dark-bg rounded-lg">
    <div className="relative">
      <select
        value={month}
        onChange={e => setMonth(parseInt(e.target.value))}
        className="appearance-none pl-4 pr-10 py-2 rounded-lg bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text border-light-border dark:border-dark-border focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {new Date(0, i).toLocaleString('default', { month: 'long' })}
          </option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
    </div>
    <input
      type="number"
      value={year}
      onChange={e => setYear(parseInt(e.target.value))}
      className="px-4 py-2 rounded-lg bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text border-light-border dark:border-dark-border focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
      min="2000"
      max={new Date().getFullYear()}
    />
    <button
      onClick={onRefresh}
      className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 transition-all duration-200 text-light-text dark:text-dark-text border-light-border dark:border-dark-border rounded-lg"
    >
      <RefreshCw className="w-4 h-4" />
      Refresh
    </button>
  </div>
);

const AttendanceTab = ({ employeeId }) => {
  const IST_OFFSET_MINUTES = 330;
  const toIstInputDate = (dateValue) => {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
    return shifted.toISOString().slice(0, 10);
  };
  const [activeTab, setActiveTab] = useState('attendance');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = toIstInputDate(new Date(year, month, 0));
  // console.log(startDate, endDate);
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Render the appropriate component based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'attendance':
        return (
          <DailyAttendanceTab
            employeeId={employeeId}
            month={month}
            year={year}
            startDate={startDate}
            endDate={endDate}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'lateCheckIns':
        return (
          <LateCheckInsTab
            employeeId={employeeId}
            month={month}
            year={year}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'halfDays':
        return (
          <HalfDaysTab
            employeeId={employeeId}
            month={month}
            year={year}
            startDate={startDate}
            endDate={endDate}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'absent':
        return (
          <AbsentTab
            employeeId={employeeId}
            startDate={startDate}
            endDate={endDate}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'holidays':
        return (
          <HolidaysTab
            employeeId={employeeId}
            month={month}
            year={year}
            refreshTrigger={refreshTrigger}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border-light-border dark:border-dark-border rounded-lg w-full overflow-x-auto hide-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-primary  text-light-text dark:text-dark-text shadow-lg shadow-primary/30'
                : 'text-light-text dark:text-dark-text'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <DateFilter
        month={month}
        setMonth={setMonth}
        year={year}
        setYear={setYear}
        onRefresh={handleRefresh}
      />

      {renderTabContent()}

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

export default AttendanceTab;
