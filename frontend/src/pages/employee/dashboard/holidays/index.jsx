import 'react-toastify/dist/ReactToastify.css';

import { Calendar } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const Holidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [customHolidays, setCustomHolidays] = useState([]);
  const [selectedHolidays, setSelectedHolidays] = useState([]);
  const [customHoliday, setCustomHoliday] = useState({ name: '', date: '' });
  const [loading, setLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  // Fetch predefined holidays
  const fetchPredefinedHolidays = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/holidays/predefined`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch predefined holidays');

      const data = await response.json();
      setHolidays(data.holidays || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error(error.message || 'Failed to fetch holidays.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user-selected holidays
  const fetchSelectedHolidays = async () => {
    try {
      const response = await fetch(`${BASE_URL}/holidays/selected`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch selected holidays');

      const data = await response.json();
      setSelectedHolidays(data.holidays || []);
      setCustomHolidays(data.holidays.filter(h => h.isCustom) || []);
    } catch (error) {
      console.error('Error fetching selected holidays:', error);
      toast.error(error.message || 'Failed to fetch selected holidays.');
    }
  };

  useEffect(() => {
    fetchPredefinedHolidays();
    fetchSelectedHolidays();
  }, []);

  // Handle holiday selection
  const toggleHolidaySelection = holiday => {
    const isPastDate = new Date(holiday.date) < new Date();
    if (isPastDate) {
      toast.error('You cannot select a holiday for a past date.');
      return;
    }

    if (selectedHolidays.some(h => h.name === holiday.name)) {
      setSelectedHolidays(selectedHolidays.filter(h => h.name !== holiday.name));
    } else if (selectedHolidays.length < 10) {
      setSelectedHolidays([...selectedHolidays, holiday]);
    } else {
      toast.error('You can select a maximum of 10 holidays.');
    }
  };

  // Update selected holidays API call
  const updateSelectedHolidays = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/holidays/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ selectedHolidays }),
      });

      if (!response.ok) throw new Error('Failed to update selected holidays');

      const data = await response.json();
      toast.success(data.message || 'Holidays updated successfully.');
    } catch (error) {
      console.error('Error updating holidays:', error);
      toast.error(error.message || 'Failed to update holidays.');
    } finally {
      setLoading(false);
    }
  };

  // Add custom holiday
  const addCustomHoliday = async () => {
    const { name, date } = customHoliday;

    if (!name || !date) {
      toast.error('Please provide both holiday name and date.');
      return;
    }

    const isPastDate = new Date(date) < new Date();
    if (isPastDate) {
      toast.error('You cannot add a holiday for a past date.');
      return;
    }

    try {
      const newCustomHoliday = { ...customHoliday, isCustom: true };

      const response = await fetch(`${BASE_URL}/holidays/select`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          selectedHolidays: [...selectedHolidays, newCustomHoliday],
        }),
      });

      if (!response.ok) throw new Error('Failed to add custom holiday');

      setCustomHolidays([...customHolidays, newCustomHoliday]);
      setSelectedHolidays([...selectedHolidays, newCustomHoliday]);
      setCustomHoliday({ name: '', date: '' });
      toast.success('Custom holiday added successfully.');
    } catch (error) {
      console.error('Error adding custom holiday:', error);
      toast.error(error.message || 'Failed to add custom holiday.');
    }
  };

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Header
          title="Holidays"
          icon={<Calendar className="w-6 h-6 text-light-text dark:text-dark-text" />}
          description="Select your holidays and add custom ones."
        />

        {/* Holiday Table */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border mb-6">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
            Available Holidays
          </h3>
          {holidays.length > 0 ? (
            <table className="w-full text-light-text dark:text-dark-text">
              <thead>
                <tr>
                  <th className="text-left py-2">Holiday</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-center py-2">Select</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map(holiday => {
                  const isSelected = selectedHolidays.some(h => h.name === holiday.name);
                  const isPastDate = new Date(holiday.date) < new Date();
                  return (
                    <tr
                      key={holiday.name}
                      className={`hover:bg-light-bg dark:hover:bg-dark-bg ${
                        isPastDate ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <td className="py-2">{holiday.name}</td>
                      <td className="py-2">{new Date(holiday.date).toLocaleDateString()}</td>
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
          ) : (
            <p className="text-light-text dark:text-dark-text opacity-70">No holidays available.</p>
          )}
        </div>

        {/* Custom Holiday Form */}
        <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border mb-6">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4">
            Add Custom Holiday
          </h3>
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

          {/* Custom Holidays Table */}
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
                  <tr key={index} className="hover:bg-light-bg dark:hover:bg-dark-bg">
                    <td className="py-2">{holiday.name}</td>
                    <td className="py-2">{new Date(holiday.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Update Holidays Button */}
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
        closeOnClick={true}
        autoClose={1000}
      />
    </div>
  );
};

export default Holidays;
