import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { CheckCircle, FileText, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import { useAuth } from '../../../../context/authContext';
import { useTheme } from '../../../../context/themeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend
);

// IST helpers ----------------------------------------------------------------
// Attendance dates from the API are UTC ISO strings. The dashboard needs the
// matching IST day, weekday, and week-of-month so the chart buckets line up
// with how employees experience the calendar.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const toIstParts = iso => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth() + 1, // 1-12
    day: ist.getUTCDate(), // 1-31
    weekday: ist.getUTCDay(), // 0 = Sun ... 6 = Sat
  };
};

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const computeStats = (records, monthIndex, year) => {
  // Bucket per-day working minutes for the active month, keyed by IST day-of-month.
  const minutesByDay = new Map();
  let totalWorkingMinutes = 0;
  let presentDays = 0;
  let halfDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let absentDays = 0;
  let workingDayCount = 0; // present + half + leave (paid) -- cap denominator

  for (const record of records) {
    const parts = toIstParts(record.date);
    if (!parts) continue;
    if (parts.month !== monthIndex || parts.year !== year) continue;

    const minutes = Number(record.totalWorkingTime || 0);
    totalWorkingMinutes += minutes;
    minutesByDay.set(parts.day, (minutesByDay.get(parts.day) || 0) + minutes);

    switch (record.status) {
      case 'full-day':
        presentDays += 1;
        workingDayCount += 1;
        break;
      case 'half-day':
        halfDays += 1;
        workingDayCount += 1;
        break;
      case 'leave':
        leaveDays += 1;
        workingDayCount += 1;
        break;
      case 'holiday':
        holidayDays += 1;
        break;
      case 'absent':
        absentDays += 1;
        break;
      default:
        break;
    }
  }

  // Daily working hours for the *current ISO week*: anchor at the most recent
  // Monday and walk forward seven days. Days outside the active month or
  // without an attendance record render as zero.
  const todayParts = toIstParts(new Date().toISOString()) || {
    year,
    month: monthIndex,
    day: 1,
    weekday: 1,
  };
  const today = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));
  // Day-of-week starting Monday (0..6).
  const todayDow = (todayParts.weekday + 6) % 7;
  const weekStart = new Date(today.getTime());
  weekStart.setUTCDate(weekStart.getUTCDate() - todayDow);

  const dailyHoursThisWeek = WEEK_LABELS.map((_, idx) => {
    const cursor = new Date(weekStart.getTime());
    cursor.setUTCDate(cursor.getUTCDate() + idx);
    const sameMonth = cursor.getUTCFullYear() === year && cursor.getUTCMonth() + 1 === monthIndex;
    if (!sameMonth) return 0;
    const minutes = minutesByDay.get(cursor.getUTCDate()) || 0;
    return Number((minutes / 60).toFixed(2));
  });

  const totalHoursThisWeek = Number(
    dailyHoursThisWeek.reduce((sum, hours) => sum + hours, 0).toFixed(2)
  );
  const activeDaysThisWeek = dailyHoursThisWeek.filter(h => h > 0).length;

  // Weekly buckets across the calendar month (1-7, 8-14, 15-21, 22-end).
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const weekRanges = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, daysInMonth],
  ];
  const weeklyHours = weekRanges.map(([start, end]) => {
    let minutes = 0;
    for (let day = start; day <= end; day += 1) {
      minutes += minutesByDay.get(day) || 0;
    }
    return Number((minutes / 60).toFixed(2));
  });
  const weeklyLabels = weekRanges.map(([start, end], idx) => `Week ${idx + 1} (${start}-${end})`);

  // Attendance percentage = (present + half*0.5) / countable days, where
  // countable days = present + half + absent. Leaves/holidays are excluded
  // from both numerator and denominator so they don't penalize the score.
  const attendanceDenominator = presentDays + halfDays + absentDays;
  const monthlyAttendancePct = attendanceDenominator
    ? Math.round(((presentDays + halfDays * 0.5) / attendanceDenominator) * 100)
    : 0;

  return {
    dailyHoursThisWeek,
    weeklyHours,
    weeklyLabels,
    totalHoursThisWeek,
    activeDaysThisWeek,
    monthlyAttendancePct,
    totals: {
      presentDays,
      halfDays,
      leaveDays,
      holidayDays,
      absentDays,
      workingDayCount,
      totalWorkingMinutes,
    },
  };
};

const ERROR_BORDER_CLASS = 'border-red-500 focus:ring-red-500';
const NORMAL_BORDER_CLASS = 'border-light-border dark:border-dark-border focus:ring-primary';

const DashboardHome = () => {
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const lineChartInstanceRef = useRef(null);
  const barChartInstanceRef = useRef(null);
  const { theme } = useTheme();
  const { setIsProfileComplete } = useAuth();

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const employeeId = localStorage.getItem('_id');

  const now = useMemo(() => new Date(), []);
  const monthIndex = now.getMonth() + 1;
  const year = now.getFullYear();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const IST_OFFSET_MINUTES = 330;
  const toIstInputDate = dateValue => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
    return shifted.toISOString().split('T')[0];
  };

  // Profile completion wizard states
  const [profileLoading, setProfileLoading] = useState(true);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    bankName: '',
    branchName: '',
    bankAccountNumber: '',
    ifscCode: '',
    aadharNumber: '',
    panNumber: '',
    dateofBirth: '',
    address: '',
    state: '',
    city: '',
    district: '',
    pinCode: '',
  });
  const [profileErrors, setProfileErrors] = useState({});
  const [submittingProfile, setSubmittingProfile] = useState(false);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!employeeId) return;
      try {
        const response = await fetch(`${BASE_URL}/employee/my-profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        const emp = data.employee || {};

        const currentData = {
          bankName: emp.bankName || '',
          branchName: emp.branchName || '',
          bankAccountNumber: emp.bankAccountNumber || '',
          ifscCode: emp.ifscCode || '',
          aadharNumber: emp.aadharNumber || '',
          panNumber: emp.panNumber || '',
          dateofBirth: emp.dateofBirth ? toIstInputDate(emp.dateofBirth) : '',
          address: emp.address || '',
          state: emp.state || '',
          city: emp.city || '',
          district: emp.district || '',
          pinCode: emp.pinCode || '',
        };
        setProfileForm(currentData);

        // Wizard displays if any of the optional details are blank
        const isMissing =
          !currentData.bankName.trim() ||
          !currentData.branchName.trim() ||
          !currentData.bankAccountNumber.trim() ||
          !currentData.ifscCode.trim() ||
          !currentData.aadharNumber.trim() ||
          !currentData.panNumber.trim() ||
          !currentData.dateofBirth.trim() ||
          !currentData.address.trim() ||
          !currentData.state.trim() ||
          !currentData.city.trim() ||
          !currentData.district.trim() ||
          !currentData.pinCode.trim();

        if (isMissing) {
          setShowCompletionModal(true);
        }
      } catch (err) {
        console.error('Error checking profile completion:', err);
      } finally {
        setProfileLoading(false);
      }
    };
    checkProfileCompletion();
  }, [BASE_URL, employeeId]);

  const validateProfileForm = () => {
    const errors = {};
    if (!profileForm.bankName.trim()) errors.bankName = 'Bank name is required';
    if (!profileForm.branchName.trim()) errors.branchName = 'Branch name is required';

    const acc = profileForm.bankAccountNumber.trim();
    if (!acc) {
      errors.bankAccountNumber = 'Bank account number is required';
    } else if (!/^[0-9]{8,20}$/.test(acc)) {
      errors.bankAccountNumber = 'Account number must be 8-20 digits';
    }

    const ifsc = profileForm.ifscCode.trim().toUpperCase();
    if (!ifsc) {
      errors.ifscCode = 'IFSC code is required';
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      errors.ifscCode = 'IFSC format should be like HDFC0001234';
    }

    const aadhar = profileForm.aadharNumber.trim();
    if (!aadhar) {
      errors.aadharNumber = 'Aadhar number is required';
    } else if (!/^[0-9]{12}$/.test(aadhar)) {
      errors.aadharNumber = 'Aadhar number must be exactly 12 digits';
    }

    const pan = profileForm.panNumber.trim().toUpperCase();
    if (!pan) {
      errors.panNumber = 'PAN number is required';
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      errors.panNumber = 'PAN format should be ABCDE1234F';
    }

    const dob = profileForm.dateofBirth.trim();
    if (!dob) {
      errors.dateofBirth = 'Date of birth is required';
    } else {
      const dobDate = new Date(dob);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (Number.isNaN(dobDate.getTime()) || dobDate >= today) {
        errors.dateofBirth = 'Date of birth must be in the past';
      }
    }

    if (!profileForm.address.trim()) errors.address = 'Address is required';
    if (!profileForm.state.trim()) errors.state = 'State is required';
    if (!profileForm.city.trim()) errors.city = 'City is required';
    if (!profileForm.district.trim()) errors.district = 'District is required';

    const pin = profileForm.pinCode.trim();
    if (!pin) {
      errors.pinCode = 'PIN code is required';
    } else if (!/^[0-9]{6}$/.test(pin)) {
      errors.pinCode = 'PIN code must be exactly 6 digits';
    }

    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateSingleField = (field, value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
      const fieldLabels = {
        bankName: 'Bank name',
        branchName: 'Branch name',
        bankAccountNumber: 'Bank account number',
        ifscCode: 'IFSC code',
        aadharNumber: 'Aadhar number',
        panNumber: 'PAN number',
        dateofBirth: 'Date of birth',
        address: 'Address',
        state: 'State',
        city: 'City',
        district: 'District',
        pinCode: 'PIN code',
      };
      return `${fieldLabels[field] || field} is required`;
    }
    switch (field) {
      case 'bankAccountNumber':
        return /^[0-9]{8,20}$/.test(trimmed) ? '' : 'Account number must be 8-20 digits';
      case 'ifscCode':
        return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(trimmed.toUpperCase())
          ? ''
          : 'IFSC format should be like HDFC0001234';
      case 'aadharNumber':
        return /^[0-9]{12}$/.test(trimmed) ? '' : 'Aadhar number must be exactly 12 digits';
      case 'panNumber':
        return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(trimmed.toUpperCase())
          ? ''
          : 'PAN format should be ABCDE1234F';
      case 'dateofBirth': {
        const dobDate = new Date(trimmed);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Number.isNaN(dobDate.getTime()) || dobDate >= today
          ? 'Date of birth must be in the past'
          : '';
      }
      case 'pinCode':
        return /^[0-9]{6}$/.test(trimmed) ? '' : 'PIN code must be exactly 6 digits';
      default:
        return '';
    }
  };

  const handleFieldChange = (field, value) => {
    let sanitizedValue = value;
    if (field === 'pinCode' || field === 'bankAccountNumber' || field === 'aadharNumber') {
      sanitizedValue = value.replace(/\D/g, '');
    } else if (field === 'panNumber' || field === 'ifscCode') {
      sanitizedValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    setProfileForm(prev => {
      const next = { ...prev, [field]: sanitizedValue };
      const err = validateSingleField(field, sanitizedValue);
      setProfileErrors(prevErrs => ({ ...prevErrs, [field]: err }));
      return next;
    });
  };

  const handleProfileSubmit = async e => {
    e.preventDefault();
    if (!validateProfileForm()) return;

    setSubmittingProfile(true);
    try {
      const response = await fetch(`${BASE_URL}/employee/update/${employeeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          bankName: profileForm.bankName.trim(),
          branchName: profileForm.branchName.trim(),
          bankAccountNumber: profileForm.bankAccountNumber.trim(),
          ifscCode: profileForm.ifscCode.trim().toUpperCase(),
          aadharNumber: profileForm.aadharNumber.trim(),
          panNumber: profileForm.panNumber.trim().toUpperCase(),
          dateofBirth: profileForm.dateofBirth.trim(),
          address: profileForm.address.trim(),
          state: profileForm.state.trim(),
          city: profileForm.city.trim(),
          district: profileForm.district.trim(),
          pinCode: profileForm.pinCode.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile details');
      }

      toast.success('Profile details updated successfully');
      setIsProfileComplete(true);
      setShowCompletionModal(false);
    } catch (err) {
      console.error('Error updating profile details:', err);
      toast.error(err.message || 'Error updating profile details');
    } finally {
      setSubmittingProfile(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchMonthlyAttendance = async () => {
      if (!employeeId) return;
      setLoading(true);
      try {
        const response = await fetch(
          `${BASE_URL}/attendance-summary/monthly?employeeId=${employeeId}&month=${monthIndex}&year=${year}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch monthly attendance');
        }
        if (cancelled) return;
        setRecords(Array.isArray(data.records) ? data.records : []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching monthly attendance:', err);
        setError(err.message || 'Failed to fetch monthly attendance');
        toast.error(err.message || 'Failed to fetch monthly attendance');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMonthlyAttendance();
    return () => {
      cancelled = true;
    };
  }, [BASE_URL, employeeId, monthIndex, year]);

  const stats = useMemo(() => computeStats(records, monthIndex, year), [records, monthIndex, year]);

  useEffect(() => {
    const textColor = theme === 'dark' ? '#E5E7EB' : '#1F2937';
    const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    if (lineChartInstanceRef.current) {
      lineChartInstanceRef.current.destroy();
      lineChartInstanceRef.current = null;
    }
    if (barChartInstanceRef.current) {
      barChartInstanceRef.current.destroy();
      barChartInstanceRef.current = null;
    }

    if (lineChartRef.current) {
      lineChartInstanceRef.current = new ChartJS(lineChartRef.current, {
        type: 'line',
        data: {
          labels: WEEK_LABELS,
          datasets: [
            {
              label: 'Daily Working Hours',
              data: stats.dailyHoursThisWeek,
              borderColor: '#1565c0',
              backgroundColor: 'rgba(21, 101, 192, 0.3)',
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: textColor } } },
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor } },
            y: {
              ticks: { color: textColor },
              grid: { color: gridColor },
              beginAtZero: true,
            },
          },
        },
      });
    }

    if (barChartRef.current) {
      barChartInstanceRef.current = new ChartJS(barChartRef.current, {
        type: 'bar',
        data: {
          labels: stats.weeklyLabels,
          datasets: [
            {
              label: 'Hours Worked',
              data: stats.weeklyHours,
              backgroundColor: '#22C55E',
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: textColor } } },
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor } },
            y: {
              ticks: { color: textColor },
              grid: { color: gridColor },
              beginAtZero: true,
            },
          },
        },
      });
    }

    return () => {
      if (lineChartInstanceRef.current) {
        lineChartInstanceRef.current.destroy();
        lineChartInstanceRef.current = null;
      }
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.destroy();
        barChartInstanceRef.current = null;
      }
    };
  }, [theme, stats]);

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Dashboard Home"
          description="Daily working, weekly hours worked, and attendance metrics."
          icon={<FileText className="w-8 h-8" />}
        />

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-emerald-500/10 text-emerald-800 dark:text-white dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border hover:scale-105 transform transition-all duration-300">
            <CheckCircle className="w-8 h-8 text-emerald-800 dark:text-white mb-4" />
            <h3 className="text-lg font-semibold">Total Hours Worked This Week</h3>
            <p className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin inline" />
              ) : (
                `${stats.totalHoursThisWeek} hrs`
              )}
            </p>
          </div>

          <div className="bg-yellow-500/10 text-yellow-800 dark:text-white dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border hover:scale-105 transform transition-all duration-300">
            <CheckCircle className="w-8 h-8 text-yellow-800 dark:text-white mb-4" />
            <h3 className="text-lg font-semibold">Active Days This Week</h3>
            <p className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin inline" />
              ) : (
                `${stats.activeDaysThisWeek} ${stats.activeDaysThisWeek === 1 ? 'Day' : 'Days'}`
              )}
            </p>
          </div>

          <div className="bg-red-500/10 text-red-800 dark:text-white dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border hover:scale-105 transform transition-all duration-300">
            <CheckCircle className="w-8 h-8 text-red-800 dark:text-white mb-4" />
            <h3 className="text-lg font-semibold">Monthly Attendance</h3>
            <p className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin inline" />
              ) : (
                `${stats.monthlyAttendancePct}%`
              )}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold mb-4">Daily Working Hours</h3>
            <canvas ref={lineChartRef}></canvas>
          </div>

          <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold mb-4">Weekly Hours Worked</h3>
            <canvas ref={barChartRef}></canvas>
          </div>
        </div>

        {error && !loading ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </div>

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white/95 dark:bg-dark-card/95 backdrop-blur-md rounded-2xl shadow-2xl border border-light-border dark:border-dark-border p-6 md:p-8 max-h-[90vh] overflow-y-auto transform transition-all duration-300">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-light-text dark:text-dark-text flex items-center justify-center gap-2">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">💼</span>
                Complete Your Profile
              </h2>
              <p className="text-sm text-light-text/60 dark:text-dark-text/60 mt-2">
                Please fill in your personal, banking, and identity details to complete your
                onboarding process. This is a one-time setup.
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Personal Details Section */}
              <div>
                <h3 className="text-md font-semibold text-primary mb-3 pb-1 border-b border-light-border dark:border-dark-border">
                  Personal & Contact Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={profileForm.dateofBirth}
                      onChange={e => handleFieldChange('dateofBirth', e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.dateofBirth ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.dateofBirth && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.dateofBirth}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      PIN Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.pinCode}
                      onChange={e => handleFieldChange('pinCode', e.target.value)}
                      placeholder="6 digits"
                      maxLength={6}
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.pinCode ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.pinCode && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.pinCode}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={profileForm.address}
                      onChange={e => handleFieldChange('address', e.target.value)}
                      placeholder="Your permanent address"
                      rows={2}
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.address ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2 resize-none`}
                    />
                    {profileErrors.address && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.address}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.city}
                      onChange={e => handleFieldChange('city', e.target.value)}
                      placeholder="City"
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.city ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.city && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      District <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.district}
                      onChange={e => handleFieldChange('district', e.target.value)}
                      placeholder="District"
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.district ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.district && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.district}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.state}
                      onChange={e => handleFieldChange('state', e.target.value)}
                      placeholder="State"
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.state ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.state && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.state}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bank Info Section */}
              <div>
                <h3 className="text-md font-semibold text-primary mb-3 pb-1 border-b border-light-border dark:border-dark-border">
                  Bank Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      Bank Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.bankName}
                      onChange={e => handleFieldChange('bankName', e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.bankName ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.bankName && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.bankName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      Branch Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.branchName}
                      onChange={e => handleFieldChange('branchName', e.target.value)}
                      placeholder="e.g. Main Branch"
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.branchName ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.branchName && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.branchName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      Bank Account Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.bankAccountNumber}
                      onChange={e => handleFieldChange('bankAccountNumber', e.target.value)}
                      placeholder="8-20 digits"
                      maxLength={20}
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.bankAccountNumber ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.bankAccountNumber && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.bankAccountNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      IFSC Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.ifscCode}
                      onChange={e => handleFieldChange('ifscCode', e.target.value)}
                      placeholder="e.g. SBIN0001234"
                      maxLength={11}
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.ifscCode ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.ifscCode && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.ifscCode}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Identity & Compliance Section */}
              <div>
                <h3 className="text-md font-semibold text-primary mb-3 pb-1 border-b border-light-border dark:border-dark-border">
                  Identity & Compliance Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      Aadhar Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.aadharNumber}
                      onChange={e => handleFieldChange('aadharNumber', e.target.value)}
                      placeholder="12 digit number"
                      maxLength={12}
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.aadharNumber ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.aadharNumber && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.aadharNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-light-text/60 dark:text-dark-text/60 mb-1">
                      PAN Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={profileForm.panNumber}
                      onChange={e => handleFieldChange('panNumber', e.target.value)}
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                      className={`w-full p-3 bg-light-bg dark:bg-dark-bg border ${
                        profileErrors.panNumber ? ERROR_BORDER_CLASS : NORMAL_BORDER_CLASS
                      } rounded-lg text-sm focus:outline-none focus:ring-2`}
                    />
                    {profileErrors.panNumber && (
                      <p className="text-red-500 text-xs mt-1">{profileErrors.panNumber}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={submittingProfile}
                  className="px-6 py-3 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors duration-200 shadow-md flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Details'
                  )}
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
        closeOnClick={true}
        autoClose={1000}
      />
    </div>
  );
};

export default DashboardHome;
