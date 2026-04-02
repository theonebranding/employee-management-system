import { ClipboardList } from 'lucide-react';
import React from 'react';
import { ToastContainer } from 'react-toastify';

import DailyReportsManager from '../../../../components/dailyReports/dailyReportsManager';
import Header from '../../../../components/pageHeader';

const AdminDailyReports = () => {
  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Daily Reports"
          description="View, filter, and update employee daily reports."
          icon={<ClipboardList className="w-8 h-8 text-primary" />}
        />

        <DailyReportsManager />
      </div>

      <ToastContainer
        position="top-right"
        pauseOnHover={false}
        limit={1}
        autoClose={2000}
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
      />
    </div>
  );
};

export default AdminDailyReports;
