import { Loader2, LogOut } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const CheckedOutEmployees = ({ selectedDate }) => {
  const [checkedOutList, setCheckedOutList] = useState([]);
  const [loading, setLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const formatDate = date => {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  };

  const formatTime = timeString => {
    if (!timeString || timeString === 'N/A') return 'N/A';
    try {
      return new Date(timeString).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'N/A';
    }
  };

  const calculateWorkingTime = (checkIn, checkOut) => {
    if (!checkIn || checkIn === 'N/A' || !checkOut || checkOut === 'N/A') {
      return 'N/A';
    }

    try {
      const checkInTime = new Date(checkIn).getTime();
      const checkOutTime = new Date(checkOut).getTime();
      const diff = Math.max(0, checkOutTime - checkInTime);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    } catch {
      return 'N/A';
    }
  };

  const fetchCheckedOutList = async () => {
    setLoading(true);
    try {
      const formattedDate = formatDate(selectedDate);
      const response = await fetch(`${BASE_URL}/attendance-summary/date?date=${formattedDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch attendance data.');

      const data = await response.json();
      const summary = data.summary || [];

      // Filter for checked-out employees:
      // - hasCheckInPunch=true (checked in)
      // - hasCheckOutPunch=true (already checked out)
      // - resolvedStatus is not leave/holiday. We intentionally do not
      //   exclude "absent" here because a short shift can still be a valid
      //   checked-out punch pair even if payroll later classifies it as absent.
      const checkedOut = summary.filter(
        emp =>
          emp.hasCheckInPunch &&
          emp.hasCheckOutPunch &&
          !['leave', 'holiday'].includes(emp.resolvedStatus)
      );

      setCheckedOutList(checkedOut);
    } catch (error) {
      console.error('Error fetching checked-out list:', error);
      toast.error(error.message || 'Failed to fetch checked-out list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchCheckedOutList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-lg p-6 border border-light-border dark:border-dark-border shadow-lg">
      <div className="flex items-center gap-4 mb-4">
        <LogOut className="text-success w-6 h-6" />
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
          Checked Out Employees
        </h2>
      </div>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-light-text dark:text-dark-text">Loading...</span>
        </div>
      ) : checkedOutList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-light-text dark:text-dark-text">
            <thead className="bg-light-bg/50 dark:bg-dark-bg/50">
              <tr>
                <th className="px-4 py-2 font-medium">Employee ID</th>
                <th className="px-4 py-2 font-medium">Employee Name</th>
                <th className="px-4 py-2 font-medium">Check-in Time</th>
                <th className="px-4 py-2 font-medium">Check-out Time</th>
                <th className="px-4 py-2 font-medium">Working Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {checkedOutList.map(employee => (
                <tr
                  key={`${employee.employeeId}_${employee.date}`}
                  className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="px-4 py-2">{employee.employeeCode || 'ID Pending'}</td>
                  <td className="px-4 py-2">{employee.employeeName || 'N/A'}</td>
                  <td className="px-4 py-2">{formatTime(employee.originalCheckInTime)}</td>
                  <td className="px-4 py-2">{formatTime(employee.originalCheckOutTime)}</td>
                  <td className="px-4 py-2 font-medium text-success">
                    {calculateWorkingTime(
                      employee.originalCheckInTime,
                      employee.originalCheckOutTime
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-light-text dark:text-dark-text opacity-70">
          No employees checked out for the selected date.
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

export default CheckedOutEmployees;
