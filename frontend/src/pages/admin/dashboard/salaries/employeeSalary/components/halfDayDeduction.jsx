import { AlertCircle, Calendar, CalendarDays, Clock, DollarSign, Loader2, Sun } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const HalfDayDeduction = ({ employeeId, onDataFetched, month, year }) => {
  const [halfDayData, setHalfDayData] = useState(null);
  const [loading, setLoading] = useState(true);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchHalfDays = async () => {
    try {
      setLoading(true);

      const startDate = `01-${month.toString().padStart(2, '0')}-${year}`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${lastDay}-${month.toString().padStart(2, '0')}-${year}`;

      const queryParams = new URLSearchParams({
        employeeId,
        startDate,
        endDate,
      }).toString();

      const response = await fetch(
        `${BASE_URL}/attendance-summary/employee-halfdays-list?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch half-days.');
      const data = await response.json();
      setHalfDayData(data);

      onDataFetched(data.totalDeduction || 0);
    } catch (error) {
      console.error('Error fetching half-days:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHalfDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, month, year]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 bg-light-bg/50 dark:bg-dark-bg/50 rounded-lg">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-light-text dark:text-dark-text opacity-70">Loading half day data...</p>
        </div>
      </div>
    );
  }

  if (!halfDayData) return null;

  return (
    <div className="bg-light-card/40 dark:bg-dark-card/40 rounded-xl border border-light-border/50 dark:border-dark-border/50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
              {halfDayData.employeeName}'s Half-Day Deductions
            </h2>
            <div className="px-4 py-1 bg-primary/10 rounded-full text-primary text-sm">
              {new Date(year, month - 1).toLocaleString('default', {
                month: 'long',
              })}{' '}
              {year}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-light-bg/50 dark:bg-dark-bg/50 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-secondary/10">
                <Sun className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-light-text dark:text-dark-text opacity-70 mb-1">
                  Total Half Days
                </p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {halfDayData.totalHalfDays}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-light-bg/50 dark:bg-dark-bg/50 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-success/10">
                <DollarSign className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-light-text dark:text-dark-text opacity-70 mb-1">
                  Deduction/Day
                </p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  ₹{parseFloat(halfDayData.dailySalary / 2).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-light-bg/50 dark:bg-dark-bg/50 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-danger/10">
                <AlertCircle className="w-6 h-6 text-danger" />
              </div>
              <div>
                <p className="text-sm text-light-text dark:text-dark-text opacity-70 mb-1">
                  Total Deduction
                </p>
                <p className="text-2xl font-bold text-danger">
                  ₹{parseFloat(halfDayData.totalDeduction).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-light-bg/50 dark:bg-dark-bg/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-light-text dark:text-dark-text">
              Half-Day History
            </h3>
            <div className="flex items-center gap-2 text-sm text-light-text dark:text-dark-text opacity-70">
              <CalendarDays className="w-4 h-4" />
              <span>{halfDayData.totalDaysInMonth} Days Month</span>
            </div>
          </div>

          {!halfDayData.halfDayDetails?.length ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-light-text dark:text-dark-text opacity-70 mx-auto mb-3" />
              <p className="text-light-text dark:text-dark-text opacity-70">
                No half-days recorded this month
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {halfDayData.halfDayDetails.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-light-card/40 dark:bg-dark-card/40 rounded-lg hover:bg-light-card/60 dark:hover:bg-dark-card/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    <span className="text-light-text dark:text-dark-text">
                      {new Date(entry.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-light-text dark:text-dark-text opacity-70">
                    <Clock className="w-4 h-4" />
                    <span>{entry.hoursWorked} Hours Worked</span>
                    <span className="px-2 py-1 bg-secondary/10 rounded-full text-secondary text-xs ml-2">
                      -₹{(parseFloat(halfDayData.dailySalary) / 2).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HalfDayDeduction;
