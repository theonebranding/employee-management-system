// components/HeaderSection.jsx
import { AlertTriangle } from 'lucide-react';

const HeaderSection = ({ status, currentTime, isLate, getStatusColor }) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-light-card dark:bg-dark-card p-6 rounded-2xl shadow-card ring-1 ring-light-border dark:ring-dark-border">
    <div className="flex items-center gap-4">
      <div>
        <h1 className="text-xl font-bold text-light-text dark:text-dark-text">Current Status</h1>
        <p className="text-light-text dark:text-dark-text opacity-70">
          {currentTime.toLocaleDateString()} • {currentTime.toLocaleTimeString()}
        </p>
      </div>
    </div>
    <div className="flex flex-col gap-2 items-end">
      <div className={`px-6 py-3 rounded-xl ${getStatusColor()} backdrop-blur-sm`}>
        <span className="font-semibold text-lg">{status || 'No Status'}</span>
      </div>
      {isLate && (
        <div className="px-4 py-2 rounded-xl bg-warning/20 text-warning ring-1 ring-warning/50 backdrop-blur-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Late Check In</span>
        </div>
      )}
    </div>
  </div>
);

export default HeaderSection;
