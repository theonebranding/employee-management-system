import 'react-toastify/dist/ReactToastify.css';

import {
  AlertCircle,
  Calendar,
  CalendarDays,
  Clock,
  Loader2,
  Star,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

const STATUS_BADGE_STYLE = {
  available: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20',
  redeemed: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20',
  expired: 'bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20',
};

const toIsoDateKey = value => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatHolidayDate = value => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const dayOfWeek = value => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'long' });
};

const HolidaysTab = ({ employeeId }) => {
  const [templates, setTemplates] = useState([]);
  const [creditGroups, setCreditGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/holidays/employees/${employeeId}/credits`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch holiday credits.');
      }
      const data = await response.json();
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setCreditGroups(Array.isArray(data.creditGroups) ? data.creditGroups : []);
    } catch (error) {
      console.error('Error fetching holiday credits:', error);
      toast.error(error.message || 'Failed to fetch holiday credits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchCredits();
    }
  }, [employeeId]);

  const handleCancelRedemption = async (creditId) => {
    if (!creditId) return;
    setCancellingId(creditId);
    try {
      const response = await fetch(
        `${BASE_URL}/holidays/credits/${creditId}/cancel-redemption`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel redemption.');
      }
      toast.success('Redemption cancelled successfully.');
      await fetchCredits();
    } catch (error) {
      toast.error(error.message || 'Failed to cancel redemption.');
    } finally {
      setCancellingId(null);
    }
  };

  const todayKey = useMemo(() => toIsoDateKey(new Date()), []);

  // Filter fixed templates
  const fixedTemplates = useMemo(() => {
    return templates.filter(t => t && t.type === 'fixed');
  }, [templates]);

  // Compute summary stats across all credits
  const summary = useMemo(() => {
    const stats = { available: 0, redeemed: 0, expired: 0 };
    for (const group of creditGroups) {
      const credits = Array.isArray(group.credits) ? group.credits : [];
      const templateHolidays = group.template?.holidays || [];
      
      credits.forEach((credit, idx) => {
        let holiday = templateHolidays.find(h => String(h._id) === String(credit.sourceHolidayId));
        if (!holiday && templateHolidays[idx]) {
          holiday = templateHolidays[idx];
        }
        
        const isExpired = credit.status === 'expired' || 
          (credit.status === 'available' && holiday?.date && toIsoDateKey(holiday.date) < todayKey);
        
        const statusToShow = isExpired ? 'expired' : credit.status;
        if (stats[statusToShow] !== undefined) {
          stats[statusToShow]++;
        }
      });
    }
    return stats;
  }, [creditGroups, todayKey]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="flex items-center space-x-3 px-4 py-2 bg-light-card dark:bg-dark-card border border-light-border/50 dark:border-dark-border/50 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-light-text dark:text-dark-text">Loading holiday details...</span>
        </div>
      </div>
    );
  }

  const renderFixedTemplateCard = template => {
    const holidays = Array.isArray(template.holidays) ? [...template.holidays] : [];
    holidays.sort((a, b) => new Date(a.date) - new Date(b.date));

    return (
      <div
        key={template._id}
        className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h4 className="text-md font-semibold text-light-text dark:text-dark-text">
                {template.name}
              </h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                Fixed · {template.year}
              </span>
            </div>
            {template.description && (
              <p className="text-xs text-light-text dark:text-dark-text opacity-70 mt-1">
                {template.description}
              </p>
            )}
          </div>
        </div>

        {holidays.length > 0 ? (
          <ul className="divide-y divide-light-border/50 dark:divide-dark-border/50">
            {holidays.map(holiday => (
              <li key={holiday._id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-light-text dark:text-dark-text font-medium truncate text-sm">
                    {holiday.name}
                  </span>
                </div>
                <div className="text-right flex flex-col sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-sm text-light-text dark:text-dark-text">
                    {formatHolidayDate(holiday.date)}
                  </span>
                  <span className="text-xs text-light-text/60 dark:text-dark-text/60">
                    {dayOfWeek(holiday.date)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-light-text/70 dark:text-dark-text/70">
            No holidays in this template.
          </p>
        )}
      </div>
    );
  };

  const renderFloatingCard = group => {
    const template = group.template || {};
    const credits = Array.isArray(group.credits) ? group.credits : [];
    const templateHolidays = template.holidays || [];

    return (
      <div
        key={template._id}
        className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h4 className="text-md font-semibold text-light-text dark:text-dark-text">
                {template.name}
              </h4>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                Floating · {template.year}
              </span>
            </div>
            {template.description && (
              <p className="text-xs text-light-text dark:text-dark-text opacity-70 mt-1">
                {template.description}
              </p>
            )}
          </div>
        </div>

        <ul className="divide-y divide-light-border/50 dark:divide-dark-border/50">
          {credits.map((credit, idx) => {
            let holiday = templateHolidays.find(h => String(h._id) === String(credit.sourceHolidayId));
            if (!holiday && templateHolidays[idx]) {
              holiday = templateHolidays[idx];
            }
            holiday = holiday || {};

            const isExpired = credit.status === 'expired' ||
              (credit.status === 'available' && holiday.date && toIsoDateKey(holiday.date) < todayKey);
            const statusToShow = isExpired ? 'expired' : credit.status;

            return (
              <li
                key={credit._id}
                className="py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-light-text dark:text-dark-text font-medium truncate text-sm">
                      {holiday.name || 'Floating credit'}
                    </p>
                    <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                      Original date: {formatHolidayDate(holiday.date)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${STATUS_BADGE_STYLE[statusToShow]}`}>
                    {statusToShow.charAt(0).toUpperCase() + statusToShow.slice(1)}
                  </span>

                  {statusToShow === 'redeemed' && (
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-light-text dark:text-dark-text">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        Redeemed: {formatHolidayDate(credit.redeemedOn)}
                      </span>
                      {holiday.date && toIsoDateKey(holiday.date) >= todayKey && (
                        <button
                          type="button"
                          onClick={() => handleCancelRedemption(credit._id)}
                          disabled={cancellingId === credit._id}
                          className="text-xs text-rose-500 hover:underline disabled:opacity-50 font-medium"
                        >
                          {cancellingId === credit._id ? 'Cancelling...' : 'Cancel Redemption'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const hasAnyAssignments = fixedTemplates.length > 0 || creditGroups.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <p className="text-2xl font-bold text-emerald-500">{summary.available}</p>
          <p className="text-xs text-light-text/70 dark:text-dark-text/70 mt-1 font-medium">Available Credits</p>
        </div>
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-center">
          <p className="text-2xl font-bold text-indigo-500">{summary.redeemed}</p>
          <p className="text-xs text-light-text/70 dark:text-dark-text/70 mt-1 font-medium">Redeemed Credits</p>
        </div>
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
          <p className="text-2xl font-bold text-rose-500">{summary.expired}</p>
          <p className="text-xs text-light-text/70 dark:text-dark-text/70 mt-1 font-medium">Expired Credits</p>
        </div>
      </div>

      {hasAnyAssignments ? (
        <div className="space-y-6">
          {/* Section 1: Fixed Templates */}
          {fixedTemplates.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">Fixed Holidays</h3>
              </div>
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {fixedTemplates.map(renderFixedTemplateCard)}
              </div>
            </section>
          )}

          {/* Section 2: Floating Templates */}
          {creditGroups.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">Floating Credits</h3>
              </div>
              <div className="grid gap-4 grid-cols-1">
                {creditGroups.map(renderFloatingCard)}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-light-card/30 dark:bg-dark-card/30 rounded-xl border border-light-border/50 dark:border-dark-border/50">
          <AlertCircle className="w-8 h-8 text-light-text/50 dark:text-dark-text/50 mb-3" />
          <p className="text-light-text dark:text-dark-text font-medium">No holiday templates assigned</p>
          <p className="text-light-text/60 dark:text-dark-text/60 text-sm mt-1">Holiday assignments will appear here</p>
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
