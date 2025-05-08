import { AlertCircle, Calendar, Clock, Loader2 } from 'lucide-react';
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
  time: timeStr => {
    if (!timeStr) return 'N/A';
    try {
      const dateObj = new Date(timeStr);
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid ISO time format:', timeStr);
        return 'Invalid Time';
      }
      dateObj.setUTCMinutes(dateObj.getUTCMinutes() + 330);
      return dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      console.error('Error parsing time:', error, timeStr);
      return 'Invalid Time';
    }
  },
};

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] bg-light-card/40 dark:bg-dark-card/40 rounded-xl border border-light-border/50 dark:border-dark-border/50">
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
    <span className="mt-3 text-light-text dark:text-dark-text font-medium text-lg">
      Loading Late Check-in Records...
    </span>
  </div>
);

const NoDataState = ({ message = 'No late check-ins found for the selected period.' }) => (
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

const LateCheckinsTab = ({ employeeId, month, year, refreshTrigger }) => {
  const [data, setData] = useState([]);
  const [totalLateCheckins, setTotalLateCheckins] = useState(0);
  const [loading, setLoading] = useState(true);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = `${BASE_URL}/late-checkins/deduction?employeeId=${employeeId}&month=${month}&year=${year}`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch late check-ins data.');

      const result = await response.json();
      setData(result.lateCheckInDetails || []);
      setTotalLateCheckins(result.totalLateCheckIns || 0);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch late check-ins data.');
      setData([]);
      setTotalLateCheckins(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, month, year, refreshTrigger]);

  if (loading) {
    return <LoadingState />;
  }

  if (!data.length) {
    return <NoDataState />;
  }

  return (
    <div className="bg-light-card/50 dark:bg-dark-card/50 rounded-xl border border-light-border/50 dark:border-dark-border/50 shadow-lg overflow-hidden">
      <div className="p-6 bg-light-bg/50 dark:bg-dark-bg/50 border-b border-light-border/50 dark:border-dark-border/50">
        <h2 className="text-xl font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Late Check-in Records
        </h2>
        <div className="flex items-center gap-4 mt-2">
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <span className="text-sm text-light-text dark:text-dark-text opacity-70">
                Total Late Check-ins
              </span>
              <p className="text-lg font-semibold text-primary">{totalLateCheckins}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table
          className="w-full text-light-text dark:text-dark-text"
          aria-label="Late check-in records"
        >
          <thead className="bg-light-bg/70 dark:bg-dark-bg/70">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-light-text dark:text-dark-text">
                Date
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-light-text dark:text-dark-text">
                Predefined Check-in (IST)
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-light-text dark:text-dark-text">
                Actual Check-in (IST)
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-light-text dark:text-dark-text">
                Late By
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light-border/50 dark:divide-dark-border/50">
            {data.map(record => (
              <tr
                key={record._id}
                className="hover:bg-light-card/40 dark:hover:bg-dark-card/40 transition-colors duration-200"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-light-text dark:text-dark-text opacity-70" />
                    <span className="text-light-text dark:text-dark-text font-medium">
                      {formatUtils.date(record.date)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-light-text dark:text-dark-text font-medium">
                      {formatUtils.time(record.predefinedCheckInTime)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-danger" />
                    <span className="text-light-text dark:text-dark-text font-medium">
                      {formatUtils.time(record.actualCheckInTime)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-danger" />
                    <span className="text-danger font-medium">{record.lateByMinutes} mins</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

export default LateCheckinsTab;
