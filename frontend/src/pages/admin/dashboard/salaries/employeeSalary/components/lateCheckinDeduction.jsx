import { Calendar, ClipboardList, DollarSign } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const LateCheckinDeduction = ({ employeeId, onDataFetched, month, year }) => {
  const [lateCheckinData, setLateCheckinData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deductions, setDeductions] = useState({
    lateCheckins: 0,
    totalDeduction: 0,
    finalSalary: 0,
  });

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const fetchLateCheckinDeductions = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/late-checkins/deduction?employeeId=${employeeId}&month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch late check-in deductions.');

      const data = await response.json();
      setLateCheckinData(data.lateCheckInDetails || []);

      setDeductions({
        lateCheckins: data.totalLateCheckIns || 0,
        totalDeduction: data.totalDeduction || 0,
        finalSalary: data.finalSalary || 0,
        totalLateCheckinDeduction: data.totalDeduction || 0,
      });
      onDataFetched(data.totalDeduction || 0);
    } catch (error) {
      console.error('Error fetching late check-in deductions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLateCheckinDeductions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, month, year]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-light-card/40 dark:bg-dark-card/40 rounded-xl border border-light-border  dark:border-dark-border ">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
              Late Check-in Deductions
            </h2>
            <div className="px-4 py-1 bg-primary/10 rounded-full text-primary text-sm">
              {months[month - 1]} {year}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-light-bg/50 dark:bg-dark-bg/50 rounded-xl p-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-info/10">
                <ClipboardList className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-light-text dark:text-dark-text opacity-70 mb-1">
                  Late Check-ins
                </p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  {deductions.lateCheckins}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-light-bg/50 dark:bg-dark-bg/50 rounded-xl p-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-danger/10">
                <DollarSign className="w-6 h-6 text-danger" />
              </div>
              <div>
                <p className="text-sm text-light-text dark:text-dark-text opacity-70 mb-1">
                  Total Deduction
                </p>
                <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                  ₹{deductions.totalDeduction.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-light-bg/50 dark:bg-dark-bg/50 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-light-text dark:text-dark-text">
              Late Check-in History
            </h3>
          </div>

          {lateCheckinData.length === 0 ? (
            <div className="text-center py-12 bg-light-card/50 dark:bg-dark-card/50 rounded-lg">
              <Calendar className="w-16 h-16 text-light-text dark:text-dark-text opacity-70 mx-auto mb-4" />
              <p className="text-light-text dark:text-dark-text opacity-70 text-lg">
                No late check-ins recorded for {months[month - 1]} {year}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-light-text dark:text-dark-text opacity-70">
                <thead className="bg-light-card/50 dark:bg-dark-card/50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Date</th>
                    <th className="px-4 py-3">Late By (mins)</th>
                    <th className="px-4 py-3">Predefined Check-in</th>
                    <th className="px-4 py-3 rounded-r-lg">Actual Check-in</th>
                  </tr>
                </thead>
                <tbody>
                  {lateCheckinData.map((entry, index) => (
                    <tr
                      key={index}
                      className="border-b border-light-border  dark:border-dark-border  hover:bg-light-card/50 dark:hover:bg-dark-card/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        {new Date(entry.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-danger/10 text-danger rounded-full">
                          {entry.lateByMinutes} mins
                        </span>
                      </td>
                      <td className="px-4 py-3">{entry.predefinedCheckInTime}</td>
                      <td className="px-4 py-3">
                        {new Date(entry.actualCheckInTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LateCheckinDeduction;
