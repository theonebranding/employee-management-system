/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable simple-import-sort/imports */
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';

import confetti from 'canvas-confetti';
import L from 'leaflet';
import { Clock, Coffee, FileText, LogIn, LogOut, StopCircle, Timer } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import { useLocation } from '../../../../context/locationContext';
import {
  enqueueAttendanceAction,
  flushAttendanceQueue,
  getAttendanceOfflineQueue,
} from '../../../../services/offlineAttendanceQueue';

import CheckoutModal from './components/checkoutModal';
import DailyReportModal from './components/dailyReportModal';
import HeaderSection from './components/headerSection';
import LocationMap from './components/locationMap';
import StatsCard from './components/statsCard';

const DAILY_REPORT_ACTION = 'daily-report';
const STATUS_CHECKED_IN = 'Checked In';
const STATUS_CHECKED_OUT = 'Checked Out';
const STATUS_IN_RECESS = 'In Recess';
const isBrowserOnline = () => (typeof window !== 'undefined' ? window.navigator.onLine : true);

const Attendance = () => {
  const [status, setStatus] = useState('');
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [totalRecessDuration, setTotalRecessDuration] = useState('0 minutes');
  const [totalWorkingTime, setTotalWorkingTime] = useState('0 minutes');
  const [liveWorkingTime, setLiveWorkingTime] = useState('0 minutes');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLate, setIsLate] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDailyReportModal, setShowDailyReportModal] = useState(false);
  const [dailyReportLoading, setDailyReportLoading] = useState(false);
  const [todayDailyReport, setTodayDailyReport] = useState(null);
  const [showCheckIn, setShowCheckIn] = useState(true);
  const [showBoth, setShowBoth] = useState(false);
  const [isOnline, setIsOnline] = useState(isBrowserOnline());
  const [pendingOfflineActions, setPendingOfflineActions] = useState(0);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const { location: deviceLocation, isLocationPermissionGranted, requestLocation } = useLocation();
  const [checkInLocation, setCheckInLocation] = useState({
    latitude: null,
    longitude: null,
  });
  const [checkOutLocation, setCheckOutLocation] = useState({
    latitude: null,
    longitude: null,
  });

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const employeeId = localStorage.getItem('_id');

  const checkInIcon = new L.Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const checkOutIcon = new L.Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const currentLocationIcon = new L.Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  const handleCheckoutConfirmation = () => {
    setShowModal(true);
  };

  const handleButtonClick = action => {
    if (action === 'checkout') {
      handleCheckoutConfirmation();
    } else if (action === DAILY_REPORT_ACTION) {
      handleOpenDailyReportModal();
    } else {
      handleAttendanceAction(action);
    }
  };

  const fetchTodayDailyReport = async () => {
    if (!employeeId) {
      setTodayDailyReport(null);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const query = new URLSearchParams({
      startDate: today,
      endDate: today,
      page: '1',
      limit: '1',
    });

    const response = await fetch(`${BASE_URL}/daily-reports/employee/${employeeId}?${query}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Failed to fetch daily report');
    }

    const data = await response.json();
    setTodayDailyReport(data.reports?.[0] || null);
  };

  const handleOpenDailyReportModal = async () => {
    setDailyReportLoading(true);
    try {
      await fetchTodayDailyReport();
      setShowDailyReportModal(true);
    } catch (error) {
      toast.error(error.message || 'Unable to open daily report');
    } finally {
      setDailyReportLoading(false);
    }
  };

  const handleSaveDailyReport = async reportText => {
    setDailyReportLoading(true);
    try {
      const hasExisting = Boolean(todayDailyReport?._id);
      const endpoint = hasExisting
        ? `${BASE_URL}/daily-reports/${todayDailyReport._id}`
        : `${BASE_URL}/daily-reports`;
      const method = hasExisting ? 'PATCH' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report: reportText }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Failed to save daily report');
      }

      const data = await response.json();
      setTodayDailyReport(data.dailyReport || null);
      toast.success(data.message || 'Daily report saved successfully');
      setShowDailyReportModal(false);
    } catch (error) {
      toast.error(error.message || 'Failed to save daily report');
    } finally {
      setDailyReportLoading(false);
    }
  };

  const handleDeleteDailyReport = async () => {
    if (!todayDailyReport?._id) return;

    setDailyReportLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/daily-reports/${todayDailyReport._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || 'Failed to delete daily report');
      }

      const data = await response.json();
      setTodayDailyReport(null);
      setShowDailyReportModal(false);
      toast.success(data.message || 'Daily report deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to delete daily report');
    } finally {
      setDailyReportLoading(false);
    }
  };

  const triggerConfetti = () => {
    const end = Date.now() + 3 * 1000;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
      // eslint-disable-next-line no-undef
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchAttendanceStatus = async () => {
    try {
      const response = await fetch(`${BASE_URL}/attendance/status`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch status');
      const { data } = await response.json();
      setStatus(data.status || 'No status available');
      setCheckInTime(data.checkInTime || null);
      setCheckOutTime(data.checkOutTime || null);
      setTotalRecessDuration(data.totalRecessDuration || '0 minutes');
      setTotalWorkingTime(data.totalWorkingTime || '0 minutes');
      setLiveWorkingTime(data.liveWorkingTime || '0 minutes');
      setIsLate(data.lateCheckIn || false);
      setCheckInLocation({
        latitude: data.checkInLocation?.latitude || null,
        longitude: data.checkInLocation?.longitude || null,
      });
      setCheckOutLocation({
        latitude: data.checkOutLocation?.latitude || null,
        longitude: data.checkOutLocation?.longitude || null,
      });
    } catch (error) {
      setStatus('No status available');
      setCheckInLocation({ latitude: null, longitude: null });
      setCheckOutLocation({ latitude: null, longitude: null });
      if (error.message === 'Error fetching current status') {
        toast.error('Failed to fetch attendance status.');
      } else {
        toast.info('No attendance status available for today, Please check in');
      }
    }
  };

  const refreshQueueCount = () => {
    setPendingOfflineActions(getAttendanceOfflineQueue().length);
  };

  const syncOfflineQueue = async () => {
    if (syncingQueue) return;
    if (!isBrowserOnline()) return;

    setSyncingQueue(true);
    try {
      const result = await flushAttendanceQueue({
        baseUrl: BASE_URL,
        token: localStorage.getItem('token'),
      });

      refreshQueueCount();

      if (result.processed > 0) {
        toast.success(`${result.processed} offline attendance action(s) synced`);
        await fetchAttendanceStatus();
      }

      if (result.failed > 0) {
        toast.warning(`${result.failed} action(s) still pending sync`);
      }
    } catch {
      toast.error('Failed to sync offline attendance queue');
    } finally {
      setSyncingQueue(false);
    }
  };

  const handleAttendanceAction = async (action, additionalPayload = {}) => {
    setLoading(true);
    requestLocation();

    await new Promise(resolve => {
      const checkLocation = setInterval(() => {
        if (deviceLocation.latitude && deviceLocation.longitude) {
          clearInterval(checkLocation);
          resolve();
        }
      }, 100);
    });

    if (!isLocationPermissionGranted || !deviceLocation.latitude || !deviceLocation.longitude) {
      toast.error('Location unavailable. Enable location services.');
      setLoading(false);
      return false;
    }

    const payload = {
      latitude: deviceLocation.latitude,
      longitude: deviceLocation.longitude,
      ...additionalPayload,
    };

    if (!isBrowserOnline()) {
      const queueLength = enqueueAttendanceAction(action, payload);
      setPendingOfflineActions(queueLength);
      toast.info(`${action.replace('-', ' ')} queued. It will sync when you are online.`);
      setLoading(false);
      return true;
    }

    try {
      const response = await fetch(`${BASE_URL}/attendance/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const { message } = await response.json();
        throw new Error(message || `Failed to ${action}`);
      }

      const { attendance, message, lateCheckIn } = await response.json();
      setStatus(attendance.currentStatus || 'No status available');
      setCheckInTime(attendance.checkInTime || null);
      setCheckOutTime(attendance.checkOutTime || null);
      setTotalRecessDuration(
        attendance.totalRecessDuration
          ? `${Math.floor(attendance.totalRecessDuration / 60000)} minutes`
          : '0 minutes'
      );
      setLiveWorkingTime(attendance.liveWorkingTime || '0 minutes');
      setTotalWorkingTime(
        attendance.checkOutTime && attendance.checkInTime
          ? `${Math.floor(
              (new Date(attendance.checkOutTime) -
                new Date(attendance.checkInTime) -
                (attendance.totalRecessDuration || 0)) /
                3600000
            )} hours ${Math.floor(
              ((new Date(attendance.checkOutTime) -
                new Date(attendance.checkInTime) -
                (attendance.totalRecessDuration || 0)) %
                3600000) /
                60000
            )} minutes`
          : '0 minutes'
      );
      toast.success(message || `${action} successful`);

      if (action === 'checkin' && attendance.lateCheckIn) {
        toast.warning(lateCheckIn || 'Late Check-in', { icon: '⚠️' });
      }

      if (action === 'checkin' || action === 'checkout') triggerConfetti();
      await fetchAttendanceStatus();
      return true;
    } catch (error) {
      console.error(`Error during ${action}:`, error.message);

      const isNetworkFailure =
        !isBrowserOnline() ||
        error.name === 'TypeError' ||
        /network|fetch|failed to fetch/i.test(error.message || '');

      if (isNetworkFailure) {
        const queueLength = enqueueAttendanceAction(action, payload);
        setPendingOfflineActions(queueLength);
        toast.info(`${action.replace('-', ' ')} queued due to network issue.`);
        return true;
      }

      toast.error(error.message || `Failed to ${action}.`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === STATUS_CHECKED_IN) {
      const interval = setInterval(fetchAttendanceStatus, 120000);
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    fetchAttendanceStatus();
    requestLocation();
    refreshQueueCount();
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isBrowserOnline()) {
      syncOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case STATUS_CHECKED_IN:
        return 'bg-success/20 text-success ring-1 ring-success/50';
      case STATUS_CHECKED_OUT:
        return 'bg-danger/20 text-danger ring-1 ring-danger/50';
      case STATUS_IN_RECESS:
        return 'bg-warning/20 text-warning ring-1 ring-warning/50';
      default:
        return 'bg-gray-500/20 text-gray-400 ring-1 ring-gray-500/50';
    }
  };

  const getActionButtonStyle = (action, disabled) => {
    if (disabled || loading)
      return 'bg-gray-300 text-black dark:bg-gray-500/50 dark:text-gray-200 cursor-not-allowed opacity-50';
    switch (action) {
      case 'checkin':
        return 'bg-success/10 text-success ring-1 ring-success/50 hover:bg-success/20';
      case 'checkout':
        return 'bg-danger/10 text-danger ring-1 ring-danger/50 hover:bg-danger/20';
      case 'start-recess':
        return 'bg-warning/10 text-warning ring-1 ring-warning/50 hover:bg-warning/20';
      case DAILY_REPORT_ACTION:
        return 'bg-info/10 text-info ring-1 ring-info/50 hover:bg-info/20';
      case 'end-recess':
        return 'bg-primary/10 text-primary ring-1 ring-primary/50 hover:bg-primary/20';
      default:
        return 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-card dark:hover:bg-dark-card';
    }
  };

  const isDisabled = buttonStatus => {
    if (buttonStatus === DAILY_REPORT_ACTION) {
      return loading || ![STATUS_CHECKED_IN, STATUS_IN_RECESS].includes(status);
    }

    if (loading) return true;
    if (status === STATUS_IN_RECESS)
      return !['end-recess', DAILY_REPORT_ACTION].includes(buttonStatus);
    if (status !== STATUS_CHECKED_IN && buttonStatus !== 'checkin') return true;
    if (buttonStatus === 'checkin' && status === STATUS_CHECKED_IN) return true;
    if (
      buttonStatus === 'checkout' &&
      (status === STATUS_CHECKED_OUT || status === STATUS_IN_RECESS)
    )
      return true;
    if (
      buttonStatus === 'start-recess' &&
      (status === STATUS_CHECKED_OUT || status === STATUS_IN_RECESS)
    )
      return true;
    if (buttonStatus === 'end-recess' && status !== STATUS_IN_RECESS) return true;
    return false;
  };

  const actionButtons = [
    { id: 'checkin', icon: LogIn, label: 'Check In' },
    { id: 'checkout', icon: LogOut, label: 'Check Out' },
    { id: 'start-recess', icon: Coffee, label: 'Start Break' },
    { id: DAILY_REPORT_ACTION, icon: FileText, label: 'Daily Report' },
    { id: 'end-recess', icon: StopCircle, label: 'End Break' },
  ];

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto space-y-6">
        <Header
          title="Attendance"
          description="Manage your attendance status and location."
          icon={<Clock className="w-8 h-8 text-light-text dark:text-dark-text" />}
        />

        <HeaderSection
          status={status}
          currentTime={currentTime}
          isLate={isLate}
          getStatusColor={getStatusColor}
        />

        <div className="rounded-xl p-3 bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border flex items-center justify-between gap-3">
          <div className="text-sm">
            <span className={`font-medium ${isOnline ? 'text-success' : 'text-warning'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            <span className="ml-2 text-light-text dark:text-dark-text opacity-70">
              Pending attendance sync: {pendingOfflineActions}
            </span>
          </div>
          <button
            onClick={syncOfflineQueue}
            disabled={!isOnline || syncingQueue || pendingOfflineActions === 0}
            className={`px-3 py-1.5 text-xs rounded-lg ${
              !isOnline || syncingQueue || pendingOfflineActions === 0
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 cursor-not-allowed'
                : 'bg-primary text-white'
            }`}
          >
            {syncingQueue ? 'Syncing...' : 'Sync now'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={LogIn}
            title="Check-in"
            value={checkInTime ? new Date(checkInTime).toLocaleString() : 'Not checked in'}
            colorClass="bg-success/10 ring-1 ring-success/30 text-success"
            subText={isLate ? 'Late Arrival' : ''}
          />
          <StatsCard
            icon={LogOut}
            title="Check-out"
            value={checkOutTime ? new Date(checkOutTime).toLocaleString() : 'Not checked out'}
            colorClass="bg-danger/10 ring-1 ring-danger/30 text-danger"
          />
          <StatsCard
            icon={Coffee}
            title="Break Time"
            value={totalRecessDuration}
            colorClass="bg-warning/10 ring-1 ring-warning/30 text-warning"
          />
          <StatsCard
            icon={Timer}
            title="Working Time"
            value={liveWorkingTime}
            colorClass="bg-primary/10 ring-1 ring-primary/30 text-primary"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {actionButtons.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => handleButtonClick(id)}
              disabled={isDisabled(id)}
              className={`p-4 rounded-xl transition-all duration-300 ${getActionButtonStyle(
                id,
                isDisabled(id)
              )} group flex flex-col items-center gap-3`}
            >
              <Icon className="w-6 h-6 transition-transform group-hover:scale-110" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>

        <LocationMap
          isLocationPermissionGranted={isLocationPermissionGranted}
          requestLocation={requestLocation}
          showCheckIn={showCheckIn}
          setShowCheckIn={setShowCheckIn}
          showBoth={showBoth}
          setShowBoth={setShowBoth}
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          checkInLocation={checkInLocation}
          checkOutLocation={checkOutLocation}
          deviceLocation={deviceLocation}
          checkInIcon={checkInIcon}
          checkOutIcon={checkOutIcon}
          currentLocationIcon={currentLocationIcon}
        />

        <CheckoutModal
          showModal={showModal}
          setShowModal={setShowModal}
          loading={loading}
          onSubmit={async () => {
            const isSuccessful = await handleAttendanceAction('checkout');
            return isSuccessful;
          }}
        />

        <DailyReportModal
          open={showDailyReportModal}
          onClose={() => setShowDailyReportModal(false)}
          initialReportText={
            todayDailyReport?.reportText === 'N/A' ? '' : todayDailyReport?.reportText
          }
          hasExistingReport={Boolean(todayDailyReport?._id)}
          loading={dailyReportLoading}
          onSave={handleSaveDailyReport}
          onDelete={handleDeleteDailyReport}
        />
      </div>
      <ToastContainer
        position="top-right"
        pauseOnHover={false}
        limit={1}
        autoClose={2000}
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
      />
    </div>
  );
};

export default Attendance;
