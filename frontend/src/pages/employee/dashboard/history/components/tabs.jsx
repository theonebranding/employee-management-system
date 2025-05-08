import { AlertTriangle, Bike, CalendarArrowDownIcon, CalendarOff, CheckSquare } from 'lucide-react';
import React from 'react';

const Tabs = ({ activeTab, setActiveTab }) => {
  return (
    <div className="flex gap-4 mb-6 border-b border-light-border dark:border-dark-border">
      <button
        onClick={() => setActiveTab('attendance')}
        className={`pb-4 px-4 font-semibold transition-all ${
          activeTab === 'attendance'
            ? 'text-primary border-b-2 border-primary'
            : 'text-light-text dark:text-dark-text hover:text-primary'
        }`}
      >
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5" />
          Attendance Records
        </div>
      </button>
      <button
        onClick={() => setActiveTab('late')}
        className={`pb-4 px-4 font-semibold transition-all ${
          activeTab === 'late'
            ? 'text-warning border-b-2 border-warning'
            : 'text-light-text dark:text-dark-text hover:text-warning'
        }`}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Late Check-ins
        </div>
      </button>
      <button
        onClick={() => setActiveTab('absent')}
        className={`pb-4 px-4 font-semibold transition-all ${
          activeTab === 'absent'
            ? 'text-warning border-b-2 border-warning'
            : 'text-light-text dark:text-dark-text hover:text-warning'
        }`}
      >
        <div className="flex items-center gap-2">
          <CalendarOff className="w-5 h-5" />
          Absent Days
        </div>
      </button>
      <button
        onClick={() => setActiveTab('late')}
        className={`pb-4 px-4 font-semibold transition-all ${
          activeTab === 'late'
            ? 'text-warning border-b-2 border-warning'
            : 'text-light-text dark:text-dark-text hover:text-warning'
        }`}
      >
        <div className="flex items-center gap-2">
          <CalendarArrowDownIcon className="w-5 h-5" />
          Half Days
        </div>
      </button>
      <button
        onClick={() => setActiveTab('late')}
        className={`pb-4 px-4 font-semibold transition-all ${
          activeTab === 'late'
            ? 'text-warning border-b-2 border-warning'
            : 'text-light-text dark:text-dark-text hover:text-warning'
        }`}
      >
        <div className="flex items-center gap-2">
          <Bike className="w-5 h-5" />
          Holidays
        </div>
      </button>
    </div>
  );
};

export default Tabs;
