import { ClockArrowDown, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const HalfDayEmployees = ({ startDate, endDate }) => {
  const [halfDayList, setHalfDayList] = useState([]);
  const [loading, setLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  // Helper function to format hours worked
  const formatHoursWorked = workHours => {
    // Convert microseconds to hours
    const hours = Math.floor(workHours / (1000 * 60 * 60));
    const minutes = Math.floor((workHours % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const fetchHalfDayList = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/attendance-summary/date?date=${startDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) {
        console.error('Response not OK:', response.status); // Debug log
        throw new Error('Failed to fetch half-day employees list.');
      }

      const data = await response.json();

      if (!data || !data.summary) {
        console.error('Invalid data structure:', data); // Debug log
        throw new Error("Invalid API response. Missing 'summary' field.");
      }

      // Filter employees with halfDay true and format their data
      const filteredHalfDays = data.summary
        .filter(entry => {
          return entry.halfDay === true;
        })
        .map(entry => ({
          date: new Date(entry.checkInTime).toLocaleDateString(),
          employeeName: entry.employeeName,
          employeeCode: entry.employeeCode,
          hoursWorked: formatHoursWorked(entry.workHours),
          checkInTime: new Date(entry.checkInTime).toLocaleTimeString(),
          checkOutTime: new Date(entry.checkOutTime).toLocaleTimeString(),
        }));

      setHalfDayList(filteredHalfDays);
    } catch (error) {
      console.error('Error fetching half-day employees list:', error);
      toast.error(error.message || 'Failed to fetch half-day employees list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchHalfDayList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-lg p-6 border border-light-border dark:border-dark-border shadow-lg">
      <div className="flex items-center gap-4 mb-4">
        <ClockArrowDown className="text-warning w-6 h-6" />
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
          Half-Day Employees
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-light-text dark:text-dark-text">Loading...</span>
        </div>
      ) : halfDayList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-light-text dark:text-dark-text">
            <thead className="bg-light-bg/50 dark:bg-dark-bg/50">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">Employee ID</th>
                <th className="px-4 py-2 font-medium">Check In</th>
                <th className="px-4 py-2 font-medium">Check Out</th>
                <th className="px-4 py-2 font-medium">Hours Worked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {halfDayList.map((entry, index) => (
                <tr
                  key={index}
                  className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="px-4 py-2">{entry.date}</td>
                  <td className="px-4 py-2">{entry.employeeName}</td>
                  <td className="px-4 py-2">{entry.employeeCode || 'ID Pending'}</td>
                  <td className="px-4 py-2">{entry.checkInTime}</td>
                  <td className="px-4 py-2">{entry.checkOutTime}</td>
                  <td className="px-4 py-2">{entry.hoursWorked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-light-text dark:text-dark-text opacity-70">
          No half-day records for the selected dates.
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

export default HalfDayEmployees;
