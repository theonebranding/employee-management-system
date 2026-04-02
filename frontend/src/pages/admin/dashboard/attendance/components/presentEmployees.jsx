import 'react-toastify/dist/ReactToastify.css';

import { CheckCircle, Loader2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
const PresentEmployees = ({ startDate, endDate }) => {
  const [presentList, setPresentList] = useState([]);
  const [loading, setLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchPresentList = useCallback(async () => {
    setLoading(true);
    try {
      const formatDate = date => {
        if (!(date instanceof Date)) return date;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      };

      const formattedStartDate = formatDate(startDate);
      const formattedEndDate = formatDate(endDate);

      const response = await fetch(
        `${BASE_URL}/attendance-summary/present-list?startDate=${formattedStartDate}&endDate=${formattedEndDate}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch present list.');

      const { presentEmployees } = await response.json(); // Access correct key in the API response
      setPresentList(presentEmployees || []);
    } catch (error) {
      console.error('Error fetching present list:', error);
      toast.error(error.message || 'Failed to fetch present list.');
    } finally {
      setLoading(false);
    }
  }, [BASE_URL, endDate, startDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchPresentList();
    }
  }, [endDate, fetchPresentList, startDate]);

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-lg p-6 border border-light-border dark:border-dark-border shadow-lg">
      <div className="flex items-center gap-4 mb-4">
        <CheckCircle className="text-success w-6 h-6" />
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text">
          Present Employees
        </h2>
      </div>
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-3 text-light-text dark:text-dark-text">Loading...</span>
        </div>
      ) : presentList.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-light-text dark:text-dark-text">
            <thead className="bg-light-bg/50 dark:bg-dark-bg/50">
              <tr>
                <th className="px-4 py-2 font-medium">Employee Name</th>
                <th className="px-4 py-2 font-medium">Employee Email</th>
                <th className="px-4 py-2 font-medium">Employee ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border dark:divide-dark-border">
              {presentList.map(employee => (
                <tr
                  key={employee._id}
                  className="hover:bg-light-bg/50 dark:hover:bg-dark-bg/50 transition-colors"
                >
                  <td className="px-4 py-2">{employee.name || 'N/A'}</td>
                  <td className="px-4 py-2">{employee.email || 'N/A'}</td>
                  <td className="px-4 py-2">{employee._id || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-light-text dark:text-dark-text opacity-70">
          No employees present for the selected dates.
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

export default PresentEmployees;
