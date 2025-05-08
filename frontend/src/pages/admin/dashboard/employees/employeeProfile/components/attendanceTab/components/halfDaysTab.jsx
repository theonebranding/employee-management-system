import { Calendar, Clock, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const formatDateToDDMMYYYY = input => {
  let date;

  if (typeof input === 'string') {
    date = new Date(input);
  } else if (input instanceof Date) {
    date = input;
  } else {
    return input;
  }

  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] bg-light-card/40 dark:bg-dark-card/40 rounded-xl border border-light-border/50 dark:border-dark-border/50">
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
    <span className="mt-3 text-light-text dark:text-dark-text font-medium text-lg">
      Loading Half-Day Records...
    </span>
  </div>
);

const NoDataState = ({ message = 'No Half Days found for the selected period.' }) => (
  <div className="flex flex-col items-center justify-center min-h-[300px] bg-light-card/40 dark:bg-dark-card/40 rounded-xl border border-light-border/50 dark:border-dark-border/50">
    <div className="bg-light-bg/30 dark:bg-dark-bg/30 p-5 rounded-full mb-4">
      <Clock className="w-10 h-10 text-light-text dark:text-dark-text opacity-70" />
    </div>
    <span className="text-light-text dark:text-dark-text font-semibold text-xl">
      No Records Available
    </span>
    <span className="text-light-text dark:text-dark-text opacity-70 text-sm mt-2">{message}</span>
  </div>
);

const HalfDaysTab = ({ employeeId, startDate, endDate, refreshTrigger }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchData = async () => {
    setLoading(true);
    try {
      const formattedStartDate = formatDateToDDMMYYYY(startDate);
      const formattedEndDate = formatDateToDDMMYYYY(endDate);

      const endpoint = `${BASE_URL}/attendance-summary/employee-halfdays-list?employeeId=${employeeId}&startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch half days data.');

      const result = await response.json();
      setData(result.halfDayDetails || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch half days data.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, startDate, endDate, refreshTrigger]);

  if (loading) {
    return <LoadingState />;
  }

  if (!data.length) {
    return <NoDataState />;
  }

  return (
    <div className="bg-light-card/50 dark:bg-dark-card/50 backdrop-blur-sm rounded-xl border border-light-border/50 dark:border-dark-border/50 shadow-lg overflow-hidden">
      <div className="p-6 bg-light-bg/50 dark:bg-dark-bg/50 border-b border-light-border/50 dark:border-dark-border/50">
        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Half-Day Records
        </h2>
        <p className="text-sm text-light-text dark:text-dark-text opacity-70 mt-1">
          Showing {data.length} half-day entries for the selected period
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-light-text dark:text-dark-text">
          <thead className="bg-light-bg/70 dark:bg-dark-bg/70">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-light-text dark:text-dark-text">
                Date
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-light-text dark:text-dark-text">
                Hours Worked
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light-border/50 dark:divide-dark-border/50">
            {data.map((record, index) => (
              <tr
                key={index}
                className="hover:bg-light-card/40 dark:hover:bg-dark-card/40 transition-colors duration-200"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-light-text dark:text-dark-text opacity-70" />
                    <span className="text-light-text dark:text-dark-text font-medium">
                      {record.formattedDate}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-light-text dark:text-dark-text font-medium">
                      {parseFloat(record.hoursWorked).toFixed(2)} Hours
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HalfDaysTab;
