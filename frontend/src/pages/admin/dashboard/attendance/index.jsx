/* eslint-disable import/order */
import { addDays, format, parseISO, subDays } from 'date-fns';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Filter,
  Loader2,
  Timer,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import LocationMap from '../../../../components/locationMap';
import Header from '../../../../components/pageHeader';
import StatCard from '../home/components/statCard';
import AbsentEmployees from './components/absentEmployees';
import HalfDayEmployees from './components/halfDayEmployees';
import HolidayEmployees from './components/holidayEmployees';
import PresentEmployees from './components/presentEmployees';

const AdminAttendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationType, setLocationType] = useState('');

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceSummary = async date => {
    setLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const response = await fetch(`${BASE_URL}/attendance-summary/date?date=${formattedDate}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch attendance data.');

      const data = await response.json();
      const uniqueData = Array.from(
        new Map(data.summary.map(item => [item.employeeEmail, item])).values()
      );
      setAttendanceData(uniqueData);
      toast.success('Attendance data fetched successfully.');
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error(error.message || 'Failed to fetch attendance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceSummary(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusColor = status => {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'text-success bg-success/10';
      case 'absent':
        return 'text-danger bg-danger/10';
      case 'late':
        return 'text-warning bg-warning/10';
      case 'half day':
        return 'text-warning bg-info/10';
      default:
        return 'text-light-text dark:text-dark-text bg-light-bg/10 dark:bg-dark-bg/10';
    }
  };

  const formatLocation = location => {
    if (!location || Object.keys(location).length === 0) return 'N/A';
    return `${location.latitude}, ${location.longitude}`;
  };

  const handlePrevDay = () => {
    const newDate = subDays(selectedDate, 1);
    setSelectedDate(newDate);
    fetchAttendanceSummary(newDate);
  };

  const handleNextDay = () => {
    const newDate = addDays(selectedDate, 1);
    setSelectedDate(newDate);
    fetchAttendanceSummary(newDate);
  };

  const handleLocationClick = (location, type) => {
    if (location && Object.keys(location).length > 0) {
      setSelectedLocation(location);
      setLocationType(type);
      setShowMapModal(true);
    }
  };


  return (
    <div className="p-6 ml-8 min-h-screen pl-20 bg-light-bg dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Attendance Dashboard"
          description="Manage and view attendance records."
          icon={<Calendar className="w-8 h-8 text-primary" />}
        />
        <div className="mb-4 bg-primary/10 rounded-xl shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-xl font-bold text-light-text dark:text-dark-text">
                  {format(selectedDate, 'EEEE')}
                </h2>
                <p className="text-primary-light">{format(selectedDate, 'MMMM d, yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-light-bg/10 dark:bg-dark-bg/10 px-4 py-2 rounded-lg backdrop-blur-sm mt-2 md:mt-0">
              <Clock className="w-5 h-5 text-light-text dark:text-dark-text animate-pulse" />
              <span className="text-lg font-medium text-light-text dark:text-dark-text font-mono">
                {format(currentTime, 'HH:mm:ss')}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded-xl shadow-xl backdrop-blur-sm">
          {/* Header Section */}
          <div className="p-6 border-b border-light-border dark:border-dark-border">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
                    Attendance Dashboard
                  </h1>
                </div>
              </div>

              {/* StatCard Component */}
              <StatCard />
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Date Controls */}
            <div className="flex items-center justify-between p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
              <div className="flex items-center gap-4">
                <Filter className="w-5 h-5 text-primary" />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrevDay}
                    className="p-2 hover:bg-light-bg dark:hover:bg-dark-bg rounded-lg transition-colors"
                    aria-label="Previous day"
                  >
                    <ChevronLeft className="w-5 h-5 text-light-text dark:text-dark-text" />
                  </button>
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={e => {
                      const newDate = parseISO(e.target.value);
                      setSelectedDate(newDate);
                      fetchAttendanceSummary(newDate);
                    }}
                    className="px-3 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                  <button
                    onClick={handleNextDay}
                    className="p-2 hover:bg-light-bg dark:hover:bg-dark-bg rounded-lg transition-colors"
                    aria-label="Next day"
                  >
                    <ChevronRight className="w-5 h-5 text-light-text dark:text-dark-text" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => fetchAttendanceSummary(selectedDate)}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg font-Medium transition-all duration-200 flex items-center gap-2 focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg transform hover:scale-105"
                aria-label="Fetch attendance data"
              >
                <Clock className="w-4 h-4" />
                Fetch Attendance
              </button>
            </div>


            {/* Table */}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="ml-3 text-light-text dark:text-dark-text">
                  Loading attendance data...
                </span>
              </div>
            ) : attendanceData.length > 0 ? (
              <div className="rounded-lg border border-light-border dark:border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-light-bg/50 dark:bg-dark-bg/50 text-light-text dark:text-dark-text">
                      <tr>
                        <th className="px-6 py-4 font-medium">Employee ID</th>
                        <th className="px-6 py-4 font-medium">Employee Name</th>
                        <th className="px-6 py-4 font-medium">Check-in</th>
                        <th className="px-6 py-4 font-medium">Check-in Location</th>
                        <th className="px-6 py-4 font-medium">Check-out</th>
                        <th className="px-6 py-4 font-medium">Check-out Location</th>
                        <th className="px-6 py-4 font-medium">Work Hours</th>
                        <th className="px-6 py-4 font-medium">Break Time</th>
                        <th className="px-6 py-4 font-medium">Status</th>
                        <th className="px-6 py-4 font-medium">Late Check-in</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                      {attendanceData.map((record, index) => (
                        <tr
                          key={record._id}
                          className={`transition-all duration-200 ${
                            record.lateCheckIn ? 'bg-warning/20' : ''
                          } ${hoveredRow === index ? 'bg-light-bg/50 dark:bg-dark-bg/50' : 'hover:bg-light-bg/30 dark:hover:bg-dark-bg/30'}`}
                          onMouseEnter={() => setHoveredRow(index)}
                          onMouseLeave={() => setHoveredRow(null)}
                        >
                          {/* Employee Name & Email */}
                          <td className="px-6 py-4 text-light-text dark:text-dark-text">
                            {record.employeeCode || 'ID Pending'}
                          </td>
                          <td className="px-6 py-4">
                            <Link
                              to={`/admin/dashboard/employees/${record.employeeId}`}
                              className="font-medium text-light-text dark:text-dark-text hover:text-primary transition-colors"
                            >
                              {record.employeeName}
                            </Link>
                          </td>

                          {/* Check-in Time */}
                          <td className="px-6 py-4 text-light-text dark:text-dark-text">
                            {record.checkInTime !== 'N/A' ? (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-success" />
                                {format(parseISO(record.checkInTime), 'hh:mm a')}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </td>

                          {/* Check-in Location */}
                          <td className="px-6 py-4 text-light-text dark:text-dark-text">
                            {record.checkInLocation === 'N/A' || !record.checkInLocation ? (
                              'N/A'
                            ) : (
                              <button
                                onClick={() =>
                                  handleLocationClick(record.checkInLocation, 'checkIn')
                                }
                                className="text-primary hover:underline"
                                aria-label="View check-in location"
                              >
                                {formatLocation(record.checkInLocation)}
                              </button>
                            )}
                          </td>

                          {/* Check-out Time */}
                          <td className="px-6 py-4 text-light-text dark:text-dark-text">
                            {record.checkOutTime !== 'N/A' ? (
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-danger" />
                                {format(parseISO(record.checkOutTime), 'hh:mm a')}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </td>

                          {/* Check-out Location */}
                          <td className="px-6 py-4 text-light-text dark:text-dark-text">
                            {record.checkOutLocation === 'N/A' || !record.checkOutLocation ? (
                              'N/A'
                            ) : (
                              <button
                                onClick={() =>
                                  handleLocationClick(record.checkOutLocation, 'checkOut')
                                }
                                className="text-primary hover:underline"
                                aria-label="View check-out location"
                              >
                                {formatLocation(record.checkOutLocation)}
                              </button>
                            )}
                          </td>

                          {/* Work Hours */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Timer className="w-4 h-4 text-primary" />
                              <span className="text-light-text dark:text-dark-text">
                                {Math.floor(record.totalWorkTime / 60)}h {record.totalWorkTime % 60}
                                m
                              </span>
                            </div>
                          </td>

                          {/* Break Time */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Coffee className="w-4 h-4 text-warning" />
                              <span className="text-light-text dark:text-dark-text">
                                {Math.floor(record.totalRecessDuration / 3600000)}h{' '}
                                {Math.floor((record.totalRecessDuration % 3600000) / 60000)}m
                              </span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(record.currentStatus)}`}
                            >
                              {record.currentStatus || 'Unknown'}
                            </span>
                          </td>

                          {/* Late Check-in */}
                          <td className="px-6 py-4 text-light-text dark:text-dark-text">
                            {record.lateCheckIn ? (
                              <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-warning" />
                                <span>Yes</span>
                              </div>
                            ) : (
                              'No'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-light-text dark:text-dark-text opacity-70">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No attendance data available for the selected date.</p>
              </div>
            )}
          </div>
        </div>

        <PresentEmployees startDate={selectedDate} endDate={selectedDate} />
        <AbsentEmployees startDate={selectedDate} endDate={selectedDate} />
        <HalfDayEmployees startDate={selectedDate} endDate={selectedDate} />
        <HolidayEmployees selectedDate={selectedDate} />

        {/* Map Modal */}
        {showMapModal && selectedLocation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-light-bg dark:bg-dark-bg rounded-2xl p-6 w-full max-w-3xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                  {locationType === 'checkIn' ? 'Check-in' : 'Check-out'} Location
                </h2>
                <button
                  onClick={() => setShowMapModal(false)}
                  className="text-light-text dark:text-dark-text opacity-70 hover:text-primary"
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
                    ? attendanceData.find(r => r.checkInLocation === selectedLocation)?.checkInTime
                    : null
                }
                checkOutTime={
                  locationType === 'checkOut'
                    ? attendanceData.find(r => r.checkOutLocation === selectedLocation)
                        ?.checkOutTime
                    : null
                }
                deviceLocation={{}}
              />
            </div>
          </div>
        )}
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

export default AdminAttendance;
