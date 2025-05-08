import {
  AlertCircle,
  Calendar,
  CalendarDays,
  ClipboardList,
  DollarSign,
  Loader2,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

const AbsentDayDeduction = ({ employeeId, onDataFetched, month, year }) => {
  const [absentData, setAbsentData] = useState(null);
  const [loading, setLoading] = useState(true);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const fetchAbsentDays = async () => {
    try {
      setLoading(true);

      const startDate = `01-${month.toString().padStart(2, '0')}-${year}`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${lastDay}-${month.toString().padStart(2, '0')}-${year}`;

      const queryParams = new URLSearchParams({
        employeeId: employeeId,
        startDate: startDate,
        endDate: endDate,
      }).toString();

      const response = await fetch(
        `${BASE_URL}/attendance-summary/employee-absentee-list?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch absent days.');
      const data = await response.json();
      setAbsentData(data);
      onDataFetched(data.totalDeduction || 0);
    } catch (error) {
      console.error('Error fetching absent days:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsentDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, month, year]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-light-card  dark:bg-dark-card  rounded-2xl border border-light-border dark:border-dark-border">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-light-text dark:text-dark-text opacity-70 font-medium">
            Loading attendance data...
          </p>
        </div>
      </div>
    );
  }

  if (!absentData) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-danger/10 p-3 rounded-xl">
            <XCircle className="w-6 h-6 text-danger" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-light-text dark:text-dark-text mb-1">
              Absent Day Deductions
            </h2>
            <p className="text-light-text dark:text-dark-text opacity-70">
              Tracking absences for {months[month - 1]} {year}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-light-card  dark:bg-dark-card  p-6 rounded-2xl border border-light-border dark:border-dark-border hover:border-primary/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <span className="text-light-text dark:text-dark-text opacity-70 font-medium">
              Total Absent Days
            </span>
          </div>
          <p className="text-3xl font-bold text-light-text dark:text-dark-text">
            {absentData.totalAbsents}
          </p>
        </div>

        <div className="bg-light-card  dark:bg-dark-card  p-6 rounded-2xl border border-light-border dark:border-dark-border hover:border-warning/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-warning/10 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-warning" />
            </div>
            <span className="text-light-text dark:text-dark-text opacity-70 font-medium">
              Deduction per Day
            </span>
          </div>
          <p className="text-3xl font-bold text-light-text dark:text-dark-text">
            ₹{parseFloat(absentData.dailySalary).toLocaleString()}
          </p>
        </div>

        <div className="bg-light-card  dark:bg-dark-card  p-6 rounded-2xl border border-light-border dark:border-dark-border hover:border-danger/50 transition-all duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-danger/10 p-2 rounded-lg">
              <AlertCircle className="w-5 h-5 text-danger" />
            </div>
            <span className="text-light-text dark:text-dark-text opacity-70 font-medium">
              Total Deduction
            </span>
          </div>
          <p className="text-3xl font-bold text-danger">
            ₹{parseFloat(absentData.totalDeduction).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-light-card  dark:bg-dark-card  rounded-2xl p-6 border border-light-border dark:border-dark-border">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
            Absence Details
          </h3>
        </div>

        {absentData.absentDates?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {absentData.absentDates.map((entry, index) => (
              <div
                key={index}
                className="flex items-center gap-3 bg-light-card/50 dark:bg-dark-card/50 px-4 py-3 rounded-xl hover:bg-light-card/70 dark:hover:bg-dark-card/70 transition-all duration-200 border border-light-border dark:border-dark-border hover:border-primary/50"
              >
                <CalendarDays className="w-4 h-4 text-primary" />
                <span className="text-light-text dark:text-dark-text font-medium">
                  {entry.formattedDate}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-light-card/20 dark:bg-dark-card/20 rounded-xl border border-light-border  dark:border-dark-border ">
            <Calendar className="w-16 h-16 text-light-text dark:text-dark-text opacity-70 mx-auto mb-4" />
            <p className="text-light-text dark:text-dark-text opacity-70 font-medium">
              No absences recorded for {months[month - 1]} {year}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AbsentDayDeduction;
