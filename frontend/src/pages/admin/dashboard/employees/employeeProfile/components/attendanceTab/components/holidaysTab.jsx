import { Clock, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const formatUtils = {
  date: date => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  },
};

const LoadingState = () => (
  <div className="flex justify-center items-center min-h-[300px] bg-light-card/40 dark:bg-dark-card/40 rounded-lg border border-light-border dark:border-dark-border">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
    <span className="ml-3 text-light-text dark:text-dark-text">Loading records...</span>
  </div>
);

const NoDataState = ({ message = 'No holidays found for the selected period.' }) => (
  <div className="flex flex-col justify-center items-center min-h-[300px] bg-light-card/40 dark:bg-dark-card/40 rounded-lg border border-light-border dark:border-dark-border">
    <div className="bg-light-bg/30 dark:bg-dark-bg/30 p-6 rounded-full mb-4">
      <Clock className="w-12 h-12 text-light-text dark:text-dark-text opacity-70" />
    </div>
    <span className="text-light-text dark:text-dark-text font-medium mb-1">No Records Found</span>
    <span className="text-light-text dark:text-dark-text opacity-70 text-sm">{message}</span>
  </div>
);

const HolidaysTab = ({ employeeId, month, year, refreshTrigger }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = `${BASE_URL}/holidays/employee-on-holiday?employeeId=${employeeId}&month=${month}&year=${year}`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (response.status === 204) {
        setData([]);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch holiday data.');

      const result = await response.json();
      setData(result.holidays || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch holidays data.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, refreshTrigger]);

  if (loading) {
    return <LoadingState />;
  }

  if (!data.length) {
    return <NoDataState />;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-light-border dark:border-dark-border bg-light-card/40 dark:bg-dark-card/40">
      <table className="w-full" aria-label="Employee holiday records">
        <thead className="bg-light-bg/50 dark:bg-dark-bg/50">
          <tr className="text-light-text dark:text-dark-text">
            <th className="px-6 py-4 text-left">Employee Name</th>
            <th className="px-6 py-4 text-left">Email</th>
            <th className="px-6 py-4 text-left">Holiday Name</th>
            <th className="px-6 py-4 text-left">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-light-border dark:divide-dark-border">
          {data.map(employee =>
            employee.holiday.map(holiday => (
              <tr
                key={`${employee.employeeId}-${holiday._id}`}
                className="hover:bg-light-card/30 dark:hover:bg-dark-card/30 transition-colors duration-150"
              >
                <td className="px-6 py-4 text-light-text dark:text-dark-text">{employee.name}</td>
                <td className="px-6 py-4 text-light-text dark:text-dark-text">{employee.email}</td>
                <td className="px-6 py-4 text-light-text dark:text-dark-text font-medium">
                  {holiday.name}
                </td>
                <td className="px-6 py-4 text-light-text dark:text-dark-text">
                  {formatUtils.date(holiday.date)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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

export default HolidaysTab;
