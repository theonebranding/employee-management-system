/* eslint-disable sonarjs/no-duplicate-string */
import { AlertTriangle, CheckSquare, UserX } from 'lucide-react';
import React from 'react';

const Tabs = ({ activeTab, setActiveTab }) => {
  const baseClass =
    'pb-4 px-4 font-semibold transition-all flex items-center gap-2';
  const activeClass = 'text-warning border-b-2 border-warning';
  const inactiveClass =
    'text-light-text dark:text-dark-text hover:text-warning';

  return (
    <div className="flex gap-4 mb-6 border-b border-light-border dark:border-dark-border">
      <button
        onClick={() => setActiveTab('attendance')}
        className={`${baseClass} ${
          activeTab === 'attendance' ? activeClass : inactiveClass
        }`}
      >
        <CheckSquare className="w-5 h-5" />
        Attendance Records
      </button>
      <button
        onClick={() => setActiveTab('late')}
        className={`${baseClass} ${
          activeTab === 'late' ? activeClass : inactiveClass
        }`}
      >
        <AlertTriangle className="w-5 h-5" />
        Late Check-ins
      </button>
      <button
        onClick={() => setActiveTab('absent')}
        className={`${baseClass} ${
          activeTab === 'absent' ? activeClass : inactiveClass
        }`}
      >
        <UserX className="w-5 h-5" />
        Absent Days
      </button>
    </div>
  );
};

export default Tabs;
