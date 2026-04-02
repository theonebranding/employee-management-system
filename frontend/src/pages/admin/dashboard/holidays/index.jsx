import {
  AlertCircle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Loader2,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import { apiGet, apiPost } from '../../../../services/apiClient';

const DEFAULT_LOCATION = 'GLOBAL';
const DEFAULT_CALENDAR_CODE = 'INDIA-GLOBAL';

const AdminHolidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: '',
    location: DEFAULT_LOCATION,
    calendarCode: DEFAULT_CALENDAR_CODE,
  });
  const [locations, setLocations] = useState([DEFAULT_LOCATION]);
  const [locationFilter, setLocationFilter] = useState(DEFAULT_LOCATION);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchPredefinedHolidays = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/holidays/predefined', {
        location: locationFilter,
        year: yearFilter,
      });
      setHolidays(data.holidays || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch holidays.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const data = await apiGet('/holidays/locations');
      const values = data.locations?.length ? data.locations : [DEFAULT_LOCATION];
      setLocations(values);
      if (!values.includes(locationFilter)) {
        setLocationFilter(DEFAULT_LOCATION);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to fetch holiday locations.');
    }
  };

  const addPredefinedHoliday = async () => {
    if (!newHoliday.name || !newHoliday.date) {
      toast.error('Holiday name and date are required.');
      return;
    }

    try {
      setAdding(true);
      const payload = {
        holidays: [
          {
            name: newHoliday.name,
            date: newHoliday.date,
            location: newHoliday.location || DEFAULT_LOCATION,
            calendarCode: newHoliday.calendarCode || DEFAULT_CALENDAR_CODE,
          },
        ],
      };
      const data = await apiPost('/holidays/add-predefined-holidays', payload);

      toast.success(data.message || 'Holiday added successfully.');
      setNewHoliday({
        name: '',
        date: '',
        location: newHoliday.location || DEFAULT_LOCATION,
        calendarCode: newHoliday.calendarCode || DEFAULT_CALENDAR_CODE,
      });
      fetchPredefinedHolidays();
    } catch (error) {
      toast.error(error.message || 'Failed to add holiday.');
    } finally {
      setAdding(false);
    }
  };

  const deleteHoliday = async holidayId => {
    if (!window.confirm('Are you sure you want to delete this holiday?')) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/holidays/delete-predefined-holidays/${holidayId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to delete holiday.');

      const data = await response.json();
      toast.success(data.message || 'Holiday deleted successfully.');
      fetchPredefinedHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error(error.message || 'Failed to delete holiday.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async format => {
    try {
      setExporting(true);
      const query = new URLSearchParams({
        location: locationFilter,
        year: String(yearFilter),
        format,
      });
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/holidays/predefined/export?${query.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to export holidays.');
      }

      const blob = await response.blob();
      const extension = format === 'csv' ? 'csv' : 'json';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `holiday-export-${locationFilter.toLowerCase()}.${extension}`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Holiday export downloaded.');
    } catch (error) {
      toast.error(error.message || 'Failed to export holidays.');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const parsed = JSON.parse(text);
      const holidays = Array.isArray(parsed) ? parsed : parsed?.holidays;

      if (!Array.isArray(holidays) || holidays.length === 0) {
        throw new Error('Import file must contain a holidays array.');
      }

      const payload = {
        holidays: holidays.map(item => ({
          name: item.name,
          date: item.date,
          location: item.location || locationFilter || DEFAULT_LOCATION,
          calendarCode: item.calendarCode || DEFAULT_CALENDAR_CODE,
          isOptional: Boolean(item.isOptional),
        })),
      };

      const data = await apiPost('/holidays/predefined/import', payload);
      toast.success(
        `${data.message || 'Import completed'} • created ${data.createdCount || 0}, skipped ${data.skippedCount || 0}`
      );
      fetchLocations();
      fetchPredefinedHolidays();
    } catch (error) {
      toast.error(error.message || 'Failed to import holidays.');
    } finally {
      event.target.value = '';
      setImporting(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchPredefinedHolidays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationFilter, yearFilter]);

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <Header
          title="Manage Holidays"
          description="Add, view, and manage predefined holidays for your organization."
          icon={<Calendar className="w-8 h-8 text-primary" />}
        />

        <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-xs mb-1 text-light-text dark:text-dark-text opacity-75">
                View Location
              </label>
              <select
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
                className="w-full p-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text"
              >
                {locations.map(location => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1 text-light-text dark:text-dark-text opacity-75">
                Year
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={yearFilter}
                onChange={e => setYearFilter(Number(e.target.value || new Date().getFullYear()))}
                className="w-full p-2.5 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text"
              />
            </div>

            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="px-4 py-2.5 rounded-lg bg-info text-white hover:bg-info/90 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export JSON'}
            </button>

            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-4 py-2.5 rounded-lg bg-secondary text-white hover:bg-secondary/90 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>

            <label className="px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark cursor-pointer text-center">
              {importing ? 'Importing...' : 'Import JSON'}
              <input
                type="file"
                accept="application/json"
                onChange={handleImportFile}
                className="hidden"
                disabled={importing}
              />
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="ml-3 text-light-text dark:text-dark-text">Loading holidays...</span>
          </div>
        ) : (
          <>
            {/* Add Holiday Form - Moved to top for better UX */}
            <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border mb-8 shadow-lg">
              <h3 className="text-lg font-semibold text-light-text dark:text-dark-text mb-6 flex items-center gap-2">
                <PlusCircle className="w-6 h-6 text-success" />
                Add New Holiday
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                    Holiday Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newHoliday.name}
                      onChange={e => setNewHoliday({ ...newHoliday, name: e.target.value })}
                      className="w-full p-3 pl-10 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg 
                               focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                               placeholder:text-light-text dark:placeholder:text-dark-text placeholder:opacity-50 text-light-text dark:text-dark-text"
                      placeholder="Enter holiday name"
                      required
                    />
                    <CalendarDays className="w-5 h-5 text-light-text dark:text-dark-text opacity-50 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                    Holiday Date
                  </label>
                  <input
                    type="date"
                    value={newHoliday.date}
                    onChange={e => setNewHoliday({ ...newHoliday, date: e.target.value })}
                    className="w-full p-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg
                             focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-light-text dark:text-dark-text"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                    Location
                  </label>
                  <select
                    value={newHoliday.location}
                    onChange={e => setNewHoliday({ ...newHoliday, location: e.target.value })}
                    className="w-full p-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text"
                  >
                    {locations.map(location => (
                      <option key={location} value={location}>
                        {location}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                    Calendar Code
                  </label>
                  <input
                    type="text"
                    value={newHoliday.calendarCode}
                    onChange={e => setNewHoliday({ ...newHoliday, calendarCode: e.target.value })}
                    className="w-full p-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text"
                    placeholder="INDIA-GLOBAL"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={addPredefinedHoliday}
                  disabled={adding}
                  className={`px-6 py-3 bg-primary hover:bg-primary-dark rounded-lg
                             flex items-center gap-2 transition-colors duration-200
                             focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 
                             focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg text-white ${adding ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {adding ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {adding ? 'Adding...' : 'Add Holiday'}
                </button>
              </div>
            </div>

            {/* Enhanced Holidays Table */}
            <div className="bg-light-card dark:bg-dark-card rounded-xl border border-light-border dark:border-dark-border shadow-lg overflow-hidden">
              <div className="p-6 border-b border-light-border dark:border-dark-border">
                <h3 className="text-lg font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Predefined Holidays
                </h3>
              </div>

              {holidays.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
                      <tr>
                        <th className="text-left py-4 px-6 font-semibold">Holiday Name</th>
                        <th className="text-left py-4 px-6 font-semibold">Date</th>
                        <th className="text-left py-4 px-6 font-semibold">Location</th>
                        <th className="text-left py-4 px-6 font-semibold">Calendar</th>
                        <th className="text-center py-4 px-6 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                      {holidays.map(holiday => (
                        <tr
                          key={holiday._id}
                          className="hover:bg-light-bg dark:hover:bg-dark-bg transition-colors duration-200"
                        >
                          <td className="py-4 px-6 text-light-text dark:text-dark-text">
                            {holiday.name}
                          </td>
                          <td className="py-4 px-6 text-light-text dark:text-dark-text">
                            {new Date(holiday.date).toLocaleDateString(undefined, {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </td>
                          <td className="py-4 px-6 text-light-text dark:text-dark-text">
                            {holiday.location || 'GLOBAL'}
                          </td>
                          <td className="py-4 px-6 text-light-text dark:text-dark-text">
                            {holiday.calendarCode || 'INDIA-GLOBAL'}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex justify-center">
                              <button
                                onClick={() => deleteHoliday(holiday._id)}
                                className="p-2 bg-danger/20 hover:bg-danger/30 rounded-lg 
                                         text-danger transition-colors duration-200"
                                title="Delete Holiday"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-light-text dark:text-dark-text opacity-50 mx-auto mb-4" />
                  <p className="text-light-text dark:text-dark-text opacity-70 text-lg">
                    No holidays have been added yet.
                  </p>
                  <p className="text-light-text dark:text-dark-text opacity-50 mt-2">
                    Add your first holiday using the form above.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick
        autoClose={1500}
      />
    </div>
  );
};

export default AdminHolidays;
