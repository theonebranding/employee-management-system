import { Clock, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const CheckedInEmployees = ({ selectedDate }) => {
  const [checkedInList, setCheckedInList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const formatDate = (date) => {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  };

  const formatTime = (timeString) => {
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

  const fetchCheckedInList = async () => {
    setLoading(true);
    try {
      const formattedDate = formatDate(selectedDate);
      const response = await fetch(
        `${BASE_URL}/attendance-summary/date?date=${formattedDate}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch attendance data.');

      const data = await response.json();
      const summary = data.summary || [];

      // Filter for checked-in employees:
      // - hasCheckInPunch=true (original checkInTime exists before masking)
      // - hasCheckOutPunch=false (no checkout yet, still in office)
      const checkedIn = summary.filter(
        (emp) => emp.hasCheckInPunch && !emp.hasCheckOutPunch
      );

      setCheckedInList(checkedIn);
    } catch (error) {
      console.error('Error fetching checked-in list:', error);
      toast.error(error.message || 'Failed to fetch checked-in list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchCheckedInList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  useEffect(() => {
    const timerId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const getRemainingToPresentSeconds = (employee) => {
    const threshold = Number(employee.fullDayThresholdMinutes || 470);
    if (!employee.originalCheckInTime || employee.originalCheckInTime === 'N/A') {
      return threshold * 60;
    }

    const checkInMs = new Date(employee.originalCheckInTime).getTime();
    if (Number.isNaN(checkInMs)) {
      return Number(employee.remainingToPresentMinutes || threshold) * 60;
    }

    const elapsedSeconds = Math.max(Math.floor((now - checkInMs) / 1000), 0);
    return Math.max(threshold * 60 - elapsedSeconds, 0);
  };

  const getRemainingToHalfSeconds = (employee) => {
    const threshold = Number(employee.halfDayThresholdMinutes || employee.halfDayThreshold || 240);
    if (!employee.originalCheckInTime || employee.originalCheckInTime === 'N/A') {
      return threshold * 60;
    }

    const checkInMs = new Date(employee.originalCheckInTime).getTime();
    if (Number.isNaN(checkInMs)) {
      return Number(employee.remainingToHalfMinutes || threshold) * 60;
    }

    const elapsedSeconds = Math.max(Math.floor((now - checkInMs) / 1000), 0);
    return Math.max(threshold * 60 - elapsedSeconds, 0);
  };

  const formatRemainingStatus = (employee) => {
    const toPresent = getRemainingToPresentSeconds(employee);
    const toHalf = getRemainingToHalfSeconds(employee);

    if (toPresent <= 0) return 'Present threshold reached';
    if (toHalf <= 0) return 'Half Day threshold reached';

    // Prefer showing half-day when it's nearer than full-day
    if (toHalf <= toPresent) {
      const h = Math.floor(toHalf / 3600);
      const m = Math.floor((toHalf % 3600) / 60);
      const s = toHalf % 60;
      return `Half Day in ${h}h ${m}m ${s}s`;
    }

    const hours = Math.floor(toPresent / 3600);
    const minutes = Math.floor((toPresent % 3600) / 60);
    const seconds = toPresent % 60;
    return `Present in ${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-lg p-6 border border-light-border dark:border-dark-border shadow-lg">
      <div className="flex items-center gap-4 mb-4">
        <Clock className="text-primary w-6 h-6" />
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
          Checked In Employees
        </h2>
      </div>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-light-text dark:text-dark-text">Loading...</span>
        </div>
      ) : checkedInList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-light-text dark:text-dark-text">
            <thead className="bg-light-bg/50 dark:bg-dark-bg/50">
              <tr>
                <th className="px-4 py-2 font-medium">Employee ID</th>
                <th className="px-4 py-2 font-medium">Employee Name</th>
                <th className="px-4 py-2 font-medium">Check-in Time</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {checkedInList.map((employee) => (
                <tr
                  key={`${employee.employeeId}_${employee.date}`}
                  className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="px-4 py-2">{employee.employeeCode || 'ID Pending'}</td>
                  <td className="px-4 py-2">{employee.employeeName || 'N/A'}</td>
                  <td className="px-4 py-2">{formatTime(employee.originalCheckInTime)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getRemainingToPresentSeconds(employee) <= 0
                          ? 'bg-green-100 text-green-700'
                          : getRemainingToHalfSeconds(employee) <= 0
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {formatRemainingStatus(employee)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-light-text dark:text-dark-text opacity-70">
          No employees checked in for the selected date.
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

export default CheckedInEmployees;
