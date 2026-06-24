/* eslint-disable simple-import-sort/imports */
/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import 'leaflet/dist/leaflet.css';
import 'react-toastify/dist/ReactToastify.css';

import confetti from 'canvas-confetti';
import L from 'leaflet';
import { Clock, Coffee, LogIn, LogOut, StopCircle, Timer } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import { useLocation } from '../../../../context/locationContext';
import CheckoutModal from './components/checkoutModal';
import HeaderSection from './components/headerSection';
import LocationMap from './components/locationMap';
import StatsCard from './components/statsCard';

// Status string constants (avoid sonarjs/no-duplicate-string).
const STATUS_CHECKED_IN = 'Checked In';
const STATUS_CHECKED_OUT = 'Checked Out';
const STATUS_IN_RECESS = 'In Recess';

const formatDuration = ms => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours} hours ${minutes} minutes ${seconds} seconds`;
};

const getStatusColorHelper = status => {
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

const getIsDisabled = (buttonStatus, status, loading) => {
  if (loading) return true;
  if (status === STATUS_IN_RECESS) return buttonStatus !== 'end-recess';
  if (status !== STATUS_CHECKED_IN && buttonStatus !== 'checkin') return true;
  if (buttonStatus === 'checkin' && status === STATUS_CHECKED_IN) return true;
  if (buttonStatus === 'checkout' && (status === STATUS_CHECKED_OUT || status === STATUS_IN_RECESS))
    return true;
  if (
    buttonStatus === 'start-recess' &&
    (status === STATUS_CHECKED_OUT || status === STATUS_IN_RECESS)
  )
    return true;
  if (buttonStatus === 'end-recess' && status !== STATUS_IN_RECESS) return true;
  return false;
};

const calculateDisplayBreakTime = (
  status,
  recessStartTime,
  currentTime,
  totalRecessDurationMs,
  totalRecessDuration
) => {
  if (status === STATUS_IN_RECESS && recessStartTime) {
    const start = new Date(recessStartTime);
    if (!isNaN(start.getTime())) {
      const elapsedMs = currentTime - start;
      const totalMs = totalRecessDurationMs + elapsedMs;
      return formatDuration(totalMs);
    }
  }
  return totalRecessDurationMs > 0 ? formatDuration(totalRecessDurationMs) : totalRecessDuration;
};

// eslint-disable-next-line sonarjs/cognitive-complexity
const Attendance = () => {
  const navigate = useNavigate();
  const hasTriggeredAutoCheckout = useRef(false);
  const [status, setStatus] = useState('');
  const [checkInTime, setCheckInTime] = useState(null);
  const [checkOutTime, setCheckOutTime] = useState(null);
  const [totalRecessDuration, setTotalRecessDuration] = useState('0 minutes');
  const [totalRecessDurationMs, setTotalRecessDurationMs] = useState(0);
  const [recessStartTime, setRecessStartTime] = useState(null);
  const [totalWorkingTime, setTotalWorkingTime] = useState('0 minutes');
  const [liveWorkingTime, setLiveWorkingTime] = useState('0 minutes');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLate, setIsLate] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [showModal, setShowModal] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(true);
  const [showBoth, setShowBoth] = useState(false);
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
  const getActionLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        position =>
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }),
        error => {
          if (error.code === 1) reject(new Error('Location permission denied.'));
          else if (error.code === 2) reject(new Error('Location unavailable.'));
          else reject(new Error('Location request timed out.'));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

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
    setCountdown(10);
  };

  useEffect(() => {
    let timer;
    if (showModal && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (countdown === 0) {
      setShowModal(false);
      handleAttendanceAction('checkout');
    }
    return () => clearInterval(timer);
  }, [showModal, countdown]);

  const handleButtonClick = action => {
    if (action === 'checkout') {
      handleCheckoutConfirmation();
    } else {
      handleAttendanceAction(action);
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
      setTotalRecessDurationMs(data.totalRecessDurationMs || 0);
      setRecessStartTime(data.recessStartTime || null);
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
      setTotalRecessDurationMs(0);
      setRecessStartTime(null);
      setCheckInLocation({ latitude: null, longitude: null });
      setCheckOutLocation({ latitude: null, longitude: null });
      if (error.message === 'Error fetching current status') {
        toast.error('Failed to fetch attendance status.');
      } else {
        toast.info('No attendance status available for today, Please check in');
      }
    }
  };

  const notifyAttendanceUpdated = attendance => {
    const payload = {
      ts: Date.now(),
      employeeId: attendance?.employee,
      date: attendance?.date,
      currentStatus: attendance?.currentStatus,
    };

    try {
      window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: payload }));
    } catch (error) {
      // ignore in non-browser environments
    }

    try {
      localStorage.setItem('attendanceUpdated', JSON.stringify(payload));
    } catch (error) {
      // ignore storage failures
    }
  };

  const handleAttendanceAction = async action => {
    setLoading(true);
    let actionLocation;
    try {
      actionLocation = await getActionLocation();
    } catch (locationError) {
      toast.error(locationError.message || 'Location unavailable. Enable location services.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/attendance/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: actionLocation.latitude,
          longitude: actionLocation.longitude,
        }),
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
      setTotalRecessDurationMs(attendance.totalRecessDuration || 0);
      setRecessStartTime(attendance.recessStartTime || null);
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
      notifyAttendanceUpdated(attendance);
      await fetchAttendanceStatus();
    } catch (error) {
      console.error(`Error during ${action}:`, error.message);
      toast.error(error.message || `Failed to ${action}.`);

      if (
        action === 'checkout' &&
        (error.message || '')
          .toLowerCase()
          .includes('submit your daily work report before check-out')
      ) {
        sessionStorage.setItem(
          'dailyWorkRedirectMessage',
          'Please submit your daily work report to complete check-out.'
        );
        sessionStorage.setItem('pendingCheckoutAfterReport', '1');
        navigate('/employee/dashboard/daily-work?checkoutBlocked=1');
      }
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
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldAutoCheckout = params.get('autoCheckout') === '1';

    if (
      shouldAutoCheckout &&
      status === STATUS_CHECKED_IN &&
      !loading &&
      !hasTriggeredAutoCheckout.current
    ) {
      hasTriggeredAutoCheckout.current = true;
      sessionStorage.removeItem('pendingCheckoutAfterReport');
      navigate('/employee/dashboard/attendance', { replace: true });
      handleAttendanceAction('checkout');
    }
  }, [status, loading, navigate]);

  const getStatusColor = () => getStatusColorHelper(status);

  const isDisabled = buttonStatus => getIsDisabled(buttonStatus, status, loading);

  const displayBreakTime = calculateDisplayBreakTime(
    status,
    recessStartTime,
    currentTime,
    totalRecessDurationMs,
    totalRecessDuration
  );

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={LogIn}
            title="Check-in"
            value={checkInTime ? new Date(checkInTime).toLocaleString() : 'Not checked in'}
            colorClass="bg-success text-white ring-1 ring-success/50 hover:bg-success/90 shadow-sm"
            subText={checkInTime ? (isLate ? 'Late Arrival' : 'Checked In') : 'Pending'}
            subTextColorClass={
              checkInTime
                ? isLate
                  ? 'bg-warning/15 text-warning ring-warning/30'
                  : 'bg-success/15 text-success ring-success/30'
                : 'bg-gray-500/15 text-gray-500 ring-gray-500/30 dark:text-gray-400 dark:ring-gray-400/30'
            }
            onClick={() => handleButtonClick('checkin')}
            disabled={isDisabled('checkin')}
          />
          <StatsCard
            icon={LogOut}
            title="Check-out"
            value={checkOutTime ? new Date(checkOutTime).toLocaleString() : 'Not checked out'}
            colorClass="bg-danger text-white ring-1 ring-danger/50 hover:bg-danger/90 shadow-sm"
            subText={checkOutTime ? 'Checked Out' : checkInTime ? 'In Progress' : 'Pending'}
            subTextColorClass={
              checkOutTime
                ? 'bg-danger/15 text-danger ring-danger/30'
                : checkInTime
                  ? 'bg-primary/15 text-primary ring-primary/30'
                  : 'bg-gray-500/15 text-gray-500 ring-gray-500/30 dark:text-gray-400 dark:ring-gray-400/30'
            }
            onClick={() => handleButtonClick('checkout')}
            disabled={isDisabled('checkout')}
          />
          <StatsCard
            icon={status === 'In Recess' ? StopCircle : Coffee}
            title="Break Time"
            value={displayBreakTime}
            colorClass="bg-warning text-slate-900 ring-1 ring-warning/50 hover:bg-warning/90 shadow-sm"
            subText={
              status === 'In Recess'
                ? 'On Break'
                : totalRecessDurationMs > 0
                  ? 'Break Taken'
                  : 'No Breaks'
            }
            subTextColorClass={
              status === 'In Recess'
                ? 'bg-warning/15 text-warning ring-warning/30'
                : 'bg-gray-500/15 text-gray-500 ring-gray-500/30 dark:text-gray-400 dark:ring-gray-400/30'
            }
            onClick={() =>
              handleButtonClick(status === 'In Recess' ? 'end-recess' : 'start-recess')
            }
            disabled={isDisabled(status === 'In Recess' ? 'end-recess' : 'start-recess')}
          />
          <StatsCard
            icon={Timer}
            title="Working Time"
            value={liveWorkingTime}
            colorClass="bg-primary/10 ring-1 ring-primary/30 text-primary"
            subText={
              status === STATUS_CHECKED_IN
                ? 'Tracking Live'
                : status === 'In Recess'
                  ? 'Paused'
                  : status === 'Checked Out'
                    ? 'Completed'
                    : 'Inactive'
            }
            subTextColorClass={
              status === STATUS_CHECKED_IN
                ? 'bg-success/15 text-success ring-success/30'
                : status === 'In Recess'
                  ? 'bg-warning/15 text-warning ring-warning/30'
                  : 'bg-gray-500/15 text-gray-500 ring-gray-500/30 dark:text-gray-400 dark:ring-gray-400/30'
            }
          />
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
          countdown={countdown}
          setCountdown={setCountdown}
          handleAttendanceAction={handleAttendanceAction}
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
