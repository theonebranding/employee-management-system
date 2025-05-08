/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable no-unused-vars */
import 'react-toastify/dist/ReactToastify.css';

import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  HelpCircle,
  Info,
  Loader2,
  Settings,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

// Conversion helper functions
const minutesToHours = minutes => {
  return minutes ? (parseInt(minutes) / 60).toString() : '';
};

const hoursToMinutes = hours => {
  return hours ? Math.round(parseFloat(hours) * 60).toString() : '';
};

const minutesToHoursDisplay = minutes => {
  if (!minutes && minutes !== 0) return { hours: '0 hrs', minutes: '0 mins' };
  const hours = Math.floor(minutes / 60);
  return {
    hours: `${hours} hrs`,
    minutes: `${minutes} mins`,
  };
};

const AdminAttendanceSettings = () => {
  const [settings, setSettings] = useState({
    lateByMinutes: '',
    totalWorkingHours: '',
    halfDayHours: '',
    minAbsentHours: '',
    maxLateCheckIns: '',
  });
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('settings');
  const [originalSettings, setOriginalSettings] = useState(null);
  const [showGuide, setShowGuide] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  // Fetch existing settings and convert specific fields from minutes to hours
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/admin/get-attendance-settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      const convertedSettings = {
        lateByMinutes: data.settings.lateByMinutes,
        totalWorkingHours: minutesToHours(data.settings.totalWorkingHours),
        halfDayHours: minutesToHours(data.settings.halfDayHours),
        minAbsentHours: minutesToHours(data.settings.minAbsentHours),
        maxLateCheckIns: data.settings.maxLateCheckIns,
      };
      setSettings(convertedSettings);
      setOriginalSettings(convertedSettings);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch attendance settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle input changes
  const handleChange = e => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  // Save settings, converting specific fields back to minutes
  const handleSave = async e => {
    e.preventDefault();
    setLoading(true);
    setSaveStatus('saving');

    const settingsToSave = {
      lateByMinutes: settings.lateByMinutes,
      totalWorkingHours: hoursToMinutes(settings.totalWorkingHours),
      halfDayHours: hoursToMinutes(settings.halfDayHours),
      minAbsentHours: hoursToMinutes(settings.minAbsentHours),
      maxLateCheckIns: settings.maxLateCheckIns,
    };

    try {
      const response = await fetch(`${BASE_URL}/admin/update-attendance-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(settingsToSave),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      const data = await response.json();
      toast.success(data.message || 'Settings updated successfully.');
      setSaveStatus('success');
      setOriginalSettings({ ...settings });
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      toast.error(error.message || 'Failed to update attendance settings.');
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Reset to original settings
  const handleReset = () => {
    if (originalSettings) {
      setSettings({ ...originalSettings });
      toast.info('Changes discarded. Settings reset to original values.');
    }
  };

  // Settings sections configuration
  const settingsSections = [
    {
      name: 'lateByMinutes',
      title: 'Late Check-in Threshold',
      description: 'Minutes after scheduled start time when an employee is marked late',
      icon: <Clock className="w-5 h-5 text-warning" />,
      help: 'This value determines how many minutes after their scheduled start time an employee can check in before being marked late.',
      placeholder: 'Enter minutes (e.g. 15)',
      unit: 'minutes',
      color: 'warning',
    },
    {
      name: 'totalWorkingHours',
      title: 'Full Day Working Hours',
      description: 'Total hours required to be counted as a complete workday',
      icon: <Calendar className="w-5 h-5 text-success" />,
      help: 'This defines how many hours an employee must work to be credited with a full day of work.',
      placeholder: 'Enter hours (e.g. 8)',
      unit: 'hours',
      color: 'success',
    },
    {
      name: 'halfDayHours',
      title: 'Half Day Minimum Hours',
      description: 'Minimum hours required to qualify for half-day attendance',
      icon: <Calendar className="w-5 h-5 text-info" />,
      help: 'If an employee works less than the full day hours but more than this threshold, they will be marked for a half day.',
      placeholder: 'Enter hours (e.g. 4)',
      unit: 'hours',
      color: 'info',
    },
    {
      name: 'minAbsentHours',
      title: 'Absent Threshold Hours',
      description: 'Hours below which an employee is marked as absent',
      icon: <AlertCircle className="w-5 h-5 text-danger" />,
      help: 'Employees working less than this number of hours will be marked as absent.',
      placeholder: 'Enter hours (e.g. 2)',
      unit: 'hours',
      color: 'danger',
    },
    {
      name: 'maxLateCheckIns',
      title: 'Maximum Late Check-ins',
      description: 'Number of allowed late check-ins per month before half-day salary deduction',
      icon: <Clock className="w-5 h-5 text-secondary" />,
      help: 'This sets how many times an employee can check in late per month. Exceeding this limit results in a half-day salary deduction.',
      placeholder: 'Enter number (e.g. 3)',
      unit: 'times',
      color: 'secondary',
    },
  ];

  return (
    <div className="relative p-6 min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-light-border dark:border-dark-border pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-3 rounded-lg">
              <Settings className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
                Attendance Settings
              </h1>
              <p className="text-light-text dark:text-dark-text opacity-70 mt-1">
                Configure how employee attendance is calculated and tracked
              </p>
            </div>
          </div>
          <div className="flex space-x-2"></div>
        </div>

        {loading && !settings.lateByMinutes ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={48} className="animate-spin text-primary mb-4" />
            <p className="text-light-text dark:text-dark-text opacity-70">
              Loading attendance settings...
            </p>
          </div>
        ) : activeTab === 'settings' ? (
          <form onSubmit={handleSave} className="space-y-8">
            {/* Quick Help Section */}
            <div className="mb-8 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-2 text-light-text dark:text-dark-text">
                    How These Settings Work
                  </p>
                  <p className="text-sm text-light-text dark:text-dark-text opacity-70 mb-2">
                    These values determine how the system categorizes employee attendance.
                  </p>
                  <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="text-sm text-primary hover:text-primary-dark flex items-center gap-1"
                  >
                    {showGuide ? 'Hide detailed guide' : 'View detailed guide'}
                    <HelpCircle size={14} />
                  </button>

                  {showGuide && (
                    <div className="mt-4 bg-light-bg dark:bg-dark-bg p-4 rounded-lg text-sm space-y-3">
                      <p className="font-medium text-primary">Attendance Status Determination:</p>
                      <div className="space-y-2 pl-2 text-light-text dark:text-dark-text">
                        <div className="flex items-start gap-2">
                          <div className="mt-1 w-2 h-2 rounded-full bg-success flex-shrink-0"></div>
                          <p>
                            <span className="font-medium text-light-text dark:text-dark-text">
                              Present:
                            </span>{' '}
                            Works ≥ {settings.totalWorkingHours} hrs, checks in before{' '}
                            {settings.lateByMinutes} mins
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="mt-1 w-2 h-2 rounded-full bg-warning flex-shrink-0"></div>
                          <p>
                            <span className="font-medium text-light-text dark:text-dark-text">
                              Late:
                            </span>{' '}
                            Works ≥ {settings.totalWorkingHours} hrs, checks in after{' '}
                            {settings.lateByMinutes} mins (≤ {settings.maxLateCheckIns} times/month)
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="mt-1 w-2 h-2 rounded-full bg-info flex-shrink-0"></div>
                          <p>
                            <span className="font-medium text-light-text dark:text-dark-text">
                              Half Day:
                            </span>{' '}
                            Works between {settings.halfDayHours} and {settings.totalWorkingHours}{' '}
                            hrs or exceeds {settings.maxLateCheckIns} late check-ins
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="mt-1 w-2 h-2 rounded-full bg-danger flex-shrink-0"></div>
                          <p>
                            <span className="font-medium text-light-text dark:text-dark-text">
                              Absent:
                            </span>{' '}
                            Works less than {settings.minAbsentHours} hrs
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Settings Fields */}
            <div className="grid gap-6 md:grid-cols-2">
              {settingsSections.map(section => (
                <div
                  key={section.name}
                  className={`bg-light-card dark:bg-dark-card p-5 rounded-xl border border-light-border dark:border-dark-border hover:border-${section.color}-500/50 transition-all group relative`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`bg-${section.color}/20 p-2 rounded-lg`}>{section.icon}</div>
                    <div>
                      <label className="block text-sm font-medium text-light-text dark:text-dark-text">
                        {section.title}
                      </label>
                      <p className="text-xs text-light-text dark:text-dark-text opacity-70 mt-1">
                        {section.description}
                      </p>
                    </div>
                    <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative group/help">
                        <HelpCircle
                          size={16}
                          className="text-light-text dark:text-dark-text opacity-50 hover:opacity-100 cursor-help"
                        />
                        <div className="absolute right-0 mt-1 w-64 bg-light-card dark:bg-dark-card p-3 rounded-lg shadow-lg border border-light-border dark:border-dark-border text-xs text-light-text dark:text-dark-text invisible group-hover/help:visible">
                          {section.help}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="relative">
                      <input
                        type="number"
                        name={section.name}
                        value={settings[section.name]}
                        onChange={handleChange}
                        className={`w-full py-3 px-4 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-${section.color} transition-all text-light-text dark:text-dark-text`}
                        placeholder={section.placeholder}
                        required
                        min="0"
                        step={
                          section.name === 'lateByMinutes' || section.name === 'maxLateCheckIns'
                            ? '1'
                            : '0.25'
                        }
                      />
                      <span className="absolute right-4 top-3 text-light-text dark:text-dark-text opacity-50 text-sm">
                        {section.unit}
                      </span>
                    </div>
                    {section.name !== 'maxLateCheckIns' && (
                      <p className="text-xs text-light-text dark:text-dark-text opacity-70 mt-1">
                        ={' '}
                        {
                          minutesToHoursDisplay(
                            section.name === 'lateByMinutes'
                              ? settings[section.name]
                              : hoursToMinutes(settings[section.name])
                          ).hours
                        }
                        {' / '}
                        {
                          minutesToHoursDisplay(
                            section.name === 'lateByMinutes'
                              ? settings[section.name]
                              : hoursToMinutes(settings[section.name])
                          ).minutes
                        }
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Example Scenarios */}
            <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl p-5 mt-8">
              <h3 className="font-medium text-lg mb-4 flex items-center gap-2 text-light-text dark:text-dark-text">
                <Calendar className="w-5 h-5 text-primary" />
                Example Scenarios
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 bg-light-bg dark:bg-dark-bg p-4 rounded-lg">
                    <h4 className="font-medium text-success mb-2 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-success"></div>
                      Present
                    </h4>
                    <div className="space-y-2 text-sm text-light-text dark:text-dark-text">
                      <p>• Check-in: Before {settings.lateByMinutes || '_'} mins</p>
                      <p>• Hours: ≥ {settings.totalWorkingHours || '_'} hrs</p>
                      <ArrowRight className="w-4 h-4 text-light-text dark:text-dark-text opacity-50 my-1" />
                      <p className="font-medium text-light-text dark:text-dark-text">
                        Result: Full day attendance
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 bg-light-bg dark:bg-dark-bg p-4 rounded-lg">
                    <h4 className="font-medium text-warning mb-2 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-warning"></div>
                      Late
                    </h4>
                    <div className="space-y-2 text-sm text-light-text dark:text-dark-text">
                      <p>• Check-in: After {settings.lateByMinutes || '_'} mins</p>
                      <p>• Hours: ≥ {settings.totalWorkingHours || '_'} hrs</p>
                      <p>• Late Check-ins: ≤ {settings.maxLateCheckIns || '_'} times</p>
                      <ArrowRight className="w-4 h-4 text-light-text dark:text-dark-text opacity-50 my-1" />
                      <p className="font-medium text-light-text dark:text-dark-text">
                        Result: Full day but marked late
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 bg-light-bg dark:bg-dark-bg p-4 rounded-lg">
                    <h4 className="font-medium text-info mb-2 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-info"></div>
                      Half Day
                    </h4>
                    <div className="space-y-2 text-sm text-light-text dark:text-dark-text">
                      <p>
                        • Hours: {settings.halfDayHours || '_'} -{' '}
                        {settings.totalWorkingHours || '_'} hrs
                      </p>
                      <p>• Or Late Check-ins: {settings.maxLateCheckIns || '_'} times</p>
                      <ArrowRight className="w-4 h-4 text-light-text dark:text-dark-text opacity-50 my-1" />
                      <p className="font-medium text-light-text dark:text-dark-text">
                        Result: Half day attendance
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 bg-light-bg dark:bg-dark-bg p-4 rounded-lg">
                    <h4 className="font-medium text-danger mb-2 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-danger"></div>
                      Absent
                    </h4>
                    <div className="space-y-2 text-sm text-light-text dark:text-dark-text">
                      <p>• Hours: {settings.minAbsentHours || '_'} hrs</p>
                      <ArrowRight className="w-4 h-4 text-light-text dark:text-dark-text opacity-50 my-1" />
                      <p className="font-medium text-light-text dark:text-dark-text">
                        Result: Absent
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save & Reset Buttons */}
            <div className="flex justify-end gap-4 mt-8">
              <button
                type="submit"
                className="px-6 py-2 rounded-lg font-medium transition flex items-center gap-2 bg-primary hover:bg-primary-dark text-white"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2 rounded-lg font-medium transition bg-light-card dark:bg-dark-card hover:bg-light-bg dark:hover:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border"
              >
                Reset
              </button>
            </div>
          </form>
        ) : null}

        <ToastContainer
          position="top-right"
          pauseOnHover={false}
          limit={1}
          autoClose={2000}
          toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        />
      </div>
    </div>
  );
};

export default AdminAttendanceSettings;
