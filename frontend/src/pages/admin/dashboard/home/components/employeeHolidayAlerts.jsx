import { AlertCircle, Calendar, Loader2, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const EmployeeHolidayAlerts = () => {
  const [holidays, setHolidays] = useState({ current: [], next: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('current');
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const year = today.getFullYear();
        const nextYear = currentMonth === 12 ? year + 1 : year;

        const [currentResponse, nextResponse] = await Promise.all([
          fetch(`${BASE_URL}/holidays/employees-on-holiday?month=${currentMonth}&year=${year}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }),
          fetch(`${BASE_URL}/holidays/employees-on-holiday?month=${nextMonth}&year=${nextYear}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }),
        ]);

        if (!currentResponse.ok || !nextResponse.ok) throw new Error('Failed to fetch holidays');

        const [currentData, nextData] = await Promise.all([
          currentResponse.json(),
          nextResponse.json(),
        ]);

        setHolidays({
          current: currentData.holidays || [],
          next: nextData.holidays || [],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMonthName = (offset = 0) => {
    return new Date(new Date().setMonth(new Date().getMonth() + offset)).toLocaleString('default', {
      month: 'long',
    });
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const HolidayItem = ({ entry }) => (
    <div className="bg-light-card dark:bg-dark-card rounded-lg p-3 mb-3 last:mb-0 border border-light-border dark:border-dark-border  hover:border-primary/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <User size={14} className="text-primary" />
          </div>
          <span className="text-light-text dark:text-dark-text font-medium">
            {entry.employee?.name}
          </span>
        </div>
        <span className="text-light-text dark:text-dark-text text-xs px-2 py-1 rounded-full bg-light-bg dark:bg-dark-bg">
          {entry.employee?.email}
        </span>
      </div>
      <div className="pl-8 space-y-2">
        {(entry.holidays || []).map((h, idx) => (
          <div
            key={`${entry.employee?._id}-${h.date}-${idx}`}
            className="flex items-center gap-2 text-sm"
          >
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-primary font-medium">{h.name}</span>
            <span className="text-light-text dark:text-dark-text">•</span>
            <span className="text-light-text dark:text-dark-text">{formatDate(h.date)}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="py-6 text-center">
      <Calendar className="w-12 h-12 mx-auto mb-3 text-light-text dark:text-dark-text " />
      <p className="text-light-text dark:text-dark-text ">
        No holidays scheduled for {activeTab === 'current' ? getMonthName() : getMonthName(1)}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-light-card dark:bg-dark-card rounded-lg p-8 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-light-text dark:text-dark-text">Loading holiday information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-light-card dark:bg-dark-card rounded-lg p-6 border border-danger/30">
        <div className="flex items-center gap-2 text-danger mb-2">
          <AlertCircle className="w-5 h-5" />
          <p className="font-medium">Error Loading Data</p>
        </div>
        <p className="text-light-text dark:text-dark-text pl-7">{error}</p>
      </div>
    );
  }

  const activeHolidays = holidays[activeTab];
  const currentMonthName = getMonthName();
  const nextMonthName = getMonthName(1);

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-lg overflow-hidden border border-light-border dark:border-dark-border">
      {/* Header */}
      <div className="bg-light-bg dark:bg-dark-bg p-4 border-b border-light-border dark:border-dark-border">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-light-text dark:text-dark-text font-medium">Employee Holidays</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-light-border dark:border-dark-border">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'current'
              ? 'text-primary border-b-2 border-primary bg-light-bg dark:bg-dark-bg'
              : 'text-light-text dark:text-dark-text  hover:bg-light-bg dark:hover:bg-dark-bg hover:text-primary'
          }`}
          aria-label={`View holidays for ${currentMonthName}`}
        >
          {currentMonthName} ({holidays.current.length})
        </button>
        <button
          onClick={() => setActiveTab('next')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'next'
              ? 'text-primary border-b-2 border-primary bg-light-bg dark:bg-dark-bg'
              : 'text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg hover:text-primary'
          }`}
          aria-label={`View holidays for ${nextMonthName}`}
        >
          {nextMonthName} ({holidays.next.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeHolidays.length > 0 && (
          <div className="text-primary text-sm mb-3 px-1">
            {activeHolidays.length} employee
            {activeHolidays.length > 1 ? 's' : ''} with scheduled time off
          </div>
        )}

        {activeHolidays.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {activeHolidays.map(entry => (
              <HolidayItem key={entry.employee?._id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeHolidayAlerts;
