import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  Loader2,
  Timer,
  UserCheck,
  UserX,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import LocationMap from '../../../../../../../../components/locationMap';

const formatUtils = {
  time: time => {
    if (!time || time === 'N/A') return 'N/A';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  },
  date: date => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  },
  recessDuration: milliseconds => {
    if (!milliseconds) return '0m 0s';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  },
  workingTime: minutes => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  },
  location: location => {
    if (!location || Object.keys(location).length === 0) return 'N/A';
    return `${location.latitude}, ${location.longitude}`;
  },
};

const getStatusIcon = status => {
  const icons = {
    Present: <UserCheck className="w-4 h-4" />,
    Absent: <UserX className="w-4 h-4" />,
    Late: <AlertCircle className="w-4 h-4" />,
    'On Leave': <Calendar className="w-4 h-4" />,
    'Half Day': <Calendar className="w-4 h-4" />,
  };
  return icons[status] || <AlertCircle className="w-4 h-4" />;
};

const getStatusColor = status => {
  const colors = {
    Present: 'bg-success/20 text-success border-success/30',
    Absent: 'bg-danger/20 text-danger border-danger/30',
    Late: 'bg-warning/20 text-warning border-warning/30',
    'On Leave': 'bg-info/20 text-info border-info/30',
    'Half Day': 'bg-secondary/20 text-secondary border-secondary/30',
  };
  return (
    colors[status] ||
    'bg-light-bg/20 dark:bg-dark-bg/20 text-light-text dark:text-dark-text opacity-70 border-light-border/30 dark:border-dark-border/30'
  );
};

const LoadingState = () => (
  <div className="flex justify-center items-center min-h-[300px] bg-light-card/40 dark:bg-dark-card/40 rounded-lg border border-light-border dark:border-dark-border">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
    <span className="ml-3 text-light-text dark:text-dark-text">Loading records...</span>
  </div>
);

const NoDataState = ({ message = 'No Records found for the selected period.' }) => (
  <div className="flex flex-col justify-center items-center min-h-[300px] bg-light-card/40 dark:bg-dark-card/40 rounded-lg border border-light-border dark:border-dark-border">
    <div className="bg-light-bg/30 dark:bg-dark-bg/30 p-6 rounded-full mb-4">
      <Clock className="w-12 h-12 text-light-text dark:text-dark-text opacity-70" />
    </div>
    <span className="text-light-text dark:text-dark-text font-medium mb-1">No Records Found</span>
    <span className="text-light-text dark:text-dark-text opacity-70 text-sm">{message}</span>
  </div>
);

const DailyAttendanceTab = ({ employeeId, month, year, refreshTrigger }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortDirection, setSortDirection] = useState('desc');
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationType, setLocationType] = useState('');

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchData = async () => {
    setLoading(true);
    try {
      const endpoint = `${BASE_URL}/attendance-summary/monthly?employeeId=${employeeId}&month=${month}&year=${year}`;
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch attendance data.');

      const result = await response.json();
      setData(result.records || []);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch attendance data.');
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
  }, [employeeId, month, year, refreshTrigger]);

  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const toggleSortDirection = () => {
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  };

  const handleLocationClick = (location, type) => {
    if (location && Object.keys(location).length > 0) {
      setSelectedLocation(location);
      setLocationType(type);
      setShowMapModal(true);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!data.length) {
    return <NoDataState />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-light-text dark:text-dark-text">
          Daily Attendance Records
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-light-text dark:text-dark-text opacity-70">
            {sortedData.length} Records Found
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-light-border dark:border-dark-border bg-light-card/40 dark:bg-dark-card/40 shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-light-bg/60 dark:bg-dark-bg/60">
              <tr className="text-light-text dark:text-dark-text">
                <th className="px-6 py-4 text-left">
                  <button
                    onClick={toggleSortDirection}
                    className="flex items-center gap-2 hover:text-primary transition-colors"
                    aria-label="Sort by date"
                  >
                    Date
                    {sortDirection === 'asc' ? (
                      <ChevronUp className="w-4 h-4 text-primary" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-primary" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left">Check-In</th>
                <th className="px-6 py-4 text-left">Check-In Location</th>
                <th className="px-6 py-4 text-left">Check-Out</th>
                <th className="px-6 py-4 text-left">Check-Out Location</th>
                <th className="px-6 py-4 text-left">Working Time</th>
                <th className="px-6 py-4 text-left">Recess Time</th>
                <th className="px-6 py-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light-border/50 dark:divide-dark-border/50">
              {sortedData.map(record => (
                <tr
                  key={record._id}
                  className="hover:bg-light-card/40 dark:hover:bg-dark-card/40 transition-colors duration-150"
                >
                  <td className="px-6 py-4 text-light-text dark:text-dark-text">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-light-text dark:text-dark-text opacity-70" />
                      {formatUtils.date(record.date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-light-text dark:text-dark-text">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-success" />
                      {formatUtils.time(record.checkInTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-light-text dark:text-dark-text">
                    {formatUtils.location(record.checkInLocation) === 'N/A' ? (
                      'N/A'
                    ) : (
                      <button
                        onClick={() =>
                          handleLocationClick(record.checkInLocation, 'checkIn', record)
                        }
                        className="text-primary hover:underline"
                        aria-label="View check-in location"
                      >
                        {formatUtils.location(record.checkInLocation)}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-light-text dark:text-dark-text">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-danger" />
                      {formatUtils.time(record.checkOutTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-light-text dark:text-dark-text">
                    {formatUtils.location(record.checkOutLocation) === 'N/A' ? (
                      'N/A'
                    ) : (
                      <button
                        onClick={() =>
                          handleLocationClick(record.checkOutLocation, 'checkOut', record)
                        }
                        className="text-primary hover:underline"
                        aria-label="View check-out location"
                      >
                        {formatUtils.location(record.checkOutLocation)}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 text-light-text dark:text-dark-text">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4 text-info" />
                      {formatUtils.workingTime(record.totalWorkingTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-light-text dark:text-dark-text">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-warning" />
                      {formatUtils.recessDuration(record.totalRecessDuration)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${getStatusColor(record.currentStatus)}`}
                      >
                        {getStatusIcon(record.currentStatus)}
                        {record.currentStatus}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showMapModal && selectedLocation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-light-bg dark:bg-dark-bg rounded-2xl p-6 w-full max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                {locationType === 'checkIn' ? 'Check-in' : 'Check-out'} Location
              </h2>
              <button
                onClick={() => setShowMapModal(false)}
                className="text-light-text dark:text-dark-text opacity-70 hover:text-light-text dark:hover:text-dark-text"
                aria-label="Close map modal"
              >
                ✕
              </button>
            </div>
            <LocationMap
              checkInLocation={locationType === 'checkIn' ? selectedLocation : {}}
              checkOutLocation={locationType === 'checkOut' ? selectedLocation : {}}
              isLocationPermissionGranted={true}
              requestLocation={() => {}}
              checkInTime={
                locationType === 'checkIn'
                  ? sortedData.find(r => r.checkInLocation === selectedLocation)?.checkInTime
                  : null
              }
              checkOutTime={
                locationType === 'checkOut'
                  ? sortedData.find(r => r.checkOutLocation === selectedLocation)?.checkOutTime
                  : null
              }
              deviceLocation={{}}
            />
          </div>
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

export default DailyAttendanceTab;
