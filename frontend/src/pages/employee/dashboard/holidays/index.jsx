import 'react-toastify/dist/ReactToastify.css';

import { Calendar, CalendarDays, Check, Clock, Lock, Star, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const BASE_URL = import.meta.env.VITE_BACKEND_URL;

// ---------------------------------------------------------------------------
// Date helpers — keep local-time formatting consistent across rows.
// `toIsoDateKey` returns YYYY-MM-DD using the calendar fields of the supplied
// date so we can compare against fixed-template dates regardless of timezone
// shifts when the API serializes dates as ISO strings.
// ---------------------------------------------------------------------------

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
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const dayOfWeek = value => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { weekday: 'long' });
};

// Surface the API error code as a targeted, user-friendly toast message.
const REDEEM_ERROR_MESSAGES = {
  REDEEM_DATE_SUNDAY: 'Cannot redeem on a Sunday.',
  REDEEM_DATE_FIXED_CLASH: 'That date is already a fixed holiday.',
  REDEEM_YEAR_MISMATCH: "Date must be in the credit's year.",
  REDEEM_DATE_ABSENT_OR_LEAVE: "You're already absent or on leave that day.",
  PAYROLL_LOCKED: 'Payroll for that month is locked.',
  CREDIT_STATUS_INVALID: 'This credit is not available for redemption.',
  CREDIT_NOT_OWNED: 'You do not own this holiday credit.',
  CREDIT_NOT_FOUND: 'This holiday credit was not found.',
};

const CANCEL_ERROR_MESSAGES = {
  PAYROLL_LOCKED: 'Payroll for that month is locked.',
  CREDIT_STATUS_INVALID: 'This credit is no longer redeemed.',
  CREDIT_NOT_OWNED: 'You do not own this holiday credit.',
  CREDIT_NOT_FOUND: 'This holiday credit was not found.',
};

const STATUS_BADGE_STYLE = {
  available: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20',
  redeemed: 'bg-primary/10 text-primary ring-1 ring-primary/20',
  expired: 'bg-gray-500/10 text-gray-500 dark:text-gray-400 ring-1 ring-gray-500/20',
  forfeited: 'bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20',
};

const Holidays = () => {
  const [templates, setTemplates] = useState([]);
  const [creditGroups, setCreditGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [redeemModal, setRedeemModal] = useState(null); // { credit, group, holiday }
  const [redeemDate, setRedeemDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Data fetch — single round-trip to the new templates endpoint.
  // -------------------------------------------------------------------------
  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/holidays/me/templates`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch holiday templates');
      }
      const data = await response.json();
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setCreditGroups(Array.isArray(data.creditGroups) ? data.creditGroups : []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch holidays.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // -------------------------------------------------------------------------
  // Derived data — separate fixed templates and build the fixed-date set used
  // by the redemption date picker to disable known clashes client-side.
  // -------------------------------------------------------------------------
  const fixedTemplates = useMemo(() => templates.filter(t => t && t.type === 'fixed'), [templates]);

  const floatingTemplates = useMemo(
    () => templates.filter(t => t && t.type === 'floating'),
    [templates]
  );

  // Map sourceHolidayId -> { name, date } for every floating template, so each
  // credit row can show the original holiday it came from.
  const floatingHolidayMap = useMemo(() => {
    const map = new Map();
    for (const template of floatingTemplates) {
      const holidays = Array.isArray(template.holidays) ? template.holidays : [];
      for (const holiday of holidays) {
        map.set(String(holiday._id), {
          name: holiday.name,
          date: holiday.date,
        });
      }
    }
    return map;
  }, [floatingTemplates]);

  const fixedDateKeys = useMemo(() => {
    const keys = new Set();
    for (const template of fixedTemplates) {
      const holidays = Array.isArray(template.holidays) ? template.holidays : [];
      for (const holiday of holidays) {
        const key = toIsoDateKey(holiday.date);
        if (key) keys.add(key);
      }
    }
    return keys;
  }, [fixedTemplates]);

  // -------------------------------------------------------------------------
  // Redemption modal lifecycle.
  // -------------------------------------------------------------------------
  const openRedeem = (credit, group) => {
    const holiday = floatingHolidayMap.get(String(credit.sourceHolidayId)) || {};
    setRedeemModal({ credit, group, holiday });
    setRedeemDate('');
  };

  const closeRedeem = () => {
    setRedeemModal(null);
    setRedeemDate('');
  };

  const submitRedeem = async event => {
    event.preventDefault();
    if (!redeemModal || !redeemDate) {
      toast.error('Please pick a date to redeem.');
      return;
    }

    // Client-side guards mirror the server rules so the user gets immediate
    // feedback. The server still performs the authoritative checks.
    const picked = new Date(`${redeemDate}T00:00:00`);
    if (Number.isNaN(picked.getTime())) {
      toast.error('Invalid date selection.');
      return;
    }
    if (picked.getDay() === 0) {
      toast.error(REDEEM_ERROR_MESSAGES.REDEEM_DATE_SUNDAY);
      return;
    }
    if (fixedDateKeys.has(redeemDate)) {
      toast.error(REDEEM_ERROR_MESSAGES.REDEEM_DATE_FIXED_CLASH);
      return;
    }
    if (picked.getFullYear() !== redeemModal.group.template.year) {
      toast.error(REDEEM_ERROR_MESSAGES.REDEEM_YEAR_MISMATCH);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${BASE_URL}/holidays/me/credits/${redeemModal.credit._id}/redeem`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ targetDate: redeemDate }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          REDEEM_ERROR_MESSAGES[data.code] || data.message || 'Failed to redeem credit.';
        toast.error(message);
        return;
      }
      toast.success('Holiday credit redeemed successfully.');
      closeRedeem();
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to redeem credit.');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Cancel-redemption flow. The "Cancel" link is always visible on redeemed
  // rows; the server returns PAYROLL_LOCKED if the redemption month is locked
  // and the toast surfaces that to the user.
  // -------------------------------------------------------------------------
  const cancelRedemption = async credit => {
    if (!credit?._id) return;
    try {
      const response = await fetch(
        `${BASE_URL}/holidays/me/credits/${credit._id}/cancel-redemption`,
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
        const message =
          CANCEL_ERROR_MESSAGES[data.code] || data.message || 'Failed to cancel redemption.';
        toast.error(message);
        return;
      }
      toast.success('Redemption cancelled. Credit returned to available pool.');
      await fetchData();
    } catch (error) {
      toast.error(error.message || 'Failed to cancel redemption.');
    }
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
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
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                {template.name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20">
                Fixed · {template.year}
              </span>
            </div>
            {template.description && (
              <p className="text-sm text-light-text dark:text-dark-text opacity-70 mt-1">
                {template.description}
              </p>
            )}
          </div>
        </div>

        {holidays.length > 0 ? (
          <ul className="divide-y divide-light-border dark:divide-dark-border">
            {holidays.map(holiday => (
              <li key={holiday._id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-light-text dark:text-dark-text font-medium truncate">
                    {holiday.name}
                  </span>
                </div>
                <div className="text-right flex flex-col sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-sm text-light-text dark:text-dark-text">
                    {formatHolidayDate(holiday.date)}
                  </span>
                  <span className="text-xs text-light-text dark:text-dark-text opacity-60">
                    {dayOfWeek(holiday.date)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-light-text dark:text-dark-text opacity-70">
            No holidays in this template.
          </p>
        )}
      </div>
    );
  };

  const renderFloatingCard = group => {
    const counts = group.counts || {
      available: 0,
      redeemed: 0,
      expired: 0,
      forfeited: 0,
    };
    const credits = Array.isArray(group.credits) ? group.credits : [];

    return (
      <div
        key={group.template._id}
        className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
                {group.template.name}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
                Floating · {group.template.year}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`px-2 py-1 rounded-full ${STATUS_BADGE_STYLE.available}`}>
              Available: {counts.available}
            </span>
            <span className={`px-2 py-1 rounded-full ${STATUS_BADGE_STYLE.redeemed}`}>
              Redeemed: {counts.redeemed}
            </span>
            <span className={`px-2 py-1 rounded-full ${STATUS_BADGE_STYLE.expired}`}>
              Expired: {counts.expired}
            </span>
            {counts.forfeited > 0 && (
              <span className={`px-2 py-1 rounded-full ${STATUS_BADGE_STYLE.forfeited}`}>
                Forfeited: {counts.forfeited}
              </span>
            )}
          </div>
        </div>

        {credits.length === 0 ? (
          <p className="text-sm text-light-text dark:text-dark-text opacity-70">
            No floating credits issued for this template.
          </p>
        ) : (
          <ul className="divide-y divide-light-border dark:divide-dark-border">
            {credits.map(credit => {
              const holiday = floatingHolidayMap.get(String(credit.sourceHolidayId)) || {};
              return (
                <li
                  key={credit._id}
                  className="py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CalendarDays className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-light-text dark:text-dark-text font-medium truncate">
                        {holiday.name || 'Floating credit'}
                      </p>
                      <p className="text-xs text-light-text dark:text-dark-text opacity-60">
                        Original date: {formatHolidayDate(holiday.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {credit.status === 'available' && (
                      <button
                        type="button"
                        onClick={() => openRedeem(credit, group)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Redeem
                      </button>
                    )}

                    {credit.status === 'redeemed' && (
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 text-sm text-light-text dark:text-dark-text">
                          <Clock className="w-4 h-4 text-primary" />
                          Redeemed: {formatHolidayDate(credit.redeemedOn)}
                        </span>
                        <button
                          type="button"
                          onClick={() => cancelRedemption(credit)}
                          className="text-sm text-rose-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {credit.status === 'expired' && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-light-text dark:text-dark-text opacity-50">
                        <Lock className="w-4 h-4" />
                        Expired
                      </span>
                    )}

                    {credit.status === 'forfeited' && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-light-text dark:text-dark-text opacity-50">
                        <Lock className="w-4 h-4" />
                        Forfeited
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Date picker bounds for the redemption modal.
  // -------------------------------------------------------------------------
  const todayKey = toIsoDateKey(new Date());

  const datePickerBounds = useMemo(() => {
    if (!redeemModal) return { min: todayKey, max: todayKey };
    const year = redeemModal.group.template.year;
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    // Clamp the lower bound to today so past dates within the credit's year
    // remain selectable only on the calendar UI but the form rejects them.
    const min = todayKey > yearStart ? todayKey : yearStart;
    return { min, max: yearEnd };
  }, [redeemModal, todayKey]);

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Holidays"
          icon={<Calendar className="w-6 h-6 text-light-text dark:text-dark-text" />}
          description="Your assigned fixed holidays and floating credit balance."
        />

        {loading && templates.length === 0 && creditGroups.length === 0 ? (
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border">
            <p className="text-light-text dark:text-dark-text opacity-70">
              Loading your holidays...
            </p>
          </div>
        ) : (
          <>
            {/* Section 1: Fixed Holidays (read-only) */}
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                  Fixed Holidays
                </h2>
              </div>

              {fixedTemplates.length === 0 ? (
                <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border">
                  <p className="text-sm text-light-text dark:text-dark-text opacity-70">
                    No fixed holiday templates are assigned to you.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  {fixedTemplates.map(renderFixedTemplateCard)}
                </div>
              )}
            </section>

            {/* Section 2: Floating Credits */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                  Floating Credits
                </h2>
              </div>

              {creditGroups.length === 0 ? (
                <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border">
                  <p className="text-sm text-light-text dark:text-dark-text opacity-70">
                    You have no floating holiday credits.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1">{creditGroups.map(renderFloatingCard)}</div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Redemption modal */}
      {redeemModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 w-full max-w-md ring-1 ring-light-border dark:ring-dark-border shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-light-text dark:text-dark-text">
                    Redeem Holiday Credit
                  </h2>
                  <p className="text-xs text-light-text dark:text-dark-text opacity-70">
                    {redeemModal.group.template.name} · {redeemModal.group.template.year}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeRedeem}
                className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg text-light-text dark:text-dark-text"
                aria-label="Close redeem modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitRedeem} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                  Target date
                </label>
                <input
                  type="date"
                  value={redeemDate}
                  onChange={e => setRedeemDate(e.target.value)}
                  min={datePickerBounds.min}
                  max={datePickerBounds.max}
                  required
                  className="w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg rounded-lg ring-1 ring-light-border dark:ring-dark-border focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text"
                />
                <ul className="text-xs text-light-text dark:text-dark-text opacity-70 list-disc pl-5 space-y-0.5">
                  <li>Sundays are not allowed.</li>
                  <li>Cannot match a fixed holiday already on your calendar.</li>
                  <li>Date must fall within {redeemModal.group.template.year}.</li>
                  <li>Past dates and locked payroll months are rejected.</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeRedeem}
                  className="px-4 py-2 text-sm rounded-lg ring-1 ring-light-border dark:ring-dark-border text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Redeeming...' : 'Confirm redemption'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick
        autoClose={2000}
      />
    </div>
  );
};

export default Holidays;
