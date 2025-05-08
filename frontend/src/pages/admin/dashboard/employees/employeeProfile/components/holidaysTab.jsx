import 'react-toastify/dist/ReactToastify.css';

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  PartyPopper,
  Star,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const HolidaysTab = ({ employeeId }) => {
  const [selectedHolidays, setSelectedHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchSelectedHolidays = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/holidays/selected/${employeeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch selected holidays.');

      const data = await response.json();
      const sortedHolidays = (data.holidays || []).sort(
        (a, b) => new Date(a.date) - new Date(b.date)
      );
      setSelectedHolidays(sortedHolidays);
    } catch (error) {
      console.error('Error fetching selected holidays:', error);
      toast.error(error.message || 'Failed to fetch selected holidays.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSelectedHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const formatDate = date => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getHolidayStatus = date => {
    const holidayDate = new Date(date);
    const today = new Date();
    const diffTime = holidayDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { type: 'past', text: `${Math.abs(diffDays)} days ago` };
    if (diffDays === 0) return { type: 'today', text: 'Today' };
    if (diffDays === 1) return { type: 'upcoming', text: 'Tomorrow' };
    if (diffDays <= 30) return { type: 'upcoming', text: `In ${diffDays} days` };
    return { type: 'future', text: formatDate(date).split(',')[0] };
  };

  const filteredHolidays = selectedHolidays.filter(holiday => {
    const status = getHolidayStatus(holiday.date);
    if (activeFilter === 'all') return true;
    if (activeFilter === 'upcoming') return status.type === 'upcoming' || status.type === 'today';
    if (activeFilter === 'past') return status.type === 'past';
    return true;
  });

  const upcomingCount = selectedHolidays.filter(holiday =>
    ['upcoming', 'today'].includes(getHolidayStatus(holiday.date).type)
  ).length;

  const nextHoliday = selectedHolidays.find(
    holiday =>
      getHolidayStatus(holiday.date).type === 'upcoming' ||
      getHolidayStatus(holiday.date).type === 'today'
  );

  const getButtonClasses = isActive =>
    `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-primary text-white'
        : 'bg-light-card/40 dark:bg-dark-card/40 text-light-text dark:text-dark-text opacity-70 hover:bg-light-card/60 dark:hover:bg-dark-card/60'
    }`;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="flex items-center space-x-3 px-4 py-2 bg-light-card/50 dark:bg-dark-card/50 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-light-text dark:text-dark-text">
            Loading holidays...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <PartyPopper className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
              Selected Holidays
            </h3>
            <p className="text-sm text-light-text dark:text-dark-text opacity-70 mt-0.5">
              {selectedHolidays.length} holidays selected for the year • {upcomingCount} upcoming
            </p>
          </div>
        </div>
      </div>

      {nextHoliday && (
        <div className="p-5 rounded-xl bg-primary/30 border border-primary/30">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-medium text-light-text dark:text-dark-text">
                  Next Holiday
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-light-text dark:text-dark-text text-lg">
                  {nextHoliday.name}
                </h3>
                <span className="px-3 py-1 text-xs font-medium text-primary bg-primary/10 rounded-full">
                  {getHolidayStatus(nextHoliday.date).text}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-light-text dark:text-dark-text">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{formatDate(nextHoliday.date)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-2 pb-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={getButtonClasses(activeFilter === 'all')}
          aria-label="Show all holidays"
        >
          All
        </button>
        <button
          onClick={() => setActiveFilter('upcoming')}
          className={getButtonClasses(activeFilter === 'upcoming')}
          aria-label="Show upcoming holidays"
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveFilter('past')}
          className={getButtonClasses(activeFilter === 'past')}
          aria-label="Show past holidays"
        >
          Past
        </button>
      </div>

      {filteredHolidays.length > 0 ? (
        <div className="grid gap-4">
          {filteredHolidays.map(holiday => {
            const status = getHolidayStatus(holiday.date);

            return (
              <div
                key={holiday._id}
                className={`group p-5 rounded-xl border transition-all duration-200 ${
                  status.type === 'past'
                    ? 'bg-light-card/20 dark:bg-dark-card/20 border-light-border/30 dark:border-dark-border/30 hover:bg-light-card/30 dark:hover:bg-dark-card/30'
                    : status.type === 'today'
                      ? 'bg-success/20 border-success/30 hover:bg-success/30'
                      : 'bg-light-card/40 dark:bg-dark-card/40 border-light-border/50 dark:border-dark-border/50 hover:bg-light-card/60 dark:hover:bg-dark-card/60 hover:border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {status.type === 'past' ? (
                        <CheckCircle className="w-4 h-4 text-light-text dark:text-dark-text opacity-70" />
                      ) : status.type === 'today' ? (
                        <Star className="w-4 h-4 text-success" />
                      ) : (
                        <Star className="w-4 h-4 text-warning" />
                      )}
                      <h4
                        className={`font-medium ${
                          status.type === 'past'
                            ? 'text-light-text dark:text-dark-text opacity-70'
                            : status.type === 'today'
                              ? 'text-success'
                              : 'text-light-text dark:text-dark-text group-hover:text-primary transition-colors'
                        }`}
                      >
                        {holiday.name}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-2 text-light-text dark:text-dark-text">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">{formatDate(holiday.date)}</span>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                      status.type === 'past'
                        ? 'text-light-text dark:text-dark-text opacity-70 bg-light-bg/10 dark:bg-dark-bg/10'
                        : status.type === 'today'
                          ? 'text-success bg-success/10'
                          : 'text-primary bg-primary/10'
                    }`}
                  >
                    {status.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-light-card/40 dark:bg-dark-card/40 rounded-xl border border-light-border/50 dark:border-dark-border/50">
          <AlertCircle className="w-8 h-8 text-light-text dark:text-dark-text opacity-70 mb-3" />
          <p className="text-light-text dark:text-dark-text font-medium">
            No {activeFilter} holidays found
          </p>
          <p className="text-light-text dark:text-dark-text opacity-70 text-sm mt-1">
            {activeFilter === 'all'
              ? 'Selected holidays will appear here'
              : activeFilter === 'upcoming'
                ? 'You have no upcoming holidays in the next 30 days'
                : 'No past holidays to display'}
          </p>
        </div>
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

export default HolidaysTab;
