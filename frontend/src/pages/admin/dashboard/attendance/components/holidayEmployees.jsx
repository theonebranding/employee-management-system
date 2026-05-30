import { Calendar, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const HolidayEmployees = ({ selectedDate }) => {
  const [holidayList, setHolidayList] = useState([]);
  const [loading, setLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  // Helper function to format the date to YYYY-MM-DD
  const formatDate = date => {
    if (date instanceof Date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const year = date.getFullYear();
      return `${year}-${month}-${day}`;
    }
    return date; // Return as is if it's already formatted
  };

  const fetchHolidayList = async () => {
    setLoading(true);
    try {
      const formattedDate = formatDate(selectedDate || new Date()); // Default to today

      const response = await fetch(
        `${BASE_URL}/holidays/employees-on-holiday?date=${formattedDate}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (response.status === 204) {
        // Handle No Content response
        setHolidayList([]);
        setLoading(false);
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch holiday list.');

      const { holidays } = await response.json(); // Access the correct key

      // New shape: holidays = [{ employee: { _id, name, email, employeeCode },
      //                          holidays: [{ name, date, source }] }, ...]
      // Flatten into one row per (employee, holiday) pair so the table can render
      // multiple holidays for the same employee on the queried date.
      const flattened = (holidays || []).flatMap(entry => {
        const employee = entry?.employee || {};
        const entryHolidays = Array.isArray(entry?.holidays) ? entry.holidays : [];
        if (entryHolidays.length === 0) {
          return [];
        }
        return entryHolidays.map(holiday => ({
          employeeId: employee._id,
          name: employee.name,
          email: employee.email,
          employeeCode: employee.employeeCode,
          holiday: {
            name: holiday?.name,
            date: holiday?.date,
            source: holiday?.source,
          },
        }));
      });

      setHolidayList(flattened);
    } catch (error) {
      console.error('Error fetching holiday list:', error);
      toast.error(error.message || 'Failed to fetch holiday list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidayList();
  }, [selectedDate]);

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-lg p-6 border border-light-border dark:border-dark-border shadow-lg">
      <div className="flex items-center gap-4 mb-4">
        <Calendar className="text-success w-6 h-6" />
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
          Employees on Holiday
        </h2>
      </div>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-light-text dark:text-dark-text">Loading...</span>
        </div>
      ) : holidayList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-light-text dark:text-dark-text">
            <thead className="bg-light-bg/50 dark:bg-dark-bg/50">
              <tr>
                <th className="px-4 py-2 font-medium">Employee ID</th>
                <th className="px-4 py-2 font-medium">Employee Name</th>
                <th className="px-4 py-2 font-medium">Employee Email</th>
                <th className="px-4 py-2 font-medium">Holiday</th>
                <th className="px-4 py-2 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {holidayList.map((employee, index) => {
                const source = employee.holiday?.source;
                const sourceLabel =
                  source === 'fixed'
                    ? 'Fixed'
                    : source === 'floating'
                      ? 'Floating'
                      : null;
                const sourceBadgeClass =
                  source === 'fixed'
                    ? 'bg-primary/10 text-primary'
                    : source === 'floating'
                      ? 'bg-success/10 text-success'
                      : 'bg-light-bg dark:bg-dark-bg opacity-70';
                const rowKey = `${employee.employeeId || 'unknown'}-${
                  employee.holiday?.name || ''
                }-${employee.holiday?.date || ''}-${index}`;
                return (
                  <tr
                    key={rowKey}
                    className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                  >
                    <td className="px-4 py-2">{employee.employeeCode || 'ID Pending'}</td>
                    <td className="px-4 py-2">{employee.name || 'N/A'}</td>
                    <td className="px-4 py-2">{employee.email || 'N/A'}</td>
                    <td className="px-4 py-2">{employee.holiday?.name || 'N/A'}</td>
                    <td className="px-4 py-2">
                      {sourceLabel ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${sourceBadgeClass}`}
                        >
                          {sourceLabel}
                        </span>
                      ) : (
                        <span className="opacity-70 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-light-text dark:text-dark-text opacity-70">
          No employees on holiday for the selected date.
        </p>
      )}
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

export default HolidayEmployees;
