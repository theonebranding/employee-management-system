import { Calendar, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const HolidayEmployees = ({ selectedDate }) => {
  const [holidayList, setHolidayList] = useState([]);
  const [loading, setLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchHolidayList = useCallback(async () => {
    setLoading(true);
    try {
      const date = selectedDate || new Date();
      const formattedDate =
        date instanceof Date
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
          : date;

      const response = await fetch(
        `${BASE_URL}/holidays/employee-on-holiday?date=${formattedDate}`,
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

      setHolidayList(holidays || []);
    } catch (error) {
      console.error('Error fetching holiday list:', error);
      toast.error(error.message || 'Failed to fetch holiday list.');
    } finally {
      setLoading(false);
    }
  }, [BASE_URL, selectedDate]);

  useEffect(() => {
    fetchHolidayList();
  }, [fetchHolidayList]);

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
          <table className="w-full text-left text-light-text dark:text-dark-text">
            <thead className="bg-light-bg/50 dark:bg-dark-bg/50">
              <tr>
                <th className="px-4 py-2 font-medium">Employee Name</th>
                <th className="px-4 py-2 font-medium">Employee Email</th>
                <th className="px-4 py-2 font-medium">Holiday</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {holidayList.map(employee => (
                <tr
                  key={employee.employeeId}
                  className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="px-4 py-2">{employee.name || 'N/A'}</td>
                  <td className="px-4 py-2">{employee.email || 'N/A'}</td>
                  <td className="px-4 py-2">{employee.holiday.name || 'N/A'}</td>
                </tr>
              ))}
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
