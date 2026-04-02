import 'react-toastify/dist/ReactToastify.css';

import { Calendar } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import { apiGet, apiPost } from '../../../../services/apiClient';

const toIsoDate = value => new Date(value).toISOString().split('T')[0];

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [customHolidays, setCustomHolidays] = useState([]);
  const [selectedHolidays, setSelectedHolidays] = useState([]);
  const [customHoliday, setCustomHoliday] = useState({ name: '', date: '' });
  const [loading, setLoading] = useState(false);
  const [myLocation, setMyLocation] = useState('GLOBAL');
  const [viewScope, setViewScope] = useState('MY_LOCATION');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const resolveLocationFilter = useMemo(() => {
    if (viewScope === 'GLOBAL') return 'GLOBAL';
    if (viewScope === 'ALL') return undefined;
    return myLocation || 'GLOBAL';
  }, [myLocation, viewScope]);

  const fetchMyLocation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/employee/my-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      setMyLocation(data?.employee?.location || 'GLOBAL');
    } catch {
      setMyLocation('GLOBAL');
    }
  };

  const fetchPredefinedHolidays = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/holidays/predefined', {
        location: resolveLocationFilter,
        year: yearFilter,
      });
      setHolidays(
        (data.holidays || []).map(item => ({
          ...item,
          date: toIsoDate(item.date),
        }))
      );
    } catch (error) {
      toast.error(error.message || 'Failed to fetch holidays.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedHolidays = async () => {
    try {
      const data = await apiGet('/holidays/selected');
      const selected = (data.holidays || []).map(item => ({
        ...item,
        date: toIsoDate(item.date),
      }));
      setSelectedHolidays(selected);
      setCustomHolidays(selected.filter(item => item.isCustom));
    } catch (error) {
      if (String(error.message || '').toLowerCase().includes('no selected holidays')) {
        setSelectedHolidays([]);
        setCustomHolidays([]);
      } else {
        toast.error(error.message || 'Failed to fetch selected holidays.');
      }
    }
  };

  useEffect(() => {
    fetchMyLocation();
    fetchSelectedHolidays();
  }, []);

  useEffect(() => {
    fetchPredefinedHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolveLocationFilter, yearFilter]);

  const toggleHolidaySelection = holiday => {
    const isPastDate = new Date(holiday.date) < new Date();
    if (isPastDate) {
      toast.error('You cannot select a holiday for a past date.');
      return;
    }

    if (selectedHolidays.some(item => item.name === holiday.name && item.date === holiday.date)) {
      setSelectedHolidays(
        selectedHolidays.filter(item => !(item.name === holiday.name && item.date === holiday.date))
      );
      return;
    }

    if (selectedHolidays.length >= 10) {
      toast.error('You can select a maximum of 10 holidays.');
      return;
    }

    setSelectedHolidays([...selectedHolidays, holiday]);
  };

  const updateSelectedHolidays = async () => {
    setLoading(true);
    try {
      const data = await apiPost('/holidays/select', {
        selectedHolidays,
        location: myLocation || 'GLOBAL',
      });
      toast.success(data.message || 'Holidays updated successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to update holidays.');
    } finally {
      setLoading(false);
    }
  };

  const addCustomHoliday = async () => {
    const { name, date } = customHoliday;
    if (!name || !date) {
      toast.error('Please provide both holiday name and date.');
      return;
    }

    if (new Date(date) < new Date()) {
      toast.error('You cannot add a holiday for a past date.');
      return;
    }

    try {
      const newCustomHoliday = { ...customHoliday, isCustom: true, location: myLocation || 'GLOBAL' };
      await apiPost('/holidays/select', {
        selectedHolidays: [...selectedHolidays, newCustomHoliday],
        location: myLocation || 'GLOBAL',
      });
      setCustomHolidays([...customHolidays, newCustomHoliday]);
      setSelectedHolidays([...selectedHolidays, newCustomHoliday]);
      setCustomHoliday({ name: '', date: '' });
      toast.success('Custom holiday added successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to add custom holiday.');
    }
  };

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Holidays"
          icon={<Calendar className="w-6 h-6 text-light-text dark:text-dark-text" />}
          description="Select holidays by location calendar and add custom ones."
        />

        <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 shadow-card ring-1 ring-light-border dark:ring-dark-border mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:items-end">
            <div className="w-full">
              <label className="block text-xs mb-1 text-light-text dark:text-dark-text opacity-70">
                Calendar Scope
              </label>
              <select
                value={viewScope}
                onChange={e => setViewScope(e.target.value)}
                className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text"
              >
                <option value="MY_LOCATION">My Location ({myLocation})</option>
                <option value="GLOBAL">Global</option>
                <option value="ALL">All Locations</option>
              </select>
            </div>

            <div className="w-full">
              <label className="block text-xs mb-1 text-light-text dark:text-dark-text opacity-70">
                Year
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={yearFilter}
                onChange={e => setYearFilter(Number(e.target.value || new Date().getFullYear()))}
                className="w-full p-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text"
              />
            </div>
          </div>
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border mb-6">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">Available Holidays</h3>
          {holidays.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-light-text dark:text-dark-text">
                <thead>
                  <tr>
                    <th className="text-left py-2">Holiday</th>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Location</th>
                    <th className="text-center py-2">Select</th>
                  </tr>
                </thead>
                <tbody>
                  {holidays.map(holiday => {
                    const isSelected = selectedHolidays.some(
                      item => item.name === holiday.name && item.date === holiday.date
                    );
                    const isPastDate = new Date(holiday.date) < new Date();
                    return (
                      <tr
                        key={`${holiday.name}-${holiday.date}-${holiday.location || 'GLOBAL'}`}
                        className={`hover:bg-light-bg dark:hover:bg-dark-bg ${
                          isPastDate ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <td className="py-2">{holiday.name}</td>
                        <td className="py-2">{new Date(holiday.date).toLocaleDateString()}</td>
                        <td className="py-2">{holiday.location || 'GLOBAL'}</td>
                        <td className="py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleHolidaySelection(holiday)}
                            disabled={isPastDate}
                            className="cursor-pointer text-primary focus:ring-primary"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-light-text dark:text-dark-text opacity-70">No holidays available.</p>
          )}
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border mb-6">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">Add Custom Holiday</h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input
              type="text"
              placeholder="Holiday Name"
              value={customHoliday.name}
              onChange={e => setCustomHoliday({ ...customHoliday, name: e.target.value })}
              className="p-2 w-full sm:w-1/2 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border rounded-lg focus:ring-1 focus:ring-primary"
            />
            <input
              type="date"
              value={customHoliday.date}
              onChange={e => setCustomHoliday({ ...customHoliday, date: e.target.value })}
              className="p-2 w-full sm:w-1/2 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border rounded-lg focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={addCustomHoliday}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark focus:ring focus:ring-primary-light transition-colors"
            >
              Add Custom Holiday
            </button>
          </div>

          {customHolidays.length > 0 && (
            <table className="w-full text-light-text dark:text-dark-text">
              <thead>
                <tr>
                  <th className="text-left py-2">Holiday</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {customHolidays.map((holiday, index) => (
                  <tr key={`${holiday.name}-${holiday.date}-${index}`}>
                    <td className="py-2">{holiday.name}</td>
                    <td className="py-2">{new Date(holiday.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-right">
          <button
            onClick={updateSelectedHolidays}
            disabled={loading}
            className={`px-6 py-3 bg-primary text-white rounded-lg font-medium shadow-card focus:outline-none focus:ring focus:ring-primary-light disabled:opacity-50 transition-colors ${
              loading ? 'cursor-not-allowed' : 'hover:bg-primary-dark'
            }`}
          >
            {loading ? 'Updating...' : 'Update My Holidays'}
          </button>
        </div>
      </div>
      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick
        autoClose={1200}
      />
    </div>
  );
};

export default Holidays;
