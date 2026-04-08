import { Loader2, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const AbsentEmployees = ({ startDate, endDate }) => {
  const [absentList, setAbsentList] = useState([]);
  const [loading, setLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  // Helper function to format the date to DD-MM-YYYY for API requests
  const formatDate = date => {
    if (date instanceof Date) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return date; // If the date is already formatted, return as is
  };

  const fetchAbsentList = async () => {
    setLoading(true);
    try {
      const formattedStartDate = formatDate(startDate);
      const formattedEndDate = formatDate(endDate);

      const response = await fetch(
        `${BASE_URL}/attendance-summary/absentee-list?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch absent list.');

      const { absentEmployees } = await response.json(); // Access the correct key

      setAbsentList(absentEmployees || []);
    } catch (error) {
      console.error('Error fetching absent list:', error);
      toast.error(error.message || 'Failed to fetch absent list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchAbsentList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-lg p-6 border border-light-border dark:border-dark-border shadow-lg">
      <div className="flex items-center gap-4 mb-4">
        <XCircle className="text-danger w-6 h-6" />
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
          Absent Employees
        </h2>
      </div>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-light-text dark:text-dark-text">Loading...</span>
        </div>
      ) : absentList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-light-text dark:text-dark-text">
            <thead className="bg-light-bg/50 dark:bg-dark-bg/50">
              <tr>
                <th className="px-4 py-2 font-medium">Employee Name</th>
                <th className="px-4 py-2 font-medium">Employee ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {absentList.map(employee => (
                <tr
                  key={employee._id}
                  className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="px-4 py-2">{employee.name || 'N/A'}</td>
                  <td className="px-4 py-2">{employee.employeeCode || 'ID Pending'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-light-text dark:text-dark-text opacity-70">
          No employees absent for the selected dates.
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

export default AbsentEmployees;
